import { createHash } from "node:crypto";

export const AMBASSADOR_BACKOFFICE_CONTRACT_VERSION =
  "cclub.ambassador-backoffice-readiness.v1" as const;

export type AuthorityReceipt = Readonly<{
  receiptId: string;
  receiptVersion: number;
  receiptHash: string;
}>;

export type AmbassadorBackofficeReadinessInput = Readonly<{
  projectId: string;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  ambassadorPartyId: string;
  ambassadorRelationshipVersion: number;
  applicationState: "SUBMITTED";
  sponsorConfirmationState: "CONFIRMED";
  managementApprovalState: "APPROVED";
  admissionState: "ADMITTED";
  roleAssignmentState: "ACTIVE";
  agreementState: "SIGNED";
  taxAndWithholdingState: "VERIFIED";
  stripeRecipientState: "ACTIVE";
  erpPayeeState: "ACTIVE";
  paperworkDossierState: "COMPLETE";
  identityReceipt: AuthorityReceipt;
  applicationReceipt: AuthorityReceipt;
  sponsorConfirmationReceipt: AuthorityReceipt;
  managementApprovalReceipt: AuthorityReceipt;
  admissionReceipt: AuthorityReceipt;
  roleAssignmentReceipt: AuthorityReceipt;
  agreementReceipt: AuthorityReceipt;
  taxAndWithholdingReceipt: AuthorityReceipt;
  stripeAccountBindingReceipt: AuthorityReceipt;
  stripeRequirementsReceipt: AuthorityReceipt;
  erpPayeeBindingReceipt: AuthorityReceipt;
  erpCompanyId: string;
  erpSupplierId: string;
  erpCostCenterId: string;
  erpPayableAccountId: string;
  erpCommissionItemId: string;
  erpTaxTemplateId: string;
  erpCurrency: string;
  nextcloudDossierId: string;
  paperworkManifestReceipt: AuthorityReceipt;
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const CURRENCY = /^[A-Z]{3}$/;

function digest(value: object): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function exactId(value: string): boolean {
  return typeof value === "string" && ID.test(value.trim());
}

function validReceipt(value: AuthorityReceipt): boolean {
  return (
    exactId(value.receiptId) &&
    Number.isSafeInteger(value.receiptVersion) &&
    value.receiptVersion > 0 &&
    HASH.test(value.receiptHash)
  );
}

export function resolveAmbassadorBackofficeReadiness(
  input: AmbassadorBackofficeReadinessInput,
) {
  const blockers: string[] = [];
  if (
    !exactId(input.projectId) ||
    !exactId(input.partnerTenantId) ||
    !exactId(input.operatorLegalEntityId) ||
    !exactId(input.ambassadorPartyId) ||
    !Number.isSafeInteger(input.ambassadorRelationshipVersion) ||
    input.ambassadorRelationshipVersion < 1
  ) {
    blockers.push("CANONICAL_SCOPE_INCOMPLETE");
  }

  const stateChecks: ReadonlyArray<readonly [boolean, string]> = [
    [input.applicationState === "SUBMITTED", "APPLICATION_NOT_SUBMITTED"],
    [
      input.sponsorConfirmationState === "CONFIRMED",
      "SPONSOR_CONFIRMATION_MISSING",
    ],
    [
      input.managementApprovalState === "APPROVED",
      "MANAGEMENT_APPROVAL_MISSING",
    ],
    [input.admissionState === "ADMITTED", "ADMISSION_MISSING"],
    [input.roleAssignmentState === "ACTIVE", "ROLE_ASSIGNMENT_INACTIVE"],
    [input.agreementState === "SIGNED", "AGREEMENT_NOT_SIGNED"],
    [
      input.taxAndWithholdingState === "VERIFIED",
      "TAX_AND_WITHHOLDING_UNVERIFIED",
    ],
    [input.stripeRecipientState === "ACTIVE", "STRIPE_RECIPIENT_NOT_ACTIVE"],
    [input.erpPayeeState === "ACTIVE", "ERP_PAYEE_NOT_ACTIVE"],
    [
      input.paperworkDossierState === "COMPLETE",
      "PAPERWORK_DOSSIER_INCOMPLETE",
    ],
  ];
  stateChecks.forEach(([passed, code]) => {
    if (!passed) blockers.push(code);
  });

  const receipts = [
    input.identityReceipt,
    input.applicationReceipt,
    input.sponsorConfirmationReceipt,
    input.managementApprovalReceipt,
    input.admissionReceipt,
    input.roleAssignmentReceipt,
    input.agreementReceipt,
    input.taxAndWithholdingReceipt,
    input.stripeAccountBindingReceipt,
    input.stripeRequirementsReceipt,
    input.erpPayeeBindingReceipt,
    input.paperworkManifestReceipt,
  ];
  if (!receipts.every(validReceipt)) {
    blockers.push("AUTHORITY_RECEIPT_INVALID");
  }

  if (
    ![
      input.erpCompanyId,
      input.erpSupplierId,
      input.erpCostCenterId,
      input.erpPayableAccountId,
      input.erpCommissionItemId,
      input.erpTaxTemplateId,
      input.nextcloudDossierId,
    ].every(exactId) ||
    !CURRENCY.test(input.erpCurrency)
  ) {
    blockers.push("ERP_OR_DOCUMENT_BINDING_INCOMPLETE");
  }

  const uniqueBlockers = [...new Set(blockers)].sort();
  const body = {
    contractVersion: AMBASSADOR_BACKOFFICE_CONTRACT_VERSION,
    projectId: input.projectId,
    partnerTenantId: input.partnerTenantId,
    operatorLegalEntityId: input.operatorLegalEntityId,
    ambassadorPartyId: input.ambassadorPartyId,
    ambassadorRelationshipVersion:
      input.ambassadorRelationshipVersion,
    state:
      uniqueBlockers.length === 0
        ? ("READY_FOR_ATTRIBUTION_AND_AUTOMATIC_SETTLEMENT" as const)
        : ("BLOCKED" as const),
    blockers: Object.freeze(uniqueBlockers),
    erpBinding: Object.freeze({
      companyId: input.erpCompanyId,
      supplierId: input.erpSupplierId,
      costCenterId: input.erpCostCenterId,
      payableAccountId: input.erpPayableAccountId,
      commissionItemId: input.erpCommissionItemId,
      taxTemplateId: input.erpTaxTemplateId,
      currency: input.erpCurrency,
      bindingReceiptHash: input.erpPayeeBindingReceipt.receiptHash,
    }),
    paperworkBinding: Object.freeze({
      nextcloudDossierId: input.nextcloudDossierId,
      manifestReceiptHash: input.paperworkManifestReceipt.receiptHash,
    }),
    stripeBindingReceiptHash:
      input.stripeAccountBindingReceipt.receiptHash,
    visibleScopes: Object.freeze([
      "OWN_PROFILE_AND_REQUIREMENTS",
      "OWN_AGREEMENTS_AND_PAPERWORK",
      "OWN_ATTRIBUTED_BOOKINGS",
      "OWN_ALLOCATIONS_TRANSFERS_AND_REVERSALS",
      "OWN_INVOICES_STATEMENTS_AND_TAX_DOCUMENTS",
      "OWN_EXCEPTIONS_AND_REQUIRED_ACTIONS",
    ]),
    foreignAmbassadorAccess: false as const,
    foreignProjectAccess: false as const,
    performsProviderMutation: false as const,
  };
  return Object.freeze({ ...body, readinessReceiptHash: digest(body) });
}

export type AmbassadorBackofficeReadiness = ReturnType<
  typeof resolveAmbassadorBackofficeReadiness
>;

