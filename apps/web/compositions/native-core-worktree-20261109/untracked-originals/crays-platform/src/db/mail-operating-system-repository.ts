import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getCorePgPool } from "./client";
import { roundcubeCapabilityContract } from "@/lib/mail/roundcube-capability-contract";
import type { RoleKey } from "@/lib/roles";

const allowedRoles = new Set<RoleKey>([
  "crays-management", "admin", "deal-manager", "expansion-manager", "finance", "hr",
  "franchise-partner", "studio-manager", "bank-partner", "landlord", "vendor", "reviewer",
]);

const email = z.string().trim().email().max(320);
const draftSchema = z.object({
  tenantId: z.string().trim().min(2).max(160),
  actorAccountId: z.string().trim().min(2).max(200),
  role: z.string().trim().min(2).max(80),
  mailAccountId: z.string().trim().min(2).max(200),
  threadId: z.string().trim().min(2).max(200).optional(),
  idempotencyKey: z.string().trim().min(8).max(200),
  to: z.array(email).min(1).max(25),
  cc: z.array(email).max(25).default([]),
  subject: z.string().trim().min(1).max(998),
  bodyText: z.string().trim().min(1).max(100_000),
});

const linkSchema = z.object({
  tenantId: z.string().trim().min(2).max(160),
  actorAccountId: z.string().trim().min(2).max(200),
  threadId: z.string().trim().min(2).max(200),
  resourceKey: z.string().trim().min(2).max(120),
  recordId: z.string().trim().min(2).max(240),
  reason: z.string().trim().min(2).max(500),
});

function rows<T>(result: { rows: T[] }) { return result.rows; }

export async function getMailOperatingSystemReadModel(input: {
  tenantId: string;
  role: RoleKey;
  selectedThreadId?: string | null;
}) {
  if (!allowedRoles.has(input.role)) {
    return {
      access: { allowed: false, role: input.role },
      accounts: [], folders: [], threads: [], messages: [], links: [], events: [],
      provider: roundcubeCapabilityContract,
      boundaries: { externalSendEnabled: false, sandboxCaptureEnabled: true, credentialsReturned: false },
    };
  }
  const pool = getCorePgPool();
  const [accounts, folders, threads, events] = await Promise.all([
    pool.query(`select mail_account_id as "mailAccountId",mailbox_address as "mailboxAddress",display_name as "displayName",mailbox_kind as "mailboxKind",status,capabilities,updated_at as "updatedAt" from crays_core.mail_accounts where tenant_id=$1 order by mailbox_kind,display_name`, [input.tenantId]),
    pool.query(`select folder_id as "folderId",mail_account_id as "mailAccountId",name,folder_kind as "folderKind",unread_count as "unreadCount",total_count as "totalCount" from crays_core.mail_folders where tenant_id=$1 order by sort_order,name`, [input.tenantId]),
    pool.query(`select thread_id as "threadId",mail_account_id as "mailAccountId",folder_id as "folderId",subject,participant_summary as participants,message_count as "messageCount",unread_count as "unreadCount",has_attachments as "hasAttachments",last_message_at as "lastMessageAt",state from crays_core.mail_threads where tenant_id=$1 order by last_message_at desc nulls last,updated_at desc limit 100`, [input.tenantId]),
    pool.query(`select event_id as "eventId",event_type as "eventType",thread_id as "threadId",draft_id as "draftId",payload_summary as "payloadSummary",occurred_at as "occurredAt" from crays_core.mail_events where tenant_id=$1 order by occurred_at desc limit 25`, [input.tenantId]),
  ]);
  const selectedThreadId = input.selectedThreadId ?? threads.rows[0]?.threadId ?? null;
  const [messages, links] = selectedThreadId ? await Promise.all([
    pool.query(`select mail_message_id as "messageId",thread_id as "threadId",direction,sender_address as "senderAddress",recipient_summary as recipients,subject,body_preview as "bodyPreview",body_text as "bodyText",attachment_metadata as attachments,delivery_state as "deliveryState",coalesce(received_at,sent_at,created_at) as "occurredAt" from crays_core.mail_messages where tenant_id=$1 and thread_id=$2 order by coalesce(received_at,sent_at,created_at),id`, [input.tenantId, selectedThreadId]),
    pool.query(`select link_id as "linkId",thread_id as "threadId",resource_key as "resourceKey",record_id as "recordId",link_reason as "reason",created_at as "createdAt" from crays_core.mail_object_links where tenant_id=$1 and thread_id=$2 order by created_at`, [input.tenantId, selectedThreadId]),
  ]) : [{ rows: [] }, { rows: [] }];
  return {
    access: { allowed: true, role: input.role }, selectedThreadId,
    accounts: rows(accounts), folders: rows(folders), threads: rows(threads), messages: rows(messages), links: rows(links), events: rows(events),
    provider: roundcubeCapabilityContract,
    boundaries: { externalSendEnabled: false, sandboxCaptureEnabled: true, credentialsReturned: false },
  };
}

export async function captureMailDraftSandbox(raw: unknown) {
  const input = draftSchema.parse(raw);
  const pool = getCorePgPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const account = await client.query<{ mailbox_address: string }>(`select mailbox_address from crays_core.mail_accounts where tenant_id=$1 and mail_account_id=$2 and status in ('sandbox_ready','provider_ready') for update`, [input.tenantId, input.mailAccountId]);
    if (!account.rows[0]) throw new Error("Mailbox is not available in this tenant.");
    const existing = await client.query<{ draft_id: string; captured_message_id: string | null }>(`select draft_id,captured_message_id from crays_core.mail_drafts where tenant_id=$1 and mail_account_id=$2 and idempotency_key=$3`, [input.tenantId, input.mailAccountId, input.idempotencyKey]);
    if (existing.rows[0]) {
      await client.query("commit");
      return { status: "replayed", draftId: existing.rows[0].draft_id, messageId: existing.rows[0].captured_message_id, externalSendPerformed: false };
    }
    let threadId = input.threadId;
    if (!threadId) {
      threadId = `mail-thread-${randomUUID()}`;
      const sent = await client.query<{ folder_id: string }>(`select folder_id from crays_core.mail_folders where tenant_id=$1 and mail_account_id=$2 and folder_kind='sent' limit 1`, [input.tenantId, input.mailAccountId]);
      await client.query(`insert into crays_core.mail_threads (tenant_id,thread_id,mail_account_id,folder_id,subject,participant_summary,message_count,last_message_at) values ($1,$2,$3,$4,$5,$6::jsonb,1,now())`, [input.tenantId, threadId, input.mailAccountId, sent.rows[0]?.folder_id ?? null, input.subject, JSON.stringify(input.to)]);
    } else {
      const owned = await client.query(`select 1 from crays_core.mail_threads where tenant_id=$1 and thread_id=$2 and mail_account_id=$3 for update`, [input.tenantId, threadId, input.mailAccountId]);
      if (!owned.rowCount) throw new Error("Thread is outside the selected mailbox scope.");
    }
    const draftId = `mail-draft-${randomUUID()}`;
    const messageId = `mail-message-${randomUUID()}`;
    await client.query(`insert into crays_core.mail_drafts (tenant_id,draft_id,mail_account_id,thread_id,idempotency_key,to_addresses,cc_addresses,subject,body_text,state,external_send_performed,created_by_account_id) values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,'captured',false,$10)`, [input.tenantId,draftId,input.mailAccountId,threadId,input.idempotencyKey,JSON.stringify(input.to),JSON.stringify(input.cc),input.subject,input.bodyText,input.actorAccountId]);
    await client.query(`insert into crays_core.mail_messages (tenant_id,mail_message_id,thread_id,direction,sender_address,recipient_summary,subject,body_preview,body_text,delivery_state,sent_at) values ($1,$2,$3,'internal_capture',$4,$5::jsonb,$6,$7,$8,'captured',now())`, [input.tenantId,messageId,threadId,account.rows[0].mailbox_address,JSON.stringify([...input.to,...input.cc]),input.subject,input.bodyText.slice(0,240),input.bodyText]);
    await client.query(`update crays_core.mail_drafts set captured_message_id=$1 where tenant_id=$2 and draft_id=$3`, [messageId,input.tenantId,draftId]);
    await client.query(`update crays_core.mail_threads set message_count=message_count+case when message_count=1 then 0 else 1 end,last_message_at=now(),updated_at=now() where tenant_id=$1 and thread_id=$2`, [input.tenantId,threadId]);
    await client.query(`insert into crays_core.mail_events (tenant_id,event_id,event_type,mail_account_id,thread_id,mail_message_id,draft_id,actor_account_id,payload_summary) values ($1,$2,'mail.sandbox_captured',$3,$4,$5,$6,$7,$8::jsonb)`, [input.tenantId,`mail-event-${randomUUID()}`,input.mailAccountId,threadId,messageId,draftId,input.actorAccountId,JSON.stringify({role:input.role,recipientCount:input.to.length+input.cc.length,externalSendPerformed:false})]);
    await client.query("commit");
    return { status: "captured", draftId, messageId, threadId, externalSendPerformed: false };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}

export async function linkMailThreadToObject(raw: unknown) {
  const input = linkSchema.parse(raw);
  const pool = getCorePgPool();
  const owned = await pool.query(`select 1 from crays_core.mail_threads where tenant_id=$1 and thread_id=$2`, [input.tenantId,input.threadId]);
  if (!owned.rowCount) throw new Error("Thread is outside the tenant scope.");
  const linkId = `mail-link-${randomUUID()}`;
  const result = await pool.query<{ link_id: string }>(`insert into crays_core.mail_object_links (tenant_id,link_id,thread_id,resource_key,record_id,link_reason,linked_by_account_id) values ($1,$2,$3,$4,$5,$6,$7) on conflict (tenant_id,thread_id,resource_key,record_id) do update set link_reason=excluded.link_reason returning link_id`, [input.tenantId,linkId,input.threadId,input.resourceKey,input.recordId,input.reason,input.actorAccountId]);
  await pool.query(`insert into crays_core.mail_events (tenant_id,event_id,event_type,thread_id,actor_account_id,payload_summary) values ($1,$2,'mail.object_linked',$3,$4,$5::jsonb)`, [input.tenantId,`mail-event-${randomUUID()}`,input.threadId,input.actorAccountId,JSON.stringify({resourceKey:input.resourceKey,recordId:input.recordId})]);
  return { linkId: result.rows[0].link_id, externalWritePerformed: false };
}
