import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const SHA256 = /^[a-f0-9]{64}$/;
export type ProviderChannelDigestCandidate = Readonly<{ bindingId: string; status: string; channelTokenSecretRef: string; currentChannelTokenSha256: string | null }>;
export type ProviderChannelDigestPlanEntry = Readonly<{ bindingId: string; channelTokenSecretRef: string; channelTokenSha256: string; action: "BACKFILL" | "UNCHANGED" }>;
export class ProviderChannelDigestBackfillError extends Error {
  constructor(readonly code: "CHANNEL_DIGEST_BACKFILL_INPUT_INVALID" | "CHANNEL_DIGEST_BACKFILL_DUPLICATE_BINDING" | "CHANNEL_DIGEST_BACKFILL_SECRET_UNRESOLVED" | "CHANNEL_DIGEST_BACKFILL_DRIFT") { super(code); this.name = "ProviderChannelDigestBackfillError"; }
}
function exactId(value: unknown): string { if (typeof value !== "string" || !ID.test(value.trim())) throw new ProviderChannelDigestBackfillError("CHANNEL_DIGEST_BACKFILL_INPUT_INVALID"); return value.trim(); }
function equalDigest(left: string, right: string): boolean { return left.length === right.length && timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")); }
/** Build a deterministic read-only plan; never emit credentials or mutate Core. */
export async function planProviderChannelTokenDigestBackfill(candidates: readonly ProviderChannelDigestCandidate[], resolveSecret: (secretReference: string) => Promise<string>): Promise<readonly ProviderChannelDigestPlanEntry[]> {
  if (!Array.isArray(candidates)) throw new ProviderChannelDigestBackfillError("CHANNEL_DIGEST_BACKFILL_INPUT_INVALID");
  const active = candidates.filter((candidate) => candidate.status === "active");
  const seen = new Set<string>(); const plan: ProviderChannelDigestPlanEntry[] = [];
  for (const candidate of active) {
    const bindingId = exactId(candidate.bindingId); const secretReference = exactId(candidate.channelTokenSecretRef);
    if (seen.has(bindingId)) throw new ProviderChannelDigestBackfillError("CHANNEL_DIGEST_BACKFILL_DUPLICATE_BINDING"); seen.add(bindingId);
    const secret = await resolveSecret(secretReference);
    if (typeof secret !== "string" || !secret.trim()) throw new ProviderChannelDigestBackfillError("CHANNEL_DIGEST_BACKFILL_SECRET_UNRESOLVED");
    const digest = createHash("sha256").update(secret, "utf8").digest("hex"); const current = candidate.currentChannelTokenSha256;
    if (current !== null && (!SHA256.test(current) || !equalDigest(current, digest))) throw new ProviderChannelDigestBackfillError("CHANNEL_DIGEST_BACKFILL_DRIFT");
    plan.push(Object.freeze({ bindingId, channelTokenSecretRef: secretReference, channelTokenSha256: digest, action: current === null ? "BACKFILL" : "UNCHANGED" }));
  }
  return Object.freeze(plan.sort((left, right) => left.bindingId.localeCompare(right.bindingId)));
}
