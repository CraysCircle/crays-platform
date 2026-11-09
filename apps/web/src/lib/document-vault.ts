import type { ModuleKey } from "./modules";
import type { RoleKey } from "./roles";

export type DocumentAccessLevel = "none" | "summary" | "read" | "upload" | "approve" | "admin";

export type DocumentGroupKey =
  | "public-franchise-proof"
  | "candidate-profile"
  | "kyc-aml"
  | "bank-package"
  | "property-lease"
  | "construction"
  | "supplier"
  | "studio-finance"
  | "tax-accounting"
  | "hr"
  | "member-contracts"
  | "support-attachments";

export type DocumentStatus = "draft" | "requested" | "submitted" | "in_review" | "approved" | "rejected" | "expired" | "archived";

export type DocumentVaultRecord = {
  id: string;
  title: string;
  group: DocumentGroupKey;
  documentType: string;
  relatedEntityType: "candidate" | "deal" | "studio" | "project" | "loan-case" | "member" | "organization";
  status: DocumentStatus;
  approvalStatus: "not_required" | "pending" | "approved" | "rejected";
  sourceModule: ModuleKey;
  requiredFor: string[];
  visibilityRoles: RoleKey[];
  version: number;
};

export type DocumentAccessRule = {
  group: DocumentGroupKey;
  label: string;
  defaultAccess: Partial<Record<RoleKey, DocumentAccessLevel>>;
  requiredChecks: string[];
};

export type DocumentVaultContract = {
  status: "contract_ready";
  liveDocumentsReturned: false;
  groups: DocumentAccessRule[];
  sampleRecords: DocumentVaultRecord[];
  guardrails: string[];
};

export const documentAccessRules: DocumentAccessRule[] = [
  {
    group: "public-franchise-proof",
    label: "Public franchise proof",
    defaultAccess: {
      guest: "read",
      "franchise-candidate": "read",
      "franchise-partner": "read",
      "deal-manager": "read",
      "crays-management": "read",
      "bank-partner": "summary",
      landlord: "summary",
    },
    requiredChecks: ["public status", "content approval", "role audience"],
  },
  {
    group: "candidate-profile",
    label: "Candidate profile",
    defaultAccess: {
      "franchise-candidate": "upload",
      "deal-manager": "approve",
      "crays-management": "read",
      finance: "summary",
      "bank-partner": "summary",
    },
    requiredChecks: ["candidate ownership", "deal scope", "release state"],
  },
  {
    group: "kyc-aml",
    label: "KYC / AML",
    defaultAccess: {
      "franchise-candidate": "upload",
      "deal-manager": "approve",
      finance: "read",
      "crays-management": "read",
      "bank-partner": "read",
    },
    requiredChecks: ["consent", "verification state", "bank package release"],
  },
  {
    group: "bank-package",
    label: "Bank package",
    defaultAccess: {
      "franchise-candidate": "read",
      "franchise-partner": "read",
      "deal-manager": "upload",
      finance: "approve",
      "crays-management": "read",
      "bank-partner": "approve",
      reviewer: "approve",
    },
    requiredChecks: ["KYC passed", "AML passed", "consent", "document completeness"],
  },
  {
    group: "property-lease",
    label: "Property / lease",
    defaultAccess: {
      "franchise-candidate": "summary",
      "franchise-partner": "read",
      "deal-manager": "upload",
      finance: "read",
      "crays-management": "read",
      "bank-partner": "read",
      landlord: "upload",
    },
    requiredChecks: ["property scope", "lease workflow state", "stakeholder relationship"],
  },
  {
    group: "construction",
    label: "Construction documents",
    defaultAccess: {
      "franchise-candidate": "summary",
      "franchise-partner": "read",
      "deal-manager": "upload",
      "crays-management": "read",
      "bank-partner": "summary",
      landlord: "summary",
      vendor: "summary",
      "studio-manager": "read",
    },
    requiredChecks: ["project scope", "supplier assignment", "handover state"],
  },
  {
    group: "supplier",
    label: "Supplier documents",
    defaultAccess: {
      "franchise-partner": "read",
      "deal-manager": "upload",
      finance: "read",
      "crays-management": "read",
      vendor: "upload",
      "studio-manager": "read",
    },
    requiredChecks: ["supplier scope", "purchase/work order", "invoice visibility"],
  },
  {
    group: "studio-finance",
    label: "Studio monthly finance",
    defaultAccess: {
      "franchise-partner": "read",
      finance: "approve",
      "crays-management": "read",
      "bank-partner": "summary",
      "studio-manager": "summary",
    },
    requiredChecks: ["studio ownership", "finance period", "partner scope"],
  },
  {
    group: "tax-accounting",
    label: "Tax / accounting exports",
    defaultAccess: {
      "franchise-partner": "read",
      finance: "upload",
      "crays-management": "read",
      "studio-manager": "summary",
    },
    requiredChecks: ["studio ownership", "advisor release", "export audit"],
  },
  {
    group: "hr",
    label: "HR documents",
    defaultAccess: {
      hr: "approve",
      "crays-management": "read",
      finance: "summary",
      "studio-manager": "summary",
    },
    requiredChecks: ["people scope", "HR permission", "private note exclusion"],
  },
  {
    group: "member-contracts",
    label: "Member contracts",
    defaultAccess: {
      "franchise-partner": "summary",
      finance: "summary",
      "crays-management": "summary",
      "studio-manager": "read",
      "gym-member": "read",
    },
    requiredChecks: ["member ownership", "studio scope", "legal basis"],
  },
  {
    group: "support-attachments",
    label: "Support attachments",
    defaultAccess: {
      "franchise-candidate": "upload",
      "franchise-partner": "read",
      "deal-manager": "read",
      finance: "summary",
      "crays-management": "read",
      "studio-manager": "read",
      "gym-member": "read",
    },
    requiredChecks: ["ticket participant", "attachment grant", "internal note exclusion"],
  },
];

export const documentVaultSampleRecords: DocumentVaultRecord[] = [
  {
    id: "doc-contract-bank-package",
    title: "Bank package checklist",
    group: "bank-package",
    documentType: "BankPackage",
    relatedEntityType: "loan-case",
    status: "in_review",
    approvalStatus: "pending",
    sourceModule: "loans",
    requiredFor: ["credit review", "payout readiness"],
    visibilityRoles: ["deal-manager", "finance", "bank-partner", "reviewer", "crays-management"],
    version: 1,
  },
  {
    id: "doc-contract-studio-finance",
    title: "Studio monthly finance pack",
    group: "studio-finance",
    documentType: "MonthlyReport",
    relatedEntityType: "studio",
    status: "submitted",
    approvalStatus: "pending",
    sourceModule: "erp",
    requiredFor: ["franchise fee basis", "partner dashboard"],
    visibilityRoles: ["franchise-partner", "finance", "crays-management"],
    version: 1,
  },
  {
    id: "doc-contract-member-attachment",
    title: "Member support attachment",
    group: "support-attachments",
    documentType: "SupportAttachment",
    relatedEntityType: "member",
    status: "submitted",
    approvalStatus: "not_required",
    sourceModule: "support",
    requiredFor: ["ticket resolution"],
    visibilityRoles: ["gym-member", "studio-manager", "reviewer"],
    version: 1,
  },
];

export const documentVaultGuardrails = [
  "Every document must be inventoried before it is exposed in CRAYS.",
  "Document visibility is role, organization, entity, workflow and explicit-grant based.",
  "Communication attachments use the same document access checks.",
  "Bank users cannot see unrelated corporate finance.",
  "Franchise partners cannot see franchisor corporate finance.",
  "Gym members never see internal franchise, banking or partner data.",
  "Every document action must create workflow and audit events before production.",
];

export function getDocumentAccessForRole(group: DocumentGroupKey, role: RoleKey): DocumentAccessLevel {
  const rule = documentAccessRules.find((entry) => entry.group === group);
  return rule?.defaultAccess[role] ?? "none";
}

export function getDocumentVaultContract(): DocumentVaultContract {
  return {
    status: "contract_ready",
    liveDocumentsReturned: false,
    groups: documentAccessRules,
    sampleRecords: documentVaultSampleRecords,
    guardrails: documentVaultGuardrails,
  };
}
