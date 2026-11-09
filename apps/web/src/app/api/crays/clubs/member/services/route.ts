import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";
import {
  executeClubsServiceCommand,
  readOwnServicesAndEntitlements,
} from "@/db/clubs-services-entitlements-repository";
import {
  clubsMemberNoStore,
  resolveClubsMemberApiAccount,
} from "@/lib/clubs/member-api-state";
import { validateClubsMemberMutationRequest } from "@/lib/clubs/member-request-security";
import { clubsMemberServiceRequestUiContract } from "@/lib/clubs/member-service-request-ui-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const identifier = z
  .string()
  .min(3)
  .max(180)
  .regex(/^[A-Za-z0-9:_.-]+$/);
const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("request_service"),
    bookingId: identifier,
    offeringId: identifier,
    quantity: z.number().int().min(1).max(1000),
    requestedFor: z.string().datetime().optional(),
    requestNote: z.string().trim().max(500).optional(),
    guestId: identifier.optional(),
  }),
  z.object({
    type: z.literal("cancel_service"),
    selectionId: identifier,
    expectedVersion: z.number().int().min(1),
    reason: z.string().trim().min(3).max(500),
  }),
]);
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);
const noStore = clubsMemberNoStore;

export async function GET(request: NextRequest) {
  const member = await resolveClubsMemberApiAccount(request);
  if ("response" in member) return member.response;
  try {
    return Response.json(
      {
        status: "ready",
        ...(await readOwnServicesAndEntitlements(member.accountId)),
      },
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
  const member = await resolveClubsMemberApiAccount(request);
  if ("response" in member) return member.response;
  const security = validateClubsMemberMutationRequest(request);
  if (!security.allowed) {
    return Response.json(
      { status: "denied", reason: security.reason },
      { status: 403, headers: noStore },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (
    !parsed.success ||
    !idempotencyKeySchema.safeParse(idempotencyKey).success
  ) {
    return Response.json(
      { status: "validation_error" },
      { status: 400, headers: noStore },
    );
  }
  try {
    const correlationId = `clubs-member-service-${randomUUID()}`;
    const receipt = await executeClubsServiceCommand({
      accountId: member.accountId,
      actorType: "member",
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
      return Response.json(
        { status: "conflict" },
        { status: 409, headers: noStore },
      );
    }
    return Response.json(
      {
        status: "unknown_outcome",
        reason:
          "The Service outcome is unknown. Reconcile the account-bound Service status with GET before retrying with the same command key.",
        reconcileAt: clubsMemberServiceRequestUiContract.endpoint,
        retryWithSameIdempotencyKeyOnly: true,
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
