import { z } from "zod";
import { ownMemberConversationsSchema } from "./member-conversation-contract";

const id = z.string().regex(/^[A-Za-z0-9:_.-]{3,180}$/);
const status = z.enum(["open", "awaiting_team", "awaiting_member", "resolved", "closed"]);
const appliedReceipt = z.object({
  receiptId: id,
  requestId: id,
  outcome: z.literal("applied"),
  reason: z.string().nullable(),
  caseId: id,
  resultingVersion: z.number().int().positive(),
  resultingStatus: status,
  replayed: z.boolean(),
}).strict();
const appliedResponse = z.object({
  status: z.literal("applied"),
  receipt: appliedReceipt,
  correlationId: z.string().regex(/^[A-Za-z0-9:_.-]{3,200}$/),
}).strict();
export const memberSupportAppliedResponseSchema = appliedResponse;
const caseReadback = z.object({
  caseId: id,
  bookingId: id.nullable(),
  category: z.enum(["booking", "change", "cancellation", "arrival", "service", "access", "document", "other"]),
  subject: z.string(),
  status,
  version: z.number().int().positive(),
  messageCount: z.number().int().nonnegative(),
}).passthrough();

export type MemberSupportCommandForReadback =
  | Readonly<{ type: "open_case"; bookingId?: string; category: z.infer<typeof caseReadback>["category"]; subject: string; message: string }>
  | Readonly<{ type: "add_message"; caseId: string; message: string }>;

/** Receipt IDs come from the original writer, never from a subject/count match. */
export function memberSupportAcknowledgedCaseId(httpStatus: number, payload: unknown): string | null {
  if (httpStatus !== 200) return null;
  const parsed = appliedResponse.safeParse(payload);
  return parsed.success ? parsed.data.receipt.caseId : null;
}

/** UI saved-state check; server SDK/Core still owns command and object authority.
 * The original receipt has no messageId. This does not invent a request/message
 * relation, delivery acknowledgement, or team publication capability.
 */
export function memberSupportCommandReadbackConfirmed(input: Readonly<{
  httpStatus: number;
  payload: unknown;
  command: MemberSupportCommandForReadback;
  expectedAccountId: string | null;
  supportCases: unknown;
  conversations: unknown;
}>): boolean {
  if (input.httpStatus !== 200 || !id.safeParse(input.expectedAccountId).success) return false;
  const acknowledgement = appliedResponse.safeParse(input.payload);
  const support = z.array(caseReadback).safeParse(input.supportCases);
  const conversations = ownMemberConversationsSchema.safeParse(input.conversations);
  if (!acknowledgement.success || !support.success || !conversations.success ||
      conversations.data.accountId !== input.expectedAccountId) return false;

  const receipt = acknowledgement.data.receipt;
  const matches = support.data.filter(item => item.caseId === receipt.caseId);
  const threads = conversations.data.cases.filter(item => item.caseId === receipt.caseId);
  if (matches.length !== 1 || threads.length !== 1) return false;
  const saved = matches[0];
  const thread = threads[0];
  if (saved.version < receipt.resultingVersion || thread.caseVersion < receipt.resultingVersion ||
      (saved.version === receipt.resultingVersion && saved.status !== receipt.resultingStatus) ||
      (thread.caseVersion === receipt.resultingVersion && thread.status !== receipt.resultingStatus)) return false;
  if (saved.bookingId !== thread.bookingId || saved.category !== thread.category || saved.subject !== thread.subject) return false;
  if (input.command.type === "add_message") {
    if (receipt.caseId !== input.command.caseId) return false;
  } else if (saved.bookingId !== (input.command.bookingId ?? null) ||
             saved.category !== input.command.category || saved.subject !== input.command.subject.trim()) return false;
  const body = input.command.message.trim();
  return body.length >= 3 && body.length <= 4000 && saved.messageCount > 0 &&
    thread.messages.some(message => message.authorType === "member" && message.body === body);
}
