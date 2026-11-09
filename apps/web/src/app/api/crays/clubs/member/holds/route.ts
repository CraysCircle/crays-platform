import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";
import {
  executeReservationHoldCommand,
  readOwnReservationHolds,
} from "@/db/clubs-reservation-hold-repository";
import { resolveClubsMemberAccount } from "@/lib/clubs/member-account";
import { validateClubsMemberMutationRequest } from "@/lib/clubs/member-request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const identifier = z.string().min(3).max(180).regex(/^[A-Za-z0-9:_.-]+$/);
const createSchema = z.object({
  type: z.literal("create"),
  quoteId: identifier,
  ttlMinutes: z.number().int().min(2).max(20).default(10),
});
const refreshSchema = z.object({
  type: z.literal("refresh"),
  holdId: identifier,
  expectedVersion: z.number().int().min(1),
  ttlMinutes: z.number().int().min(2).max(20).default(10),
});
const releaseSchema = z.object({
  type: z.literal("release"),
  holdId: identifier,
  expectedVersion: z.number().int().min(1),
});
const commandSchema = z.discriminatedUnion("type", [
  createSchema,
  refreshSchema,
  releaseSchema,
]);
const noStore = { "cache-control": "no-store" };

async function accountId(request: NextRequest) {
  const resolution = await resolveClubsMemberAccount(request);
  const value = resolution?.bundle.account.account_id;
  return typeof value === "string" ? value : null;
}

export async function GET(request: NextRequest) {
  const account = await accountId(request);
  if (!account) {
    return Response.json(
      { status: "authentication_required" },
      { status: 401, headers: noStore },
    );
  }
  try {
    return Response.json(
      { status: "ready", holds: await readOwnReservationHolds(account) },
      { headers: noStore },
    );
  } catch {
    return Response.json(
      { status: "temporarily_unavailable" },
      { status: 503, headers: noStore },
    );
  }
}

export async function POST(request: NextRequest) {
  const account = await accountId(request);
  if (!account) {
    return Response.json(
      { status: "authentication_required" },
      { status: 401, headers: noStore },
    );
  }
  const requestSecurity = validateClubsMemberMutationRequest(request);
  if (!requestSecurity.allowed) {
    return Response.json(
      { status: "denied", reason: requestSecurity.reason },
      { status: 403, headers: noStore },
    );
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { status: "validation_error", issues: parsed.error.issues },
      { status: 400, headers: noStore },
    );
  }
  try {
    const correlationId = `clubs-hold-${randomUUID()}`;
    const receipt = await executeReservationHoldCommand({
      accountId: account,
      idempotencyKey,
      correlationId,
      command: parsed.data,
    });
    const status =
      receipt.outcome === "denied"
        ? 403
        : receipt.outcome === "conflict"
          ? 409
          : receipt.outcome === "invalid"
            ? 400
            : 200;
    return Response.json(
      { status: receipt.outcome, receipt, correlationId },
      { status, headers: noStore },
    );
  } catch (error) {
    if (error instanceof ClubsIdempotencyReplayConflictError) {
      return Response.json({ status: "conflict" }, { status: 409, headers: noStore });
    }
    return Response.json(
      {
        status: "unknown_outcome",
        reason: "The Hold outcome is unknown. Retry with the same command key.",
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
