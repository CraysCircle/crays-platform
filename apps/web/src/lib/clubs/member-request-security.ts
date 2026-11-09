import type { NextRequest } from "next/server";

function normalizedRequestOrigin(request: NextRequest) {
  const forwardedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host")?.split(",")[0]?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    request.nextUrl.protocol.replace(":", "");

  if (!forwardedHost || !/^(https?|http)$/.test(forwardedProto)) return null;
  try {
    return new URL(`${forwardedProto}://${forwardedHost}`).origin;
  } catch {
    return null;
  }
}

export function validateClubsMemberMutationRequest(request: NextRequest) {
  const expectedOrigin = normalizedRequestOrigin(request);
  const suppliedOrigin = request.headers.get("origin");
  if (!expectedOrigin || suppliedOrigin !== expectedOrigin) {
    return { allowed: false as const, reason: "origin_mismatch" as const };
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return { allowed: false as const, reason: "cross_site_request" as const };
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return { allowed: false as const, reason: "json_required" as const };
  }

  return { allowed: true as const };
}

