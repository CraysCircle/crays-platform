import { getCorePgPool } from "./client";
import { getNativePersonalRuntimePool } from "./native-personal-runtime-pool";
import type { QueryResultRow } from "pg";

type Reader = <T extends QueryResultRow>(sql: string, values: unknown[]) => Promise<{rows: T[]}>;
async function nativeOwnRead<T extends QueryResultRow>(accountId: string, sql: string, values: unknown[]) {
  if (!accountId || accountId.length > 256 || /[\x00-\x20\x7f]/.test(accountId)) throw new Error("NATIVE_CONTACT_ACCOUNT_REQUIRED");
  const client = await getNativePersonalRuntimePool().connect();
  let active = false, discard = false;
  try {
    await client.query("begin read only"); active = true;
    await client.query("set local crays.app_role='core_service'; set local statement_timeout='5000ms'");
    await client.query("select set_config('crays.native_personal_account',$1,true)", [accountId]);
    const result = await client.query<T>(sql, values);
    await client.query("commit"); active = false;
    return result;
  } catch (error) {
    if (active) await client.query("rollback").catch(() => { discard = true; });
    throw error;
  } finally { client.release(discard || active); }
}

export type CurrentAccountEmailVerification = {
  receipt_id: string;
  account_id: string;
  contact_revision: string;
  verified_at: Date;
};

/** Read inside the existing Core authority boundary, never by client-selected
 * account/issuer. This read grants no identity or access and writes no proof.
 * The eventual writer must consume the server-owned provider proof and both
 * account/link authorization in the same transaction. Generic verified=true,
 * migration, contact edits or a receipt from another identity are insufficient.
 */
export async function getCurrentAccountEmailVerification(
  accountId: string, configuredIssuer: string,
): Promise<CurrentAccountEmailVerification | null> {
  return readCurrentEmailVerification(accountId, configuredIssuer, (sql, values) => getCorePgPool().query(sql, values));
}

/** Native exact-Core mapping is established by the fixed caller first. The
 * native reader uses its admitted, non-bypass own-account role, never the broad
 * web/business pool. It reads existing proof; it does not issue one. */
export async function getNativeCurrentAccountEmailVerification(accountId: string, configuredIssuer: string) {
  return readCurrentEmailVerification(accountId, configuredIssuer, (sql, values) => nativeOwnRead(accountId, sql, values));
}
async function readCurrentEmailVerification(accountId: string, configuredIssuer: string, query: Reader): Promise<CurrentAccountEmailVerification | null> {
  const issuer = new URL(configuredIssuer);
  if (issuer.protocol !== "https:" || issuer.username || issuer.password || issuer.port ||
      issuer.pathname !== "/" || issuer.search || issuer.hash) throw new Error("INVALID_EMAIL_PROOF_ISSUER");
  const result = await query<CurrentAccountEmailVerification>(`
    select v.receipt_id, v.account_id, v.contact_revision::text, v.verified_at
    from crays_core.crays_accounts a
    join crays_core.account_email_verifications v
      on v.account_id = a.account_id and v.contact_revision = a.primary_contact_revision
      and v.contact_address = a.primary_contact
    join crays_core.auth_identities i on i.identity_id = v.auth_identity_id
      and i.account_id = a.account_id and i.provider_key = 'auth0'
      and i.provider_subject = v.provider_subject
      and i.verified = true
    where a.account_id = $1 and a.primary_contact_type = 'contact'
      and v.provider_issuer = $2 and v.proof_method = 'auth0-userinfo-verified-email'
      and v.revoked_at is null and a.status in ('active', 'review')
  `, [accountId, issuer.href]);
  return result.rows.length === 1 ? result.rows[0] : null;
}

/** Current revision for an ALREADY exact-Core-mapped native account. The original
 * V1 identity wire bundle intentionally has no revision field. Never invent one
 * or use proof existence as the revision: new accounts need email setup too.
 * Match the original Core contact snapshot so another local context or a
 * concurrent contact edit cannot supply a revision for different contact data.
 * Actual deployment still requires this reader's original Core role admission.
 */
export async function getCurrentAccountContactRevision(accountId: string, primaryContact: string | null, primaryContactType: string | null): Promise<string | null> {
  return readCurrentContactRevision(accountId, primaryContact, primaryContactType, (sql, values) => getCorePgPool().query(sql, values));
}
export async function getNativeCurrentAccountContactRevision(accountId: string, primaryContact: string | null, primaryContactType: string | null): Promise<string | null> {
  return readCurrentContactRevision(accountId, primaryContact, primaryContactType, (sql, values) => nativeOwnRead(accountId, sql, values));
}
async function readCurrentContactRevision(accountId: string, primaryContact: string | null, primaryContactType: string | null, query: Reader): Promise<string | null> {
  if (!accountId || !["contact", "nip05", "npub"].includes(primaryContactType ?? "")) return null;
  const result=await query<{revision:string}>(
    `select primary_contact_revision::text revision from crays_core.crays_accounts
     where account_id=$1 and status='active' and primary_contact is not distinct from $2::text and primary_contact_type=$3`,
    [accountId,primaryContact,primaryContactType]);
  const revision=result.rows.length===1?result.rows[0].revision:null;
  return typeof revision==="string" && /^[1-9][0-9]{0,18}$/.test(revision)?revision:null;
}
