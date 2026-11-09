export type NostrProofMethod = "nip07" | "nip46" | "nip98";

export type NostrAccessStatus =
  | "not_configured"
  | "identifier_ready"
  | "pubkey_resolved"
  | "proof_required"
  | "proof_shape_valid"
  | "signature_library_required"
  | "verified"
  | "blocked";

export type ParsedNip05Identifier = {
  identifier: string;
  localPart: string;
  domain: string;
};

export type Nip05Resolution = ParsedNip05Identifier & {
  status: "resolved" | "not_found" | "invalid" | "unavailable";
  pubkeyHex?: string;
  relays: string[];
  reason?: string;
};

export type NostrAccessContract = {
  nip05Domain: string;
  proofMethods: NostrProofMethod[];
  challengeKind: 27235;
  issuance: {
    requiredForEveryAccount: true;
    issuer: "crays";
    privateKeyDelivery: "client_held_one_time_handoff";
    privateKeyMaterialAcceptedByServer: false;
    plaintextPrivateKeyStorage: false;
  };
  endpoints: {
    contract: "/api/crays/auth/nostr/contract";
    resolve: "/api/crays/auth/nostr/resolve";
    challenge: "/api/crays/auth/nostr/challenge";
    verify: "/api/crays/auth/nostr/verify";
    handoff: "/api/crays/auth/nostr/handoff";
  };
  rules: string[];
};

export type NostrChallengeTemplate = {
  challengeId: string;
  expiresInSeconds: number;
  proofMethods: NostrProofMethod[];
  eventTemplate: {
    kind: 27235;
    created_at: number;
    content: "";
    tags: string[][];
  };
};

export type NostrSignedEventShape = {
  id?: string;
  pubkey?: string;
  created_at?: number;
  kind?: number;
  tags?: string[][];
  content?: string;
  sig?: string;
};

const nip05LocalPartPattern = /^[a-z0-9._-]{1,64}$/;
const domainPattern = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const publicKeyHexPattern = /^[0-9a-f]{64}$/;
const signatureHexPattern = /^[0-9a-f]{128}$/;
const eventIdHexPattern = /^[0-9a-f]{64}$/;

export function getNostrAccessContract(env: Record<string, string | undefined> = process.env): NostrAccessContract {
  return {
    nip05Domain: env.CRAYS_NIP05_DOMAIN || "crays.world",
    proofMethods: ["nip07", "nip46", "nip98"],
    challengeKind: 27235,
    issuance: {
      requiredForEveryAccount: true,
      issuer: "crays",
      privateKeyDelivery: "client_held_one_time_handoff",
      privateKeyMaterialAcceptedByServer: false,
      plaintextPrivateKeyStorage: false,
    },
    endpoints: {
      contract: "/api/crays/auth/nostr/contract",
      resolve: "/api/crays/auth/nostr/resolve",
      challenge: "/api/crays/auth/nostr/challenge",
      verify: "/api/crays/auth/nostr/verify",
      handoff: "/api/crays/auth/nostr/handoff",
    },
    rules: [
      "NIP-05 resolves a human-readable identity to a public key.",
      "The public key, not the NIP-05 address, is the stable account reference.",
      "CRAYS requires signer proof before mapping access to an account.",
      "CRAYS issues a Nostr identity for every account during account mapping.",
      "Roles, permissions, status and scopes remain CRAYS-owned.",
      "Plaintext private keys are never accepted, stored or logged.",
      "The handoff endpoint accepts public keys only and blocks private key material, tokens, credentials and secrets.",
      "Verified Nostr browser proof is persisted only in a signed HTTP-only cookie with no localStorage use.",
      "Auth0 remains the provider login layer; Nostr browser proof is accepted only when the active Auth0 session maps to the same CRAYS account.",
    ],
  };
}

export function isPublicKeyHex(value: string | null | undefined): value is string {
  return Boolean(value && publicKeyHexPattern.test(value));
}

export function parseNip05Identifier(input: string | null | undefined): ParsedNip05Identifier | null {
  const identifier = input?.trim().toLowerCase();
  if (!identifier || !identifier.includes("@")) return null;

  const [localPart, domain, ...extra] = identifier.split("@");
  if (!localPart || !domain || extra.length) return null;
  if (!nip05LocalPartPattern.test(localPart)) return null;
  if (!domainPattern.test(domain)) return null;

  return { identifier: `${localPart}@${domain}`, localPart, domain };
}

export function getNip05WellKnownUrl(parsed: ParsedNip05Identifier) {
  const url = new URL(`https://${parsed.domain}/.well-known/nostr.json`);
  url.searchParams.set("name", parsed.localPart);
  return url.toString();
}

export function buildCraysNip05Identifier(localPart: string, env: Record<string, string | undefined> = process.env) {
  const normalized = localPart.trim().toLowerCase();
  const domain = env.CRAYS_NIP05_DOMAIN || "crays.world";
  if (!nip05LocalPartPattern.test(normalized)) return null;
  return `${normalized}@${domain}`;
}

export async function resolveNip05Identifier(identifier: string, fetcher: typeof fetch = fetch): Promise<Nip05Resolution> {
  const parsed = parseNip05Identifier(identifier);
  if (!parsed) {
    return {
      identifier: identifier.trim().toLowerCase(),
      localPart: "",
      domain: "",
      status: "invalid",
      relays: [],
      reason: "Identifier must use a valid NIP-05 shape.",
    };
  }

  try {
    const response = await fetcher(getNip05WellKnownUrl(parsed), {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ...parsed, status: "unavailable", relays: [], reason: `Resolver returned ${response.status}.` };
    }

    const payload = (await response.json()) as {
      names?: Record<string, string>;
      relays?: Record<string, string[]>;
    };
    const pubkeyHex = payload.names?.[parsed.localPart]?.toLowerCase();

    if (!isPublicKeyHex(pubkeyHex)) {
      return { ...parsed, status: "not_found", relays: [], reason: "No lowercase hex public key was returned for this name." };
    }

    return {
      ...parsed,
      status: "resolved",
      pubkeyHex,
      relays: payload.relays?.[pubkeyHex] ?? [],
    };
  } catch {
    return { ...parsed, status: "unavailable", relays: [], reason: "Resolver could not be reached." };
  }
}

export function createNostrChallengeTemplate(absoluteVerifyUrl: string, method = "POST"): NostrChallengeTemplate {
  const challengeId = globalThis.crypto?.randomUUID?.() ?? `challenge-${Date.now()}`;

  return {
    challengeId,
    expiresInSeconds: 60,
    proofMethods: ["nip07", "nip46", "nip98"],
    eventTemplate: {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      content: "",
      tags: [
        ["u", absoluteVerifyUrl],
        ["method", method],
        ["challenge", challengeId],
      ],
    },
  };
}

export function inspectNostrSignedEventShape(event: NostrSignedEventShape, expectedUrl?: string, expectedMethod = "POST") {
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const urlTag = tags.find((tag) => tag[0] === "u")?.[1];
  const methodTag = tags.find((tag) => tag[0] === "method")?.[1];
  const challengeTag = tags.find((tag) => tag[0] === "challenge")?.[1];
  const createdAt = typeof event.created_at === "number" ? event.created_at : 0;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - createdAt);
  const issues: string[] = [];

  if (event.kind !== 27235) issues.push("Event kind must be 27235.");
  if (!event.id || !eventIdHexPattern.test(event.id)) issues.push("Event id must be lowercase hex.");
  if (!isPublicKeyHex(event.pubkey)) issues.push("Public key must be lowercase hex.");
  if (!event.sig || !signatureHexPattern.test(event.sig)) issues.push("Signature must be lowercase hex.");
  if (typeof event.content !== "string") issues.push("Event content must be a string.");
  if (!Array.isArray(event.tags) || !event.tags.every((tag) => Array.isArray(tag) && tag.every((value) => typeof value === "string"))) {
    issues.push("Tags must be arrays of strings.");
  }
  if (!urlTag) issues.push("Missing URL tag.");
  if (!methodTag) issues.push("Missing method tag.");
  if (!challengeTag) issues.push("Missing challenge tag.");
  if (expectedUrl && urlTag !== expectedUrl) issues.push("URL tag does not match the verification endpoint.");
  if (methodTag && methodTag !== expectedMethod) issues.push("Method tag does not match.");
  if (!createdAt || ageSeconds > 60) issues.push("Event timestamp is outside the accepted window.");

  return {
    status: issues.length ? "blocked" : "proof_shape_valid",
    issues,
    signatureVerified: false,
    nextRequired: issues.length ? "Fix event shape." : "Verify Schnorr signature and consume persisted challenge.",
  } as const;
}
