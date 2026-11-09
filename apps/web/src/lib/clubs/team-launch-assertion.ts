import { createHmac, timingSafeEqual } from "node:crypto";

export const clubsTeamAudience = "crays-clubs-team";
export const clubsTeamOrigin = "https://team.craysclub.com";

export type ClubsTeamLaunchAssertion = {
  iss: "https://www.crays.pro";
  aud: typeof clubsTeamAudience;
  sub: string;
  role: "holiday-manager";
  organizationId: string;
  partnerTenantId: string;
  legalEntityId: string;
  propertyId: string;
  capability: "clubs.qlo.launch";
  assuranceLevel: "aal2" | "aal3";
  launchReceiptId: string;
  iat: number;
  exp: number;
};

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createClubsTeamLaunchAssertion(
  payload: ClubsTeamLaunchAssertion,
  secret: string,
) {
  if (secret.length < 32) {
    throw new Error("CRAYS Clubs team assertion secret must contain at least 32 characters.");
  }
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyClubsTeamLaunchAssertion(
  value: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): ClubsTeamLaunchAssertion | null {
  const [encodedPayload, signature, extra] = value.split(".");
  if (!encodedPayload || !signature || extra) return null;
  const expected = sign(encodedPayload, secret);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (
    actualBytes.length !== expectedBytes.length
    || !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ClubsTeamLaunchAssertion;
    if (
      payload.iss !== "https://www.crays.pro"
      || payload.aud !== clubsTeamAudience
      || payload.role !== "holiday-manager"
      || payload.capability !== "clubs.qlo.launch"
      || !["aal2", "aal3"].includes(payload.assuranceLevel)
      || payload.iat > nowSeconds + 5
      || payload.exp <= nowSeconds
      || payload.exp - payload.iat > 60
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

