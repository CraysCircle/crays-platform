import { createHash } from "node:crypto";

const SHA256 = /^[0-9a-f]{64}$/;
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const LOOPBACK_ORIGIN = /^http:\/\/127\.0\.0\.1:([0-9]{4,5})$/;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function requireDigest(value: string, error: string): void {
  if (!SHA256.test(value)) throw new Error(error);
}

export const REQUIRED_PROXY_TLS_PUBLICATION_PHASES = [
  "APPROVED_HOSTNAME_AND_AUTHORITY_PREFLIGHT",
  "DNS_PRECONDITION_VERIFIED",
  "LOOPBACK_UPSTREAM_HEALTH_VERIFIED",
  "PROXY_CONFIGURATION_STAGED",
  "TLS_CERTIFICATE_STAGED",
  "LOCAL_CANARY_VERIFIED",
  "PUBLICATION_VERIFICATION_PLANNED",
  "ROLLBACK_VERIFIED",
] as const;

export const REQUIRED_PROXY_TLS_VERIFICATIONS = [
  "HOSTNAME_RESOLVES_EXPECTED_TARGET",
  "TLS_CHAIN_AND_HOSTNAME_VALID",
  "PROXY_CONFIGURATION_SYNTAX_VALID",
  "LOOPBACK_UPSTREAM_HEALTHY",
  "SECURITY_HEADERS_MATCH",
  "DISALLOWED_ROUTES_DENIED",
  "ROLLBACK_RESTORES_BEFORE_STATE",
] as const;

export type ProxyTlsPublicationPhase =
  (typeof REQUIRED_PROXY_TLS_PUBLICATION_PHASES)[number];
export type ProxyTlsVerification =
  (typeof REQUIRED_PROXY_TLS_VERIFICATIONS)[number];

export interface ReverseProxyTlsPublicationPlanCore {
  schemaVersion: "crays.clubs.reverse-proxy-tls-publication-plan.v1";
  planId: string;
  targetHostname: string;
  hostnameApproved: boolean;
  hostnameApprovalReceiptSha256: string | null;
  externalPublicationAuthorized: boolean;
  externalExecutionAuthorityReceiptSha256: string | null;
  releaseCandidateSha256: string;
  targetHostRefSha256: string;
  loopbackUpstreamOrigin: string;
  routeManifestSha256: string;
  observedDnsPreconditionSha256: string;
  dnsMutationPlanned: false;
  beforeProxyConfigSha256: string;
  stagedProxyConfigSha256: string;
  beforeTlsStateSha256: string;
  stagedCertificateRequestSha256: string;
  stagedCertificateChainSha256: string;
  tlsPrivateKeyReferenceSha256: string;
  securityHeaderPolicySha256: string;
  localCanaryContractSha256: string;
  rollbackProxyConfigSha256: string;
  rollbackTlsStateSha256: string;
  phases: readonly ProxyTlsPublicationPhase[];
  verifications: readonly ProxyTlsVerification[];
  rollbackOrder: readonly ["TLS_STATE", "PROXY_CONFIG"];
}

export interface SealedReverseProxyTlsPublicationPlan
  extends ReverseProxyTlsPublicationPlanCore {
  publicationPlanSha256: string;
}

export function sealReverseProxyTlsPublicationPlan(
  input: ReverseProxyTlsPublicationPlanCore,
): Readonly<SealedReverseProxyTlsPublicationPlan> {
  if (!input.planId.trim() || !HOSTNAME.test(input.targetHostname))
    throw new Error("PROXY_TLS_PLAN_IDENTITY_INVALID");
  const originMatch = LOOPBACK_ORIGIN.exec(input.loopbackUpstreamOrigin);
  const port = originMatch ? Number(originMatch[1]) : 0;
  if (!originMatch || port < 1024 || port > 65535)
    throw new Error("PROXY_TLS_PLAN_LOOPBACK_ORIGIN_INVALID");
  for (const value of [
    input.releaseCandidateSha256,
    input.targetHostRefSha256,
    input.routeManifestSha256,
    input.observedDnsPreconditionSha256,
    input.beforeProxyConfigSha256,
    input.stagedProxyConfigSha256,
    input.beforeTlsStateSha256,
    input.stagedCertificateRequestSha256,
    input.stagedCertificateChainSha256,
    input.tlsPrivateKeyReferenceSha256,
    input.securityHeaderPolicySha256,
    input.localCanaryContractSha256,
    input.rollbackProxyConfigSha256,
    input.rollbackTlsStateSha256,
  ])
    requireDigest(value, "PROXY_TLS_PLAN_DIGEST_INVALID");
  if (input.hostnameApproved) {
    if (
      input.hostnameApprovalReceiptSha256 === null ||
      !SHA256.test(input.hostnameApprovalReceiptSha256)
    )
      throw new Error("PROXY_TLS_PLAN_HOSTNAME_APPROVAL_REQUIRED");
  } else if (input.hostnameApprovalReceiptSha256 !== null) {
    throw new Error("PROXY_TLS_PLAN_DORMANT_HOSTNAME_APPROVAL_FORBIDDEN");
  }
  if (input.externalPublicationAuthorized) {
    if (
      input.externalExecutionAuthorityReceiptSha256 === null ||
      !SHA256.test(input.externalExecutionAuthorityReceiptSha256)
    )
      throw new Error("PROXY_TLS_PLAN_EXECUTION_AUTHORITY_REQUIRED");
  } else if (input.externalExecutionAuthorityReceiptSha256 !== null) {
    throw new Error("PROXY_TLS_PLAN_DORMANT_EXECUTION_AUTHORITY_FORBIDDEN");
  }
  if (input.dnsMutationPlanned !== false)
    throw new Error("PROXY_TLS_PLAN_DNS_MUTATION_FORBIDDEN");
  if (input.beforeProxyConfigSha256 === input.stagedProxyConfigSha256)
    throw new Error("PROXY_TLS_PLAN_PROXY_NOOP_FORBIDDEN");
  if (input.beforeTlsStateSha256 === input.stagedCertificateChainSha256)
    throw new Error("PROXY_TLS_PLAN_TLS_NOOP_FORBIDDEN");
  if (
    input.rollbackProxyConfigSha256 !== input.beforeProxyConfigSha256 ||
    input.rollbackTlsStateSha256 !== input.beforeTlsStateSha256
  )
    throw new Error("PROXY_TLS_PLAN_ROLLBACK_STATE_MISMATCH");
  if (
    input.phases.join("|") !== REQUIRED_PROXY_TLS_PUBLICATION_PHASES.join("|")
  )
    throw new Error("PROXY_TLS_PLAN_PHASE_ORDER_INVALID");
  if (input.verifications.join("|") !== REQUIRED_PROXY_TLS_VERIFICATIONS.join("|"))
    throw new Error("PROXY_TLS_PLAN_VERIFICATION_SET_INVALID");
  if (input.rollbackOrder.join("|") !== "TLS_STATE|PROXY_CONFIG")
    throw new Error("PROXY_TLS_PLAN_ROLLBACK_ORDER_INVALID");

  const core = {
    ...input,
    phases: Object.freeze([...input.phases]),
    verifications: Object.freeze([...input.verifications]),
    rollbackOrder: Object.freeze([...input.rollbackOrder]) as readonly [
      "TLS_STATE",
      "PROXY_CONFIG",
    ],
  };
  return Object.freeze({ ...core, publicationPlanSha256: hash(core) });
}

export type ProxyTlsPublicationReadinessFailure =
  | "PROXY_TLS_PLAN_HASH_MISMATCH"
  | "HOSTNAME_APPROVAL_MISSING"
  | "EXTERNAL_EXECUTION_AUTHORITY_MISSING"
  | "EXTERNAL_EXECUTION_AUTHORITY_MISMATCH"
  | "TARGET_HOST_MISMATCH"
  | "DNS_PRECONDITION_MISMATCH"
  | "PROXY_BEFORE_STATE_MISMATCH"
  | "TLS_BEFORE_STATE_MISMATCH"
  | "UPSTREAM_HEALTH_RECEIPT_INVALID"
  | "PHASE_RECEIPT_ORDER_INVALID"
  | "PHASE_RECEIPT_INVALID"
  | "OFFLINE_PROXY_MUTATION_FORBIDDEN"
  | "OFFLINE_TLS_MUTATION_FORBIDDEN"
  | "OFFLINE_DNS_MUTATION_FORBIDDEN";

export interface ProxyTlsPublicationReadinessInput {
  plan: SealedReverseProxyTlsPublicationPlan;
  observedTargetHostRefSha256: string;
  observedDnsPreconditionSha256: string;
  observedProxyConfigSha256: string;
  observedTlsStateSha256: string;
  upstreamHealthReceiptSha256: string;
  observedExternalExecutionAuthorityReceiptSha256: string | null;
  phaseReceipts: readonly {
    phase: ProxyTlsPublicationPhase;
    receiptSha256: string;
  }[];
  proxyMutationPerformed: boolean;
  tlsMutationPerformed: boolean;
  dnsMutationPerformed: boolean;
}

export function assessReverseProxyTlsPublicationReadiness(
  input: ProxyTlsPublicationReadinessInput,
): Readonly<{
  planValid: boolean;
  readyForExternalPublication: boolean;
  failures: readonly ProxyTlsPublicationReadinessFailure[];
  readinessReceiptSha256: string;
}> {
  const failures: ProxyTlsPublicationReadinessFailure[] = [];
  const { publicationPlanSha256, ...core } = input.plan;
  const planValid = hash(core) === publicationPlanSha256;
  if (!planValid) failures.push("PROXY_TLS_PLAN_HASH_MISMATCH");
  if (!input.plan.hostnameApproved || input.plan.hostnameApprovalReceiptSha256 === null)
    failures.push("HOSTNAME_APPROVAL_MISSING");
  if (
    !input.plan.externalPublicationAuthorized ||
    input.plan.externalExecutionAuthorityReceiptSha256 === null
  ) {
    failures.push("EXTERNAL_EXECUTION_AUTHORITY_MISSING");
  } else if (
    input.observedExternalExecutionAuthorityReceiptSha256 !==
    input.plan.externalExecutionAuthorityReceiptSha256
  ) {
    failures.push("EXTERNAL_EXECUTION_AUTHORITY_MISMATCH");
  }
  if (input.observedTargetHostRefSha256 !== input.plan.targetHostRefSha256)
    failures.push("TARGET_HOST_MISMATCH");
  if (
    input.observedDnsPreconditionSha256 !== input.plan.observedDnsPreconditionSha256
  )
    failures.push("DNS_PRECONDITION_MISMATCH");
  if (input.observedProxyConfigSha256 !== input.plan.beforeProxyConfigSha256)
    failures.push("PROXY_BEFORE_STATE_MISMATCH");
  if (input.observedTlsStateSha256 !== input.plan.beforeTlsStateSha256)
    failures.push("TLS_BEFORE_STATE_MISMATCH");
  if (!SHA256.test(input.upstreamHealthReceiptSha256))
    failures.push("UPSTREAM_HEALTH_RECEIPT_INVALID");
  if (
    input.phaseReceipts.map((item) => item.phase).join("|") !==
    REQUIRED_PROXY_TLS_PUBLICATION_PHASES.join("|")
  )
    failures.push("PHASE_RECEIPT_ORDER_INVALID");
  if (input.phaseReceipts.some((item) => !SHA256.test(item.receiptSha256)))
    failures.push("PHASE_RECEIPT_INVALID");
  if (input.proxyMutationPerformed) failures.push("OFFLINE_PROXY_MUTATION_FORBIDDEN");
  if (input.tlsMutationPerformed) failures.push("OFFLINE_TLS_MUTATION_FORBIDDEN");
  if (input.dnsMutationPerformed) failures.push("OFFLINE_DNS_MUTATION_FORBIDDEN");
  const receiptCore = {
    publicationPlanSha256,
    observedTargetHostRefSha256: input.observedTargetHostRefSha256,
    phaseReceipts: input.phaseReceipts,
    failures: [...failures].sort(),
  };
  return Object.freeze({
    planValid,
    readyForExternalPublication: failures.length === 0,
    failures: Object.freeze(failures),
    readinessReceiptSha256: hash(receiptCore),
  });
}

export function verifySealedReverseProxyTlsPublicationPlan(
  plan: SealedReverseProxyTlsPublicationPlan,
): boolean {
  const { publicationPlanSha256, ...core } = plan;
  return hash(core) === publicationPlanSha256;
}
