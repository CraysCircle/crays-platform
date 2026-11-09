import "server-only";
import {createHash} from "node:crypto";
import type {NextRequest} from "next/server";
import {getAuth0RuntimeConfigStateForRequest, getExactOidcServerSessionRead} from "@/lib/auth0";
import {createCoreOriginalMemberIdentityRuntimeRpcClient} from "@/db/core-identity-runtime-rpc";
import {getCoreOriginalMemberIdentityRpcPool} from "@/db/core-identity-runtime-pool";
import {validateClubsMemberMutationRequest} from "@/lib/clubs/member-request-security";
import {
  issueOwnMemberTestHold, prepareOwnMemberHoldBoundCart,
  type MemberNativeBookingActor, type MemberNativeBookingQuery,
} from "@/db/member-native-booking-rpc";

const headers = {"cache-control":"private, no-store", vary:"Cookie"};
const reply = (body: object, status: number) => Response.json(body, {status, headers});

export async function resolveMemberNativeBookingActor(request: NextRequest): Promise<MemberNativeBookingActor | null> {
  const config = getAuth0RuntimeConfigStateForRequest(request);
  if (config.application !== "clubs" || !config.appBaseUrlConfigured ||
      !config.baseUrlMatchesRequestOrigin || !config.domainConfigured ||
      !config.clientIdConfigured || !config.clientSecretConfigured || !config.secretConfigured) return null;
  const session = await getExactOidcServerSessionRead(request);
  if (!session || session.status !== "ready") return null;
  const bundle = await createCoreOriginalMemberIdentityRuntimeRpcClient(
    (sql, values) => getCoreOriginalMemberIdentityRpcPool().query(sql, values),
  ).resolveAuth0IdentityBundleV2(session.validatedIssuer,session.validatedSubject,session.serverConfiguredClientId);
  if (!bundle) return null;
  const identities = bundle.accessIdentities.filter(identity =>
    identity.provider_key === "auth0" && identity.verified === true &&
    identity.account_id === bundle.account.account_id && identity.provider_subject === session.validatedSubject);
  if (identities.length !== 1) return null;
  const accountId=bundle.account.account_id, sourceIdentityId=identities[0].identity_id;
  if (typeof accountId!=="string" || !accountId || typeof sourceIdentityId!=="string" || !sourceIdentityId) return null;
  return Object.freeze({accountId,sourceIdentityId,
    issuer:session.validatedIssuer,subject:session.validatedSubject,
    clientIdSha256:createHash("sha256").update(session.serverConfiguredClientId,"utf8").digest("hex"),
    // This is the endpoint purpose; SQL separately requires current canonical customer linkage.
    purpose:"clubs-customer" as const});
}

/** The production route supplies the separately admitted narrow TEST writer pool. */
export function createMemberNativeBookingHandler(dependencies: Readonly<{
  query: MemberNativeBookingQuery;
  resolveActor?: typeof resolveMemberNativeBookingActor;
}>) {
  return async (request: NextRequest) => {
    const security = validateClubsMemberMutationRequest(request);
    if (!security.allowed) return reply({status:"denied",reason:security.reason},403);
    const key = request.headers.get("idempotency-key") ?? "";
    if (!/^[A-Za-z0-9][A-Za-z0-9:_.-]{15,199}$/.test(key)) return reply({status:"validation_error"},400);
    const length = Number(request.headers.get("content-length") ?? 0);
    if (!Number.isFinite(length) || length > 4096) return reply({status:"validation_error"},400);
    const raw = await request.text();
    if (Buffer.byteLength(raw,"utf8") > 4096) return reply({status:"validation_error"},400);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return reply({status:"validation_error"},400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({status:"validation_error"},400);
    const value = body as Record<string,unknown>;
    const fields = Object.keys(value).sort().join(",");
    if ((value.type !== "issue_test_hold" || fields !== "inventoryKey,type" || typeof value.inventoryKey !== "string") &&
        (value.type !== "prepare_hold_bound_cart" || fields !== "holdReference,type" || typeof value.holdReference !== "string")) {
      // Browser account/person, issuer/subject, seller/channel, amounts and role fields are never admitted.
      return reply({status:"validation_error"},400);
    }
    let actor: MemberNativeBookingActor | null;
    try { actor = await (dependencies.resolveActor ?? resolveMemberNativeBookingActor)(request); }
    catch { return reply({status:"temporarily_unavailable"},503); }
    if (!actor) return reply({status:"signed_out"},401);
    try {
      if (value.type === "issue_test_hold") {
        const hold = await issueOwnMemberTestHold(dependencies.query,actor,{inventoryKey:value.inventoryKey as string,idempotencyKey:key});
        return reply({status:hold.holdState==="held"?"hold_issued":"hold_expired",hold},200);
      }
      const cart = await prepareOwnMemberHoldBoundCart(dependencies.query,actor,{holdReference:value.holdReference as string,idempotencyKey:key});
      // Raw variant IDs, provider/session credentials and seller/channel authority remain server-side.
      return reply({status:"cart_prepared",cart:{cartId:cart.cartId,providerState:cart.providerState,
        currency:cart.currency,unitAmountMinor:cart.unitAmountMinor,
        bookingConfirmed:false,liveMoneyAllowed:false}},200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "MEMBER_BOOKING_RUNTIME_NOT_ADMITTED") return reply({status:"temporarily_unavailable"},503);
      if (message === "MEMBER_NATIVE_INPUT_INVALID" || message === "MEMBER_NATIVE_ACTOR_INVALID" ||
          message === "MEMBER_NATIVE_IDEMPOTENCY_INVALID") return reply({status:"validation_error"},400);
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === "42501") return reply({status:"denied"},403);
      if (code === "23505") return reply({status:"conflict"},409);
      // Never declare a failed/unknown native write safe to repeat with a new key.
      return reply({status:"unknown_outcome",recovery:"retry_same_key",bookingConfirmed:false,liveMoneyAllowed:false},503);
    }
  };
}
