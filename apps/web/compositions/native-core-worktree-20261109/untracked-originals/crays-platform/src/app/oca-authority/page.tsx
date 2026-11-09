"use client";
import { OcaAuthorityPermissionLens } from "@/components/oca-authority-permission-lens";

export default function OcaAuthorityDiagnosticsPage() {
  return <main className="min-h-screen bg-[var(--background)] p-4 sm:p-6"><div className="mx-auto max-w-[1440px] space-y-5"><header><p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">CRAYS AI Authority Diagnostics</p><h1 className="mt-1 text-2xl font-semibold">Workload and delegated actor authority</h1><p className="mt-2 max-w-3xl text-sm">Canonical Permission Lens, preflight, append-only command receipts and reconciliation. OpenClaw remains a bounded GraphQL workload client.</p></header><OcaAuthorityPermissionLens /></div></main>;
}
