import { createHash } from "node:crypto";
import { schnorr } from "@noble/curves/secp256k1.js";
import type { NostrSignedEventShape } from "./nostr-identity";

type NostrEventForHash = {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
};

const lowercaseHexPattern = /^[0-9a-f]+$/;

function hexToBytes(hex: string) {
  if (hex.length % 2 !== 0 || !lowercaseHexPattern.test(hex)) {
    throw new Error("Invalid lowercase hex.");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function toHashableNostrEvent(event: NostrSignedEventShape): NostrEventForHash | null {
  if (typeof event.pubkey !== "string") return null;
  if (typeof event.created_at !== "number") return null;
  if (typeof event.kind !== "number") return null;
  if (!Array.isArray(event.tags)) return null;
  if (!event.tags.every((tag) => Array.isArray(tag) && tag.every((value) => typeof value === "string"))) return null;
  if (typeof event.content !== "string") return null;

  return {
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
  };
}

export function calculateNostrEventId(event: NostrSignedEventShape) {
  const hashable = toHashableNostrEvent(event);
  if (!hashable) return null;

  const serialized = JSON.stringify([0, hashable.pubkey, hashable.created_at, hashable.kind, hashable.tags, hashable.content]);
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

export function verifyNostrSchnorrEvent(event: NostrSignedEventShape) {
  const issues: string[] = [];
  const calculatedEventId = calculateNostrEventId(event);

  if (!calculatedEventId) {
    issues.push("Event cannot be serialized for id calculation.");
  }

  if (!event.id || event.id !== calculatedEventId) {
    issues.push("Event id does not match the serialized event hash.");
  }

  if (!event.sig || !event.pubkey || !calculatedEventId) {
    issues.push("Event signature, public key or id is missing.");
  } else {
    try {
      const signatureVerified = schnorr.verify(hexToBytes(event.sig), hexToBytes(calculatedEventId), hexToBytes(event.pubkey));
      if (!signatureVerified) issues.push("Schnorr signature verification failed.");
    } catch {
      issues.push("Schnorr signature verification could not be completed.");
    }
  }

  return {
    status: issues.length ? "blocked" : "verified",
    eventId: calculatedEventId,
    signatureVerified: issues.length === 0,
    issues,
  } as const;
}
