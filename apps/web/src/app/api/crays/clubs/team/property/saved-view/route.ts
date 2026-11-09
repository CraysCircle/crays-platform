import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  ClubsPropertySavedViewReplayConflictError,
  archiveClubsPropertyView,
  saveClubsPropertyView,
} from "@/db/clubs-property-saved-view-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamIssueOrigin,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const saveSchema = z.object({
  name: z.string().trim().min(1).max(120),
  search: z.string().trim().max(160).default(""),
  lifecycle: z.enum(["draft", "review", "published", "suspended", "archived"]).nullable(),
  recordType: z.enum(["all", "property", "unit"]),
  viewMode: z.enum(["table", "board"]),
  pageSize: z.number().int().min(10).max(50),
  expectedVersion: z.number().int().min(0),
  idempotencyKey: z.string().min(16).max(200).regex(/^[A-Za-z0-9:_-]+$/),
  correlationId: z.string().min(8).max(160).regex(/^[A-Za-z0-9:_-]+$/).optional(),
});
const archiveSchema = z.object({
  savedViewId: z.string().min(12).max(200).regex(/^[A-Za-z0-9:_-]+$/),
  expectedVersion: z.number().int().min(1),
  idempotencyKey: z.string().min(16).max(200).regex(/^[A-Za-z0-9:_-]+$/),
  correlationId: z.string().min(8).max(160).regex(/^[A-Za-z0-9:_-]+$/).optional(),
});
const noStore = { "cache-control": "no-store" };

async function authority(request: NextRequest) {
  if (!validClubsTeamIssueOrigin(request)) return null;
  const actor = await resolveClubsTeamActor(request);
  if (!actor) return null;
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (
    !tenantSession
    || !["holiday-manager", "crays-management", "admin"].includes(tenantSession.roleKey)
  ) {
    return null;
  }
  return { actor, tenantSession };
}

export async function POST(request: NextRequest) {
  const authorized = await authority(request);
  if (!authorized) {
    return Response.json({ status: "forbidden" }, { status: 403, headers: noStore });
  }
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ status: "validation_error" }, { status: 400, headers: noStore });
  }
  try {
    const receipt = await saveClubsPropertyView({
      accountId: authorized.actor.accountId,
      tenantSessionId: authorized.tenantSession.sessionId,
      organizationId: authorized.tenantSession.organizationId,
      roleKey: authorized.tenantSession.roleKey,
      ...parsed.data,
      correlationId:
        parsed.data.correlationId ?? `clubs-saved-view-${randomUUID()}`,
    });
    const status = receipt.outcome === "conflict"
      ? 409
      : receipt.outcome === "denied"
        ? 403
        : 200;
    const reason = receipt.outcome === "conflict"
      ? "This saved view changed. Reload the current view and try again."
      : receipt.outcome === "denied"
        ? "The active tenant session can no longer manage this saved view."
        : undefined;
    return Response.json(
      { status: receipt.outcome, reason, receipt },
      { status, headers: noStore },
    );
  } catch (error) {
    if (error instanceof ClubsPropertySavedViewReplayConflictError) {
      return Response.json(
        { status: "conflict", reason: "The saved-view command key is bound to another authority context or payload. Reload before starting a new command." },
        { status: 409, headers: noStore },
      );
    }
    return Response.json(
      { status: "unknown_outcome", reason: "The saved-view outcome is unknown. Reload before starting a new command." },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authorized = await authority(request);
  if (!authorized) {
    return Response.json({ status: "forbidden" }, { status: 403, headers: noStore });
  }
  const parsed = archiveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ status: "validation_error" }, { status: 400, headers: noStore });
  }
  try {
    const receipt = await archiveClubsPropertyView({
      accountId: authorized.actor.accountId,
      tenantSessionId: authorized.tenantSession.sessionId,
      organizationId: authorized.tenantSession.organizationId,
      roleKey: authorized.tenantSession.roleKey,
      ...parsed.data,
      correlationId:
        parsed.data.correlationId ?? `clubs-saved-view-${randomUUID()}`,
    });
    const status = receipt.outcome === "conflict"
      ? 409
      : receipt.outcome === "denied"
        ? 403
        : 200;
    const reason = receipt.outcome === "conflict"
      ? "This saved view changed. Reload the current view and try again."
      : receipt.outcome === "denied"
        ? "The active tenant session can no longer manage this saved view."
        : undefined;
    return Response.json(
      { status: receipt.outcome, reason, receipt },
      { status, headers: noStore },
    );
  } catch (error) {
    if (error instanceof ClubsPropertySavedViewReplayConflictError) {
      return Response.json(
        { status: "conflict", reason: "The saved-view archive key is bound to another authority context or payload. Reload before starting a new command." },
        { status: 409, headers: noStore },
      );
    }
    return Response.json(
      { status: "unknown_outcome", reason: "The saved-view archive outcome is unknown. Reload before starting a new command." },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
