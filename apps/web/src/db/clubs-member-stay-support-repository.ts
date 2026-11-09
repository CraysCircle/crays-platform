import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";

type OpenCase = {
  type: "open_case";
  bookingId?: string;
  category:
    | "booking"
    | "change"
    | "cancellation"
    | "arrival"
    | "service"
    | "access"
    | "document"
    | "other";
  subject: string;
  message: string;
};
type AddMessage = {
  type: "add_message";
  caseId: string;
  message: string;
};
export type MemberSupportCommand = OpenCase | AddMessage;

export type MemberSupportReceipt = {
  receiptId: string;
  requestId: string;
  outcome: "applied" | "denied" | "invalid";
  reason: string | null;
  caseId: string | null;
  resultingVersion: number | null;
  resultingStatus: string | null;
  replayed: boolean;
};

export type MemberSupportCommandInput = {
  accountId: string;
  idempotencyKey: string;
  correlationId: string;
  command: MemberSupportCommand;
};

type MemberSupportQueryable = Pick<PoolClient, "query">;

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function reference() {
  return `SUP-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validate(command: MemberSupportCommand) {
  if (
    command.type === "add_message" &&
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(command.caseId)
  ) {
    throw new Error("Support Case is invalid.");
  }
  if (command.type === "open_case") {
    if (
      command.bookingId &&
      !/^[A-Za-z0-9:_.-]{3,180}$/.test(command.bookingId)
    ) {
      throw new Error("Booking is invalid.");
    }
    if (
      command.subject.trim().length < 3 ||
      command.subject.trim().length > 160
    ) {
      throw new Error("Support subject is invalid.");
    }
  }
  if (
    command.message.trim().length < 3 ||
    command.message.trim().length > 4000
  ) {
    throw new Error("Support message is invalid.");
  }
}

async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function appendReceipt(
  client: PoolClient,
  input: Omit<MemberSupportReceipt, "receiptId" | "replayed">,
) {
  const receiptId = id("clubs_member_support_receipt");
  await client.query(
    `insert into crays_core.clubs_member_support_command_receipts
      (member_support_command_receipt_id,member_support_command_request_id,
       outcome,reason,member_support_case_id,resulting_version,resulting_status)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      receiptId,
      input.requestId,
      input.outcome,
      input.reason,
      input.caseId,
      input.resultingVersion,
      input.resultingStatus,
    ],
  );
  return {
    ...input,
    receiptId,
    replayed: false,
  } satisfies MemberSupportReceipt;
}

function validateInput(input: MemberSupportCommandInput) {
  validate(input.command);
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(input.idempotencyKey)) {
    throw new Error("A strong idempotency key is required.");
  }
}

export async function executeMemberSupportCommand(
  input: MemberSupportCommandInput,
): Promise<MemberSupportReceipt> {
  validateInput(input);
  return transaction((client) =>
    executeMemberSupportCommandWithClient(client, input),
  );
}

export async function executeMemberSupportCommandWithClient(
  client: PoolClient,
  input: MemberSupportCommandInput,
): Promise<MemberSupportReceipt> {
  validateInput(input);
  const payloadSha256 = hash(input.command);
  const requestId = id("clubs_member_support_command");
  const targetId =
    input.command.type === "open_case"
      ? (input.command.bookingId ?? `account:${input.accountId}`)
      : input.command.caseId;
  const inserted = await client.query(
    `insert into crays_core.clubs_member_support_command_requests
        (member_support_command_request_id,idempotency_key,correlation_id,
         actor_account_id,command_type,target_id,payload_sha256)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (actor_account_id,idempotency_key) do nothing
       returning member_support_command_request_id`,
    [
      requestId,
      input.idempotencyKey,
      input.correlationId,
      input.accountId,
      input.command.type,
      targetId,
      payloadSha256,
    ],
  );
  if ((inserted.rowCount ?? 0) === 0) {
    const replay = await client.query<{
      member_support_command_request_id: string;
      payload_sha256: string;
      member_support_command_receipt_id: string;
      outcome: MemberSupportReceipt["outcome"];
      reason: string | null;
      member_support_case_id: string | null;
      resulting_version: number | null;
      resulting_status: string | null;
    }>(
      `select request.member_support_command_request_id,request.payload_sha256,
           receipt.member_support_command_receipt_id,receipt.outcome,receipt.reason,
           receipt.member_support_case_id,receipt.resulting_version,receipt.resulting_status
         from crays_core.clubs_member_support_command_requests request
         join lateral (
           select * from crays_core.clubs_member_support_command_receipts
           where member_support_command_request_id=request.member_support_command_request_id
           order by occurred_at desc limit 1
         ) receipt on true
         where request.actor_account_id=$1 and request.idempotency_key=$2`,
      [input.accountId, input.idempotencyKey],
    );
    const row = replay.rows[0];
    if (!row || row.payload_sha256 !== payloadSha256) {
      throw new ClubsIdempotencyReplayConflictError();
    }
    return {
      receiptId: row.member_support_command_receipt_id,
      requestId: row.member_support_command_request_id,
      outcome: row.outcome,
      reason: row.reason,
      caseId: row.member_support_case_id,
      resultingVersion: row.resulting_version,
      resultingStatus: row.resulting_status,
      replayed: true,
    };
  }

  if (input.command.type === "open_case") {
    let propertyId: string | null = null;
    if (input.command.bookingId) {
      const booking = await client.query<{ property_id: string }>(
        `select property_id from crays_core.clubs_bookings
           where booking_id=$1 and account_id=$2`,
        [input.command.bookingId, input.accountId],
      );
      propertyId = booking.rows[0]?.property_id ?? null;
      if (!propertyId) {
        await client.query(
          `update crays_core.clubs_member_support_command_requests
             set status='denied',completed_at=now()
             where member_support_command_request_id=$1`,
          [requestId],
        );
        return appendReceipt(client, {
          requestId,
          outcome: "denied",
          reason: "own_booking_required",
          caseId: null,
          resultingVersion: null,
          resultingStatus: null,
        });
      }
    }
    const caseId = id("clubs_member_support_case");
    await client.query(
      `insert into crays_core.clubs_member_support_cases
          (member_support_case_id,public_reference,account_id,booking_id,
           property_id,category,subject)
         values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        caseId,
        reference(),
        input.accountId,
        input.command.bookingId ?? null,
        propertyId,
        input.command.category,
        input.command.subject.trim(),
      ],
    );
    await client.query(
      `insert into crays_core.clubs_member_support_messages
          (member_support_message_id,member_support_case_id,author_account_id,
           author_type,body)
         values ($1,$2,$3,'member',$4)`,
      [
        id("clubs_member_support_message"),
        caseId,
        input.accountId,
        input.command.message.trim(),
      ],
    );
    await client.query(
      `update crays_core.clubs_member_support_command_requests
         set status='applied',completed_at=now()
         where member_support_command_request_id=$1`,
      [requestId],
    );
    return appendReceipt(client, {
      requestId,
      outcome: "applied",
      reason: null,
      caseId,
      resultingVersion: 1,
      resultingStatus: "open",
    });
  }

  const supportCase = await client.query<{
    member_support_case_id: string;
    status: string;
    version: number;
  }>(
    `select member_support_case_id,status,version
       from crays_core.clubs_member_support_cases
       where member_support_case_id=$1 and account_id=$2 for update`,
    [input.command.caseId, input.accountId],
  );
  const row = supportCase.rows[0];
  if (!row || ["resolved", "closed"].includes(row.status)) {
    await client.query(
      `update crays_core.clubs_member_support_command_requests
         set status='denied',completed_at=now()
         where member_support_command_request_id=$1`,
      [requestId],
    );
    return appendReceipt(client, {
      requestId,
      outcome: "denied",
      reason: "own_open_support_case_required",
      caseId: row?.member_support_case_id ?? null,
      resultingVersion: row?.version ?? null,
      resultingStatus: row?.status ?? null,
    });
  }
  await client.query(
    `insert into crays_core.clubs_member_support_messages
        (member_support_message_id,member_support_case_id,author_account_id,
         author_type,body)
       values ($1,$2,$3,'member',$4)`,
    [
      id("clubs_member_support_message"),
      row.member_support_case_id,
      input.accountId,
      input.command.message.trim(),
    ],
  );
  const resultingVersion = row.version + 1;
  await client.query(
    `update crays_core.clubs_member_support_cases
       set status='awaiting_team',version=$2,updated_at=now()
       where member_support_case_id=$1 and version=$3`,
    [row.member_support_case_id, resultingVersion, row.version],
  );
  await client.query(
    `update crays_core.clubs_member_support_command_requests
       set status='applied',completed_at=now()
       where member_support_command_request_id=$1`,
    [requestId],
  );
  return appendReceipt(client, {
    requestId,
    outcome: "applied",
    reason: null,
    caseId: row.member_support_case_id,
    resultingVersion,
    resultingStatus: "awaiting_team",
  });
}

export async function readMemberStaySupportWithQueryable(
  queryable: MemberSupportQueryable,
  accountId: string,
) {
  const documents = await queryable.query<{
    document_reference_id: string;
    business_record_urn: string;
    document_kind: string;
    title: string;
    provider_key: string;
    provider_object_ref: string;
    provider_version_ref: string | null;
    content_sha256: string | null;
    created_at: Date;
  }>(
    `select document.document_reference_id,document.business_record_urn,
       document.document_kind,document.title,document.provider_key,
       document.provider_object_ref,document.provider_version_ref,
       document.content_sha256,document.created_at
     from crays_core.clubs_document_references document
     join crays_core.clubs_bookings booking
       on document.business_record_urn=concat('urn:crays:clubs:booking:',booking.booking_id)
     where booking.account_id=$1
       and document.visibility='member_after_booking'
       and document.approval_status='approved'
       and document.lifecycle='active'
     order by document.sort_order,document.created_at desc`,
    [accountId],
  );
  const cases = await queryable.query<{
    member_support_case_id: string;
    public_reference: string;
    booking_id: string | null;
    category: string;
    subject: string;
    status: string;
    version: number;
    opened_at: Date;
    updated_at: Date;
    message_count: number;
  }>(
    `select support.member_support_case_id,support.public_reference,
       support.booking_id,support.category,support.subject,support.status,
       support.version,support.opened_at,support.updated_at,
       count(message.member_support_message_id)::int message_count
     from crays_core.clubs_member_support_cases support
     left join crays_core.clubs_member_support_messages message
       on message.member_support_case_id=support.member_support_case_id
     where support.account_id=$1
     group by support.member_support_case_id
     order by support.updated_at desc limit 100`,
    [accountId],
  );
  return {
    documents: documents.rows.map((row) => ({
      documentId: row.document_reference_id,
      bookingUrn: row.business_record_urn,
      kind: row.document_kind,
      title: row.title,
      providerKey: row.provider_key,
      providerObjectReference: row.provider_object_ref,
      providerVersionReference: row.provider_version_ref,
      contentSha256: row.content_sha256,
      createdAt: row.created_at.toISOString(),
      directProviderUrl: null,
    })),
    supportCases: cases.rows.map((row) => ({
      caseId: row.member_support_case_id,
      publicReference: row.public_reference,
      bookingId: row.booking_id,
      category: row.category,
      subject: row.subject,
      status: row.status,
      version: row.version,
      openedAt: row.opened_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      messageCount: row.message_count,
    })),
  };
}

export async function readMemberStaySupport(accountId: string) {
  return readMemberStaySupportWithQueryable(getCorePgPool(), accountId);
}
