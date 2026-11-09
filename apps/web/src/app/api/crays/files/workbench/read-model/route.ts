import { getLatestPersistedSourceSnapshot } from "@/db/source-sync-repository";
import type { RoleKey } from "@/lib/roles";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { attachLiveSourceSections, getSourceFaithfulWorkbench } from "@/lib/source-faithful-product-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const internalSectionKeys = new Set([
  "packages",
  "documents",
  "version-history",
  "approvals",
  "grants",
  "redactions",
  "release-preflights",
  "room-access",
  "package-tasks",
]);

const financeSectionKeys = new Set(["packages", "documents", "approvals", "grants", "redactions", "release-preflights", "room-access", "package-tasks"]);
const dealSectionKeys = new Set(["packages", "documents", "version-history", "approvals", "grants", "redactions", "release-preflights", "room-access", "package-tasks"]);
const scopedSectionKeys = new Set(["packages", "documents", "grants", "release-preflights"]);

function sectionKeysForRole(role: RoleKey) {
  if (["admin", "crays-management", "reviewer"].includes(role)) return internalSectionKeys;
  if (role === "finance" || role === "bank-partner") return financeSectionKeys;
  if (role === "deal-manager" || role === "expansion-manager") return dealSectionKeys;
  if (["franchise-candidate", "franchise-partner", "landlord", "vendor"].includes(role)) return scopedSectionKeys;
  return dealSectionKeys;
}

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const role = context.role;
  const baseReadModel = getSourceFaithfulWorkbench("files", role);

  return Response.json(
    !baseReadModel.access.allowed
      ? {
          status: "forbidden",
          serverAuthority: context.authoritySource,
          tenantId: context.tenantId,
          role,
          reviewPersona: context.reviewPersona,
          readModel: baseReadModel,
          liveBusinessRecordReturned: false,
          note: "Files workbench access is forbidden for this role.",
        }
      : await filesPayload(role, baseReadModel, context),
    { status: baseReadModel.access.allowed ? 200 : 403 },
  );
}

async function filesPayload(
  role: RoleKey,
  baseReadModel: ReturnType<typeof getSourceFaithfulWorkbench>,
  context: Awaited<ReturnType<typeof resolveCraysRouteContext>>,
) {
  const snapshot = await getLatestPersistedSourceSnapshot({
    moduleKey: "files",
    sectionKeys: sectionKeysForRole(role),
  });

  if (snapshot.status === "ready") {
    return {
      status: "ready",
      sourceRecordStatus: "snapshot_ready",
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role,
      reviewPersona: context.reviewPersona,
      readModel: attachLiveSourceSections(baseReadModel, {
        source: { connection: snapshot.sourceConnection, owner: "Core Sync" },
        generatedAt: snapshot.generatedAt ?? new Date().toISOString(),
        sections: snapshot.sections,
        capabilities: {
          ...snapshot.capabilities,
          uploads: false,
          privatePreviews: false,
          roomRelease: false,
          externalSending: false,
        },
        diagnostics: snapshot.diagnostics,
      }),
      liveBusinessRecordReturned: true,
      note:
        "Files workbench is using synchronized Core document-package source records. Uploads, previews, room release and external sending remain gated.",
    };
  }

  return {
    status: "ready",
    sourceRecordStatus: snapshot.status,
    serverAuthority: context.authoritySource,
    tenantId: context.tenantId,
    role,
    reviewPersona: context.reviewPersona,
    readModel: baseReadModel,
    liveBusinessRecordReturned: false,
    note:
      snapshot.status === "not_found"
        ? "Files workbench is available, but no synchronized Files source snapshot exists yet."
        : "Files workbench is available, but the Files source snapshot is unavailable right now.",
  };
}
