import { NextResponse, type NextRequest } from "next/server";
import {
  portalBridgeIssuedCookieName,
  portalBridgeIssuedMarker,
  portalBridgeMaxAgeSeconds,
  portalBridgeRoleCookieName,
  resolvePortalBridgeTarget,
} from "@/lib/portal-access-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ role: string; target: string }>;
  },
) {
  const { role: rawRole, target: rawTarget } = await params;
  const { role, target } = resolvePortalBridgeTarget(rawRole, rawTarget);
  const redirectUrl = new URL(target.path, request.url);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(portalBridgeRoleCookieName, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: portalBridgeMaxAgeSeconds,
  });
  response.cookies.set(portalBridgeIssuedCookieName, portalBridgeIssuedMarker, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: portalBridgeMaxAgeSeconds,
  });

  return response;
}
