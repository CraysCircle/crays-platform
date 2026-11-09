import { getLatestPersistedSourceSnapshot, persistSourceSnapshot } from "@/db/source-sync-repository";
import type { RoleKey } from "@/lib/roles";
import { getBackOfficeOperationalSourceSlice } from "@/lib/back-office-operational-source-adapter";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { attachLiveSourceSections, getSourceFaithfulWorkbench } from "@/lib/source-faithful-product-contract";
import type { SourceWorkbenchSection } from "@/lib/source-faithful-product-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const financeSectionKeys = new Set([
  "accounts",
  "cost-centers",
  "budgets",
  "invoices",
  "payment-exceptions",
  "customers",
  "suppliers",
  "items",
  "purchase-orders",
  "material-requests",
  "projects",
  "tasks",
  "employees",
  "departments",
  "job-applicants",
  "training-events",
  "assets",
  "maintenance",
  "issues",
  "quality-inspections",
  "communications",
]);

const dealSectionKeys = new Set([
  "budgets",
  "invoices",
  "payment-exceptions",
  "customers",
  "suppliers",
  "items",
  "purchase-orders",
  "material-requests",
  "projects",
  "tasks",
  "assets",
  "maintenance",
  "issues",
  "quality-inspections",
  "communications",
]);

const studioSectionKeys = new Set([
  "budgets",
  "invoices",
  "payment-exceptions",
  "customers",
  "suppliers",
  "items",
  "purchase-orders",
  "material-requests",
  "projects",
  "tasks",
  "employees",
  "departments",
  "job-applicants",
  "training-events",
  "assets",
  "maintenance",
  "issues",
  "quality-inspections",
  "communications",
]);

function sectionKeysForRole(role: RoleKey) {
  if (["admin", "crays-management", "reviewer"].includes(role)) return null;
  if (role === "finance") return financeSectionKeys;
  if (role === "deal-manager") return dealSectionKeys;
  if (role === "franchise-partner" || role === "studio-manager") return studioSectionKeys;
  return financeSectionKeys;
}

function ownerRoleForSnapshot(role: RoleKey): RoleKey {
  if (role === "franchise-partner" || role === "studio-manager") return role;
  if (role === "deal-manager") return "deal-manager";
  if (role === "crays-management" || role === "admin" || role === "reviewer") return role;
  return "finance";
}

function scopedSectionsForRole(role: RoleKey, sections: SourceWorkbenchSection[]) {
  const keys = sectionKeysForRole(role);
  if (!keys) return sections;
  return sections.filter((section) => keys.has(section.key));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const role = context.role;
  const baseReadModel = getSourceFaithfulWorkbench("erp", role);
  if (!baseReadModel.access.allowed) {
    return Response.json(
      {
        status: "forbidden",
        serverAuthority: context.authoritySource,
        tenantId: context.tenantId,
        role,
        reviewPersona: context.reviewPersona,
        readModel: baseReadModel,
        liveBusinessRecordReturned: false,
        note: "ERP workbench access is forbidden for this role.",
      },
      { status: 403 },
    );
  }

  const source = await getBackOfficeOperationalSourceSlice({ limit: Number(url.searchParams.get("limit") ?? 35) });
  const scopedSource = {
    ...source,
    sections: scopedSectionsForRole(role, source.sections),
  };
  let sourceRecordStatus = source.source.connection === "unavailable" ? "source_unavailable" : "ready";
  let readModel = source.source.connection === "unavailable" ? baseReadModel : attachLiveSourceSections(baseReadModel, scopedSource);
  const coreSync =
    source.source.connection === "unavailable"
      ? null
      : await persistSourceSnapshot({
          moduleKey: "erp",
          role,
          ownerRole: ownerRoleForSnapshot(role),
          sourceConnection: source.source.connection,
          generatedAt: source.generatedAt,
          sections: scopedSource.sections,
          capabilities: source.capabilities,
        });
  let note =
    source.source.connection === "unavailable"
      ? "ERP workbench is available, but the back-office source is unavailable right now."
      : "ERP workbench is backed by role-scoped back-office source records; exports, payments and bank sends remain gated.";

  if (source.source.connection === "unavailable") {
    const snapshot = await getLatestPersistedSourceSnapshot({
      moduleKey: "erp",
      sectionKeys: sectionKeysForRole(role),
    });

    if (snapshot.status === "ready") {
      readModel = attachLiveSourceSections(baseReadModel, {
        source: { connection: snapshot.sourceConnection, owner: "Core Sync" },
        generatedAt: snapshot.generatedAt ?? new Date().toISOString(),
        sections: snapshot.sections,
        capabilities: snapshot.capabilities,
        diagnostics: snapshot.diagnostics,
      });
      sourceRecordStatus = "snapshot_ready";
      note =
        "ERP workbench is using the latest synchronized Core source snapshot because the live back-office source is unavailable right now.";
    } else {
      note =
        snapshot.status === "not_found"
          ? "ERP workbench is available, but no synchronized back-office source snapshot exists yet."
          : "ERP workbench is available, but the back-office source and Core snapshot fallback are unavailable right now.";
    }
  }

  return Response.json(
    {
      status: "ready",
      sourceRecordStatus,
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role,
      reviewPersona: context.reviewPersona,
      readModel,
      coreSync,
      liveBusinessRecordReturned: sourceRecordStatus !== "source_unavailable",
      note,
    },
    { status: 200 },
  );
}
