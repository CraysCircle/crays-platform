import { NextRequest, NextResponse } from "next/server";
import {
  resolveClubsTeamHostSession,
  revokeClubsTeamHostSession,
} from "@/db/clubs-team-launch-exchange-repository";
import {
  clubsTeamSessionCookieName,
  validClubsTeamHostRequest,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };

export async function GET(request: NextRequest) {
  if (!validClubsTeamHostRequest(request)) {
    return NextResponse.json(
      { status: "misdirected" },
      { status: 421, headers: noStore },
    );
  }
  const session = await resolveClubsTeamHostSession(
    request.cookies.get(clubsTeamSessionCookieName)?.value,
  );
  if (!session) {
    return NextResponse.json(
      { status: "authentication_required" },
      { status: 401, headers: noStore },
    );
  }
  return NextResponse.json(
    {
      status: "active",
      session: {
        sessionId: session.sessionId,
        role: "holiday-manager",
        organizationId: session.organizationId,
        partnerTenantId: session.partnerTenantId,
        legalEntityId: session.legalEntityId,
        propertyId: session.propertyId,
        assuranceLevel: session.assuranceLevel,
        expiresAt: session.expiresAt,
      },
    },
    { headers: noStore },
  );
}

export async function DELETE(request: NextRequest) {
  if (!validClubsTeamHostRequest(request)) {
    return NextResponse.json(
      { status: "misdirected" },
      { status: 421, headers: noStore },
    );
  }
  const token = request.cookies.get(clubsTeamSessionCookieName)?.value;
  const result = await revokeClubsTeamHostSession(token);
  const response = NextResponse.json(
    { status: "revoked", revoked: result.revoked },
    { headers: noStore },
  );
  response.cookies.set(clubsTeamSessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
