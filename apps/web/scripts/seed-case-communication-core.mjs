import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const preparedOfferArg = process.argv
  .find((arg) => arg.startsWith("--prepared-offer-id="))
  ?.slice("--prepared-offer-id=".length)
  .trim();
const connectionString = process.env.CRAYS_DATABASE_URL;

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: Number.parseInt(process.env.CRAYS_DATABASE_POOL_MAX ?? "5", 10),
  ssl:
    process.env.CRAYS_DATABASE_SSL === "require"
      ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
  options: "-c crays.app_role=core_service",
});

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function json(value) {
  return JSON.stringify(value);
}

async function activeCase(client) {
  const result = await client.query(`
    select
      prepared_offers.offer_id,
      prepared_offers.title,
      prepared_offers.property_case_id,
      deals.deal_id,
      bank_packages.package_id as bank_package_id,
      loan_cases.loan_case_id
    from crays_core.prepared_offers
    left join crays_core.deals on deals.prepared_offer_id = prepared_offers.offer_id
    left join crays_core.bank_packages on bank_packages.deal_id = deals.deal_id
    left join crays_core.loan_cases on loan_cases.bank_package_id = bank_packages.package_id
    where ($1::text is null or prepared_offers.offer_id = $1)
    order by
      case when $1::text is not null and prepared_offers.offer_id = $1 then 0 else 1 end,
      prepared_offers.updated_at desc,
      prepared_offers.id desc
    limit 1
  `, [preparedOfferArg || null]);

  if (!result.rows[0]) throw new Error("No prepared offer exists for communication seed.");
  return result.rows[0];
}

function conversationsFor(caseRecord) {
  return [
    {
      conversationId: `conv_${caseRecord.offer_id}_candidate`,
      title: "Candidate financing and evidence thread",
      conversationType: "candidate_deal_thread",
      relatedEntityType: "prepared-offer",
      relatedEntityId: caseRecord.offer_id,
      openedByRole: "deal-manager",
      visibilityRoles: ["deal-manager", "finance", "reviewer", "crays-management", "franchise-candidate"],
      status: "open",
      metadata: { workflow: "candidate-evidence", priority: "high" },
      participants: [
        ["deal-manager", "internal", "shared", true, true],
        ["finance", "internal", "internal", true, false],
        ["reviewer", "internal", "internal", true, false],
        ["franchise-candidate", "candidate", "shared", true, false],
      ],
      messages: [
        {
          messageId: `msg_${caseRecord.offer_id}_candidate_001`,
          senderRole: "deal-manager",
          channel: "in_app",
          messageType: "shared_comment",
          visibility: "shared",
          body: "Please confirm the updated source-of-funds evidence and the preferred bank package timing.",
          deliveryStatus: "not_sent",
          reviewStatus: "approved",
          relatedDocumentIds: ["candidate-case-memo", "bank-approval-package"],
        },
        {
          messageId: `msg_${caseRecord.offer_id}_candidate_002`,
          senderRole: "franchise-candidate",
          channel: "in_app",
          messageType: "candidate_reply",
          visibility: "shared",
          body: "I can confirm the equity contribution and will provide the missing confirmation document today.",
          deliveryStatus: "read",
          reviewStatus: "not_required",
          relatedDocumentIds: [],
        },
        {
          messageId: `msg_${caseRecord.offer_id}_candidate_003`,
          senderRole: "finance",
          channel: "internal",
          messageType: "internal_note",
          visibility: "internal",
          body: "Finance should verify the evidence note before the package is offered to the bank reviewer.",
          deliveryStatus: "not_sent",
          reviewStatus: "not_required",
          relatedDocumentIds: ["bank-approval-package"],
        },
      ],
    },
    {
      conversationId: `conv_${caseRecord.offer_id}_bank`,
      title: "Bank package questions",
      conversationType: "bank_questions",
      relatedEntityType: "bank-package",
      relatedEntityId: caseRecord.bank_package_id ?? caseRecord.deal_id ?? caseRecord.offer_id,
      openedByRole: "finance",
      visibilityRoles: ["deal-manager", "finance", "reviewer", "crays-management", "bank-partner"],
      status: "pending",
      metadata: { workflow: "bank-readiness", priority: "high" },
      participants: [
        ["finance", "internal", "shared", true, false],
        ["deal-manager", "internal", "shared", true, true],
        ["reviewer", "internal", "internal", true, false],
        ["bank-partner", "bank", "shared", true, false],
      ],
      messages: [
        {
          messageId: `msg_${caseRecord.offer_id}_bank_001`,
          senderRole: "finance",
          channel: "shared_portal",
          messageType: "bank_question",
          visibility: "shared",
          body: "Draft question: confirm whether the bank package should include the updated rent sensitivity schedule.",
          deliveryStatus: "not_sent",
          reviewStatus: "needs_review",
          relatedDocumentIds: ["bank-approval-package"],
        },
        {
          messageId: `msg_${caseRecord.offer_id}_bank_002`,
          senderRole: "reviewer",
          channel: "internal",
          messageType: "internal_note",
          visibility: "internal",
          body: "Reviewer must approve the wording and evidence links before any bank-facing question is shared.",
          deliveryStatus: "not_sent",
          reviewStatus: "not_required",
          relatedDocumentIds: ["bank-approval-package"],
        },
      ],
    },
    {
      conversationId: `conv_${caseRecord.offer_id}_opening`,
      title: "Opening handoff room",
      conversationType: "opening_project_thread",
      relatedEntityType: "deal",
      relatedEntityId: caseRecord.deal_id ?? caseRecord.offer_id,
      openedByRole: "deal-manager",
      visibilityRoles: ["deal-manager", "franchise-partner", "studio-manager", "expansion-manager", "reviewer", "crays-management"],
      status: "open",
      metadata: { workflow: "opening-handoff", priority: "medium" },
      participants: [
        ["deal-manager", "internal", "shared", true, true],
        ["expansion-manager", "internal", "shared", true, false],
        ["franchise-partner", "partner", "shared", true, false],
        ["studio-manager", "partner", "shared", true, false],
        ["reviewer", "internal", "internal", true, false],
      ],
      messages: [
        {
          messageId: `msg_${caseRecord.offer_id}_opening_001`,
          senderRole: "deal-manager",
          channel: "in_app",
          messageType: "shared_comment",
          visibility: "shared",
          body: "Opening handoff is ready for partner review once the document package preflight has no outstanding issues.",
          deliveryStatus: "not_sent",
          reviewStatus: "approved",
          relatedDocumentIds: ["partner-approval-file"],
        },
      ],
    },
  ];
}

async function ensureCommunicationRoleScope(client) {
  const roleList =
    "('deal-manager', 'expansion-manager', 'finance', 'reviewer', 'crays-management', 'admin', 'franchise-candidate', 'franchise-partner', 'studio-manager', 'bank-partner', 'landlord', 'vendor', 'gym-member', 'hr', 'system')";

  await client.query(`
    alter table crays_core.conversations
      drop constraint if exists conversations_opened_by_role_check,
      add constraint conversations_opened_by_role_check check (opened_by_role in ${roleList})
  `);
  await client.query(`
    alter table crays_core.conversation_participants
      drop constraint if exists conversation_participants_role_key_check,
      add constraint conversation_participants_role_key_check check (role_key in ${roleList})
  `);
  await client.query(`
    alter table crays_core.messages
      drop constraint if exists messages_sender_role_check,
      add constraint messages_sender_role_check check (sender_role in ${roleList})
  `);
}

async function upsertConversation(client, caseRecord, conversation) {
  await client.query(
    `
      insert into crays_core.conversations (
        conversation_id, title, conversation_type, related_entity_type, related_entity_id,
        prepared_offer_id, deal_id, property_case_id, bank_package_id, loan_case_id,
        visibility_roles, visibility_scopes, status, opened_by_role, last_message_at, metadata
      )
      values (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11::jsonb, $12::jsonb, $13, $14, now(), $15::jsonb
      )
      on conflict (conversation_id) do update set
        title = excluded.title,
        conversation_type = excluded.conversation_type,
        related_entity_type = excluded.related_entity_type,
        related_entity_id = excluded.related_entity_id,
        visibility_roles = excluded.visibility_roles,
        status = excluded.status,
        last_message_at = now(),
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      conversation.conversationId,
      conversation.title,
      conversation.conversationType,
      conversation.relatedEntityType,
      conversation.relatedEntityId,
      caseRecord.offer_id,
      caseRecord.deal_id,
      caseRecord.property_case_id,
      caseRecord.bank_package_id,
      caseRecord.loan_case_id,
      json(conversation.visibilityRoles),
      json({ caseTitle: caseRecord.title, source: "core-dev-seed" }),
      conversation.status,
      conversation.openedByRole,
      json(conversation.metadata),
    ],
  );

  for (const [roleKey, participantType, visibilityLevel, canReply, canInvite] of conversation.participants) {
    await client.query(
      `
        insert into crays_core.conversation_participants (
          participant_id, conversation_id, role_key, participant_type, visibility_level,
          can_reply, can_invite, can_share_externally, status, metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7, false, 'active', $8::jsonb)
        on conflict (participant_id) do update set
          role_key = excluded.role_key,
          participant_type = excluded.participant_type,
          visibility_level = excluded.visibility_level,
          can_reply = excluded.can_reply,
          can_invite = excluded.can_invite,
          status = 'active',
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        `part_${conversation.conversationId}_${roleKey}`,
        conversation.conversationId,
        roleKey,
        participantType,
        visibilityLevel,
        canReply,
        canInvite,
        json({ displayName: roleKey.replaceAll("-", " ") }),
      ],
    );
  }

  for (const message of conversation.messages) {
    await client.query(
      `
        insert into crays_core.messages (
          message_id, conversation_id, sender_role, channel, message_type, body,
          visibility, related_document_ids, delivery_status, review_status, metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb)
        on conflict (message_id) do update set
          sender_role = excluded.sender_role,
          channel = excluded.channel,
          message_type = excluded.message_type,
          body = excluded.body,
          visibility = excluded.visibility,
          related_document_ids = excluded.related_document_ids,
          delivery_status = excluded.delivery_status,
          review_status = excluded.review_status,
          metadata = excluded.metadata
      `,
      [
        message.messageId,
        conversation.conversationId,
        message.senderRole,
        message.channel,
        message.messageType,
        message.body,
        message.visibility,
        json(message.relatedDocumentIds),
        message.deliveryStatus,
        message.reviewStatus,
        json({ seededFor: "case-communication-workbench" }),
      ],
    );

    await client.query(
      `
        insert into crays_core.communication_events (
          event_id, conversation_id, message_id, event_type, event_status, channel,
          related_entity_type, related_entity_id, delivery_status, payload_summary
        )
        values ($1, $2, $3, 'message.created', 'visible', $4, $5, $6, $7, $8::jsonb)
        on conflict (event_id) do update set
          delivery_status = excluded.delivery_status,
          payload_summary = excluded.payload_summary,
          occurred_at = now()
      `,
      [
        `comm_event_${message.messageId}`,
        conversation.conversationId,
        message.messageId,
        message.channel,
        conversation.relatedEntityType,
        conversation.relatedEntityId,
        message.deliveryStatus,
        json({ senderRole: message.senderRole, visibility: message.visibility, reviewStatus: message.reviewStatus }),
      ],
    );
  }

  await client.query(
    `
      insert into crays_core.communication_events (
        event_id, conversation_id, event_type, event_status, channel,
        related_entity_type, related_entity_id, delivery_status, payload_summary
      )
      values ($1, $2, 'conversation.opened', 'visible', 'system', $3, $4, 'not_sent', $5::jsonb)
      on conflict (event_id) do update set payload_summary = excluded.payload_summary, occurred_at = now()
    `,
    [
      `comm_event_${conversation.conversationId}_opened`,
      conversation.conversationId,
      conversation.relatedEntityType,
      conversation.relatedEntityId,
      json({ status: conversation.status, openedByRole: conversation.openedByRole }),
    ],
  );
}

async function upsertConsents(client, caseRecord) {
  const consents = [
    ["consent_candidate_in_app", "in_app", "candidate deal updates", "active"],
    ["consent_candidate_mail", "mail", "candidate deal updates", "pending"],
    ["consent_partner_in_app", "in_app", "opening handoff updates", "active"],
    ["consent_bank_portal", "external_message", "bank package questions", "pending"],
  ];

  for (const [key, channel, purpose, status] of consents) {
    await client.query(
      `
        insert into crays_core.communication_consents (
          consent_id, channel, destination_hash, status, purpose, consent_source, consented_at, metadata
        )
        values ($1, $2, $3, $4, $5, 'manual_review', case when $4 = 'active' then now() else null end, $6::jsonb)
        on conflict (consent_id) do update set
          channel = excluded.channel,
          status = excluded.status,
          purpose = excluded.purpose,
          consented_at = excluded.consented_at,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        `${key}_${caseRecord.offer_id}`,
        channel,
        digest(`${caseRecord.offer_id}:${key}:${channel}`),
        status,
        purpose,
        json({ preparedOfferId: caseRecord.offer_id, noPrivateDestinationStored: true }),
      ],
    );
  }
}

async function main() {
  const target = getRedactedDatabaseTarget(connectionString);
  console.log(JSON.stringify({ target, apply, preparedOfferId: preparedOfferArg || null }, null, 2));

  const client = await pool.connect();
  try {
    const caseRecord = await activeCase(client);
    const conversations = conversationsFor(caseRecord);

    if (!apply) {
      console.log(
        JSON.stringify(
          {
            status: "dry_run",
            case: { offerId: caseRecord.offer_id, title: caseRecord.title },
            conversations: conversations.map((conversation) => ({
              conversationId: conversation.conversationId,
              messages: conversation.messages.length,
              participants: conversation.participants.length,
            })),
          },
          null,
          2,
        ),
      );
      return;
    }

    await client.query("begin");
    await ensureCommunicationRoleScope(client);
    for (const conversation of conversations) {
      await upsertConversation(client, caseRecord, conversation);
    }
    await upsertConsents(client, caseRecord);
    await client.query("commit");

    const counts = await client.query(`
      select
        (select count(*)::int from crays_core.conversations where prepared_offer_id = $1) as conversations,
        (select count(*)::int from crays_core.conversation_participants where conversation_id in (select conversation_id from crays_core.conversations where prepared_offer_id = $1)) as participants,
        (select count(*)::int from crays_core.messages where conversation_id in (select conversation_id from crays_core.conversations where prepared_offer_id = $1)) as messages,
        (select count(*)::int from crays_core.communication_events where conversation_id in (select conversation_id from crays_core.conversations where prepared_offer_id = $1)) as events,
        (select count(*)::int from crays_core.communication_consents where metadata ->> 'preparedOfferId' = $1) as consents
    `, [caseRecord.offer_id]);

    console.log(JSON.stringify({ status: "seeded", case: { offerId: caseRecord.offer_id, title: caseRecord.title }, counts: counts.rows[0] }, null, 2));
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // no-op
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
