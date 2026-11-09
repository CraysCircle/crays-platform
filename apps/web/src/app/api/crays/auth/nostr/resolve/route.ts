import { NextRequest } from "next/server";
import { resolveNip05Identifier } from "@/lib/nostr-identity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identifier = request.nextUrl.searchParams.get("identifier");

  if (!identifier) {
    return Response.json(
      {
        status: "invalid",
        reason: "Missing identifier.",
      },
      { status: 400 },
    );
  }

  const resolution = await resolveNip05Identifier(identifier);
  return Response.json({ resolution });
}
