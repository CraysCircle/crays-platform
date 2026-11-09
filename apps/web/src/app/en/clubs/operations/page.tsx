import type { Metadata } from "next";
import { cookies } from "next/headers";
import { HolidayManagerWorkbench } from "@/components/clubs/holiday-manager-workbench";
import { ClubsAmbassadorOperations } from "@/components/crays-clubs/operations/clubs-ambassador-operations";
import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import { getHolidayManagerReadModel } from "@/db/clubs-holiday-manager-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import { auth0 } from "@/lib/auth0";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Clubs Management | CRAYS Clubs",
  robots: { index: false, follow: false },
};

const operationsRoles = new Set(["holiday-manager", "crays-management", "admin"]);

export default async function ClubsManagementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const cookieStore = await cookies();
  const provider = await auth0.getSession().catch(() => null);
  const subject = typeof provider?.user?.sub === "string" ? provider.user.sub : null;
  const identity = subject
    ? await getIdentityBundleByProviderSubject("auth0", subject).catch(() => null)
    : null;
  const rawAccountId = identity?.account.account_id;
  const accountId = typeof rawAccountId === "string" ? rawAccountId : null;
  const tenantSession = await resolveTenantSession(
    cookieStore.get(tenantSessionCookieName)?.value,
    accountId ?? undefined,
  ).catch(() => null);
  const roleKey = tenantSession?.roleKey;
  const workbench =
    accountId &&
    tenantSession &&
    typeof roleKey === "string" &&
    operationsRoles.has(roleKey)
      ? await getHolidayManagerReadModel(
          accountId,
          tenantSession.organizationId,
          {
            search: typeof query.q === "string" ? query.q : null,
            lifecycle: typeof query.lifecycle === "string" ? query.lifecycle : null,
            recordType: typeof query.recordType === "string" ? query.recordType : null,
            viewMode: typeof query.mode === "string" ? query.mode : null,
            cursor: typeof query.cursor === "string" ? query.cursor : null,
            pageSize: typeof query.pageSize === "string" ? query.pageSize : null,
          },
          roleKey as "holiday-manager" | "crays-management" | "admin",
        )
      : null;

  return (
    <div className="space-y-6">
      {workbench ? (
        <div>
          <HolidayManagerWorkbench
            readModel={workbench}
            actorRole={roleKey as "holiday-manager" | "crays-management" | "admin"}
          />
        </div>
      ) : null}
      <ClubsAmbassadorOperations embedded={Boolean(workbench)} />
    </div>
  );
}
