import { z } from "zod";
import { createTenantInvitation, transitionTenantMembership } from "@/db/identity-tenant-lifecycle-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { roleByKey } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const invitationSchema = z.object({ command: z.literal("create-invitation"), organizationId: z.string().min(3).max(160), inviteeContact: z.string().email(), roleKey: z.string().min(2), scopes: z.array(z.string().min(1).max(120)).max(50).default([]), expiresInHours: z.number().int().min(1).max(168).default(72) });
const transitionSchema = z.object({ command: z.literal("transition-membership"), accountId: z.string().min(3).max(160), organizationId: z.string().min(3).max(160), roleKey: z.string().min(2), action: z.enum(["activate", "suspend", "restore", "offboard"]), reason: z.string().trim().min(8).max(500) });
const commandSchema = z.discriminatedUnion("command", [invitationSchema, transitionSchema]);

export async function POST(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest", surface: "privileged-operation" });
  const actor = context.session.account;
  if (context.authoritySource !== "auth0-crays-session" || !actor || !["admin", "crays-management"].includes(context.session.activeRole ?? "")) {
    return Response.json({ status: "forbidden", note: "Tenant lifecycle commands require an active mapped Admin or CRAYS Management session. Review personas and Portal bridges cannot mutate identity." }, { status: 403 });
  }
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ status: "validation_error", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400 });
  try {
    if (parsed.data.command === "create-invitation") {
      const result = await createTenantInvitation({ organizationId: parsed.data.organizationId, inviteeContact: parsed.data.inviteeContact, roleKey: roleByKey(parsed.data.roleKey).key, scopes: parsed.data.scopes, invitedByAccountId: actor.id, expiresAt: new Date(Date.now() + parsed.data.expiresInHours * 3_600_000) });
      return Response.json({ status: "created", result, note: "Invitation token is returned once for an authorized handoff. No email or external send occurred." }, { status: 201 });
    }
    const result = await transitionTenantMembership({ accountId: parsed.data.accountId, organizationId: parsed.data.organizationId, roleKey: roleByKey(parsed.data.roleKey).key, action: parsed.data.action, actorAccountId: actor.id, reason: parsed.data.reason });
    return Response.json({ status: "changed", result });
  } catch (error) {
    return Response.json({ status: "conflict", error: error instanceof Error ? error.message : "Tenant lifecycle command failed." }, { status: 409 });
  }
}
