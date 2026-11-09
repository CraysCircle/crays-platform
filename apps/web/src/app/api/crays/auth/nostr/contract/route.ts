import { getNostrAccessContract } from "@/lib/nostr-identity";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    contract: getNostrAccessContract(),
    liveProviderConnected: false,
    note: "This is the CRAYS Nostr identity contract. Handoff accepts public keys only, signer proof verifies event id, Schnorr signature and single-use challenge consumption, then maps known public keys to CRAYS account context and audit state. Browser proof persistence uses an HTTP-only cookie and requires the active Auth0 provider session to match the same CRAYS account.",
  });
}
