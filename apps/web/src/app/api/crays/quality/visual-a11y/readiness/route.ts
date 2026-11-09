import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { visualA11yQualityGates, visualA11yRouteSpecs } from "@/lib/phase3/visual-a11y-regression";
import type { RoleKey } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const allowed = allowedRoles.includes(context.role);
  return Response.json(
    {
      block: 109,
      status: allowed ? "ready_for_browser_regression" : "forbidden",
      role: context.role,
      tenantId: context.tenantId,
      serverAuthority: context.authoritySource,
      access: {
        allowed,
        reason: allowed ? "Role can inspect visual, accessibility and regression route inventory." : "Quality regression inventory is internal-only.",
      },
      summary: {
        routes: visualA11yRouteSpecs.length,
        publicRoutes: visualA11yRouteSpecs.filter((route) => route.purpose === "public").length,
        workspaceRoutes: visualA11yRouteSpecs.filter((route) => route.purpose === "workspace").length,
        portalRoutes: visualA11yRouteSpecs.filter((route) => route.purpose === "portal").length,
      },
      routes: visualA11yRouteSpecs,
      gates: visualA11yQualityGates,
      boundaries: {
        screenshotsOnly: true,
        sourceWritesEnabled: false,
        externalSendingEnabled: false,
        productionDeployEnabled: false,
      },
      note:
        "Block 109: Visual/a11y regression inventory targets pages that previously showed repeated or unreadable content. Browser execution is performed by the verifier, not by this API.",
    },
    { status: allowed ? 200 : 423 },
  );
}
