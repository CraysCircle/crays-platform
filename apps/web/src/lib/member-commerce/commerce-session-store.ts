import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

import { getCorePgPool } from "@/db/client";

export type CommerceMemberContext = {
  tenantId: string;
  memberId: string;
  channelToken: string;
};

export interface CommerceSessionStore {
  readActiveOrderToken(context: CommerceMemberContext): Promise<string | null>;
  writeActiveOrderToken(
    context: CommerceMemberContext,
    orderToken: string,
    providerOrderId?: string | null,
  ): Promise<void>;
}

function encryptionKey(): Buffer {
  const secret = process.env.CRAYS_COMMERCE_SESSION_ENCRYPTION_KEY?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("CRAYS_COMMERCE_SESSION_ENCRYPTION_KEY_REQUIRED");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

function encryptToken(token: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptToken(envelope: string): string {
  const [version, nonce, tag, ciphertext] = envelope.split(".");
  if (version !== "v1" || !nonce || !tag || !ciphertext) {
    throw new Error("COMMERCE_SESSION_TOKEN_INVALID");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(nonce, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export class CoreCommerceSessionStore implements CommerceSessionStore {
  async readActiveOrderToken(context: CommerceMemberContext): Promise<string | null> {
    const result = await getCorePgPool().query<{ active_order_token_ciphertext: string | null }>(
      `select active_order_token_ciphertext
         from crays_core.member_commerce_provider_sessions
        where tenant_id = $1 and member_id = $2 and provider = 'vendure'
          and channel_token = $3
          and (expires_at is null or expires_at > now())`,
      [context.tenantId, context.memberId, context.channelToken],
    );
    const encrypted = result.rows[0]?.active_order_token_ciphertext;
    return encrypted ? decryptToken(encrypted) : null;
  }

  async writeActiveOrderToken(
    context: CommerceMemberContext,
    orderToken: string,
    providerOrderId: string | null = null,
  ): Promise<void> {
    if (!orderToken.trim()) throw new Error("COMMERCE_SESSION_TOKEN_EMPTY");
    await getCorePgPool().query(
      `insert into crays_core.member_commerce_provider_sessions
        (provider_session_id, tenant_id, member_id, provider, channel_token,
         active_order_token_ciphertext, active_provider_order_id, last_used_at)
       values ($1, $2, $3, 'vendure', $4, $5, $6, now())
       on conflict (tenant_id, member_id, provider, channel_token)
       do update set
         active_order_token_ciphertext = excluded.active_order_token_ciphertext,
         active_provider_order_id = coalesce(excluded.active_provider_order_id, member_commerce_provider_sessions.active_provider_order_id),
         provider_version = member_commerce_provider_sessions.provider_version + 1,
         last_used_at = now(),
         updated_at = now()`,
      [randomUUID(), context.tenantId, context.memberId, context.channelToken, encryptToken(orderToken), providerOrderId],
    );
  }
}

export const commerceSessionCryptoForTests = { encryptToken, decryptToken };
