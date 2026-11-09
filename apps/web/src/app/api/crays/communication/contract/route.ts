import {
  communicationAdaptersForRole,
  communicationPolicyForRole,
  communicationRoutesForRole,
  getCommunicationContract,
} from "@/lib/communication";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getCommunicationContract();

  return Response.json({
    role,
    contract,
    rolePreview: {
      policy: communicationPolicyForRole(role),
      routes: communicationRoutesForRole(role).map((route) => ({
        id: route.id,
        title: route.title,
        type: route.type,
        primaryModule: route.primaryModule,
        allowedChannels: route.allowedChannels,
        defaultVisibility: route.defaultVisibility,
        documentPolicy: route.documentPolicy,
        status: route.status,
      })),
      adapters: communicationAdaptersForRole(role).map((adapter) => ({
        key: adapter.key,
        label: adapter.label,
        channels: adapter.channels,
        status: adapter.status,
        consentRequired: adapter.consentRequired,
      })),
      dashboardSignals: contract.dashboardSignals.filter((signal) => signal.visibilityRoles.includes(role)).length,
    },
    note: "This is the CRAYS communication contract. No live conversations, messages or provider connections are returned.",
  });
}
