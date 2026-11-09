import { handlePublicAmbassadorRead } from "@/lib/server/clubs/public-ambassador-saas-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handlePublicAmbassadorRead;

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
