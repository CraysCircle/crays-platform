import {z} from "zod";
import {memberOwnStateSchema} from "./member-own-state-contract";

const account = z.object({
  id: z.string().min(1).max(180).refine(value=>value===value.trim()),
  displayName: z.string().min(1).max(300),
  name: z.string().min(1).max(300),
  email: z.string().max(500).nullable(),
  emailVerified: z.boolean(),
  backendSynced: z.literal(true),
  provider: z.literal("auth0"),
}).strict();
const common = {
  status: z.literal("ready"),
  authenticated: z.literal(true),
  accountMapped: z.literal(true),
  sessionMode: z.literal("auth0"),
  bookingAuthority: z.literal(false),
  logoutHref: z.literal("/auth/logout?returnTo=%2Fen"),
};
const globalSession = z.object({
  ...common,
  account: account.extend({status: z.literal("active")}).strict(),
}).strict();
const clubSession = z.object({
  ...common,
  account,
  ownState: memberOwnStateSchema,
}).strict().superRefine((value,ctx) => {
  if (value.account.id !== value.ownState.accountId)
    ctx.addIssue({code:"custom",message:"Original Club account/state mismatch"});
});
export const memberGlobalNativeSessionSchema = z.object({
  schema: z.literal("crays.club.global-native-session.v1"),
  globalSession,
  clubSession,
}).strict();

/** Presentation consistency only. The BFF derives both accounts from one actual
 * SDK principal; this parser never supplies identity or grants a capability.
 * Keep the global ID for host notification and the original Club ID for feeds.
 */
export function parseMemberGlobalNativeSession(payload:unknown, expectedGlobalAccountId:string|undefined) {
  if (!expectedGlobalAccountId) return null;
  const parsed=memberGlobalNativeSessionSchema.safeParse(payload);
  if (!parsed.success || parsed.data.globalSession.account.id !== expectedGlobalAccountId) return null;
  return parsed.data;
}
