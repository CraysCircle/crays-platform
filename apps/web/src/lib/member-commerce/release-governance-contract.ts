import { createHash } from "node:crypto";

export const RELEASE_GOVERNANCE_VERSION = "ncrv2-176-180.v1" as const;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const freezeStrings = (values: readonly string[]) => Object.freeze(values.map((value) => value.trim()));
const hasNonEmptyValues = (values: readonly string[]) => values.length > 0 && values.every((value) => value.trim().length > 0);

export const operationalRunbookOwners = Object.freeze({
  backup_restore: "CRAYS Platform Operations Owner",
  upgrade: "CRAYS Collaboration Platform Owner",
  incident: "CRAYS Security and Incident Owner",
  queue_repair: "CRAYS Integration Operations Owner",
  reconciliation: "CRAYS Finance and Payments Owner",
  access_review: "CRAYS Identity and Security Owner",
  offboarding: "CRAYS Privacy and Partner Operations Owner",
});

type Admission = Readonly<{
  phase16Passed: boolean;
  licensingApproved: boolean;
  migrationReconciled: boolean;
  rolloutApproved: boolean;
  runbooksAccepted: boolean;
}>;

export function evaluateNonProductionReleaseCandidate(input: Admission & Readonly<{
  imageDigests: readonly string[];
  migrationHashes: readonly string[];
  configHashes: readonly string[];
  sbomSha256?: string;
  evidenceManifestSha256?: string;
}>) {
  const imageDigests = freezeStrings(input.imageDigests);
  const migrationHashes = freezeStrings(input.migrationHashes);
  const configHashes = freezeStrings(input.configHashes);
  const sbomSha256 = input.sbomSha256?.trim();
  const evidenceManifestSha256 = input.evidenceManifestSha256?.trim();
  const blockers = Object.freeze([
    ...(input.phase16Passed === true ? [] : ["PHASE16_NOT_PASSED"]),
    ...(input.licensingApproved === true ? [] : ["LICENSING_NOT_APPROVED"]),
    ...(input.migrationReconciled === true ? [] : ["MIGRATION_NOT_RECONCILED"]),
    ...(input.rolloutApproved === true ? [] : ["ROLLOUT_NOT_APPROVED"]),
    ...(input.runbooksAccepted === true ? [] : ["RUNBOOKS_NOT_ACCEPTED"]),
    ...(hasNonEmptyValues(imageDigests) ? [] : ["IMAGE_DIGESTS_MISSING"]),
    ...(hasNonEmptyValues(migrationHashes) ? [] : ["MIGRATION_HASHES_MISSING"]),
    ...(hasNonEmptyValues(configHashes) ? [] : ["CONFIG_HASHES_MISSING"]),
    ...(/^[a-f0-9]{64}$/.test(input.sbomSha256 ?? "") ? [] : ["SBOM_HASH_MISSING"]),
    ...(/^[a-f0-9]{64}$/.test(input.evidenceManifestSha256 ?? "") ? [] : ["EVIDENCE_MANIFEST_HASH_MISSING"]),
  ]);
  const body = Object.freeze({
    contractVersion: RELEASE_GOVERNANCE_VERSION,
    imageDigests,
    migrationHashes,
    configHashes,
    sbomSha256,
    evidenceManifestSha256,
    blockers,
    immutable: blockers.length === 0,
    productionAuthorized: false as const,
  });
  return Object.freeze({ ...body, candidateSha256: digest(body) });
}

export function evaluateCutoverRehearsal(input: Readonly<{
  immutableCandidate: boolean;
  restorePassed: boolean;
  ssoPassed: boolean;
  journeysPassed: boolean;
  monitoringPassed: boolean;
  rollbackPassed: boolean;
}>) {
  const checks = Object.freeze([
    Object.freeze({ name: "immutableCandidate", passed: input.immutableCandidate === true }),
    Object.freeze({ name: "restorePassed", passed: input.restorePassed === true }),
    Object.freeze({ name: "ssoPassed", passed: input.ssoPassed === true }),
    Object.freeze({ name: "journeysPassed", passed: input.journeysPassed === true }),
    Object.freeze({ name: "monitoringPassed", passed: input.monitoringPassed === true }),
    Object.freeze({ name: "rollbackPassed", passed: input.rollbackPassed === true }),
  ]);
  return Object.freeze({ checks, passed: checks.every((check) => check.passed), productionMutation: false as const });
}

export function evaluateProductionDecision(input: Readonly<{
  exactMutationBundleSha256?: string;
  explicitNonTransferableApprovalReceiptId?: string;
  finalReconciliationPassed: boolean;
}>) {
  const exactMutationBundleSha256 = input.exactMutationBundleSha256?.trim();
  const explicitNonTransferableApprovalReceiptId = input.explicitNonTransferableApprovalReceiptId?.trim();
  const bundleFixed = /^[a-f0-9]{64}$/.test(exactMutationBundleSha256 ?? "");
  const approvalPresent = Boolean(explicitNonTransferableApprovalReceiptId);
  const finalReconciliationPassed = input.finalReconciliationPassed === true;
  const mayChangeProduction = bundleFixed && approvalPresent && finalReconciliationPassed;
  const body = {
    contractVersion: RELEASE_GOVERNANCE_VERSION,
    exactMutationBundleSha256,
    explicitNonTransferableApprovalReceiptId,
    bundleFixed,
    approvalPresent,
    finalReconciliationPassed,
    mayChangeProduction,
    decision: mayChangeProduction ? "APPROVED_EXACT_BUNDLE" : "DENIED_NO_EXPLICIT_COMPLETE_APPROVAL",
  };
  return Object.freeze({ ...body, decisionSha256: digest(body) });
}
