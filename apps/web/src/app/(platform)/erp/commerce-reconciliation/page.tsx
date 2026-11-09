import type { Metadata } from "next";
import { Suspense } from "react";
import { CommerceReconciliationWorkbench } from
  "@/components/commerce-reconciliation-workbench";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Commerce reconciliation | CRAYS ERP",
  description:
    "Store-authorized provider acknowledgement and business reconciliation queue.",
  robots: { index: false, follow: false },
};

export default function CommerceReconciliationPage() {
  return (
    <Suspense fallback={<div className="min-h-24 rounded-[8px] border border-[var(--line)] bg-white p-5" aria-busy="true" />}>
      <CommerceReconciliationWorkbench />
    </Suspense>
  );
}
