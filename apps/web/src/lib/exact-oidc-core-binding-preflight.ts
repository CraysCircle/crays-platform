import { createHash } from "node:crypto";
import { exactOidcIdentity, type ExactOidcIdentity } from "@/lib/exact-oidc-identity";

const SHA256 = /^[a-f0-9]{64}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{2,255}$/;
const CONNECTION = /^[a-z0-9][a-z0-9._-]{1,79}$/;
const CANONICAL_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export const EXACT_OIDC_BINDING_HASH_SCHEMA = "ncrv2-040.exact-oidc-core-binding.v2" as const;

export type ExactOidcSessionAuthority = Readonly<{
  identity: ExactOidcIdentity;
  auth0TenantId: string;
  connectionKey: string;
  clientIdSha256: string;
  provenance: "validated_id_token_plus_server_client_configuration";
}>;

export type ExactOidcBindingSnapshot = Readonly<{
  bindingId: string;
  bindingVersion: number;
  bindingSha256: string;
  issuer: string;
  issuerSha256: string;
  subject: string;
  providerKey: string;
  identitySha256: string;
  auth0TenantId: string;
  connectionKey: string;
  clientIdSha256: string;
  accountId: string;
  canonicalPersonId: string;
  personVersion: number;
  canonicalOrganizationId: string;
  relationshipId: string;
  relationshipVersion: number;
  craysTenantId: string;
  roleAssignmentId: string;
  roleContextId: string;
  roleContextVersion: number;
  effectiveRole: string;
  purpose: string;
  verticalRoot: "coffee" | "retail" | "gym" | "clubs";
  partnerTenantId: string;
  partnerTenantVersion: number;
  operatorLegalEntityId: string;
  operatorLegalEntityVersion: number;
  storeId: string;
  storeVersion: number;
  storeAssignmentId: string;
  storeAssignmentVersion: number;
  securityPolicyVersion: string;
  nextcloudProviderInstanceId: string;
  nextcloudOrganizationScopeId: string;
  nextcloudPrincipalBindingId: string;
  nextcloudPrincipalBindingVersion: number;
  nextcloudInternalUidSha256: string;
  state: "REVIEW" | "ACTIVE" | "REVOKED" | "SUPERSEDED";
  validFrom: string;
  validUntil: string | null;
}>;

export type ExactOidcBindingRead = Readonly<{
  databaseNow: string;
  rows: readonly ExactOidcBindingSnapshot[];
}>;

export type ExactOidcBindingExpectation = Readonly<{
  craysTenantId: string;
  canonicalOrganizationId: string;
  roleAssignmentId: string;
  roleContextId: string;
  roleContextVersion: number;
  effectiveRole: string;
  purpose: string;
  verticalRoot: "coffee" | "retail" | "gym" | "clubs";
  partnerTenantId: string;
  partnerTenantVersion: number;
  operatorLegalEntityId: string;
  operatorLegalEntityVersion: number;
  storeId: string;
  storeVersion: number;
  storeAssignmentId: string;
  storeAssignmentVersion: number;
  securityPolicyVersion: string;
  nextcloudProviderInstanceId: string;
  nextcloudOrganizationScopeId: string;
}>;

export type ExactOidcBindingDecision = Readonly<{
  status: "READY_FOR_SERVER_ALIGNMENT" | "DENIED";
  reason:
    | "EXACT_BINDING_MATCHED"
    | "INVALID_SERVER_EXPECTATION"
    | "INVALID_SESSION_PROVENANCE"
    | "UNTRUSTED_REQUEST_HOST"
    | "MISSING_CURRENT_CORE_AUTHORITY"
    | "AMBIGUOUS_CURRENT_CORE_AUTHORITY"
    | "CURRENT_CORE_AUTHORITY_UNAVAILABLE"
    | "MISSING_EXACT_BINDING"
    | "AMBIGUOUS_EXACT_BINDING"
    | "BINDING_INTEGRITY_MISMATCH"
    | "BINDING_SCOPE_MISMATCH"
    | "BINDING_NOT_ACTIVE"
    | "BINDING_NOT_CURRENT"
    | "BINDING_READ_UNAVAILABLE";
  authority?: Readonly<{
    bindingId: string;
    bindingVersion: number;
    bindingSha256: string;
    browserProjectionAllowed: false;
  }>;
}>;

type Loader = (
  session: ExactOidcSessionAuthority,
  expected: ExactOidcBindingExpectation,
) => Promise<ExactOidcBindingRead>;

function id(value: unknown): value is string {
  return typeof value === "string" && IDENTIFIER.test(value);
}

function positiveVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function canonicalUtc(value: unknown): value is string {
  if (typeof value !== "string" || !CANONICAL_UTC.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString() === value;
}

export function exactOidcSessionAuthority(input: Readonly<{
  validatedIssuer: unknown;
  validatedSubject: unknown;
  serverConfiguredClientId: unknown;
}>): ExactOidcSessionAuthority {
  const identity = exactOidcIdentity(input.validatedIssuer, input.validatedSubject);
  if (typeof input.serverConfiguredClientId !== "string" || !input.serverConfiguredClientId.trim()) {
    throw new Error("OIDC_SERVER_CLIENT_ID_REQUIRED");
  }
  const separator = identity.subject.indexOf("|");
  const connectionKey = separator > 0 ? identity.subject.slice(0, separator) : "";
  if (!CONNECTION.test(connectionKey)) throw new Error("OIDC_CONNECTION_PROVENANCE_INVALID");
  return Object.freeze({
    identity,
    auth0TenantId: `auth0-tenant:${identity.issuerSha256}`,
    connectionKey,
    clientIdSha256: createHash("sha256").update(input.serverConfiguredClientId, "utf8").digest("hex"),
    provenance: "validated_id_token_plus_server_client_configuration",
  });
}

function validExpectation(value: ExactOidcBindingExpectation): boolean {
  return [
    value.craysTenantId, value.canonicalOrganizationId, value.roleAssignmentId,
    value.roleContextId, value.effectiveRole, value.purpose, value.partnerTenantId,
    value.operatorLegalEntityId, value.storeId, value.storeAssignmentId,
    value.securityPolicyVersion, value.nextcloudProviderInstanceId,
    value.nextcloudOrganizationScopeId,
  ].every(id)
    && positiveVersion(value.roleContextVersion)
    && positiveVersion(value.partnerTenantVersion)
    && positiveVersion(value.operatorLegalEntityVersion)
    && positiveVersion(value.storeVersion)
    && positiveVersion(value.storeAssignmentVersion)
    && ["coffee", "retail", "gym", "clubs"].includes(value.verticalRoot);
}

function validSnapshot(row: ExactOidcBindingSnapshot): boolean {
  return [
    row.bindingId, row.auth0TenantId, row.connectionKey, row.accountId,
    row.canonicalPersonId, row.canonicalOrganizationId, row.relationshipId,
    row.craysTenantId, row.roleAssignmentId, row.roleContextId, row.effectiveRole,
    row.purpose, row.partnerTenantId, row.operatorLegalEntityId, row.storeId,
    row.storeAssignmentId, row.securityPolicyVersion, row.nextcloudProviderInstanceId,
    row.nextcloudOrganizationScopeId, row.nextcloudPrincipalBindingId,
  ].every(id)
    && positiveVersion(row.bindingVersion)
    && positiveVersion(row.personVersion)
    && positiveVersion(row.relationshipVersion)
    && positiveVersion(row.roleContextVersion)
    && positiveVersion(row.partnerTenantVersion)
    && positiveVersion(row.operatorLegalEntityVersion)
    && positiveVersion(row.storeVersion)
    && positiveVersion(row.storeAssignmentVersion)
    && positiveVersion(row.nextcloudPrincipalBindingVersion)
    && [row.bindingSha256, row.issuerSha256, row.identitySha256, row.clientIdSha256, row.nextcloudInternalUidSha256].every((value) => SHA256.test(value))
    && ["coffee", "retail", "gym", "clubs"].includes(row.verticalRoot)
    && ["REVIEW", "ACTIVE", "REVOKED", "SUPERSEDED"].includes(row.state)
    && canonicalUtc(row.validFrom)
    && (row.validUntil === null || canonicalUtc(row.validUntil))
    && (row.validUntil === null || Date.parse(row.validUntil) > Date.parse(row.validFrom));
}

export function exactOidcBindingSnapshotSha256(row: Omit<ExactOidcBindingSnapshot, "bindingSha256">): string {
  return createHash("sha256").update(JSON.stringify([
    EXACT_OIDC_BINDING_HASH_SCHEMA,
    row.bindingId, row.bindingVersion, row.issuer, row.issuerSha256, row.subject,
    row.providerKey, row.identitySha256, row.auth0TenantId, row.connectionKey,
    row.clientIdSha256, row.accountId, row.canonicalPersonId, row.personVersion,
    row.canonicalOrganizationId, row.relationshipId, row.relationshipVersion,
    row.craysTenantId, row.roleAssignmentId, row.roleContextId,
    row.roleContextVersion, row.effectiveRole, row.purpose, row.verticalRoot,
    row.partnerTenantId, row.partnerTenantVersion, row.operatorLegalEntityId,
    row.operatorLegalEntityVersion, row.storeId, row.storeVersion,
    row.storeAssignmentId, row.storeAssignmentVersion, row.securityPolicyVersion,
    row.nextcloudProviderInstanceId, row.nextcloudOrganizationScopeId,
    row.nextcloudPrincipalBindingId, row.nextcloudPrincipalBindingVersion,
    row.nextcloudInternalUidSha256, row.state, row.validFrom, row.validUntil,
  ]), "utf8").digest("hex");
}

const deny = (reason: ExactOidcBindingDecision["reason"]): ExactOidcBindingDecision => Object.freeze({ status: "DENIED", reason });

export async function preflightExactOidcCoreBinding(input: Readonly<{
  validatedIssuer: unknown;
  validatedSubject: unknown;
  serverConfiguredClientId: unknown;
  expected: ExactOidcBindingExpectation;
  load: Loader;
}>): Promise<ExactOidcBindingDecision> {
  if (!validExpectation(input.expected)) return deny("INVALID_SERVER_EXPECTATION");
  let session: ExactOidcSessionAuthority;
  try {
    session = exactOidcSessionAuthority(input);
  } catch {
    return deny("INVALID_SESSION_PROVENANCE");
  }

  let read: ExactOidcBindingRead;
  try {
    read = await input.load(session, input.expected);
  } catch {
    return deny("BINDING_READ_UNAVAILABLE");
  }
  if (!read || !Array.isArray(read.rows) || !canonicalUtc(read.databaseNow)) return deny("BINDING_INTEGRITY_MISMATCH");
  if (read.rows.length === 0) return deny("MISSING_EXACT_BINDING");
  if (read.rows.length !== 1) return deny("AMBIGUOUS_EXACT_BINDING");
  const row = read.rows[0];
  if (!validSnapshot(row)) return deny("BINDING_INTEGRITY_MISMATCH");
  const { bindingSha256, ...snapshot } = row;
  if (bindingSha256 !== exactOidcBindingSnapshotSha256(snapshot)) return deny("BINDING_INTEGRITY_MISMATCH");
  if (
    row.issuer !== session.identity.issuer
    || row.issuerSha256 !== session.identity.issuerSha256
    || row.subject !== session.identity.subject
    || row.providerKey !== session.identity.providerKey
    || row.identitySha256 !== session.identity.identitySha256
    || row.auth0TenantId !== session.auth0TenantId
    || row.connectionKey !== session.connectionKey
    || row.clientIdSha256 !== session.clientIdSha256
  ) return deny("INVALID_SESSION_PROVENANCE");

  const expected = input.expected;
  if (
    row.craysTenantId !== expected.craysTenantId
    || row.canonicalOrganizationId !== expected.canonicalOrganizationId
    || row.roleAssignmentId !== expected.roleAssignmentId
    || row.roleContextId !== expected.roleContextId
    || row.roleContextVersion !== expected.roleContextVersion
    || row.effectiveRole !== expected.effectiveRole
    || row.purpose !== expected.purpose
    || row.verticalRoot !== expected.verticalRoot
    || row.partnerTenantId !== expected.partnerTenantId
    || row.partnerTenantVersion !== expected.partnerTenantVersion
    || row.operatorLegalEntityId !== expected.operatorLegalEntityId
    || row.operatorLegalEntityVersion !== expected.operatorLegalEntityVersion
    || row.storeId !== expected.storeId
    || row.storeVersion !== expected.storeVersion
    || row.storeAssignmentId !== expected.storeAssignmentId
    || row.storeAssignmentVersion !== expected.storeAssignmentVersion
    || row.securityPolicyVersion !== expected.securityPolicyVersion
    || row.nextcloudProviderInstanceId !== expected.nextcloudProviderInstanceId
    || row.nextcloudOrganizationScopeId !== expected.nextcloudOrganizationScopeId
  ) return deny("BINDING_SCOPE_MISMATCH");
  if (row.state !== "ACTIVE") return deny("BINDING_NOT_ACTIVE");
  const databaseNow = Date.parse(read.databaseNow);
  const validFrom = Date.parse(row.validFrom);
  const validUntil = row.validUntil === null ? null : Date.parse(row.validUntil);
  if (validFrom > databaseNow || (validUntil !== null && validUntil <= databaseNow)) return deny("BINDING_NOT_CURRENT");

  return Object.freeze({
    status: "READY_FOR_SERVER_ALIGNMENT",
    reason: "EXACT_BINDING_MATCHED",
    authority: Object.freeze({
      bindingId: row.bindingId,
      bindingVersion: row.bindingVersion,
      bindingSha256,
      browserProjectionAllowed: false,
    }),
  });
}
