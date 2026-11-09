import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  applyClubsPropertyBatch,
  ClubsPropertyBatchReplayConflictError,
  ClubsPropertyBatchScopeError,
  ClubsPropertyBatchStepUpRequiredError,
  previewClubsPropertyBatch,
} from "@/db/clubs-property-bulk-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamIssueOrigin,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const commandTypes = [
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
] as const;
const previewSchema = z.object({
  action: z.literal("preview"),
  commandType: z.enum(commandTypes),
  idempotencyKey: z.string().min(16).max(200).regex(/^[A-Za-z0-9:_-]+$/),
  operationKind: z.enum(["bulk_command", "csv_import"]).default("bulk_command"),
  sourceFilename: z.string().trim().min(1).max(240).optional(),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  items: z.array(z.object({
    propertyId: z.string().min(3).max(160).regex(/^[A-Za-z0-9:_-]+$/),
    targetId: z.string().min(3).max(160).regex(/^[A-Za-z0-9:_-]+$/),
    expectedVersion: z.number().int().min(0),
    canonicalName: z.string().trim().min(1).max(240).optional(),
    canonicalCode: z.string().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9:_-]*$/).optional(),
  })).min(1).max(100),
});
const applySchema = z.object({
  action: z.literal("apply"),
  batchId: z.string().min(12).max(200).regex(/^[A-Za-z0-9:_-]+$/),
});
const schema = z.discriminatedUnion("action", [previewSchema, applySchema]);
const noStore = { "cache-control": "no-store" };

export async function POST(request: NextRequest) {
  if (!validClubsTeamIssueOrigin(request)) {
    return Response.json({ status: "forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await resolveClubsTeamActor(request);
  if (!actor) {
    return Response.json({ status: "authentication_required" }, { status: 401, headers: noStore });
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (
    !tenantSession
    || !["holiday-manager", "crays-management", "admin"].includes(tenantSession.roleKey)
  ) {
    return Response.json({ status: "tenant_session_required" }, { status: 403, headers: noStore });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ status: "validation_error" }, { status: 400, headers: noStore });
  }
  if (
    parsed.data.action === "preview"
    && actor.assuranceLevel === "aal1"
    && /^(publish|suspend|archive)_/.test(parsed.data.commandType)
  ) {
    return Response.json({ status: "step_up_required" }, { status: 403, headers: noStore });
  }
  try {
    const authority = {
      accountId: actor.accountId,
      tenantSessionId: tenantSession.sessionId,
      organizationId: tenantSession.organizationId,
      roleKey: tenantSession.roleKey,
    };
    const receipt = parsed.data.action === "preview"
      ? await previewClubsPropertyBatch({ ...authority, ...parsed.data })
      : await applyClubsPropertyBatch({
          ...authority,
          batchId: parsed.data.batchId,
          assuranceLevel: actor.assuranceLevel,
        });
    return Response.json(
      { status: receipt.status, receipt, correlationId: `clubs-bulk-${randomUUID()}` },
      { headers: noStore },
    );
  } catch (error) {
    if (error instanceof ClubsPropertyBatchReplayConflictError) {
      return Response.json(
        { status: "conflict", reason: "The command key belongs to a different batch request." },
        { status: 409, headers: noStore },
      );
    }
    if (error instanceof ClubsPropertyBatchStepUpRequiredError) {
      return Response.json({ status: "step_up_required" }, { status: 403, headers: noStore });
    }
    if (error instanceof ClubsPropertyBatchScopeError) {
      return Response.json({ status: "denied" }, { status: 403, headers: noStore });
    }
    return Response.json(
      { status: "unknown_outcome", reason: "Retry with the same command key to reconcile." },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
