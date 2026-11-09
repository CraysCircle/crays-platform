import { getAuthEnvironmentState, getAuthRouteContract } from "@/lib/auth-boundary";
import { serverGuardrails } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    contract: getAuthRouteContract(),
    environment: getAuthEnvironmentState(),
    guardrails: serverGuardrails,
    liveProviderConnected: getAuthEnvironmentState().connectionState === "provider_ready",
  });
}
