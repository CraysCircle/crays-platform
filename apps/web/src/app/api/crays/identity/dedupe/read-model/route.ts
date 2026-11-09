import { getCanonicalIdentityDedupeReadModel } from "@/db/canonical-identity-dedupe-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 80);
  const model = await getCanonicalIdentityDedupeReadModel(context.role, limit);

  if (!model.access.allowed) {
    return Response.json(
      {
        status: "release_blocked",
        block: 93,
        role: context.role,
        tenantId: context.tenantId,
        serverAuthority: context.authoritySource,
        access: model.access,
        boundaries: model.boundaries,
        provenance: model.provenance,
      },
      { status: 423 },
    );
  }

  return Response.json({
    status: model.queryStatus === "schema_ready" ? "ready" : model.queryStatus,
    block: 93,
    role: context.role,
    tenantId: context.tenantId,
    serverAuthority: context.authoritySource,
    ...model,
  });
}
