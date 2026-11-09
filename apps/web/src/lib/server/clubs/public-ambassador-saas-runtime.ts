import "server-only";
import {getProductionPublicPool} from "@/db/clubs-production-public-pool";
import {createProductionPublicAmbassadorRepository} from "@/lib/clubs/public-ambassador-production-repository";
import {createPublicAmbassadorReadHandler} from "@/lib/clubs/public-ambassador-saas-read-handler";
import {getVerifiedClubsPublicReleaseOrigin} from "./public-clubs-release-origin";

/** Dedicated production public-read role. Identity/owner/TEST connections are never fallback sources. */
export function getPublicAmbassadorRepository() {
  return createProductionPublicAmbassadorRepository(getProductionPublicPool(), "https://www.craysclub.com");
}
export async function handlePublicAmbassadorRead(request: Request): Promise<Response> {
  try {
    return await createPublicAmbassadorReadHandler(getPublicAmbassadorRepository(), getVerifiedClubsPublicReleaseOrigin())(request);
  } catch {
    return Response.json({status: "PUBLIC_AMBASSADOR_SOURCE_UNAVAILABLE"}, {status: 503,
      headers: {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}});
  }
}
