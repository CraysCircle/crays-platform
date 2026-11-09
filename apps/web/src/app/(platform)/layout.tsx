import { Suspense } from "react";
import { cookies } from "next/headers";
import { PlatformShell } from "@/components/platform-shell";
import { getCraysWorkspaceSessionDto } from "@/lib/workspace/server-session";
import { CraysWorkspaceProvider } from "@/providers/crays-workspace-provider";

function workspaceSessionRequestFromCookies(
  values: readonly Readonly<{ name: string; value: string }>[],
) {
  const cookie = values
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
  return new Request("http://crays.local/api/crays/workspace/session", {
    headers: cookie ? { cookie } : undefined,
  });
}

export default async function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialSession = await getCraysWorkspaceSessionDto(
    workspaceSessionRequestFromCookies(cookieStore.getAll()),
  );
  const initialRole = initialSession.status === "ready"
    ? initialSession.authority.role
    : undefined;

  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <CraysWorkspaceProvider initialSession={initialSession}>
        <PlatformShell initialRole={initialRole}>{children}</PlatformShell>
      </CraysWorkspaceProvider>
    </Suspense>
  );
}
