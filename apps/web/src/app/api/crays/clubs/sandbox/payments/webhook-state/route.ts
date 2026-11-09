export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 1_048_576;

export async function POST(request: Request) {
  const advertisedLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertisedLength) && advertisedLength > MAX_BODY_BYTES) {
    return Response.json({ state: "PAYLOAD_TOO_LARGE", livemode: false }, { status: 413, headers: noStore });
  }
  const signatureHeader = request.headers.get("stripe-signature")?.trim() ?? "";
  if (!signatureHeader) {
    return Response.json({
      state: "SIGNATURE_REQUIRED",
      livemode: false,
      signatureVerified: false,
      webhookAccepted: false,
      persisted: false,
      providerSuccessClaimed: false,
    }, { status: 400, headers: noStore });
  }
  const rawBody = await request.text();
  const bodyBytes = Buffer.byteLength(rawBody, "utf8");
  if (bodyBytes === 0 || bodyBytes > MAX_BODY_BYTES) {
    return Response.json({ state: "INVALID_PAYLOAD_SIZE", livemode: false }, { status: 413, headers: noStore });
  }

  // No ENV or provider secret is read in SOURCE_PASS. The raw payload is not parsed or persisted.
  return Response.json({
    state: "SIGNATURE_BINDING_UNAVAILABLE",
    livemode: false,
    signatureVerified: false,
    webhookAccepted: false,
    persisted: false,
    providerSuccessClaimed: false,
  }, { status: 503, headers: { ...noStore, "retry-after": "5" } });
}
