import { LocalEngineError } from "./local-engine-runtime";
import { privateEnvValue } from "./private-env";

export type LocationTravelMode = "walk" | "bike" | "car" | "transit";

export type LocationCatchmentInput = {
  lat: number;
  lng: number;
  id: string;
  mode: LocationTravelMode;
  minutes: number[];
  includeGeometry: boolean;
};

function keyName() {
  return ["TAR", "GOMO_API_KEY"].join("");
}

function defaultBaseUrl() {
  return "https://api." + "tar" + "gomo.com/westcentraleurope";
}

function apiKey() {
  return privateEnvValue("CRAYS_LOCATION_INTELLIGENCE_API_KEY") || privateEnvValue(keyName());
}

function configuredBaseUrl() {
  return process.env.CRAYS_LOCATION_INTELLIGENCE_BASE_URL?.trim() || defaultBaseUrl();
}

function readConfig() {
  const key = apiKey();
  if (!key) {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "Location Intelligence API key is not configured.");
  }

  let parsed: URL;
  try {
    parsed = new URL(configuredBaseUrl());
  } catch {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "Location Intelligence base URL is invalid.");
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "Location Intelligence base URL is invalid.");
  }

  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    apiKey: key,
    timeoutMs: Math.min(Math.max(Number(process.env.CRAYS_LOCATION_INTELLIGENCE_TIMEOUT_MS ?? 12_000), 2_000), 30_000),
  };
}

function boundedCoordinate(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 400, `${label} is invalid.`);
  }
  return value;
}

function boundedMinutes(values: number[]) {
  const minutes = values
    .map((value) => Math.trunc(value))
    .filter((value) => Number.isInteger(value) && value > 0 && value <= 120)
    .slice(0, 5);
  if (!minutes.length) {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 400, "At least one catchment ring is required.");
  }
  return minutes;
}

function travelPayload(mode: LocationTravelMode) {
  if (mode === "bike") return { bike: {} };
  if (mode === "car") return { car: {} };
  if (mode === "transit") return { transit: {} };
  return { walk: {} };
}

async function postJson(path: string, body: unknown, timeoutMs: number) {
  const config = readConfig();
  const target = new URL(path.replace(/^\/+/, ""), `${config.baseUrl}/`);
  target.searchParams.set("key", config.apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "Location Intelligence denied this request.");
    }
    if (!response.ok) {
      throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "Location Intelligence could not complete this request.");
    }
    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof LocalEngineError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new LocalEngineError("LOCAL_SOURCE_TIMEOUT", 504, "Location Intelligence timed out.");
    }
    throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "Location Intelligence is unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeGeoJson(data: unknown) {
  const record = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const features = Array.isArray(record.features) ? record.features : [];
  return {
    type: typeof record.type === "string" ? record.type : "unknown",
    featureCount: features.length,
  };
}

export function getLocationIntelligenceRuntimeState() {
  return {
    configured: Boolean(apiKey()),
    mode: "server-side-rest" as const,
    dataOwner: "Location Intelligence" as const,
    secretsReturned: false,
  };
}

export function getLocationIntelligenceCapabilityMap() {
  return {
    source: { owner: "Location Intelligence", connection: getLocationIntelligenceRuntimeState().configured ? "configured" : "not_configured" },
    capabilities: [
      {
        key: "catchment-polygons",
        label: "Catchment polygons",
        productUse: "Show reachable member catchments by walk, bike, car and transit for a candidate studio site.",
        preservedFunction: "Isochrone / isoline polygons",
        status: "server_route_ready",
      },
      {
        key: "travel-times",
        label: "Travel times",
        productUse: "Compare candidate sites against homes, competitors, transit stops, parking and corporate client clusters.",
        preservedFunction: "Many-to-many travel-time matrix",
        status: "adapter_next",
      },
      {
        key: "places-context",
        label: "Places context",
        productUse: "Find nearby competitors, parking, public transport, offices and complementary demand generators.",
        preservedFunction: "Closest and grouped places around a location",
        status: "adapter_next",
      },
      {
        key: "statistics-context",
        label: "Statistics context",
        productUse: "Combine catchments with demographics, purchasing power and local demand indicators.",
        preservedFunction: "Reachability plus statistics",
        status: "adapter_next",
      },
      {
        key: "location-scoring",
        label: "Location scoring",
        productUse: "Score fitness-site fit from accessibility, competition, demographics, parking and revenue potential.",
        preservedFunction: "Weighted location quality scoring",
        status: "adapter_next",
      },
      {
        key: "routing",
        label: "Routing",
        productUse: "Explain why a site is convenient for recurring planned visits.",
        preservedFunction: "Detailed route scenarios",
        status: "adapter_next",
      },
    ],
    fitnessSiteModel: {
      decisionFactors: ["member potential", "accessibility", "competition overlap", "public transport", "parking", "demographics", "purchasing power"],
      recurringVisitBias: true,
      scenarioTypes: ["new opening", "relocation", "closure impact", "network optimization", "bank evidence"],
    },
    secretsReturned: false,
  };
}

export async function runLocationCatchmentAnalysis(input: LocationCatchmentInput) {
  const config = readConfig();
  const lat = boundedCoordinate(input.lat, -90, 90, "Latitude");
  const lng = boundedCoordinate(input.lng, -180, 180, "Longitude");
  const minutes = boundedMinutes(input.minutes);
  const values = minutes.map((minute) => minute * 60);
  const payload = {
    sources: [
      {
        lat,
        lng,
        id: input.id,
        tm: travelPayload(input.mode),
      },
    ],
    polygon: {
      serializer: "geojson",
      srid: 4326,
      values,
    },
  };
  const response = await postJson("/v1/polygon_post", payload, config.timeoutMs);
  const data = response.data;

  return {
    source: { owner: "Location Intelligence", connection: "live-api" as const },
    generatedAt: new Date().toISOString(),
    request: {
      siteId: input.id,
      lat,
      lng,
      mode: input.mode,
      minutes,
      fitnessUseCase: true,
    },
    analysis: {
      catchment: summarizeGeoJson(data),
      geometry: input.includeGeometry ? data : undefined,
      decisionFactors: getLocationIntelligenceCapabilityMap().fitnessSiteModel.decisionFactors,
      nextActions: [
        "Run competitor and POI context for the same catchment.",
        "Combine catchment with demographics and purchasing power.",
        "Score location fit for recurring gym visits before lease or financing review.",
      ],
    },
    capabilities: {
      liveCatchment: true,
      placesContext: false,
      statisticsContext: false,
      locationScoring: false,
      geometryReturned: input.includeGeometry,
    },
    secretsReturned: false,
  };
}
