import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ModulePage } from "@/components/module-page";
import { HolidayManagerWorkbench } from "@/components/clubs/holiday-manager-workbench";
import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import { getHolidayManagerReadModel } from "@/db/clubs-holiday-manager-repository";
import { resolveTenantSession, tenantSessionCookieName } from "@/db/identity-tenant-lifecycle-repository";
import { getWorkbenchSavedViewsReadModel } from "@/db/workbench-saved-views-read-model-repository";
import { auth0 } from "@/lib/auth0";
import { getInitialCrmOperationalPayload, getInitialProjectWorkItemsPayload } from "@/lib/performance/initial-workspace-payloads";
import { portalBridgeRoleCookieName } from "@/lib/portal-access-bridge";
import { moduleByKey, modules } from "@/lib/modules";
import { roleByKey } from "@/lib/roles";
import type { CrmPayload } from "@/components/crm-operational-workspace-page";
import type { ProjectWorkItemsPayload } from "@/components/project-work-item-slice-page";
import type { WorkbenchModuleKey } from "@/lib/workbench-saved-views";

const serverInitializedWorkbenchModules = new Set<WorkbenchModuleKey>(["erp", "files", "analytics", "loans", "operations"]);

async function getInitialWorkbenchViews(moduleKey: string, role: string) {
  if (!serverInitializedWorkbenchModules.has(moduleKey as WorkbenchModuleKey)) return null;

  const readModel = await getWorkbenchSavedViewsReadModel({
    role: roleByKey(role).key,
    moduleKey: moduleKey as WorkbenchModuleKey,
  });

  return {
    status: readModel.access.allowed ? readModel.source.queryStatus : "forbidden",
    readModel,
  };
}

async function getInitialWorkspacePayloads({
  moduleKey,
  role,
  view,
  record,
}: {
  moduleKey: string;
  role: string;
  view?: string;
  record?: string;
}): Promise<{ initialCrm: CrmPayload | null; initialProject: ProjectWorkItemsPayload | null }> {
  if (moduleKey === "crm" && view !== "deals" && record !== "deals" && view !== "candidate-offer") {
    return {
      initialCrm: await getInitialCrmOperationalPayload(roleByKey(role).key, view, record),
      initialProject: null,
    };
  }

  if (moduleKey === "project" && view !== "real-estate-decision") {
    return {
      initialCrm: null,
      initialProject: await getInitialProjectWorkItemsPayload(roleByKey(role).key),
    };
  }

  return { initialCrm: null, initialProject: null };
}

export const dynamicParams = false;
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateStaticParams() {
  return modules.map((module) => ({ module: module.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: moduleKey } = await params;
  const moduleDefinition = moduleByKey(moduleKey);
  return {
    title: moduleDefinition ? `${moduleDefinition.label} | CRAYS Platform` : "CRAYS Platform",
  };
}

export default async function PlatformModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { module: moduleKey } = await params;
  const query = await searchParams;
  const moduleDefinition = moduleByKey(moduleKey);
  const view = typeof query.view === "string" ? query.view : undefined;
  const record = typeof query.record === "string" ? query.record : undefined;
  const cookieStore = await cookies();
  const cookieRole = cookieStore.get(portalBridgeRoleCookieName)?.value;

  if (!moduleDefinition) notFound();
  if (moduleDefinition.key === "operations") {
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
    if (tenantSession?.roleKey === "holiday-manager") {
      const readModel = await getHolidayManagerReadModel(
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
      );
      return <HolidayManagerWorkbench readModel={readModel} />;
    }
  }

  const role = roleByKey(cookieRole ?? "guest").key;

  const [initialViews, initialWorkspacePayloads] = await Promise.all([
    getInitialWorkbenchViews(moduleDefinition.key, role),
    getInitialWorkspacePayloads({ moduleKey: moduleDefinition.key, role, view, record }),
  ]);

  return (
    <ModulePage
      module={moduleDefinition}
      view={view}
      record={record}
      role={role}
      initialViews={initialViews}
      initialCrm={initialWorkspacePayloads.initialCrm}
      initialProject={initialWorkspacePayloads.initialProject}
    />
  );
}
