import { getDocumentAccessForRole, getDocumentVaultContract } from "@/lib/document-vault";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getDocumentVaultContract();

  return Response.json({
    role,
    contract,
    accessPreview: contract.groups.map((group) => ({
      group: group.group,
      label: group.label,
      access: getDocumentAccessForRole(group.group, role),
    })),
    note: "This is the CRAYS Document Vault contract. No live documents or files are returned.",
  });
}
