import { getSourceMetadataDiscoveryReadModel } from "@/db/source-metadata-discovery-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const model = await getSourceMetadataDiscoveryReadModel(context.role);

  if (!model.access.allowed) {
    return Response.json(
      {
        status: "release_blocked",
        role: context.role,
        tenantId: context.tenantId,
        serverAuthority: context.authoritySource,
        access: model.access,
        boundaries: model.boundaries,
        note: model.note,
      },
      { status: 423 },
    );
  }

  return Response.json({
    status: model.summary.metadataVerified === model.summary.systems ? "metadata_verified" : "discovery_required",
    block: [92, 96, 98],
    role: context.role,
    tenantId: context.tenantId,
    serverAuthority: context.authoritySource,
    ...model,
  });
}
