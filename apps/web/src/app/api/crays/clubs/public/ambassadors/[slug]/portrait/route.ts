import {getPublicAmbassadorRepository} from "@/lib/server/clubs/public-ambassador-saas-runtime";
import {getVerifiedClubsPublicReleaseOrigin} from "@/lib/server/clubs/public-clubs-release-origin";
import {createProductionPublicAmbassadorPortraitHandler} from "@/lib/clubs/public-ambassador-production-portrait-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return await createProductionPublicAmbassadorPortraitHandler(getPublicAmbassadorRepository(), getVerifiedClubsPublicReleaseOrigin())(request);
  } catch {
    return new Response(null, {status: 503, headers: {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}});
  }
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
