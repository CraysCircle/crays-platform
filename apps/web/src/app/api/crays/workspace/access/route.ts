import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { canUseCraysResource } from "@/lib/workspace/server-access";

export async function POST(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const body = await request.json().catch(() => null) as { resource?: string; action?: string } | null;
  const decision = canUseCraysResource(context, body?.resource, body?.action ?? "read");

  return Response.json(decision, {
    status: decision.can ? 200 : 403,
  });
}
