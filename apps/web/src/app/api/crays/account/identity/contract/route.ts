import { getAccountIdentitySettingsContract } from "@/lib/account-settings";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getAccountIdentitySettingsContract();

  return Response.json({
    role,
    contract,
    rolePreview: {
      stages: contract.stages.length,
      accessMethods: contract.accessMethods.length,
      handoffStates: contract.keyHandoffStates.length,
      roleBindings: contract.roleBindings.filter((binding) => binding.role === role || binding.visibility !== "admin").length,
    },
    note: "This is the CRAYS account identity settings contract. No live accounts, secrets or private keys are returned.",
  });
}
