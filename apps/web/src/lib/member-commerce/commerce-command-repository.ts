import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getCorePgPool } from "@/db/client";

export type CommerceCommandType =
  | "cart-add"
  | "cart-adjust"
  | "cart-remove"
  | "shipping-set"
  | "checkout-transition"
  | "test-payment"
  | "cancel-order"
  | "request-return"
  | "request-refund";

function payloadHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function beginCommerceCommand(input: {
  commandId: string;
  tenantId: string;
  memberId: string;
  commandType: CommerceCommandType;
  idempotencyKey: string;
  correlationId: string;
  payload: unknown;
}): Promise<{ receiptId: string; replay: boolean; state: string; response: unknown }> {
  if (input.idempotencyKey.trim().length < 8) throw new Error("COMMERCE_IDEMPOTENCY_KEY_REQUIRED");
  const receiptId = randomUUID();
  const requestSha256 = payloadHash(input.payload);
  const result = await getCorePgPool().query<{
    command_receipt_id: string;
    command_state: string;
    response_snapshot: unknown;
    request_sha256: string;
    inserted: boolean;
  }>(
    `insert into crays_core.member_commerce_command_receipts
      (command_receipt_id, command_id, tenant_id, member_id, command_type,
       idempotency_key, provider, command_state, request_sha256, correlation_id,
       real_money_movement)
     values ($1, $2::uuid, $3, $4, $5, $6, 'vendure', 'received', $7, $8, false)
     on conflict (tenant_id, member_id, idempotency_key)
     do update set updated_at = member_commerce_command_receipts.updated_at
     returning command_receipt_id, command_state, response_snapshot, request_sha256,
               (xmax = 0) as inserted`,
    [
      receiptId, input.commandId, input.tenantId, input.memberId, input.commandType,
      input.idempotencyKey, requestSha256, input.correlationId,
    ],
  );
  const row = result.rows[0];
  if (!row) throw new Error("COMMERCE_COMMAND_RECEIPT_NOT_CREATED");
  if (!row.inserted && row.request_sha256 !== requestSha256) {
    throw new Error("COMMERCE_IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD");
  }
  return {
    receiptId: row.command_receipt_id,
    replay: !row.inserted,
    state: row.command_state,
    response: row.response_snapshot,
  };
}

export async function completeCommerceCommand(input: {
  receiptId: string;
  tenantId: string;
  memberId: string;
  providerOrderId?: string | null;
  providerObjectId?: string | null;
  response: Record<string, unknown>;
}): Promise<void> {
  const result = await getCorePgPool().query(
    `update crays_core.member_commerce_command_receipts
        set command_state = 'provider-accepted',
            provider_order_id = $1,
            provider_object_id = $2,
            response_snapshot = $3::jsonb,
            last_error_code = null,
            next_attempt_at = null,
            updated_at = now()
      where command_receipt_id = $4 and tenant_id = $5 and member_id = $6
        and command_state in ('received', 'retryable')
      returning command_receipt_id`,
    [
      input.providerOrderId ?? null, input.providerObjectId ?? null,
      JSON.stringify(input.response), input.receiptId, input.tenantId, input.memberId,
    ],
  );
  if (!result.rowCount) throw new Error("COMMERCE_COMMAND_RECEIPT_NOT_COMPLETABLE");
}

export async function failCommerceCommand(input: {
  receiptId: string;
  tenantId: string;
  memberId: string;
  errorCode: string;
  retryable: boolean;
}): Promise<{ state: "provider-rejected" | "retryable" | "dead-letter"; retryCount: number }> {
  const result = await getCorePgPool().query<{
    command_state: "provider-rejected" | "retryable" | "dead-letter";
    retry_count: number;
  }>(
    `update crays_core.member_commerce_command_receipts
        set command_state = case
              when not $1::boolean then 'provider-rejected'
              when retry_count + 1 >= 8 then 'dead-letter'
              else 'retryable'
            end,
            retry_count = retry_count + 1,
            next_attempt_at = case when $1::boolean and retry_count + 1 < 8
                                   then now() + make_interval(secs => least(30 * power(2, retry_count)::integer, 3600))
                                   else null end,
            last_error_code = $2,
            updated_at = now()
      where command_receipt_id = $3 and tenant_id = $4 and member_id = $5
      returning command_state, retry_count`,
    [input.retryable, input.errorCode, input.receiptId, input.tenantId, input.memberId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("COMMERCE_COMMAND_RECEIPT_NOT_FOUND");
  return { state: row.command_state, retryCount: row.retry_count };
}

export const commerceCommandRepositoryForTests = { payloadHash };
