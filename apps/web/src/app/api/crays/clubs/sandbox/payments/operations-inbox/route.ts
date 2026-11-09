import { projectClubsSandboxOperationsInboxV2 } from "../../../../../../../lib/member-commerce/clubs-stripe-sandbox-operations-inbox-projection-v2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store", "retry-after": "5" };

export async function GET() {
  const projection = projectClubsSandboxOperationsInboxV2([]);
  return Response.json({
    state: "PERSISTENT_INBOX_UNAVAILABLE",
    signatureSecretsExposed: false,
    piiExposed: false,
    ...projection,
  }, { status: 503, headers: noStore });
}
