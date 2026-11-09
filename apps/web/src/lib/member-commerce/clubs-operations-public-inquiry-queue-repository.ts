import "server-only";

import { getCorePgPool } from "@/db/client";
import {
  CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT,
  type ClubsOperationsPublicInquiryQueueActor,
  type ClubsOperationsPublicInquiryQueueItem,
  type ClubsOperationsPublicInquiryQueueProjection,
} from "./clubs-operations-public-inquiry-queue-contract";

type Row = Record<string, unknown>;

export interface ClubsOperationsPublicInquiryQueueSqlClient {
  query<ResultRow extends Row = Row>(
    statement: string,
    values?: readonly unknown[],
  ): Promise<{ rows: ResultRow[]; rowCount?: number | null }>;
  release?(): void;
}

export interface ClubsOperationsPublicInquiryQueueSqlPool {
  connect(): Promise<ClubsOperationsPublicInquiryQueueSqlClient>;
}

type QueueRow = Readonly<{
  public_reference: unknown;
  inquiry_type: unknown;
  received_at: unknown;
}>;

export class ClubsOperationsPublicInquiryQueueAuthorityError extends Error {
  constructor() {
    super("CCLUB_OPERATIONS_PUBLIC_INQUIRY_QUEUE_AUTHORITY_REQUIRED");
    this.name = "ClubsOperationsPublicInquiryQueueAuthorityError";
  }
}

export class ClubsOperationsPublicInquiryQueueUnavailableError extends Error {
  constructor() {
    super("CCLUB_OPERATIONS_PUBLIC_INQUIRY_QUEUE_UNAVAILABLE");
    this.name = "ClubsOperationsPublicInquiryQueueUnavailableError";
  }
}

function assertActor(actor: ClubsOperationsPublicInquiryQueueActor): void {
  if (
    !actor.accountId ||
    !actor.tenantSessionId ||
    !actor.organizationId ||
    !CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.allowedRoles.includes(
      actor.role,
    ) ||
    !CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.assurance.allowed.includes(
      actor.assuranceLevel,
    )
  ) {
    throw new ClubsOperationsPublicInquiryQueueAuthorityError();
  }
}

function mapQueueRow(row: QueueRow): ClubsOperationsPublicInquiryQueueItem {
  if (
    typeof row.public_reference !== "string" ||
    !/^CRAYS-INQUIRY-[0-9a-f-]{36}$/i.test(row.public_reference) ||
    (row.inquiry_type !== "golf_tourism" && row.inquiry_type !== "mice_event")
  ) {
    throw new ClubsOperationsPublicInquiryQueueUnavailableError();
  }
  const receivedAt =
    row.received_at instanceof Date
      ? row.received_at
      : new Date(String(row.received_at));
  if (!Number.isFinite(receivedAt.getTime())) {
    throw new ClubsOperationsPublicInquiryQueueUnavailableError();
  }
  return Object.freeze({
    publicReference: row.public_reference,
    inquiryType: row.inquiry_type,
    receivedAt: receivedAt.toISOString(),
    confirmationStatus: "received" as const,
    teamQueueStatus: "queued" as const,
    reconciliationStatus: "reconciled" as const,
    providerDeliveryState: "provider_not_bound" as const,
    providerDeliveryClaimed: false as const,
  });
}

export async function readClubsOperationsPublicInquiryQueueWithClient(
  client: ClubsOperationsPublicInquiryQueueSqlClient,
  actor: ClubsOperationsPublicInquiryQueueActor,
): Promise<ClubsOperationsPublicInquiryQueueProjection> {
  assertActor(actor);
  const result = await client.query<QueueRow>(
    `select r.public_reference,i.inquiry_type,i.persisted_at received_at
       from crays_core.clubs_public_inquiry_command_receipts r
       join crays_core.clubs_public_inquiries i
         on i.inquiry_id=r.inquiry_id
        and i.public_reference=r.public_reference
        and i.payload_sha256=r.payload_sha256
       join crays_core.clubs_public_inquiry_crm_outbox o
         on o.outbox_id=r.outbox_id
        and o.inquiry_id=i.inquiry_id
        and o.payload_sha256=r.payload_sha256
      where r.outcome='persisted'
        and o.destination='CRAYS_TEAM'
        and o.delivery_state='provider_not_bound'
        and o.provider_delivery_claimed=false
      order by i.persisted_at desc,r.public_reference desc
      limit 26
      /* cclub-operations-public-inquiry:queue-read */`,
  );
  const maximumItems = CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.maximumItems;
  const items = result.rows.slice(0, maximumItems).map(mapQueueRow);
  return Object.freeze({
    schema: CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.schema,
    version: CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.version,
    status: items.length > 0 ? "ready" : "empty",
    items: Object.freeze(items),
    truncated: result.rows.length > maximumItems,
    destination: "CRAYS_TEAM" as const,
    containsPersonalData: false as const,
    providerDeliveryClaimed: false as const,
  });
}

export async function readClubsOperationsPublicInquiryQueueWithPool(
  pool: ClubsOperationsPublicInquiryQueueSqlPool,
  actor: ClubsOperationsPublicInquiryQueueActor,
): Promise<ClubsOperationsPublicInquiryQueueProjection> {
  assertActor(actor);
  const client = await pool.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    await client.query(
      "select set_config('crays.app_role', 'core_service', true) /* cclub-operations-public-inquiry:app-role-read-only */",
    );
    const projection = await readClubsOperationsPublicInquiryQueueWithClient(
      client,
      actor,
    );
    await client.query("rollback");
    return projection;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (error instanceof ClubsOperationsPublicInquiryQueueAuthorityError) {
      throw error;
    }
    throw new ClubsOperationsPublicInquiryQueueUnavailableError();
  } finally {
    client.release?.();
  }
}

export async function readClubsOperationsPublicInquiryQueue(
  actor: ClubsOperationsPublicInquiryQueueActor,
): Promise<ClubsOperationsPublicInquiryQueueProjection> {
  return readClubsOperationsPublicInquiryQueueWithPool(getCorePgPool(), actor);
}
