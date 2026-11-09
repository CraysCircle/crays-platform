import { createHash } from "node:crypto";

export const MULTI_VERTICAL_PRODUCT_LAUNCH_VERSION = "ncrv2-159.v1" as const;

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const requiredSteps = [
  "plane_launch_project",
  "nextcloud_brief_assets",
  "governed_approval",
  "vendure_seller_channel",
  "selected_store_storefront",
  "permitted_crm_projection",
  "exact_partner_erp_projection",
] as const;

type LaunchStep = (typeof requiredSteps)[number];
type Vertical = "coffee" | "retail" | "gym" | "clubs";

export function createMultiVerticalProductLaunchJourney(
  input: Readonly<{
    launchId: string;
    vertical: Vertical;
    partnerTenantId: string;
    operatorLegalEntityId: string;
    storeId: string;
    storeOperatorAssignmentVersion: number;
    planeProjectId: string;
    nextcloudHostSessionBindingId: string;
    approvedBriefArtifactVersionId: string;
    approvedMediaDerivativeVersionId: string;
    approvalReceiptId: string;
    vendureSellerId: string;
    vendureChannelId: string;
    storefrontRouteId: string;
    crmProjectionPolicyId: string;
    erpSiteId: string;
    erpCompanyId: string;
    erpWarehouseId: string;
    stepReceipts: Partial<Record<LaunchStep, string>>;
    phase12Passed: boolean;
    idempotencyKey: string;
  }>,
) {
  if (
    !input.launchId.trim() ||
    !input.partnerTenantId.trim() ||
    !input.operatorLegalEntityId.trim() ||
    !input.storeId.trim() ||
    !Number.isInteger(input.storeOperatorAssignmentVersion) ||
    input.storeOperatorAssignmentVersion < 1 ||
    !input.planeProjectId.trim() ||
    !input.nextcloudHostSessionBindingId.trim() ||
    !input.approvedBriefArtifactVersionId.trim() ||
    !input.approvedMediaDerivativeVersionId.trim() ||
    !input.approvalReceiptId.trim() ||
    !input.vendureSellerId.trim() ||
    !input.vendureChannelId.trim() ||
    !input.storefrontRouteId.trim() ||
    !input.crmProjectionPolicyId.trim() ||
    !input.erpSiteId.trim() ||
    !input.erpCompanyId.trim() ||
    !input.erpWarehouseId.trim() ||
    !input.idempotencyKey.trim() ||
    Object.values(input.stepReceipts).some((value) => typeof value !== "string" || !value.trim())
  ) {
    throw new Error("PRODUCT_LAUNCH_INPUT_INVALID");
  }

  const suppliedReceipts=Object.values(input.stepReceipts);
  if(new Set(suppliedReceipts).size!==suppliedReceipts.length)throw new Error("PRODUCT_LAUNCH_RECEIPT_REUSE_DENIED");

  const steps = Object.freeze(requiredSteps.map((step) => Object.freeze({
    step,
    authority:
      step === "plane_launch_project"
        ? "plane"
        : step === "nextcloud_brief_assets"
          ? "nextcloud"
          : step === "governed_approval"
            ? "crays_core"
            : step === "vendure_seller_channel" ||
                step === "selected_store_storefront"
              ? "vendure"
              : step === "permitted_crm_projection"
                ? "twenty"
                : "erpnext",
    receiptId: input.stepReceipts[step] ?? null,
    state: input.stepReceipts[step] ? "RECEIPTED" : "PENDING",
  })));

  const body = {
    contractVersion: MULTI_VERTICAL_PRODUCT_LAUNCH_VERSION,
    launchId: input.launchId,
    vertical: input.vertical,
    partnerTenantId: input.partnerTenantId,
    operatorLegalEntityId: input.operatorLegalEntityId,
    storeId: input.storeId,
    storeOperatorAssignmentVersion: input.storeOperatorAssignmentVersion,
    planeProjectId: input.planeProjectId,
    nextcloudHostSessionBindingId: input.nextcloudHostSessionBindingId,
    approvedBriefArtifactVersionId: input.approvedBriefArtifactVersionId,
    approvedMediaDerivativeVersionId: input.approvedMediaDerivativeVersionId,
    approvalReceiptId: input.approvalReceiptId,
    vendureSellerId: input.vendureSellerId,
    vendureChannelId: input.vendureChannelId,
    storefrontRouteId: input.storefrontRouteId,
    crmProjectionPolicyId: input.crmProjectionPolicyId,
    erpSiteId: input.erpSiteId,
    erpCompanyId: input.erpCompanyId,
    erpWarehouseId: input.erpWarehouseId,
    steps,
    state: !input.phase12Passed
      ? "BLOCKED_BY_PHASE12"
      : steps.every((step) => step.state === "RECEIPTED")
        ? "READY_FOR_RECONCILIATION"
        : "IN_PROGRESS",
    craysIsSeller: false as const,
    browserProviderTargetAllowed: false as const,
    defaultSellerFallbackAllowed: false as const,
    idempotencyKey: input.idempotencyKey,
  };

  return Object.freeze({ ...body, journeySha256: digest(body) });
}

export function authorizeMultiVerticalProductLaunchJourney(
  journey: ReturnType<typeof createMultiVerticalProductLaunchJourney>,
  viewer: Readonly<{
    vertical: Vertical;
    partnerTenantId: string;
    operatorLegalEntityId: string;
    storeId: string;
  }>,
) {
  if (
    viewer.vertical !== journey.vertical ||
    viewer.partnerTenantId !== journey.partnerTenantId ||
    viewer.operatorLegalEntityId !== journey.operatorLegalEntityId ||
    viewer.storeId !== journey.storeId
  ) {
    throw new Error("PRODUCT_LAUNCH_NOT_FOUND_OR_DENIED");
  }
  return Object.freeze({ ...journey, authorized: true as const });
}
