import { getDocumentPersistenceRolePreview, getWorkflowPersistenceContract } from "@/lib/workflow-persistence-contracts";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getWorkflowPersistenceContract("document-evidence");

  return Response.json({
    role,
    contract,
    rolePreview: getDocumentPersistenceRolePreview(role),
    liveRecordsReturned: false,
    fileUploadEnabled: false,
    note: "This is the CRAYS document/evidence persistence contract. No live files, uploads or document records are returned.",
  });
}
