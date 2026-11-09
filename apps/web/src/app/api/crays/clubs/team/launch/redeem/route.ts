import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redeemClubsTeamLaunchCode } from "@/db/clubs-team-launch-exchange-repository";
import {
  authorizeClubsTeamConsumer,
  clubsTeamSessionCookieName,
  hashClubsTeamBrowserVerifier,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  code: z.string().min(43).max(128).regex(/^[A-Za-z0-9_-]+$/),
  browserVerifier: z.string().min(43).max(128).regex(/^[A-Za-z0-9_-]+$/),
  correlationId: z.string().min(8).max(160).regex(/^[A-Za-z0-9:_-]+$/).optional(),
});

const noStore = { "cache-control": "no-store" };

export async function POST(request: NextRequest) {
  if (!authorizeClubsTeamConsumer(request)) {
    return NextResponse.json(
      { status: "consumer_authentication_required" },
      { status: 401, headers: noStore },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { status: "validation_error" },
      { status: 400, headers: noStore },
    );
  }
  const assertionSecret =
    process.env.CRAYS_CLUBS_TEAM_ASSERTION_SECRET?.trim() ?? "";
  const consumerId = process.env.CRAYS_CLUBS_TEAM_CONSUMER_ID?.trim() ?? "";
  if (assertionSecret.length < 32 || !/^[A-Za-z0-9:_-]{3,160}$/.test(consumerId)) {
    return NextResponse.json(
      { status: "runtime_not_configured" },
      { status: 503, headers: noStore },
    );
  }
  try {
    const result = await redeemClubsTeamLaunchCode({
      code: parsed.data.code,
      browserBindingHash: hashClubsTeamBrowserVerifier(
        parsed.data.browserVerifier,
      ),
      correlationId:
        parsed.data.correlationId ?? `clubs-team-redeem-${randomUUID()}`,
      assertionSecret,
      consumerId,
    });
    const response = NextResponse.json(
      {
        status: "consumed",
        receiptId: result.receiptId,
        returnPath: result.returnPath,
        expiresAt: result.hostSessionExpiresAt,
      },
      { headers: noStore },
    );
    response.cookies.set(clubsTeamSessionCookieName, result.hostSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(result.hostSessionExpiresAt),
    });
    return response;
  } catch {
    return NextResponse.json(
      {
        status: "invalid",
        reason: "The launch code could not be consumed.",
      },
      { status: 400, headers: noStore },
    );
  }
}
