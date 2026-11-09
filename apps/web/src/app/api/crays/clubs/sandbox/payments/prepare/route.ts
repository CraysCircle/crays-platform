import { prepareClubsSandboxSourcePaymentV2 } from "../../../../../../../lib/member-commerce/clubs-stripe-sandbox-facade-v2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 32_768;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_.-]{16,200}$/;
const SUBJECT_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,126}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const advertisedLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertisedLength) && advertisedLength > MAX_BODY_BYTES) {
    return Response.json({ state: "PAYLOAD_TOO_LARGE", livemode: false }, { status: 413, headers: noStore });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return Response.json({ state: "PAYLOAD_TOO_LARGE", livemode: false }, { status: 413, headers: noStore });
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (
    !isRecord(body)
    || (body.paymentKind !== "MEMBERSHIP_FEE" && body.paymentKind !== "STAY_PAYMENT")
    || typeof body.subjectReference !== "string"
    || !SUBJECT_REFERENCE_PATTERN.test(body.subjectReference)
    || !Number.isSafeInteger(body.amountMinor)
    || (body.amountMinor as number) < 400
    || body.currency !== "EUR"
    || body.livemode !== false
    || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)
  ) {
    return Response.json({
      state: body && isRecord(body) && body.livemode === true ? "LIVEMODE_REJECTED" : "VALIDATION_ERROR",
      livemode: false,
      checkoutCreated: false,
      allocationPosted: false,
      providerSuccessClaimed: false,
    }, { status: 400, headers: noStore });
  }

  const prepared = prepareClubsSandboxSourcePaymentV2({
    request: {
      paymentKind: body.paymentKind,
      subjectReference: body.subjectReference,
      amountMinor: body.amountMinor as number,
      currency: "EUR",
      idempotencyKey,
      livemode: false,
    },
    // Client-supplied GO claims are never authority. No trusted repository is bound here.
    teamGoVerification: { ok: false, state: "IMMUTABLE_TEAM_GO_REQUIRED" },
    binding: null,
  });
  return Response.json(prepared, {
    status: prepared.httpStatus,
    headers: { ...noStore, "retry-after": "5" },
  });
}
