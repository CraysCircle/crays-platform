import { NextRequest } from "next/server";
import { createNostrChallengeTemplate, isPublicKeyHex, parseNip05Identifier } from "@/lib/nostr-identity";
import { createNostrChallengeRecord } from "@/db/core-identity-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    identifier?: string;
    pubkeyHex?: string;
  };
  const parsedIdentifier = body.identifier ? parseNip05Identifier(body.identifier) : null;
  const publicKeyReady = isPublicKeyHex(body.pubkeyHex);
  const verifyUrl = new URL("/api/crays/auth/nostr/verify", request.nextUrl.origin).toString();

  if (!parsedIdentifier && !publicKeyReady) {
    return Response.json(
      {
        status: "invalid",
        reason: "Provide a NIP-05 identifier or lowercase hex public key.",
      },
      { status: 400 },
    );
  }

  const challenge = createNostrChallengeTemplate(verifyUrl);
  const expiresAt = new Date(Date.now() + challenge.expiresInSeconds * 1000);
  await createNostrChallengeRecord({
    challengeId: challenge.challengeId,
    identifier: parsedIdentifier?.identifier,
    pubkeyHex: publicKeyReady ? body.pubkeyHex : undefined,
    challenge: challenge.challengeId,
    absoluteUrl: verifyUrl,
    method: "POST",
    expiresAt,
  });

  return Response.json({
    status: "proof_required",
    identifier: parsedIdentifier?.identifier,
    pubkeyHex: publicKeyReady ? body.pubkeyHex : undefined,
    challenge,
    persisted: true,
    note: "Client signs this persisted template through a browser or remote signer. Verification must consume the challenge once.",
  });
}
