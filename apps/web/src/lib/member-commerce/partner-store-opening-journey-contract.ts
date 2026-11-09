import { createHash } from "node:crypto";

export const PARTNER_STORE_OPENING_VERSION = "ncrv2-155.v2" as const;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const required = ["plane_project","vendor_documents","room_resource_meetings","office","erp_procurement_projection"] as const;
type Step = typeof required[number];

export function createPartnerStoreOpeningJourney(input: Readonly<{
  openingCaseId: string; openingCaseVersion: number; openingHandoffReceiptId: string; openingHandoffSha256: string;
  canonicalOrganizationId: string; relationshipId: string; partnerTenantId: string; operatorLegalEntityId: string; storeId: string;
  storeOperatorAssignmentId: string; storeOperatorAssignmentVersion: number; storeReadinessScopeId: string;
  planeWorkspaceId: string; planeProjectId: string; nextcloudHostSessionBindingId: string; functionalCalendarResourceIds: readonly string[];
  erpSiteId: string; erpCompanyId: string; erpProcurementBaselineId: string; authorizedPrincipalIds: readonly string[]; vendorArtifactIds: readonly string[];
  stepReceipts: Partial<Record<Step,string>>; openingHandoffAcceptanceReceiptId?: string; idempotencyKey: string;
}>) {
  const strings = [input.openingCaseId,input.openingHandoffReceiptId,input.canonicalOrganizationId,input.relationshipId,input.partnerTenantId,input.operatorLegalEntityId,input.storeId,input.storeOperatorAssignmentId,input.storeReadinessScopeId,input.planeWorkspaceId,input.planeProjectId,input.nextcloudHostSessionBindingId,input.erpSiteId,input.erpCompanyId,input.erpProcurementBaselineId,input.idempotencyKey];
  if (strings.some(value => !value.trim()) || !Number.isSafeInteger(input.openingCaseVersion) || input.openingCaseVersion < 1 || !Number.isSafeInteger(input.storeOperatorAssignmentVersion) || input.storeOperatorAssignmentVersion < 1 || !/^[a-f0-9]{64}$/.test(input.openingHandoffSha256) || !input.functionalCalendarResourceIds.length || input.functionalCalendarResourceIds.some(value=>!value.trim()) || !input.authorizedPrincipalIds.length || input.authorizedPrincipalIds.some(value=>!value.trim()) || !input.vendorArtifactIds.length || input.vendorArtifactIds.some(value=>!value.trim())) throw new Error("STORE_OPENING_INPUT_INVALID");
  const suppliedReceipts=required.map(step=>input.stepReceipts[step]).filter((value):value is string=>value!==undefined);
  if(suppliedReceipts.some(value=>!value.trim()))throw new Error("STORE_OPENING_RECEIPT_INVALID");
  if(new Set(suppliedReceipts).size!==suppliedReceipts.length)throw new Error("STORE_OPENING_RECEIPT_REUSE_DENIED");
  if(input.openingHandoffAcceptanceReceiptId!==undefined&&!input.openingHandoffAcceptanceReceiptId.trim())throw new Error("STORE_OPENING_ACCEPTANCE_RECEIPT_INVALID");
  const steps = Object.freeze(required.map(step => ({step,provider:step === "plane_project" ? "plane" : step === "erp_procurement_projection" ? "erpnext" : step === "room_resource_meetings" ? "nextcloud_calendar_talk" : "nextcloud_files_office",receiptId:input.stepReceipts[step] ?? null,state:input.stepReceipts[step] ? "RECEIPTED" : "PENDING"})));
  const providerStepsReceipted = steps.every(step => step.state === "RECEIPTED");
  const handoffAccepted = Boolean(input.openingHandoffAcceptanceReceiptId?.trim());
  const state = providerStepsReceipted ? (handoffAccepted ? "READY_FOR_RECONCILIATION" : "AWAITING_HANDOFF_ACCEPTANCE") : "IN_PROGRESS";
  const body = {contractVersion:PARTNER_STORE_OPENING_VERSION,openingCaseId:input.openingCaseId,openingCaseVersion:input.openingCaseVersion,openingHandoffReceiptId:input.openingHandoffReceiptId,openingHandoffSha256:input.openingHandoffSha256,canonicalOrganizationId:input.canonicalOrganizationId,relationshipId:input.relationshipId,partnerTenantId:input.partnerTenantId,operatorLegalEntityId:input.operatorLegalEntityId,storeId:input.storeId,storeOperatorAssignmentId:input.storeOperatorAssignmentId,storeOperatorAssignmentVersion:input.storeOperatorAssignmentVersion,storeReadinessScopeId:input.storeReadinessScopeId,planeWorkspaceId:input.planeWorkspaceId,planeProjectId:input.planeProjectId,nextcloudHostSessionBindingId:input.nextcloudHostSessionBindingId,functionalCalendarResourceIds:Object.freeze([...new Set(input.functionalCalendarResourceIds)].sort()),erpSiteId:input.erpSiteId,erpCompanyId:input.erpCompanyId,erpProcurementBaselineId:input.erpProcurementBaselineId,authorizedPrincipalIds:Object.freeze([...new Set(input.authorizedPrincipalIds)].sort()),vendorArtifactIds:Object.freeze([...new Set(input.vendorArtifactIds)].sort()),steps,openingHandoffAcceptanceReceiptId:input.openingHandoffAcceptanceReceiptId ?? null,state,planeOwnsProjectState:true as const,erpnextOwnsProcurementTruth:true as const,createsPersonalCalendar:false as const,browserProviderTargetAllowed:false as const,idempotencyKey:input.idempotencyKey};
  return Object.freeze({...body,journeySha256:digest(body)});
}

export function authorizePartnerStoreOpeningJourney(journey: ReturnType<typeof createPartnerStoreOpeningJourney>, viewer: Readonly<{principalId:string;relationshipId:string;partnerTenantId:string;operatorLegalEntityId:string;storeId:string;storeOperatorAssignmentId:string;storeReadinessScopeId:string}>) {
  if (viewer.relationshipId !== journey.relationshipId || viewer.partnerTenantId !== journey.partnerTenantId || viewer.operatorLegalEntityId !== journey.operatorLegalEntityId || viewer.storeId !== journey.storeId || viewer.storeOperatorAssignmentId !== journey.storeOperatorAssignmentId || viewer.storeReadinessScopeId !== journey.storeReadinessScopeId || !journey.authorizedPrincipalIds.includes(viewer.principalId)) throw new Error("STORE_OPENING_NOT_FOUND_OR_DENIED");
  return Object.freeze({...journey,authorized:true as const});
}
