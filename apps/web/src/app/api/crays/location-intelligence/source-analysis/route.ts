import type { LocationTravelMode } from "@/lib/location-intelligence-source-adapter";
import { runLocationCatchmentAnalysis } from "@/lib/location-intelligence-source-adapter";
import { localEngineErrorHttpStatus, safeLocalEngineError } from "@/lib/local-engine-runtime";
import type { RoleKey } from "@/lib/roles";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];
const travelModes: LocationTravelMode[] = ["walk", "bike", "car", "transit"];

function forbidden(role: RoleKey) {
  return Response.json(
    {
      status: "forbidden",
      role,
      reason: "Location Intelligence analysis requires an internal site, deal or review role.",
      secretsReturned: false,
      privateKeysReturned: false,
    },
    { status: 403 },
  );
}

function readNumber(value: string | null) {
  if (value === null) return Number.NaN;
  return Number(value);
}

function readMinutes(value: string | null) {
  return (value || "10,20,30")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));
}

function readTravelMode(value: string | null): LocationTravelMode {
  return travelModes.includes(value as LocationTravelMode) ? (value as LocationTravelMode) : "walk";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  if (!allowedRoles.includes(role)) return forbidden(role);

  try {
    const readModel = await runLocationCatchmentAnalysis({
      lat: readNumber(url.searchParams.get("lat")),
      lng: readNumber(url.searchParams.get("lng")),
      id: url.searchParams.get("siteId")?.trim() || "candidate-site",
      mode: readTravelMode(url.searchParams.get("mode")),
      minutes: readMinutes(url.searchParams.get("minutes")),
      includeGeometry: url.searchParams.get("includeGeometry") === "true",
    });

    return Response.json({
      status: "ready",
      role,
      readModel,
      boundaries: {
        liveReadsEnabled: true,
        sourceWritesEnabled: false,
        externalSendingEnabled: false,
        sourceUiEmbedded: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
    });
  } catch (error) {
    return Response.json(
      {
        status: "source_unavailable",
        role,
        error: safeLocalEngineError(error),
        boundaries: {
          liveReadsEnabled: true,
          sourceWritesEnabled: false,
          externalSendingEnabled: false,
          sourceUiEmbedded: false,
          secretsReturned: false,
          privateKeysReturned: false,
        },
      },
      { status: localEngineErrorHttpStatus(error) },
    );
  }
}
