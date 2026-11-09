"use client";

import { useSearchParams } from "next/navigation";
import { roleByKey } from "@/lib/roles";
import { BankPackageWorkflowPanel } from "./bank-package-workflow-panel";
import { CaseWorkspaceContextPanel } from "./case-workspace-context-panel";

const internalCaseRoles = new Set(["finance", "deal-manager", "reviewer", "crays-management", "admin"]);

export function BankReadinessLoansPage({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
      {internalCaseRoles.has(role) ? <CaseWorkspaceContextPanel moduleKey="loans" /> : null}
      <BankPackageWorkflowPanel role={role} />
    </div>
  );
}
