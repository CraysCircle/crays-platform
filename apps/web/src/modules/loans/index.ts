import type { ModuleAdapterContract } from "../common/adapter";

export const loansAdapterContract: ModuleAdapterContract = {
  module: "loans",
  label: "Loans",
  sourceEngine: "loan-engine",
  capabilities: ["read", "write", "event", "file", "communication"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
  entities: [
    { name: "BankPackage", description: "Approved credit package assembled after CRAYS checks." },
    { name: "LoanCase", description: "Financing workflow with status, conditions and decisions." },
    { name: "Consent", description: "Permissioned data handoff state for financing partners." },
  ],
  scopes: [
    { role: "deal-manager", grants: ["loan-case:read", "loan-case:prepare"] },
    { role: "finance", grants: ["loan-case:read", "conditions:review"] },
    { role: "bank-partner", grants: ["approved-package:read", "condition:comment"] },
  ],
  integrationBoundary: "Loan data is released only after CRAYS KYC, AML and consent checks.",
};
