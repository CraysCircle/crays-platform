import { Suspense } from "react";
import { PlatformShell } from "@/components/platform-shell";
import { ProjectNativeWorkbenchPage } from "@/components/project-native-workbench-page";

export const metadata = {
  title: "Project | CRAYS",
  description: "CRAYS Project workspace.",
};

export default function InvestmentsProjectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <PlatformShell>
        <ProjectNativeWorkbenchPage />
      </PlatformShell>
    </Suspense>
  );
}
