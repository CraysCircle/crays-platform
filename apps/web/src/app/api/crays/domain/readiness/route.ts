import { getCoreDomainReadiness } from "@/db/core-domain-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const readiness = await getCoreDomainReadiness();

  return Response.json({
    status: readiness.configured && readiness.schemaReady ? "ready" : "incomplete",
    readiness,
    liveRecordsReturned: false,
    security: {
      secretsReturned: false,
      privateKeysReturned: false,
    },
    note: "This endpoint checks CRAYS core domain DB readiness and row counts. It returns no live business records.",
  });
}
