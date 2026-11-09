import { NextRequest } from "next/server";
import { searchClubsPublicCatalog } from "@/db/clubs-public-catalog-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function integerParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const catalog = await searchClubsPublicCatalog({
      destination: request.nextUrl.searchParams.get("destination") ?? undefined,
      guests: integerParam(request.nextUrl.searchParams.get("guests")),
      bedrooms: integerParam(request.nextUrl.searchParams.get("bedrooms")),
      bathrooms: integerParam(request.nextUrl.searchParams.get("bathrooms")),
      minimumPriceMinor: integerParam(request.nextUrl.searchParams.get("min_price_minor")),
      maximumPriceMinor: integerParam(request.nextUrl.searchParams.get("max_price_minor")),
      limit: integerParam(request.nextUrl.searchParams.get("limit")),
      offset: integerParam(request.nextUrl.searchParams.get("offset")),
    });
    return Response.json(catalog, {
      headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json(
      {
        status: "temporarily_unavailable",
        items: [],
        authority: "crays_core",
        syntheticFallbackUsed: false,
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
