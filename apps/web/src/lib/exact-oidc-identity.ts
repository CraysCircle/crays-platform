import { createHash } from "node:crypto";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export type ExactOidcIdentity = Readonly<{
  issuer: string;
  issuerSha256: string;
  subject: string;
  providerKey: string;
  identitySha256: string;
}>;

export function normalizeOidcIssuer(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || CONTROL_CHARACTERS.test(value)) {
    throw new Error("OIDC_ISSUER_REQUIRED");
  }

  let issuer: URL;
  try {
    issuer = new URL(value.trim());
  } catch {
    throw new Error("OIDC_ISSUER_INVALID");
  }

  if (
    issuer.protocol !== "https:"
    || issuer.username
    || issuer.password
    || issuer.search
    || issuer.hash
    || issuer.pathname !== "/"
  ) {
    throw new Error("OIDC_ISSUER_INVALID");
  }

  return `${issuer.origin}/`;
}

export function normalizeOidcSubject(value: unknown): string {
  if (
    typeof value !== "string"
    || !value.trim()
    || value !== value.trim()
    || value.length > 512
    || CONTROL_CHARACTERS.test(value)
  ) {
    throw new Error("OIDC_SUBJECT_INVALID");
  }
  return value;
}

export function exactOidcIdentity(issuerValue: unknown, subjectValue: unknown): ExactOidcIdentity {
  const issuer = normalizeOidcIssuer(issuerValue);
  const subject = normalizeOidcSubject(subjectValue);
  const issuerSha256 = createHash("sha256").update(issuer, "utf8").digest("hex");
  const identitySha256 = createHash("sha256")
    .update(JSON.stringify([issuer, subject]), "utf8")
    .digest("hex");

  return Object.freeze({
    issuer,
    issuerSha256,
    subject,
    providerKey: `auth0-oidc:${issuerSha256}`,
    identitySha256,
  });
}
