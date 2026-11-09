import { Suspense } from "react";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { PlatformShell } from "@/components/platform-shell";
import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import { auth0 } from "@/lib/auth0";
import { clubsUtilityMetadata } from "@/lib/clubs/seo";
import { getCraysWorkspaceSessionDto } from "@/lib/workspace/server-session";
import { CraysWorkspaceProvider } from "@/providers/crays-workspace-provider";

export const metadata: Metadata = clubsUtilityMetadata("en");

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

export default async function ClubsOperationsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const [workspaceSession, providerSession] = await Promise.all([
    getCraysWorkspaceSessionDto(
      workspaceSessionRequestFromCookies(cookieStore.getAll()),
    ),
    auth0.getSession().catch(() => null),
  ]);
  const subject =
    typeof providerSession?.user?.sub === "string"
      ? providerSession.user.sub
      : null;
  const identity = subject
    ? await getIdentityBundleByProviderSubject("auth0", subject).catch(() => null)
    : null;
  const accountId =
    typeof identity?.account.account_id === "string"
      ? identity.account.account_id
      : null;
  const tenantSession = await resolveTenantSession(
    cookieStore.get(tenantSessionCookieName)?.value,
    accountId ?? undefined,
  ).catch(() => null);
  const clubsRole = tenantSession?.roleKey;
  const initialRole =
    clubsRole === "holiday-manager" ||
    clubsRole === "crays-management" ||
    clubsRole === "admin"
      ? clubsRole
      : workspaceSession.status === "ready"
        ? workspaceSession.authority.role
        : undefined;

  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <CraysWorkspaceProvider initialSession={workspaceSession}>
        <PlatformShell initialRole={initialRole}>{children}</PlatformShell>
      </CraysWorkspaceProvider>
    </Suspense>
  );
}
