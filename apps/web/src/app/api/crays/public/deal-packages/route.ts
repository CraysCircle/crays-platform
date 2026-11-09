import { getPublicDealPackageReadModel } from "@/db/public-deal-package-read-model-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const audience = url.searchParams.get("audience") === "candidate" ? "candidate" : "guest";
  const readModel = await getPublicDealPackageReadModel(audience);

  return Response.json({
    status: readModel.status,
    readModel,
    note: "Public deal packages are versioned CRAYS Public DTOs only. Static productive offer fallbacks are not used.",
  });
}
