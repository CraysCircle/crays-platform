import "server-only";

import { randomUUID } from "node:crypto";

import { getCorePgPool } from "@/db/client";
import {
  hashPublicInquiryEvidence,
  normalizePublicGolfMiceInquiryInput,
  normalizePublicInquiryIdempotencyKey,
  type PublicGolfMiceInquiryInput,
} from "./public-golf-mice-inquiry-contract";

type Row = Record<string, unknown>;

export interface PublicInquirySqlClient {
  query<ResultRow extends Row = Row>(
    statement: string,
    values?: readonly unknown[],
  ): Promise<{ rows: ResultRow[]; rowCount?: number | null }>;
  release?(): void;
}

export interface PublicInquirySqlPool {
  connect(): Promise<PublicInquirySqlClient>;
}

export type PersistedPublicInquiry = Readonly<{
  status: "persisted";
  publicReference: string;
  providerDeliveryState: "provider_not_bound";
  providerDeliveryClaimed: false;
  destination: "CRAYS_TEAM";
  receiptSha256: string;
  replayed: boolean;
}>;

export class PublicInquiryReplayConflictError extends Error {
  constructor() {
    super("CCLUB_PUBLIC_INQUIRY_REPLAY_CONFLICT");
    this.name = "PublicInquiryReplayConflictError";
  }
}

export class PublicInquiryUnknownOutcomeError extends Error {
  constructor() {
    super("CCLUB_PUBLIC_INQUIRY_UNKNOWN_OUTCOME");
    this.name = "PublicInquiryUnknownOutcomeError";
  }
}

class PublicInquiryPersistenceInvariantError extends Error {
  constructor(message: string) {
    super(`CCLUB_PUBLIC_INQUIRY_PERSISTENCE_INVARIANT: ${message}`);
    this.name = "PublicInquiryPersistenceInvariantError";
  }
}

type ReceiptRow = Readonly<{
  payload_sha256: string;
  public_reference: string;
  response_sha256: string;
  outcome: string;
}>;

type ReconciliationReceiptRow = ReceiptRow &
  Readonly<{
    durable_complete: boolean;
  }>;

function iso(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new PublicInquiryPersistenceInvariantError("time invalid");
  return new Date(parsed).toISOString();
}

function responseFor(publicReference: string, receiptSha256: string, replayed: boolean) {
  return Object.freeze({
    status: "persisted" as const,
    publicReference,
    providerDeliveryState: "provider_not_bound" as const,
    providerDeliveryClaimed: false as const,
    destination: "CRAYS_TEAM" as const,
    receiptSha256,
    replayed,
  });
}

function responseMaterial(publicReference: string) {
  return Object.freeze({
    status: "persisted" as const,
    publicReference,
    providerDeliveryState: "provider_not_bound" as const,
    providerDeliveryClaimed: false as const,
    destination: "CRAYS_TEAM" as const,
  });
}

export async function persistPublicGolfMiceInquiryWithClient(
  client: PublicInquirySqlClient,
  input: PublicGolfMiceInquiryInput,
  idempotencyKey: string,
  persistedAtInput: string,
): Promise<PersistedPublicInquiry> {
  const normalized = normalizePublicGolfMiceInquiryInput(input);
  const commandKey = normalizePublicInquiryIdempotencyKey(idempotencyKey);
  const persistedAt = iso(persistedAtInput);
  const payloadSha256 = hashPublicInquiryEvidence(normalized);
  const idempotencyKeySha256 = hashPublicInquiryEvidence(commandKey);

  await client.query(
    "select pg_advisory_xact_lock(hashtextextended($1, 0)) /* cclub-public-inquiry:lock */",
    [idempotencyKeySha256],
  );
  const prior = await client.query<ReceiptRow>(
    `select payload_sha256, public_reference, response_sha256, outcome
       from crays_core.clubs_public_inquiry_command_receipts
      where idempotency_key_sha256=$1
      for update /* cclub-public-inquiry:receipt-read */`,
    [idempotencyKeySha256],
  );
  if (prior.rows[0]) {
    const receipt = prior.rows[0];
    if (receipt.payload_sha256 !== payloadSha256) throw new PublicInquiryReplayConflictError();
    if (receipt.outcome !== "persisted") {
      throw new PublicInquiryPersistenceInvariantError("receipt outcome invalid");
    }
    const expectedResponseSha256 = hashPublicInquiryEvidence(
      responseMaterial(receipt.public_reference),
    );
    if (receipt.response_sha256 !== expectedResponseSha256) {
      throw new PublicInquiryPersistenceInvariantError("receipt response hash mismatch");
    }
    return responseFor(receipt.public_reference, receipt.response_sha256, true);
  }

  const inquiryId = randomUUID();
  const outboxId = randomUUID();
  const commandReceiptId = randomUUID();
  const publicReference = `CRAYS-INQUIRY-${randomUUID()}`;
  const responseSha256 = hashPublicInquiryEvidence(responseMaterial(publicReference));

  await client.query(
    `insert into crays_core.clubs_public_inquiries
      (inquiry_id,public_reference,inquiry_type,contact_name,contact_email,
       organization_name,country_or_region,preferred_start_date,preferred_end_date,
       participant_count,message,privacy_notice_version,privacy_consent,contact_consent,
       destination,payload_sha256,persisted_at)
     values($1,$2,$3,$4,$5,$6,$7,$8::date,$9::date,$10,$11,$12,true,true,
       'CRAYS_TEAM',$13,$14::timestamptz)
     /* cclub-public-inquiry:inquiry-insert */`,
    [
      inquiryId,
      publicReference,
      normalized.inquiryType,
      normalized.contactName,
      normalized.contactEmail,
      normalized.organizationName,
      normalized.countryOrRegion,
      normalized.preferredStartDate,
      normalized.preferredEndDate,
      normalized.participantCount,
      normalized.message,
      normalized.privacyNoticeVersion,
      payloadSha256,
      persistedAt,
    ],
  );
  await client.query(
    `insert into crays_core.clubs_public_inquiry_crm_outbox
      (outbox_id,inquiry_id,destination,delivery_state,payload_sha256,
       provider_binding_receipt_sha256,provider_acknowledgement_sha256,
       provider_delivery_claimed,created_at)
     values($1,$2,'CRAYS_TEAM','provider_not_bound',$3,null,null,false,$4::timestamptz)
     /* cclub-public-inquiry:outbox-insert */`,
    [outboxId, inquiryId, payloadSha256, persistedAt],
  );
  await client.query(
    `insert into crays_core.clubs_public_inquiry_command_receipts
      (command_receipt_id,idempotency_key_sha256,payload_sha256,inquiry_id,outbox_id,
       public_reference,response_sha256,outcome,created_at)
     values($1,$2,$3,$4,$5,$6,$7,'persisted',$8::timestamptz)
     /* cclub-public-inquiry:receipt-insert */`,
    [
      commandReceiptId,
      idempotencyKeySha256,
      payloadSha256,
      inquiryId,
      outboxId,
      publicReference,
      responseSha256,
      persistedAt,
    ],
  );

  const readback = await client.query<ReceiptRow>(
    `select r.payload_sha256,r.public_reference,r.response_sha256,r.outcome
       from crays_core.clubs_public_inquiry_command_receipts r
       join crays_core.clubs_public_inquiries i on i.inquiry_id=r.inquiry_id
       join crays_core.clubs_public_inquiry_crm_outbox o on o.outbox_id=r.outbox_id
      where r.idempotency_key_sha256=$1
        and i.payload_sha256=r.payload_sha256
        and o.payload_sha256=r.payload_sha256
        and o.destination='CRAYS_TEAM'
        and o.delivery_state='provider_not_bound'
        and o.provider_delivery_claimed=false
      /* cclub-public-inquiry:atomic-readback */`,
    [idempotencyKeySha256],
  );
  const persisted = readback.rows[0];
  if (
    readback.rows.length !== 1 ||
    persisted.payload_sha256 !== payloadSha256 ||
    persisted.public_reference !== publicReference ||
    persisted.response_sha256 !== responseSha256 ||
    persisted.outcome !== "persisted"
  ) {
    throw new PublicInquiryPersistenceInvariantError("atomic readback failed");
  }
  return responseFor(publicReference, responseSha256, false);
}

export async function persistPublicGolfMiceInquiryWithPool(
  pool: PublicInquirySqlPool,
  inputValue: unknown,
  idempotencyKeyValue: string | null,
  persistedAt: string,
): Promise<PersistedPublicInquiry> {
  const input = normalizePublicGolfMiceInquiryInput(inputValue);
  const idempotencyKey = normalizePublicInquiryIdempotencyKey(idempotencyKeyValue);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      "select set_config('crays.app_role', 'core_service', true) /* cclub-public-inquiry:app-role */",
    );
    const result = await persistPublicGolfMiceInquiryWithClient(
      client,
      input,
      idempotencyKey,
      persistedAt,
    );
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (error instanceof PublicInquiryReplayConflictError) throw error;
    throw new PublicInquiryUnknownOutcomeError();
  } finally {
    client.release?.();
  }
}

export async function reconcilePublicGolfMiceInquiryWithClient(
  client: PublicInquirySqlClient,
  input: PublicGolfMiceInquiryInput,
  idempotencyKey: string,
): Promise<PersistedPublicInquiry | null> {
  const normalized = normalizePublicGolfMiceInquiryInput(input);
  const commandKey = normalizePublicInquiryIdempotencyKey(idempotencyKey);
  const payloadSha256 = hashPublicInquiryEvidence(normalized);
  const idempotencyKeySha256 = hashPublicInquiryEvidence(commandKey);
  const result = await client.query<ReconciliationReceiptRow>(
    `select r.payload_sha256,r.public_reference,r.response_sha256,r.outcome,
            (i.payload_sha256=r.payload_sha256 and
             o.payload_sha256=r.payload_sha256 and
             o.destination='CRAYS_TEAM' and
             o.delivery_state='provider_not_bound' and
             o.provider_delivery_claimed=false) durable_complete
       from crays_core.clubs_public_inquiry_command_receipts r
       left join crays_core.clubs_public_inquiries i on i.inquiry_id=r.inquiry_id
       left join crays_core.clubs_public_inquiry_crm_outbox o on o.outbox_id=r.outbox_id
      where r.idempotency_key_sha256=$1
      /* cclub-public-inquiry:reconciliation-read */`,
    [idempotencyKeySha256],
  );
  const receipt = result.rows[0];
  if (!receipt) return null;
  if (receipt.payload_sha256 !== payloadSha256) throw new PublicInquiryReplayConflictError();
  if (receipt.outcome !== "persisted" || !receipt.durable_complete) {
    throw new PublicInquiryPersistenceInvariantError("reconciliation receipt incomplete");
  }
  const expectedResponseSha256 = hashPublicInquiryEvidence(
    responseMaterial(receipt.public_reference),
  );
  if (receipt.response_sha256 !== expectedResponseSha256) {
    throw new PublicInquiryPersistenceInvariantError("reconciliation response hash mismatch");
  }
  return responseFor(receipt.public_reference, receipt.response_sha256, true);
}

export async function reconcilePublicGolfMiceInquiryWithPool(
  pool: PublicInquirySqlPool,
  inputValue: unknown,
  idempotencyKeyValue: string | null,
): Promise<PersistedPublicInquiry | null> {
  const input = normalizePublicGolfMiceInquiryInput(inputValue);
  const idempotencyKey = normalizePublicInquiryIdempotencyKey(idempotencyKeyValue);
  const client = await pool.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    await client.query(
      "select set_config('crays.app_role', 'core_service', true) /* cclub-public-inquiry:app-role-read-only */",
    );
    const result = await reconcilePublicGolfMiceInquiryWithClient(
      client,
      input,
      idempotencyKey,
    );
    await client.query("rollback");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (error instanceof PublicInquiryReplayConflictError) throw error;
    throw new PublicInquiryUnknownOutcomeError();
  } finally {
    client.release?.();
  }
}

export async function executePublicGolfMiceInquiryCommand(
  input: unknown,
  idempotencyKey: string | null,
): Promise<PersistedPublicInquiry> {
  return persistPublicGolfMiceInquiryWithPool(
    getCorePgPool(),
    input,
    idempotencyKey,
    new Date().toISOString(),
  );
}

export async function reconcilePublicGolfMiceInquiryCommand(
  input: unknown,
  idempotencyKey: string | null,
): Promise<PersistedPublicInquiry | null> {
  return reconcilePublicGolfMiceInquiryWithPool(getCorePgPool(), input, idempotencyKey);
}
