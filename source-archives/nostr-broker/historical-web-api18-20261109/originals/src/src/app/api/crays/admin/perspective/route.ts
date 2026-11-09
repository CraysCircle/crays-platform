import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAuditEvent } from "@/db/core-identity-repository";
import { resolveBlock196OwnerContext } from "@/lib/block196-owner-context";
import {
  block196PerspectiveRoles,
  createBlock196PerspectiveAuditEvent,
  createBlock196PerspectiveDenialAuditEvent,
} from "@/lib/block196-owner-perspective-policy";
import type { RoleKey } from "@/lib/roles";
import {
  createSuperAdminPerspectiveToken,
  superAdminPerspectiveCookieName,
  superAdminPerspectiveMaxAgeSeconds,
  verifySuperAdminPerspectiveToken,
} from "@/lib/super-admin-perspective";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function denyInvalidRequest(
  accountId: string,
  requestedPerspective: string | null,
  targetScope: string | null,
) {
  const denial = createBlock196PerspectiveDenialAuditEvent({
    actorSubject: null,
    actorAccountId: accountId,
    requestedPerspective,
    targetScope,
    denialReason: "invalid_perspective_request",
  });
  await createAuditEvent({
    actorAccountId: accountId,
    action: denial.action,
    targetType: "role-perspective",
    targetId: denial.requestedPerspective ?? "invalid",
    outcome: "denied",
    riskLevel: "critical",
    metadata: {
      reason: denial.denialReason,
      targetScope: denial.targetScope,
      underlyingAssignmentMutated: false,
    },
  }).catch(() => null);
}

export async function GET(request: NextRequest) {
  const owner = await resolveBlock196OwnerContext(request);
  if (!owner.decision.allowed) return Response.json({ allowed: false, reason: owner.decision.reason }, { status: 403 });

  const token = request.cookies.get(superAdminPerspectiveCookieName)?.value;
  const active = verifySuperAdminPerspectiveToken(token, owner.decision.ownerSubject, owner.decision.accountId);
  if (!active && token) {
    const expired = verifySuperAdminPerspectiveToken(token, owner.decision.ownerSubject, owner.decision.accountId, process.env, Date.now(), true);
    if (expired && expired.expiresAtSeconds <= Math.floor(Date.now() / 1000)) {
      const audit = createBlock196PerspectiveAuditEvent(expired, "identity.owner_perspective.expired");
      await createAuditEvent({
        actorAccountId: audit.actorAccountId,
        action: audit.action,
        targetType: "role-perspective",
        targetId: audit.perspective,
        outcome: "changed",
        riskLevel: "critical",
        metadata: { targetScope: audit.targetScope, reason: audit.reason, underlyingAssignmentMutated: false },
      }).catch(() => null);
    }
  }

  return Response.json({
    allowed: true,
    active: Boolean(active),
    perspective: active
      ? { role: active.perspective, targetScope: active.targetScope, reason: active.reason, expiresAt: new Date(active.expiresAtSeconds * 1000).toISOString() }
      : null,
  });
}

export async function POST(request: NextRequest) {
  const owner = await resolveBlock196OwnerContext(request);
  if (!owner.decision.allowed) return Response.json({ allowed: false, reason: owner.decision.reason }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { role?: unknown; reason?: unknown };
  const role = typeof body.role === "string" && block196PerspectiveRoles.includes(body.role as RoleKey)
    ? body.role as RoleKey
    : null;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const targetScope = role ? `review:${role}` : null;
  if (!role || reason.length < 8 || !targetScope) {
    await denyInvalidRequest(owner.decision.accountId, typeof body.role === "string" ? body.role : null, targetScope);
    return Response.json({ allowed: false, reason: "valid_role_and_review_reason_required" }, { status: 400 });
  }

  const token = createSuperAdminPerspectiveToken({
    subject: owner.decision.ownerSubject,
    accountId: owner.decision.accountId,
    role,
    targetScope,
    reason,
    nonce: randomUUID(),
  });
  if (!token) return Response.json({ allowed: false, reason: "perspective_signing_unavailable" }, { status: 503 });

  const context = verifySuperAdminPerspectiveToken(token, owner.decision.ownerSubject, owner.decision.accountId);
  if (!context) return Response.json({ allowed: false, reason: "perspective_signing_unavailable" }, { status: 503 });
  const lifecycle = createBlock196PerspectiveAuditEvent(context, "identity.owner_perspective.started");
  const audit = await createAuditEvent({
    actorAccountId: lifecycle.actorAccountId,
    action: lifecycle.action,
    targetType: "role-perspective",
    targetId: lifecycle.perspective,
    outcome: "allowed",
    riskLevel: "critical",
    metadata: {
      targetScope: lifecycle.targetScope,
      reason: lifecycle.reason,
      expiresAt: lifecycle.expiresAt,
      underlyingAssignmentMutated: false,
    },
  });
  const response = NextResponse.json({ allowed: true, role, auditId: audit.auditId, expiresInSeconds: superAdminPerspectiveMaxAgeSeconds });
  response.cookies.set({
    name: superAdminPerspectiveCookieName,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: superAdminPerspectiveMaxAgeSeconds,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  const owner = await resolveBlock196OwnerContext(request);
  if (!owner.decision.allowed) return Response.json({ allowed: false, reason: owner.decision.reason }, { status: 403 });
  const token = request.cookies.get(superAdminPerspectiveCookieName)?.value;
  const context = verifySuperAdminPerspectiveToken(token, owner.decision.ownerSubject, owner.decision.accountId, process.env, Date.now(), true);
  const lifecycle = context ? createBlock196PerspectiveAuditEvent(context, "identity.owner_perspective.ended") : null;
  const audit = await createAuditEvent({
    actorAccountId: owner.decision.accountId,
    action: "identity.owner_perspective.ended",
    targetType: "role-perspective",
    targetId: lifecycle?.perspective ?? "none",
    outcome: "changed",
    riskLevel: "critical",
    metadata: {
      targetScope: lifecycle?.targetScope ?? null,
      reason: lifecycle?.reason ?? null,
      underlyingAssignmentMutated: false,
    },
  });
  const response = NextResponse.json({ allowed: true, active: false, auditId: audit.auditId });
  response.cookies.set({ name: superAdminPerspectiveCookieName, value: "", httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
