import { NextRequest, NextResponse } from "next/server";
import { projectExactOidcAlignmentDecision } from "@/lib/exact-oidc-alignment-route-policy";
import { preflightCurrentExactOidcCoreBinding } from "@/lib/exact-oidc-core-binding-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const decision = await preflightCurrentExactOidcCoreBinding({ request });
  const projection = projectExactOidcAlignmentDecision(decision);
  return NextResponse.json(projection.body, {
    status: projection.httpStatus,
    headers: projection.headers,
  });
}
