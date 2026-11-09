import "server-only";
import { isHospitalityPropertyId } from "@/lib/member-commerce/clubs-hospitality-content-contract";
import { readPublicHospitalityContentEnvelope } from "@/graphql/clubs/public-hospitality-content-runtime";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await context.params;
  const headers = { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" };
  if (!isHospitalityPropertyId(propertyId)) return Response.json({ status: "not_found", code: "HOSPITALITY_PROPERTY_NOT_FOUND" }, { status: 404, headers });
  const envelope = await readPublicHospitalityContentEnvelope({ propertyId });
  return Response.json(envelope, { status: envelope.status === "ready" ? 200 : 503, headers });
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
