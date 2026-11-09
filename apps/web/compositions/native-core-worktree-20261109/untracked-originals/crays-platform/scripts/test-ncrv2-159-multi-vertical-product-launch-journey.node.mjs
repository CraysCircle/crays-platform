import assert from "node:assert/strict";
import {
  authorizeMultiVerticalProductLaunchJourney,
  createMultiVerticalProductLaunchJourney,
} from "../src/lib/member-commerce/multi-vertical-product-launch-journey-contract.ts";

const base = {
  launchId: "launch-a",
  vertical: "coffee",
  partnerTenantId: "partner-a",
  operatorLegalEntityId: "legal-a",
  storeId: "store-a",
  storeOperatorAssignmentVersion: 7,
  planeProjectId: "plane-project-a",
  nextcloudHostSessionBindingId: "host-a",
  approvedBriefArtifactVersionId: "brief-v3",
  approvedMediaDerivativeVersionId: "media-v5",
  approvalReceiptId: "approval-a",
  vendureSellerId: "seller-a",
  vendureChannelId: "channel-a",
  storefrontRouteId: "storefront-a",
  crmProjectionPolicyId: "crm-policy-a",
  erpSiteId: "erp-site-a",
  erpCompanyId: "erp-company-a",
  erpWarehouseId: "erp-warehouse-a",
  stepReceipts: {},
  phase12Passed: false,
  idempotencyKey: "launch-a-v1",
};

let passed = 0;
const pass = (name, value) => {
  assert.ok(value, name);
  passed += 1;
  console.log(`PASS ${name}`);
};

const blocked = createMultiVerticalProductLaunchJourney(base);
pass("seven launch steps", blocked.steps.length === 7);
pass("open Phase-12 gate blocks launch", blocked.state === "BLOCKED_BY_PHASE12");
pass("exact Vertical retained", blocked.vertical === "coffee");
pass("exact operator and Store retained", blocked.operatorLegalEntityId === "legal-a" && blocked.storeId === "store-a");
pass("versioned Store assignment retained", blocked.storeOperatorAssignmentVersion === 7);
pass("Plane remains project authority", blocked.steps.find((step) => step.step === "plane_launch_project")?.authority === "plane");
pass("Nextcloud remains asset authority", blocked.steps.find((step) => step.step === "nextcloud_brief_assets")?.authority === "nextcloud");
pass("Vendure Seller and Channel exact", blocked.vendureSellerId === "seller-a" && blocked.vendureChannelId === "channel-a");
pass("ERP site company warehouse exact", blocked.erpSiteId === "erp-site-a" && blocked.erpCompanyId === "erp-company-a" && blocked.erpWarehouseId === "erp-warehouse-a");
pass("CRAYS is not seller", !blocked.craysIsSeller);
pass("browser target and fallback forbidden", !blocked.browserProviderTargetAllowed && !blocked.defaultSellerFallbackAllowed);

const receipts = Object.fromEntries(blocked.steps.map((step) => [step.step, `receipt-${step.step}`]));
const ready = createMultiVerticalProductLaunchJourney({ ...base, phase12Passed: true, stepReceipts: receipts });
pass("hypothetical admitted receipts require reconciliation", ready.state === "READY_FOR_RECONCILIATION");
pass("exact scope authorized", authorizeMultiVerticalProductLaunchJourney(ready, { vertical: "coffee", partnerTenantId: "partner-a", operatorLegalEntityId: "legal-a", storeId: "store-a" }).authorized);
assert.throws(() => authorizeMultiVerticalProductLaunchJourney(ready, { vertical: "retail", partnerTenantId: "partner-a", operatorLegalEntityId: "legal-a", storeId: "store-a" }), /NOT_FOUND_OR_DENIED/);
pass("cross-Vertical denied", true);
assert.throws(() => authorizeMultiVerticalProductLaunchJourney(ready, { vertical: "coffee", partnerTenantId: "partner-b", operatorLegalEntityId: "legal-a", storeId: "store-a" }), /NOT_FOUND_OR_DENIED/);
pass("cross-partner denied without existence leak", true);
assert.throws(() => authorizeMultiVerticalProductLaunchJourney(ready, { vertical: "coffee", partnerTenantId: "partner-a", operatorLegalEntityId: "legal-b", storeId: "store-a" }), /NOT_FOUND_OR_DENIED/);
pass("cross-operator denied", true);
assert.throws(() => authorizeMultiVerticalProductLaunchJourney(ready, { vertical: "coffee", partnerTenantId: "partner-a", operatorLegalEntityId: "legal-a", storeId: "store-b" }), /NOT_FOUND_OR_DENIED/);
pass("cross-Store denied", true);
pass("deterministic journey receipt", createMultiVerticalProductLaunchJourney(base).journeySha256 === blocked.journeySha256);

assert.equal(passed, 18);
console.log(`RESULT ${passed}/18`);
