import { getEvidencePackagesReadModel } from "./evidence-packages-read-model-repository";
import type { RoleKey } from "@/lib/roles";

export async function getEvidenceVaultReadModel(role: RoleKey) {
  const evidence = await getEvidencePackagesReadModel(role);
  return {
    access: {
      role,
      allowed: evidence.access.allowed,
      reason: evidence.access.reason,
      canStageReview: evidence.access.canStageReview,
      canViewInternalRedactions: evidence.access.canViewInternalRedactions,
    },
    status: evidence.queryStatus === "schema_ready" ? "ready" : evidence.queryStatus,
    summary: {
      packages: evidence.summary.packages,
      evidenceItems: evidence.summary.evidenceItems,
      evidenceVersions: evidence.summary.evidenceVersions,
      redactions: evidence.summary.redactions,
      approvals: evidence.summary.approvals,
      preflights: evidence.summary.preflights,
      blockers: evidence.summary.blockers,
      missingEvidence: evidence.summary.missingEvidence,
      freshnessMinutes: evidence.summary.freshnessMinutes,
    },
    vaultGrants: evidence.packages.map((pkg) => ({
      packageId: pkg.packageId,
      label: pkg.label,
      audience: pkg.audience,
      owner: pkg.owner,
      status: pkg.status,
      completeness: pkg.completeness,
      records: pkg.records,
      blockers: pkg.blockers,
      privatePreviewEnabled: false,
      packageReleaseEnabled: false,
    })),
    boundaries: evidence.boundaries,
    actions: evidence.actions,
    note:
      "Block 99: Evidence Vault is package/metadata-first. Uploads, private previews, file-body access and package release remain gated; external stakeholders receive only scoped package metadata.",
  };
}
