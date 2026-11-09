import {
  ClubsStripeSandboxServiceError,
  receiveClubsStripeSandboxWebhook,
} from "@/lib/member-commerce/clubs-stripe-sandbox-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 1_048_576;

export async function POST(request: Request) {
  const advertisedLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertisedLength) && advertisedLength > MAX_BODY_BYTES) {
    return Response.json({ status: "payload_too_large" }, { status: 413, headers: noStore });
  }
  const signatureHeader = request.headers.get("stripe-signature") ?? "";
  if (!signatureHeader) {
    return Response.json({ status: "signature_required" }, { status: 400, headers: noStore });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") === 0 || Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return Response.json({ status: "invalid_payload_size" }, { status: 413, headers: noStore });
  }
  try {
    const receipt = await receiveClubsStripeSandboxWebhook({ rawBody, signatureHeader });
    return Response.json({ status: "accepted", replayed: receipt.replayed }, { headers: noStore });
  } catch (error) {
    if (error instanceof ClubsStripeSandboxServiceError) {
      const status = error.code === "WEBHOOK_REJECTED" ? 400 : 503;
      return Response.json({ status: error.code.toLowerCase() }, { status, headers: noStore });
    }
    return Response.json({ status: "temporarily_unavailable" }, { status: 503, headers: noStore });
  }
}
