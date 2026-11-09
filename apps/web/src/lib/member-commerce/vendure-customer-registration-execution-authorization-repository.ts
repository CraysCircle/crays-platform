import "server-only";

import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

import { getCorePgPool } from "@/db/client";
import type {
  VendureRegistrationAuthorizationConsumption,
  VendureRegistrationExecutionAuthorizationRepository,
} from "./vendure-customer-registration-execution-authorization";

export const VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_REPOSITORY_VERSION =
  "cclub-063.vendure-registration-execution-authorization-repository.v1" as const;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/;
const HASH = /^[a-f0-9]{64}$/;

type AuthorizationRow = Readonly<{
  authorization_id: string;
  tenant_id: string;
  scheduler_id: string;
  vendure_endpoint_sha256: string;
  approval_receipt_sha256: string;
  human_aal2_receipt_sha256: string;
  authorized_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
}>;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function exactId(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim() !== value || !ID.test(value)) {
    throw new Error(code);
  }
  return value;
}

function exactHash(value: unknown, code: string): string {
  if (typeof value !== "string" || !HASH.test(value)) throw new Error(code);
  return value;
}

function exactInstant(value: string, code: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(code);
  }
  return value;
}

async function transaction<T>(
  tenantId: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin isolation level serializable");
    await client.query(
      "select set_config('crays.app_role','core_service',true)",
    );
    await client.query("select set_config('crays.tenant_id',$1,true)", [
      tenantId,
    ]);
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function createPersistedVendureRegistrationExecutionAuthorizationRepository(
  config: Readonly<{ tenantId: string; maxClockSkewMs?: number }>,
): VendureRegistrationExecutionAuthorizationRepository {
  const tenantId = exactId(
    config.tenantId,
    "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_REPOSITORY_CONFIG_INVALID",
  );
  const maxClockSkewMs = config.maxClockSkewMs ?? 5_000;
  if (!Number.isSafeInteger(maxClockSkewMs) || maxClockSkewMs < 0) {
    throw new Error(
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_REPOSITORY_CONFIG_INVALID",
    );
  }

  async function consumeAuthorization(
    input: VendureRegistrationAuthorizationConsumption,
  ): Promise<
    | "CONSUMED"
    | "NOT_FOUND"
    | "ALREADY_CONSUMED"
    | "SCOPE_MISMATCH"
  > {
    const authorizationId = exactId(
      input.authorizationId,
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONSUMPTION_INVALID",
    );
    exactId(
      input.tenantId,
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONSUMPTION_INVALID",
    );
    exactId(
      input.schedulerId,
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONSUMPTION_INVALID",
    );
    exactHash(
      input.vendureEndpointSha256,
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONSUMPTION_INVALID",
    );
    exactHash(
      input.approvalReceiptSha256,
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONSUMPTION_INVALID",
    );
    exactHash(
      input.humanAal2ReceiptSha256,
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONSUMPTION_INVALID",
    );
    const requestedConsumedAt = exactInstant(
      input.consumedAt,
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONSUMPTION_INVALID",
    );
    if (input.tenantId !== tenantId) return "SCOPE_MISMATCH";

    return transaction(tenantId, async (client) => {
      const clockResult = await client.query<{ authority_now: Date }>(
        "select transaction_timestamp() authority_now",
      );
      const authorityNow = new Date(clockResult.rows[0]?.authority_now);
      if (
        Number.isNaN(authorityNow.getTime()) ||
        Math.abs(authorityNow.getTime() - Date.parse(requestedConsumedAt)) >
          maxClockSkewMs
      ) {
        throw new Error(
          "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CLOCK_SKEW",
        );
      }
      const result = await client.query<AuthorizationRow>(
        `select authorization_id,tenant_id,scheduler_id,
                vendure_endpoint_sha256,approval_receipt_sha256,
                human_aal2_receipt_sha256,authorized_at,expires_at,consumed_at
           from crays_core.vendure_registration_execution_authorizations
          where tenant_id=$1 and authorization_id=$2
          for update`,
        [tenantId, authorizationId],
      );
      const row = result.rows[0];
      if (!row) return "NOT_FOUND" as const;
      if (row.consumed_at !== null) return "ALREADY_CONSUMED" as const;
      if (
        row.scheduler_id !== input.schedulerId ||
        row.vendure_endpoint_sha256 !== input.vendureEndpointSha256 ||
        row.approval_receipt_sha256 !== input.approvalReceiptSha256 ||
        row.human_aal2_receipt_sha256 !== input.humanAal2ReceiptSha256
      ) {
        return "SCOPE_MISMATCH" as const;
      }
      if (
        authorityNow < new Date(row.authorized_at) ||
        authorityNow >= new Date(row.expires_at)
      ) {
        return "NOT_FOUND" as const;
      }

      const consumedAt = authorityNow.toISOString();
      const receiptBody = {
        repositoryVersion:
          VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_REPOSITORY_VERSION,
        authorizationId,
        tenantId,
        schedulerId: input.schedulerId,
        vendureEndpointSha256: input.vendureEndpointSha256,
        approvalReceiptSha256: input.approvalReceiptSha256,
        humanAal2ReceiptSha256: input.humanAal2ReceiptSha256,
        consumedAt,
      };
      const receiptSha256 = digest(receiptBody);
      const receiptId =
        "vrea_" + digest([authorizationId, receiptSha256]).slice(0, 48);
      await client.query(
        `update crays_core.vendure_registration_execution_authorizations
            set consumed_at=$3,consumption_receipt_sha256=$4
          where tenant_id=$1 and authorization_id=$2 and consumed_at is null`,
        [tenantId, authorizationId, consumedAt, receiptSha256],
      );
      await client.query(
        `insert into crays_core.vendure_registration_execution_authorization_receipts (
           authorization_receipt_id,authorization_id,tenant_id,scheduler_id,
           vendure_endpoint_sha256,approval_receipt_sha256,
           human_aal2_receipt_sha256,receipt_kind,consumed_at,receipt_sha256
         ) values ($1,$2,$3,$4,$5,$6,$7,'CONSUMED',$8,$9)`,
        [
          receiptId,
          authorizationId,
          tenantId,
          input.schedulerId,
          input.vendureEndpointSha256,
          input.approvalReceiptSha256,
          input.humanAal2ReceiptSha256,
          consumedAt,
          receiptSha256,
        ],
      );
      return "CONSUMED" as const;
    });
  }

  return Object.freeze({ consumeAuthorization });
}
