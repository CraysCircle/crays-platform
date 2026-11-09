import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import { executeClubsPropertyCommand } from "@/db/clubs-property-command-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamIssueOrigin,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  commandType: z.enum([
    "create_unit",
    "edit_property",
    "edit_unit",
    "submit_property_review",
    "submit_unit_review",
    "return_property_to_draft",
    "return_unit_to_draft",
    "publish_property",
    "publish_unit",
    "suspend_property",
    "suspend_unit",
    "archive_property",
    "archive_unit",
  ]),
  propertyId: z.string().min(3).max(160).regex(/^[A-Za-z0-9:_-]+$/),
  targetId: z.string().min(3).max(160).regex(/^[A-Za-z0-9:_-]+$/),
  expectedVersion: z.number().int().min(0),
  idempotencyKey: z.string().min(16).max(200).regex(/^[A-Za-z0-9:_-]+$/),
  correlationId: z.string().min(8).max(160).regex(/^[A-Za-z0-9:_-]+$/).optional(),
  canonicalName: z.string().trim().min(1).max(240).optional(),
  canonicalCode: z.string().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9:_-]*$/).optional(),
}).superRefine((value, context) => {
  if (
    ["create_unit", "edit_property", "edit_unit"].includes(value.commandType)
    && !value.canonicalName
  ) {
    context.addIssue({
      code: "custom",
      path: ["canonicalName"],
      message: "A canonical name is required for create and edit commands.",
    });
  }
  if (value.commandType === "create_unit" && !value.canonicalCode) {
    context.addIssue({
      code: "custom",
      path: ["canonicalCode"],
      message: "A canonical Unit code is required.",
    });
  }
  if (
    value.commandType.includes("property")
    && value.targetId !== value.propertyId
  ) {
    context.addIssue({
      code: "custom",
      path: ["targetId"],
      message: "Property commands must target the scoped Property.",
    });
  }
});

const noStore = { "cache-control": "no-store" };

export async function POST(request: NextRequest) {
  if (!validClubsTeamIssueOrigin(request)) {
    return Response.json(
      { status: "forbidden", reason: "invalid_origin" },
      { status: 403, headers: noStore },
    );
  }
  const actor = await resolveClubsTeamActor(request);
  if (!actor) {
    return Response.json(
      { status: "authentication_required" },
      { status: 401, headers: noStore },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { status: "validation_error" },
      { status: 400, headers: noStore },
    );
  }
  if (
    actor.assuranceLevel === "aal1"
    && /^(publish|suspend|archive)_/.test(parsed.data.commandType)
  ) {
    return Response.json(
      { status: "step_up_required" },
      { status: 403, headers: noStore },
    );
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (
    !tenantSession
    || !["holiday-manager", "crays-management", "admin"].includes(
      tenantSession.roleKey,
    )
  ) {
    return Response.json(
      { status: "tenant_session_required" },
      { status: 403, headers: noStore },
    );
  }
  try {
    const receipt = await executeClubsPropertyCommand({
      accountId: actor.accountId,
      tenantSessionId: tenantSession.sessionId,
      organizationId: tenantSession.organizationId,
      roleKey: tenantSession.roleKey,
      ...parsed.data,
      correlationId:
        parsed.data.correlationId ?? `clubs-property-${randomUUID()}`,
    });
    const status = receipt.outcome === "conflict" ? 409 : 200;
    return Response.json(
      { status: receipt.outcome, receipt },
      { status, headers: noStore },
    );
  } catch (error) {
    if (error instanceof ClubsIdempotencyReplayConflictError) {
      return Response.json({ status: "conflict" }, { status: 409, headers: noStore });
    }
    return Response.json(
      {
        status: "unknown_outcome",
        reason: "The Property-command outcome is unknown. Retry with the same command key.",
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
