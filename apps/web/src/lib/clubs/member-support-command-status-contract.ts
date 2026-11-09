import { z } from "zod";

const id = z.string().regex(/^[A-Za-z0-9:_.-]{3,180}$/);
export const memberSupportCommandKeySchema = z.string().regex(/^[A-Za-z0-9:_.-]{16,200}$/);
const outcome = z.enum(["applied", "denied", "invalid"]);
const caseStatus = z.enum(["open", "awaiting_team", "awaiting_member", "resolved", "closed"]);
const request = z.object({
  requestId: id,
  action: z.enum(["open_case", "add_message"]),
  targetId: z.string().regex(/^[A-Za-z0-9:_.-]{3,200}$/),
  // Native PostgreSQL jsonb digest; never compare to a browser JSON digest.
  payloadSha256: z.string().regex(/^[a-f0-9]{64}$/),
  correlationId: z.string().regex(/^[A-Za-z0-9:_.-]{3,200}$/),
}).strict();
const receipt = z.object({
  receiptId: id, requestId: id, outcome,
  reason: z.string().nullable(), caseId: id.nullable(),
  resultingVersion: z.number().int().positive().nullable(),
  resultingStatus: caseStatus.nullable(), replayed: z.literal(false),
}).strict();

/** Original Core request/receipt readback. Absence is nonterminal because an
 * earlier HTTP command may not yet have entered the writer's account/key lock.
 * This contract makes no request/message-ID or external delivery assertion. */
export const ownMemberSupportCommandStatusSchema = z.object({
  schema: z.literal("crays.member.own-support-command-status.v1"),
  accountId: id, idempotencyKey: memberSupportCommandKeySchema,
  status: z.enum(["not_found", "unconfirmed", "applied", "denied", "invalid"]),
  terminal: z.boolean(), request: request.nullable(), receipt: receipt.nullable(),
  messageRelationProven: z.literal(false), messageId: z.null(),
  testOnly: z.literal(true), externalDeliveryConfirmed: z.literal(false),
}).strict().superRefine((value, context) => {
  const reject = () => context.addIssue({code: "custom", message: "Inconsistent original Support command status"});
  const terminal = value.status === "applied" || value.status === "denied" || value.status === "invalid";
  if (value.terminal !== terminal) reject();
  if (value.status === "not_found") {
    if (value.request !== null || value.receipt !== null) reject();
    return;
  }
  if (!value.request) { reject(); return; }
  if (value.status === "unconfirmed") {
    if (value.receipt !== null) reject();
    return;
  }
  if (!value.receipt || value.receipt.outcome !== value.status ||
      value.receipt.requestId !== value.request.requestId) { reject(); return; }
  if (value.status === "applied") {
    if (value.receipt.caseId === null || value.receipt.resultingVersion === null ||
        value.receipt.resultingStatus === null ||
        (value.request.action === "add_message" && value.request.targetId !== value.receipt.caseId)) reject();
  }
});

export type OwnMemberSupportCommandStatus = z.output<typeof ownMemberSupportCommandStatusSchema>;

export function parseOwnMemberSupportCommandStatus(payload: unknown, accountId: string, idempotencyKey: string): OwnMemberSupportCommandStatus {
  const status = ownMemberSupportCommandStatusSchema.parse(payload);
  if (status.accountId !== accountId || status.idempotencyKey !== idempotencyKey) {
    throw Error("MEMBER_SUPPORT_COMMAND_STATUS_SCOPE_INVALID");
  }
  return status;
}


/** Join fresh original Core authority to the pending browser reference. The
 * browser digest describes its draft; the native jsonb digest is a different
 * representation and cannot be equated with it. Visible content is checked
 * separately against the authorized conversation before saved confirmation. */
export function memberSupportStatusMatchesPending(status: OwnMemberSupportCommandStatus,
  marker: Pick<import("./member-support-pending-storage").MemberSupportPendingMarker,
    "accountId"|"idempotencyKey"|"action"|"caseId"|"bookingId"|"receipt">): boolean {
  if (status.accountId !== marker.accountId || status.idempotencyKey !== marker.idempotencyKey ||
      !status.request || status.request.action !== marker.action ||
      status.request.targetId !== (marker.action === "add_message" ? marker.caseId : marker.bookingId ?? "account:" + marker.accountId)) return false;
  if (marker.receipt) {
    const receipt = status.receipt;
    if (status.status !== "applied" || !receipt ||
        receipt.requestId !== marker.receipt.requestId || receipt.receiptId !== marker.receipt.receiptId ||
        receipt.caseId !== marker.receipt.caseId || receipt.resultingVersion !== marker.receipt.resultingVersion ||
        receipt.resultingStatus !== marker.receipt.resultingStatus) return false;
  }
  return true;
}

export function memberSupportAppliedStatusPayload(status: OwnMemberSupportCommandStatus) {
  if (status.status !== "applied" || !status.terminal || !status.receipt || !status.request) return null;
  return {status: "applied", correlationId: status.request.correlationId, receipt: status.receipt};
}
