import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { ClubsSandboxPaymentKindV2 } from "./clubs-stripe-sandbox-team-go-verifier-v2";

export type ClubsSandboxWebhookStateV2 = Readonly<{
  httpStatus: 400 | 503;
  state:
    | "SIGNATURE_REQUIRED"
    | "SIGNATURE_BINDING_UNAVAILABLE"
    | "SIGNATURE_MALFORMED"
    | "SIGNATURE_INVALID"
    | "SIGNATURE_TIMESTAMP_REJECTED"
    | "PAYLOAD_INVALID"
    | "LIVEMODE_REJECTED"
    | "CLUBS_SCOPE_REJECTED"
    | "SIGNATURE_VERIFIED_SOURCE_ONLY";
  livemode: false;
  signatureVerified: boolean;
  webhookAccepted: false;
  persisted: false;
  providerSuccessClaimed: false;
  eventFingerprint?: string;
  paymentKind?: ClubsSandboxPaymentKindV2;
}>;

type ParsedSignature = { timestamp: number; v1: string[] };

function rejected(state: ClubsSandboxWebhookStateV2["state"]): ClubsSandboxWebhookStateV2 {
  return {
    httpStatus: state === "SIGNATURE_BINDING_UNAVAILABLE" ? 503 : 400,
    state,
    livemode: false,
    signatureVerified: false,
    webhookAccepted: false,
    persisted: false,
    providerSuccessClaimed: false,
  };
}

function parseSignatureHeader(header: string): ParsedSignature | null {
  const values = header.split(",").map((part) => part.trim().split("=", 2));
  const timestampValue = values.find(([key]) => key === "t")?.[1];
  const timestamp = Number(timestampValue);
  const v1 = values.filter(([key, value]) => key === "v1" && Boolean(value)).map(([, value]) => value);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || v1.length === 0) return null;
  if (v1.some((signature) => !/^[a-f0-9]{64}$/.test(signature))) return null;
  return { timestamp, v1 };
}

function signaturesMatch(expectedHex: string, candidates: string[]): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  return candidates.some((candidate) => {
    const actual = Buffer.from(candidate, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

function readPaymentKind(payload: Record<string, unknown>): ClubsSandboxPaymentKindV2 | null {
  const data = payload.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const object = (data as Record<string, unknown>).object;
  if (typeof object !== "object" || object === null || Array.isArray(object)) return null;
  const metadata = (object as Record<string, unknown>).metadata;
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return null;
  const values = metadata as Record<string, unknown>;
  if (values.crays_scope !== "clubs") return null;
  if (values.clubs_payment_kind !== "MEMBERSHIP_FEE" && values.clubs_payment_kind !== "STAY_PAYMENT") {
    return null;
  }
  return values.clubs_payment_kind;
}

/**
 * Verifies a raw-body Stripe-style signature supplied by a trusted server-side
 * binding. It never reads ENV and never accepts or persists an event.
 */
export function verifyClubsSandboxWebhookStateV2(input: {
  rawBody: string;
  signatureHeader: string;
  signingSecret: string | null;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): ClubsSandboxWebhookStateV2 {
  if (!input.signatureHeader) return rejected("SIGNATURE_REQUIRED");
  if (!input.signingSecret) return rejected("SIGNATURE_BINDING_UNAVAILABLE");
  const parsedSignature = parseSignatureHeader(input.signatureHeader);
  if (!parsedSignature) return rejected("SIGNATURE_MALFORMED");
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1_000);
  const toleranceSeconds = input.toleranceSeconds ?? 300;
  if (Math.abs(nowSeconds - parsedSignature.timestamp) > toleranceSeconds) {
    return rejected("SIGNATURE_TIMESTAMP_REJECTED");
  }
  const signedPayload = `${parsedSignature.timestamp}.${input.rawBody}`;
  const expected = createHmac("sha256", input.signingSecret).update(signedPayload, "utf8").digest("hex");
  if (!signaturesMatch(expected, parsedSignature.v1)) return rejected("SIGNATURE_INVALID");

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(input.rawBody);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return rejected("PAYLOAD_INVALID");
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return rejected("PAYLOAD_INVALID");
  }
  if (payload.livemode !== false) return rejected("LIVEMODE_REJECTED");
  const paymentKind = readPaymentKind(payload);
  if (!paymentKind) return rejected("CLUBS_SCOPE_REJECTED");
  const eventId = typeof payload.id === "string" ? payload.id : "missing_event_id";
  return {
    httpStatus: 503,
    state: "SIGNATURE_VERIFIED_SOURCE_ONLY",
    livemode: false,
    signatureVerified: true,
    webhookAccepted: false,
    persisted: false,
    providerSuccessClaimed: false,
    eventFingerprint: createHash("sha256").update(eventId, "utf8").digest("hex"),
    paymentKind,
  };
}
