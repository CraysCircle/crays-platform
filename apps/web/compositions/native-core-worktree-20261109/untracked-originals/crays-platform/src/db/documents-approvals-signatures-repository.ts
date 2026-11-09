import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { documensoCapabilityContract } from "@/lib/documents/documenso-capability-contract";
import type { RoleKey } from "@/lib/roles";
import { getCorePgPool } from "./client";

const readableRoles = new Set<RoleKey>([
  "crays-management", "admin", "deal-manager", "expansion-manager", "finance", "hr",
  "franchise-partner", "studio-manager", "bank-partner", "landlord", "vendor", "reviewer",
]);
const commandRoles = new Set<RoleKey>(["crays-management", "admin", "deal-manager", "expansion-manager", "finance", "reviewer"]);
const overrideRoles = new Set<RoleKey>(["crays-management", "admin"]);
const sandboxWebhookSecret = randomBytes(32).toString("hex");

const signatureLevel = z.enum(["ordinary", "advanced", "qualified"]);
const createDocumentSchema = z.object({
  tenantId: z.string().trim().min(2).max(160),
  actorAccountId: z.string().trim().min(2).max(200),
  role: z.string().trim().min(2).max(80),
  title: z.string().trim().min(3).max(300),
  documentType: z.string().trim().min(2).max(120),
  businessResourceKey: z.string().trim().min(2).max(120),
  businessRecordId: z.string().trim().min(2).max(240),
  requiredSignatureLevel: signatureLevel.default("ordinary"),
  sandboxContent: z.string().min(1).max(500_000),
  approvalRoles: z.array(z.string().trim().min(2).max(80)).min(1).max(12),
});
const approveSchema = z.object({
  tenantId: z.string().trim().min(2).max(160),
  actorAccountId: z.string().trim().min(2).max(200),
  role: z.string().trim().min(2).max(80),
  documentId: z.string().trim().min(2).max(200),
  decisionNote: z.string().trim().min(2).max(2_000),
});
const recipientSchema = z.object({
  label: z.string().trim().min(2).max(200),
  destination: z.string().trim().min(3).max(320),
  role: z.enum(["signer", "approver", "cc", "viewer"]).default("signer"),
  routingOrder: z.number().int().positive().max(100),
});
const envelopeSchema = z.object({
  tenantId: z.string().trim().min(2).max(160),
  actorAccountId: z.string().trim().min(2).max(200),
  role: z.string().trim().min(2).max(80),
  documentId: z.string().trim().min(2).max(200),
  idempotencyKey: z.string().trim().min(8).max(200),
  recipients: z.array(recipientSchema).min(1).max(25),
}).refine((value) => value.recipients.some((recipient) => recipient.role === "signer" || recipient.role === "approver"), {
  message: "At least one signer or approver is required.",
  path: ["recipients"],
});
const webhookPayloadSchema = z.object({
  providerEventId: z.string().trim().min(8).max(240),
  eventType: z.literal("recipient.completed"),
  envelopeId: z.string().trim().min(2).max(200),
  recipientId: z.string().trim().min(2).max(200),
});

export type DocumentsApprovalsReadModel = Awaited<ReturnType<typeof getDocumentsApprovalsReadModel>>;

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function roleCanCommand(role: string) {
  return commandRoles.has(role as RoleKey);
}

async function appendEvent(client: { query: (sql: string, values?: unknown[]) => Promise<unknown> }, input: {
  tenantId: string;
  eventType: string;
  documentId?: string | null;
  versionId?: string | null;
  envelopeId?: string | null;
  actorAccountId?: string | null;
  payload?: Record<string, unknown>;
}) {
  await client.query(
    `insert into crays_core.document_signature_events
      (tenant_id,event_id,event_type,document_id,version_id,envelope_id,actor_account_id,payload_summary)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [input.tenantId, `document-event-${randomUUID()}`, input.eventType, input.documentId ?? null, input.versionId ?? null, input.envelopeId ?? null, input.actorAccountId ?? null, JSON.stringify(input.payload ?? {})],
  );
}

export async function getDocumentsApprovalsReadModel(input: {
  tenantId: string;
  role: RoleKey;
  selectedDocumentId?: string | null;
}) {
  if (!readableRoles.has(input.role)) {
    return {
      access: { allowed: false, canCommand: false, role: input.role },
      documents: [], selectedDocumentId: null, versions: [], approvals: [], envelopes: [], recipients: [], completionEvidence: [], events: [],
      provider: documensoCapabilityContract,
      boundaries: { realUploadEnabled: false, externalInvitationEnabled: false, qualifiedSignatureEnabled: false, secretsReturned: false },
    };
  }
  const pool = getCorePgPool();
  const documents = await pool.query(`
    select d.document_id as "documentId",d.title,d.document_type as "documentType",d.business_resource_key as "businessResourceKey",
      d.business_record_id as "businessRecordId",d.lifecycle_state as "lifecycleState",d.required_signature_level as "requiredSignatureLevel",
      d.active_version_id as "activeVersionId",d.updated_at as "updatedAt",v.version_number as "versionNumber",v.content_sha256 as "contentSha256",
      v.version_state as "versionState",
      count(distinct a.approval_step_id)::int as "approvalSteps",
      count(distinct a.approval_step_id) filter (where a.step_status='approved')::int as "approvedSteps",
      count(distinct e.envelope_id)::int as "envelopeCount"
    from crays_core.managed_documents d
    left join crays_core.managed_document_versions v on v.tenant_id=d.tenant_id and v.version_id=d.active_version_id
    left join crays_core.document_approval_steps a on a.tenant_id=d.tenant_id and a.document_id=d.document_id and a.version_id=d.active_version_id
    left join crays_core.signature_envelopes e on e.tenant_id=d.tenant_id and e.document_id=d.document_id
    where d.tenant_id=$1
    group by d.id,v.id
    order by d.updated_at desc,d.id desc
    limit 100`, [input.tenantId]);
  const selectedDocumentId = input.selectedDocumentId && documents.rows.some((row) => row.documentId === input.selectedDocumentId)
    ? input.selectedDocumentId
    : documents.rows[0]?.documentId ?? null;
  const empty = { rows: [] as Record<string, unknown>[] };
  const [versions, approvals, envelopes, events] = selectedDocumentId ? await Promise.all([
    pool.query(`select version_id as "versionId",document_id as "documentId",version_number as "versionNumber",content_sha256 as "contentSha256",mime_type as "mimeType",byte_size as "byteSize",storage_reference as "storageReference",version_state as "versionState",locked_at as "lockedAt",signed_at as "signedAt",created_at as "createdAt" from crays_core.managed_document_versions where tenant_id=$1 and document_id=$2 order by version_number desc`, [input.tenantId,selectedDocumentId]),
    pool.query(`select approval_step_id as "approvalStepId",document_id as "documentId",version_id as "versionId",sequence_number as "sequenceNumber",approval_role as "approvalRole",approver_account_id as "approverAccountId",step_status as "stepStatus",decision_note as "decisionNote",decided_at as "decidedAt" from crays_core.document_approval_steps where tenant_id=$1 and document_id=$2 order by sequence_number`, [input.tenantId,selectedDocumentId]),
    pool.query(`select envelope_id as "envelopeId",document_id as "documentId",version_id as "versionId",provider_key as provider,provider_envelope_ref as "providerEnvelopeRef",envelope_state as "envelopeState",required_signature_level as "requiredSignatureLevel",actual_signature_level as "actualSignatureLevel",version_hash_snapshot as "versionHashSnapshot",external_invitation_sent as "externalInvitationSent",completed_at as "completedAt",created_at as "createdAt" from crays_core.signature_envelopes where tenant_id=$1 and document_id=$2 order by created_at desc`, [input.tenantId,selectedDocumentId]),
    pool.query(`select event_id as "eventId",event_type as "eventType",document_id as "documentId",version_id as "versionId",envelope_id as "envelopeId",payload_summary as "payloadSummary",occurred_at as "occurredAt" from crays_core.document_signature_events where tenant_id=$1 and document_id=$2 order by occurred_at desc,id desc limit 50`, [input.tenantId,selectedDocumentId]),
  ]) : [empty,empty,empty,empty];
  const envelopeIds = envelopes.rows.map((row: Record<string, unknown>) => row.envelopeId as string);
  const [recipients, completionEvidence] = envelopeIds.length ? await Promise.all([
    pool.query(`select recipient_id as "recipientId",envelope_id as "envelopeId",recipient_label as "recipientLabel",recipient_role as "recipientRole",routing_order as "routingOrder",recipient_status as "recipientStatus",completed_at as "completedAt" from crays_core.signature_recipients where tenant_id=$1 and envelope_id=any($2::text[]) order by envelope_id,routing_order`, [input.tenantId,envelopeIds]),
    pool.query(`select evidence_id as "evidenceId",envelope_id as "envelopeId",version_id as "versionId",completion_sha256 as "completionSha256",provider_certificate_ref as "providerCertificateRef",signature_level as "signatureLevel",evidence_summary as "evidenceSummary",verified_at as "verifiedAt" from crays_core.signature_completion_evidence where tenant_id=$1 and envelope_id=any($2::text[]) order by verified_at desc`, [input.tenantId,envelopeIds]),
  ]) : [empty,empty];
  return {
    access: { allowed: true, canCommand: roleCanCommand(input.role), role: input.role },
    documents: documents.rows,
    selectedDocumentId,
    versions: versions.rows,
    approvals: approvals.rows,
    envelopes: envelopes.rows,
    recipients: recipients.rows,
    completionEvidence: completionEvidence.rows,
    events: events.rows,
    provider: documensoCapabilityContract,
    boundaries: { realUploadEnabled: false, externalInvitationEnabled: false, qualifiedSignatureEnabled: false, secretsReturned: false },
  };
}

export async function createSandboxManagedDocument(raw: unknown) {
  const input = createDocumentSchema.parse(raw);
  if (!roleCanCommand(input.role)) throw new Error("This role cannot create managed documents.");
  const pool = getCorePgPool();
  const client = await pool.connect();
  const documentId = `document-${randomUUID()}`;
  const versionId = `document-version-${randomUUID()}`;
  const contentSha256 = sha256(input.sandboxContent);
  try {
    await client.query("begin");
    await client.query(`insert into crays_core.managed_documents (tenant_id,document_id,title,document_type,business_resource_key,business_record_id,owner_account_id,lifecycle_state,required_signature_level,active_version_id) values ($1,$2,$3,$4,$5,$6,$7,'in_review',$8,null)`, [input.tenantId,documentId,input.title,input.documentType,input.businessResourceKey,input.businessRecordId,input.actorAccountId,input.requiredSignatureLevel]);
    await client.query(`insert into crays_core.managed_document_versions (tenant_id,version_id,document_id,version_number,content_sha256,mime_type,byte_size,storage_reference,version_state) values ($1,$2,$3,1,$4,'application/pdf',$5,$6,'draft')`, [input.tenantId,versionId,documentId,contentSha256,Buffer.byteLength(input.sandboxContent,"utf8"),`sandbox://documents/${versionId}.pdf`]);
    await client.query(`update crays_core.managed_documents set active_version_id=$1 where tenant_id=$2 and document_id=$3`, [versionId,input.tenantId,documentId]);
    for (let index = 0; index < input.approvalRoles.length; index += 1) {
      await client.query(`insert into crays_core.document_approval_steps (tenant_id,approval_step_id,document_id,version_id,sequence_number,approval_role,step_status) values ($1,$2,$3,$4,$5,$6,$7)`, [input.tenantId,`approval-step-${randomUUID()}`,documentId,versionId,index+1,input.approvalRoles[index],index===0?"ready":"pending"]);
    }
    await appendEvent(client,{tenantId:input.tenantId,eventType:"document.sandbox_created",documentId,versionId,actorAccountId:input.actorAccountId,payload:{contentSha256,approvalSteps:input.approvalRoles.length,requiredSignatureLevel:input.requiredSignatureLevel,realUploadPerformed:false}});
    await client.query("commit");
    return { status:"created",documentId,versionId,contentSha256,realUploadPerformed:false,externalInvitationSent:false };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
}

export async function approveNextDocumentStep(raw: unknown) {
  const input = approveSchema.parse(raw);
  if (!roleCanCommand(input.role)) throw new Error("This role cannot approve documents.");
  const pool = getCorePgPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const document = await client.query<{active_version_id:string;lifecycle_state:string}>(`select active_version_id,lifecycle_state from crays_core.managed_documents where tenant_id=$1 and document_id=$2 for update`,[input.tenantId,input.documentId]);
    if (!document.rows[0]) throw new Error("Document is outside the tenant scope.");
    if (!["in_review","approved"].includes(document.rows[0].lifecycle_state)) throw new Error("Document is not in an approvable state.");
    const step = await client.query<{approval_step_id:string;approval_role:string;sequence_number:number}>(`select approval_step_id,approval_role,sequence_number from crays_core.document_approval_steps where tenant_id=$1 and document_id=$2 and version_id=$3 and step_status='ready' order by sequence_number limit 1 for update`,[input.tenantId,input.documentId,document.rows[0].active_version_id]);
    if (!step.rows[0]) throw new Error("No approval step is ready.");
    if (!overrideRoles.has(input.role as RoleKey) && step.rows[0].approval_role !== input.role) throw new Error(`Approval step ${step.rows[0].sequence_number} requires role ${step.rows[0].approval_role}.`);
    await client.query(`update crays_core.document_approval_steps set step_status='approved',approver_account_id=$1,decision_note=$2,decided_at=now() where tenant_id=$3 and approval_step_id=$4`,[input.actorAccountId,input.decisionNote,input.tenantId,step.rows[0].approval_step_id]);
    const next = await client.query<{approval_step_id:string}>(`select approval_step_id from crays_core.document_approval_steps where tenant_id=$1 and document_id=$2 and version_id=$3 and step_status='pending' order by sequence_number limit 1 for update`,[input.tenantId,input.documentId,document.rows[0].active_version_id]);
    if (next.rows[0]) await client.query(`update crays_core.document_approval_steps set step_status='ready' where tenant_id=$1 and approval_step_id=$2`,[input.tenantId,next.rows[0].approval_step_id]);
    else await client.query(`update crays_core.managed_documents set lifecycle_state='approved',updated_at=now() where tenant_id=$1 and document_id=$2`,[input.tenantId,input.documentId]);
    await appendEvent(client,{tenantId:input.tenantId,eventType:"document.approval_completed",documentId:input.documentId,versionId:document.rows[0].active_version_id,actorAccountId:input.actorAccountId,payload:{sequenceNumber:step.rows[0].sequence_number,approvalRole:step.rows[0].approval_role,allApproved:!next.rows[0]}});
    await client.query("commit");
    return { status:"approved",sequenceNumber:step.rows[0].sequence_number,allApproved:!next.rows[0] };
  } catch(error){await client.query("rollback");throw error;} finally{client.release();}
}

export async function prepareSandboxSignatureEnvelope(raw: unknown) {
  const input = envelopeSchema.parse(raw);
  if (!roleCanCommand(input.role)) throw new Error("This role cannot prepare signature envelopes.");
  const pool = getCorePgPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query<{envelope_id:string}>(`select envelope_id from crays_core.signature_envelopes where tenant_id=$1 and idempotency_key=$2`,[input.tenantId,input.idempotencyKey]);
    if(existing.rows[0]){await client.query("commit");return{status:"replayed",envelopeId:existing.rows[0].envelope_id,externalInvitationSent:false};}
    const document = await client.query<{active_version_id:string;required_signature_level:"ordinary"|"advanced"|"qualified";lifecycle_state:string}>(`select active_version_id,required_signature_level,lifecycle_state from crays_core.managed_documents where tenant_id=$1 and document_id=$2 for update`,[input.tenantId,input.documentId]);
    if(!document.rows[0]) throw new Error("Document is outside the tenant scope.");
    if(document.rows[0].lifecycle_state!=="approved") throw new Error("Every approval step must complete before envelope preparation.");
    if(document.rows[0].required_signature_level!=="ordinary") throw new Error(`${document.rows[0].required_signature_level} signatures are unavailable without reviewed Documenso Enterprise CSC/QTSP/TSA capability; no downgrade was performed.`);
    const incomplete = await client.query(`select 1 from crays_core.document_approval_steps where tenant_id=$1 and document_id=$2 and version_id=$3 and step_status<>'approved' limit 1`,[input.tenantId,input.documentId,document.rows[0].active_version_id]);
    if(incomplete.rowCount) throw new Error("Approval sequence is incomplete.");
    const version = await client.query<{content_sha256:string;version_state:string}>(`select content_sha256,version_state from crays_core.managed_document_versions where tenant_id=$1 and version_id=$2 for update`,[input.tenantId,document.rows[0].active_version_id]);
    if(!version.rows[0]) throw new Error("Active version is missing.");
    if(version.rows[0].version_state!=="draft") throw new Error("Only a draft version can be locked into a new envelope.");
    const envelopeId=`signature-envelope-${randomUUID()}`;
    await client.query(`update crays_core.managed_document_versions set version_state='locked',locked_at=now(),locked_by_account_id=$1 where tenant_id=$2 and version_id=$3`,[input.actorAccountId,input.tenantId,document.rows[0].active_version_id]);
    await client.query(`insert into crays_core.signature_envelopes (tenant_id,envelope_id,document_id,version_id,envelope_state,required_signature_level,version_hash_snapshot,idempotency_key,external_invitation_sent,created_by_account_id) values ($1,$2,$3,$4,'sandbox_signing','ordinary',$5,$6,false,$7)`,[input.tenantId,envelopeId,input.documentId,document.rows[0].active_version_id,version.rows[0].content_sha256,input.idempotencyKey,input.actorAccountId]);
    const minimumOrder=Math.min(...input.recipients.filter((recipient)=>["signer","approver"].includes(recipient.role)).map((recipient)=>recipient.routingOrder));
    for(const recipient of input.recipients){
      const actionable=["signer","approver"].includes(recipient.role);
      await client.query(`insert into crays_core.signature_recipients (tenant_id,recipient_id,envelope_id,recipient_label,destination_hash,recipient_role,routing_order,recipient_status) values ($1,$2,$3,$4,$5,$6,$7,$8)`,[input.tenantId,`signature-recipient-${randomUUID()}`,envelopeId,recipient.label,sha256(recipient.destination.toLowerCase()),recipient.role,recipient.routingOrder,actionable&&recipient.routingOrder===minimumOrder?"ready":actionable?"pending":"completed"]);
    }
    await client.query(`update crays_core.managed_documents set lifecycle_state='signature_pending',updated_at=now() where tenant_id=$1 and document_id=$2`,[input.tenantId,input.documentId]);
    await appendEvent(client,{tenantId:input.tenantId,eventType:"signature.sandbox_envelope_prepared",documentId:input.documentId,versionId:document.rows[0].active_version_id,envelopeId,actorAccountId:input.actorAccountId,payload:{recipientCount:input.recipients.length,versionHash:version.rows[0].content_sha256,externalInvitationSent:false}});
    await client.query("commit");
    return{status:"prepared",envelopeId,versionId:document.rows[0].active_version_id,versionHash:version.rows[0].content_sha256,externalInvitationSent:false,realUploadPerformed:false};
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function processVerifiedDocumensoWebhook(input: {
  tenantId: string;
  rawBody: string;
  signature: string;
  secret: string;
  verificationMode?: "provider" | "sandbox";
}) {
  const payloadHash=sha256(input.rawBody);
  const expected=createHmac("sha256",input.secret).update(input.rawBody).digest("hex");
  const supplied=input.signature.startsWith("sha256=")?input.signature.slice(7):input.signature;
  const signatureValid=/^[0-9a-f]{64}$/i.test(supplied)&&supplied.length===expected.length&&timingSafeEqual(Buffer.from(supplied,"hex"),Buffer.from(expected,"hex"));
  let parsed: z.infer<typeof webhookPayloadSchema> | null=null;
  try{parsed=webhookPayloadSchema.parse(JSON.parse(input.rawBody));}catch{parsed=null;}
  const providerEventId=parsed?.providerEventId??`invalid-${payloadHash}`;
  const pool=getCorePgPool();
  const client=await pool.connect();
  try{
    await client.query("begin");
    const existing=await client.query<{payload_sha256:string;processing_state:string}>(`select payload_sha256,processing_state from crays_core.signature_webhook_deliveries where tenant_id=$1 and provider_key='documenso' and provider_event_id=$2 for update`,[input.tenantId,providerEventId]);
    if(existing.rows[0]){
      if(existing.rows[0].payload_sha256!==payloadHash) throw new Error("Webhook event id was reused with a different payload.");
      await client.query("commit");
      return{status:"replayed",providerEventId,processedAgain:false};
    }
    const deliveryId=`signature-webhook-${randomUUID()}`;
    if(!signatureValid||!parsed){
      await client.query(`insert into crays_core.signature_webhook_deliveries (tenant_id,delivery_id,provider_event_id,event_type,payload_sha256,verification_state,processing_state,error_summary,processed_at) values ($1,$2,$3,$4,$5,'rejected','rejected',$6,now())`,[input.tenantId,deliveryId,providerEventId,parsed?.eventType??"invalid",payloadHash,!signatureValid?"Signature verification failed.":"Payload validation failed."]);
      await client.query("commit");
      throw new Error(!signatureValid?"Webhook signature verification failed.":"Webhook payload validation failed.");
    }
    await client.query(`insert into crays_core.signature_webhook_deliveries (tenant_id,delivery_id,provider_event_id,event_type,payload_sha256,verification_state,processing_state) values ($1,$2,$3,$4,$5,$6,'received')`,[input.tenantId,deliveryId,providerEventId,parsed.eventType,payloadHash,input.verificationMode==="sandbox"?"sandbox_verified":"verified"]);
    const envelope=await client.query<{document_id:string;version_id:string;version_hash_snapshot:string;envelope_state:string}>(`select document_id,version_id,version_hash_snapshot,envelope_state from crays_core.signature_envelopes where tenant_id=$1 and envelope_id=$2 for update`,[input.tenantId,parsed.envelopeId]);
    if(!envelope.rows[0]) throw new Error("Envelope is outside the tenant scope.");
    if(["completed","cancelled","rejected"].includes(envelope.rows[0].envelope_state)) throw new Error("Envelope is already terminal.");
    const recipient=await client.query<{recipient_role:string;routing_order:number;recipient_status:string}>(`select recipient_role,routing_order,recipient_status from crays_core.signature_recipients where tenant_id=$1 and envelope_id=$2 and recipient_id=$3 for update`,[input.tenantId,parsed.envelopeId,parsed.recipientId]);
    if(!recipient.rows[0]) throw new Error("Recipient is outside the envelope scope.");
    if(recipient.rows[0].recipient_status!=="ready") throw new Error("Recipient is not ready; routing order is enforced.");
    const completedStatus=recipient.rows[0].recipient_role==="approver"?"approved":"signed";
    await client.query(`update crays_core.signature_recipients set recipient_status=$1,completed_at=now() where tenant_id=$2 and recipient_id=$3`,[completedStatus,input.tenantId,parsed.recipientId]);
    const remaining=await client.query<{recipient_id:string;routing_order:number}>(`select recipient_id,routing_order from crays_core.signature_recipients where tenant_id=$1 and envelope_id=$2 and recipient_role in ('signer','approver') and recipient_status in ('pending','ready') order by routing_order`,[input.tenantId,parsed.envelopeId]);
    let completed=false;
    let evidenceId:string|null=null;
    if(remaining.rows.length){
      const nextOrder=remaining.rows[0].routing_order;
      await client.query(`update crays_core.signature_recipients set recipient_status='ready' where tenant_id=$1 and envelope_id=$2 and routing_order=$3 and recipient_status='pending'`,[input.tenantId,parsed.envelopeId,nextOrder]);
      await client.query(`update crays_core.signature_envelopes set envelope_state='partially_signed',updated_at=now() where tenant_id=$1 and envelope_id=$2`,[input.tenantId,parsed.envelopeId]);
      await client.query(`update crays_core.managed_documents set lifecycle_state='partially_signed',updated_at=now() where tenant_id=$1 and document_id=$2`,[input.tenantId,envelope.rows[0].document_id]);
    }else{
      completed=true;
      evidenceId=`signature-evidence-${randomUUID()}`;
      const completionSha256=sha256(`${envelope.rows[0].version_hash_snapshot}:${parsed.envelopeId}:${providerEventId}`);
      await client.query(`update crays_core.signature_envelopes set envelope_state='completed',actual_signature_level='ordinary',completed_at=now(),updated_at=now() where tenant_id=$1 and envelope_id=$2`,[input.tenantId,parsed.envelopeId]);
      await client.query(`update crays_core.managed_document_versions set version_state='signed',signed_at=now() where tenant_id=$1 and version_id=$2`,[input.tenantId,envelope.rows[0].version_id]);
      await client.query(`update crays_core.managed_documents set lifecycle_state='completed',updated_at=now() where tenant_id=$1 and document_id=$2`,[input.tenantId,envelope.rows[0].document_id]);
      await client.query(`insert into crays_core.signature_completion_evidence (tenant_id,evidence_id,envelope_id,version_id,completion_sha256,provider_certificate_ref,signature_level,evidence_summary,verified_at) values ($1,$2,$3,$4,$5,$6,'ordinary',$7::jsonb,now())`,[input.tenantId,evidenceId,parsed.envelopeId,envelope.rows[0].version_id,completionSha256,`sandbox-certificate://${evidenceId}`,JSON.stringify({provider:"documenso",verificationMode:input.verificationMode??"provider",versionHash:envelope.rows[0].version_hash_snapshot,externalInvitationSent:false})]);
    }
    await appendEvent(client,{tenantId:input.tenantId,eventType:completed?"signature.envelope_completed":"signature.recipient_completed",documentId:envelope.rows[0].document_id,versionId:envelope.rows[0].version_id,envelopeId:parsed.envelopeId,payload:{providerEventId,recipientId:parsed.recipientId,completed,verificationMode:input.verificationMode??"provider"}});
    await client.query(`update crays_core.signature_webhook_deliveries set processing_state='processed',processed_at=now() where tenant_id=$1 and delivery_id=$2`,[input.tenantId,deliveryId]);
    await client.query("commit");
    return{status:"processed",providerEventId,completed,evidenceId,processedAgain:false};
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function completeSandboxSignature(input: {tenantId:string;actorAccountId:string;role:string;envelopeId:string;recipientId:string}) {
  if(!roleCanCommand(input.role)) throw new Error("This role cannot run the sandbox signing session.");
  const rawBody=JSON.stringify({providerEventId:`sandbox-documenso-${randomUUID()}`,eventType:"recipient.completed",envelopeId:input.envelopeId,recipientId:input.recipientId});
  const signature=createHmac("sha256",sandboxWebhookSecret).update(rawBody).digest("hex");
  return processVerifiedDocumensoWebhook({tenantId:input.tenantId,rawBody,signature,secret:sandboxWebhookSecret,verificationMode:"sandbox"});
}
