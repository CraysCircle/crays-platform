import { getControlledBetaCurrentReadModel } from "./controlled-beta-current-read-model-repository";
import { getProductionReliabilityReadiness } from "./production-reliability-readiness-repository";
import { getSourceMetadataDiscoveryReadModel } from "./source-metadata-discovery-read-model-repository";
import { getTenantFieldScopeReadiness } from "./tenant-field-scope-readiness-repository";
import { postBlock110PerformancePhase } from "@/lib/phase3/performance-optimization-plan";
import { visualA11yQualityGates, visualA11yRouteSpecs } from "@/lib/phase3/visual-a11y-regression";
import type { RoleKey } from "@/lib/roles";

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];

export async function getBlock110ControlledBetaReadiness(role: RoleKey) {
  const allowed = allowedRoles.includes(role);
  if (!allowed) {
    return {
      access: {
        role,
        allowed: false,
        reason: "Block 110 final readiness is internal-only.",
      },
      status: "forbidden" as const,
      releaseDecision: {
        internalControlledBetaReady: false,
        externalBetaApproved: false,
        productionDeployApproved: false,
        releaseApproved: false,
      },
    };
  }

  const [beta, production, discovery, scope] = await Promise.all([
    getControlledBetaCurrentReadModel(role),
    getProductionReliabilityReadiness(role),
    getSourceMetadataDiscoveryReadModel(role),
    getTenantFieldScopeReadiness(role),
  ]);
  const sourceGatesClosed = discovery.boundaries.sourceWritesEnabled === false && discovery.boundaries.targetApplyEnabled === false;
  const releaseGatesClosed = beta.decision.externalBetaApproved === false && beta.decision.productionDeployApproved === false && beta.decision.releaseApproved === false;
  const scopeReady = scope.status === "ready";
  const dataReady = production.status === "ready";
  const internalControlledBetaReady = Boolean(beta.decision.internalBetaRehearsalReady && sourceGatesClosed && releaseGatesClosed && scopeReady && dataReady);

  return {
    access: {
      role,
      allowed: true,
      reason: "Role can inspect final Block 110 readiness evidence.",
    },
    status: internalControlledBetaReady ? "internal_controlled_beta_ready" as const : "attention" as const,
    releaseDecision: {
      internalControlledBetaReady,
      externalBetaApproved: false,
      productionDeployApproved: false,
      releaseApproved: false,
      bankSendApproved: false,
      paymentApproved: false,
      applyApproved: false,
    },
    summary: {
      betaEvidenceSections: beta.summary.evidenceSections,
      betaBlockers: beta.summary.blockers,
      openSideEffectGates: beta.summary.openSideEffectGates,
      productionDataReady: dataReady,
      discoverySystems: discovery.summary.systems,
      resourcesRequiringDiscovery: discovery.summary.resourcesRequiringDiscovery,
      scopeStatus: scope.status,
      visualA11yRoutes: visualA11yRouteSpecs.length,
      performancePhaseQueued: true,
    },
    gates: {
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      destructiveApplyEnabled: false,
      uploadsEnabled: false,
      privatePreviewEnabled: false,
      externalSendingEnabled: false,
      bankSendEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      publicReleaseEnabled: false,
      candidateReleaseEnabled: false,
      productionDeployEnabled: false,
      liveAiEnabled: false,
    },
    checks: {
      production,
      discoverySummary: discovery.summary,
      tenantFieldScopeSummary: scope.summary,
      visualA11yQualityGates,
    },
    nextPhase: postBlock110PerformancePhase,
    note:
      "Block 110 closes Phase 3 as internal controlled-beta readiness evidence only. External beta, production deploy and side-effect gates remain closed; performance optimization is queued as the next major phase.",
  };
}
