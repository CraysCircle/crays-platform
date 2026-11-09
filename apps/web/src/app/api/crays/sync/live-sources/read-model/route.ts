import { persistSourceSnapshot, type SourceSyncModule } from "@/db/source-sync-repository";
import { getBackOfficeOperationalSourceSlice } from "@/lib/back-office-operational-source-adapter";
import { getCrmOperationalSourceSlice } from "@/lib/crm-operational-source-adapter";
import { safeLocalEngineError } from "@/lib/local-engine-runtime";
import { getLendingSourceReadSlice } from "@/lib/loans-operational-source-adapter";
import { safeSourceError } from "@/lib/operational-source-client";
import { getProjectOperationalSourceSlice } from "@/lib/project-operational-source-adapter";
import type { RoleKey } from "@/lib/roles";
import type { SourceWorkbenchSection } from "@/lib/source-faithful-product-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "finance", "deal-manager", "expansion-manager"];
const moduleKeys: SourceSyncModule[] = ["crm", "erp", "project", "loans"];

type SourceSlice = {
  source: { connection: string; owner: string };
  generatedAt: string;
  sections: SourceWorkbenchSection[];
  capabilities: Record<string, unknown>;
  summary?: Record<string, number>;
};

function forbidden(role: RoleKey) {
  return Response.json(
    {
      status: "forbidden",
      role,
      reason: "Live source synchronization requires an internal operating role.",
      boundaries: closedBoundaries(false),
    },
    { status: 403 },
  );
}

function closedBoundaries(coreWritesEnabled: boolean) {
  return {
    coreWritesEnabled,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    toolApplyEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    financePostingEnabled: false,
    accountingExportEnabled: false,
    externalSendingEnabled: false,
    releaseActionsEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function requestedModules(raw: string | null) {
  if (!raw) return moduleKeys;
  const requested = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is SourceSyncModule => moduleKeys.includes(item as SourceSyncModule));
  return requested.length ? requested : moduleKeys;
}

async function readSource(moduleKey: SourceSyncModule, limit: number): Promise<SourceSlice> {
  if (moduleKey === "crm") return getCrmOperationalSourceSlice({ limit });
  if (moduleKey === "erp") return getBackOfficeOperationalSourceSlice({ limit });
  if (moduleKey === "project") return getProjectOperationalSourceSlice({ limit });
  return getLendingSourceReadSlice(limit);
}

function safeModuleError(error: unknown) {
  const sourceError = safeSourceError(error);
  if (sourceError.code !== "SOURCE_UNAVAILABLE") return sourceError;
  const localError = safeLocalEngineError(error);
  if (localError.code !== "LOCAL_SOURCE_UNAVAILABLE") return localError;
  return { code: "SOURCE_UNAVAILABLE", message: "The operational source is unavailable." };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  if (!allowedRoles.includes(role)) return forbidden(role);

  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? 20), 50));
  const modules = requestedModules(url.searchParams.get("modules"));
  const results = [];

  for (const moduleKey of modules) {
    try {
      const source = await readSource(moduleKey, limit);
      if (source.source.connection === "unavailable") {
        results.push({
          moduleKey,
          sourceRecordStatus: "source_unavailable",
          source: source.source,
          summary: source.summary ?? {},
          coreSync: null,
        });
        continue;
      }

      const coreSync = await persistSourceSnapshot({
        moduleKey,
        role,
        ownerRole: moduleKey === "erp" || moduleKey === "loans" ? "finance" : "admin",
        sourceConnection: source.source.connection,
        generatedAt: source.generatedAt,
        sections: source.sections,
        capabilities: source.capabilities,
      });

      results.push({
        moduleKey,
        sourceRecordStatus: "ready",
        source: source.source,
        generatedAt: source.generatedAt,
        summary: source.summary ?? Object.fromEntries(source.sections.map((section) => [section.key, section.count])),
        coreSync,
      });
    } catch (error) {
      results.push({
        moduleKey,
        sourceRecordStatus: "source_unavailable",
        error: safeModuleError(error),
        coreSync: null,
      });
    }
  }

  const persisted = results.filter((result) => result.coreSync?.status === "persisted").length;
  const unavailable = results.filter((result) => result.sourceRecordStatus !== "ready").length;
  const coreUnavailable = results.filter((result) => result.coreSync?.status === "core_unavailable").length;

  return Response.json({
    status: unavailable ? "partial" : coreUnavailable ? "core_partial" : "ready",
    role,
    modules: results,
    summary: {
      requested: modules.length,
      sourceReady: results.length - unavailable,
      corePersisted: persisted,
      coreUnavailable,
    },
    boundaries: closedBoundaries(true),
    note: "Live source records were read through CRAYS adapters and mapped into CRAYS Core where available. Source writes, sync apply, tool apply, finance posting, bank send, payment, external sending and release remain closed.",
  });
}
