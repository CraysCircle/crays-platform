import "server-only";

export type StripeCustomerCreateWorkerQueryResult = {
  readonly rowCount: number;
  readonly rows: readonly Record<string, unknown>[];
};

export interface StripeCustomerCreateWorkerSqlClient {
  query(sql: string, values?: readonly unknown[]): Promise<StripeCustomerCreateWorkerQueryResult>;
  release(): void;
}

export interface StripeCustomerCreateWorkerSqlPool {
  connect(): Promise<StripeCustomerCreateWorkerSqlClient>;
}

export type ClaimedStripeCustomerCreateCommand = Readonly<{
  commandId: string;
  commandSha256: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceSha256: string;
  idempotencyKeySha256: string;
  leaseOwner: string;
  leaseId: string;
  leaseVersion: number;
  leaseExpiresAt: string;
  attemptCount: number;
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function assertId(value: string, field: string): void {
  if (!ID.test(value)) throw new Error(`CCLUB_STRIPE_CUSTOMER_WORKER_${field}_INVALID`);
}

function assertInstant(value: string, field: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`CCLUB_STRIPE_CUSTOMER_WORKER_${field}_INVALID`);
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) throw new Error(`CCLUB_STRIPE_CUSTOMER_WORKER_${field}_INVALID`);
}

function requiredString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || value.length === 0) throw new Error(`CCLUB_STRIPE_CUSTOMER_WORKER_ROW_${field}_INVALID`);
  return value;
}

function requiredSha(row: Record<string, unknown>, field: string): string {
  const value = requiredString(row, field);
  if (!SHA256.test(value)) throw new Error(`CCLUB_STRIPE_CUSTOMER_WORKER_ROW_${field}_INVALID`);
  return value;
}

function requiredPositiveInteger(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`CCLUB_STRIPE_CUSTOMER_WORKER_ROW_${field}_INVALID`);
  }
  return value;
}

export class StripeCustomerCreateCommandWorker {
  constructor(private readonly pool: StripeCustomerCreateWorkerSqlPool) {}

  private async inTenantTransaction<T>(tenantId: string, operation: (client: StripeCustomerCreateWorkerSqlClient) => Promise<T>): Promise<T> {
    assertId(tenantId, "TENANT_ID");
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('crays.app_role','core_service',true)");
      await client.query("select set_config('crays.tenant_id',$1,true)", [tenantId]);
      const result = await operation(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async claimNext(input: Readonly<{
    tenantId: string;
    workerId: string;
    leaseId: string;
    now: string;
    leaseExpiresAt: string;
  }>): Promise<ClaimedStripeCustomerCreateCommand | null> {
    assertId(input.workerId, "WORKER_ID");
    assertId(input.leaseId, "LEASE_ID");
    assertInstant(input.now, "NOW");
    assertInstant(input.leaseExpiresAt, "LEASE_EXPIRES_AT");
    if (Date.parse(input.leaseExpiresAt) <= Date.parse(input.now)) {
      throw new Error("CCLUB_STRIPE_CUSTOMER_WORKER_LEASE_WINDOW_INVALID");
    }

    return this.inTenantTransaction(input.tenantId, async (client) => {
      const result = await client.query(
        `with candidate as (
           select command_id
           from crays_core.clubs_stripe_customer_create_commands
           where tenant_id = $1
             and command_state in ('PENDING','RETRY')
             and next_attempt_at <= $2::timestamptz
             and not_before <= $2::timestamptz
             and expires_at > $2::timestamptz
           order by next_attempt_at asc, created_at asc, command_id asc
           for update skip locked
           limit 1
         )
         update crays_core.clubs_stripe_customer_create_commands as command
         set command_state = 'LEASED',
             lease_owner = $3,
             lease_id = $4,
             lease_expires_at = $5::timestamptz,
             lease_version = command.lease_version + 1,
             attempt_count = command.attempt_count + 1,
             updated_at = transaction_timestamp()
         from candidate
         where command.tenant_id = $1 and command.command_id = candidate.command_id
         returning command.command_id, command.command_sha256,
                   command.stripe_account_scope_sha256,
                   command.customer_subject_reference_sha256,
                   command.idempotency_key_sha256,
                   command.lease_owner, command.lease_id, command.lease_version,
                   command.lease_expires_at, command.attempt_count`,
        [input.tenantId, input.now, input.workerId, input.leaseId, input.leaseExpiresAt],
      );
      if (result.rowCount === 0) return null;
      if (result.rowCount !== 1 || !result.rows[0]) throw new Error("CCLUB_STRIPE_CUSTOMER_WORKER_CLAIM_CARDINALITY_INVALID");
      const row = result.rows[0];
      return Object.freeze({
        commandId: requiredString(row, "command_id"),
        commandSha256: requiredSha(row, "command_sha256"),
        stripeAccountScopeSha256: requiredSha(row, "stripe_account_scope_sha256"),
        customerSubjectReferenceSha256: requiredSha(row, "customer_subject_reference_sha256"),
        idempotencyKeySha256: requiredSha(row, "idempotency_key_sha256"),
        leaseOwner: requiredString(row, "lease_owner"),
        leaseId: requiredString(row, "lease_id"),
        leaseVersion: requiredPositiveInteger(row, "lease_version"),
        leaseExpiresAt: requiredString(row, "lease_expires_at"),
        attemptCount: requiredPositiveInteger(row, "attempt_count"),
      });
    });
  }

  async recoverExpiredLeases(input: Readonly<{
    tenantId: string;
    now: string;
    retryAt: string;
  }>): Promise<readonly string[]> {
    assertInstant(input.now, "NOW");
    assertInstant(input.retryAt, "RETRY_AT");
    return this.inTenantTransaction(input.tenantId, async (client) => {
      const result = await client.query(
        `update crays_core.clubs_stripe_customer_create_commands
         set command_state = 'RETRY', lease_owner = null, lease_id = null, lease_expires_at = null,
             next_attempt_at = $3::timestamptz, updated_at = transaction_timestamp()
         where tenant_id = $1 and command_state = 'LEASED'
           and lease_expires_at <= $2::timestamptz
         returning command_id`,
        [input.tenantId, input.now, input.retryAt],
      );
      return Object.freeze(result.rows.map((row) => requiredString(row, "command_id")));
    });
  }

  async releaseForRetry(input: Readonly<{
    tenantId: string;
    commandId: string;
    workerId: string;
    leaseVersion: number;
    now: string;
    retryAt: string;
  }>): Promise<boolean> {
    assertId(input.commandId, "COMMAND_ID");
    assertId(input.workerId, "WORKER_ID");
    assertPositiveInteger(input.leaseVersion, "LEASE_VERSION");
    assertInstant(input.now, "NOW");
    assertInstant(input.retryAt, "RETRY_AT");
    return this.inTenantTransaction(input.tenantId, async (client) => {
      const result = await client.query(
        `update crays_core.clubs_stripe_customer_create_commands
         set command_state = 'RETRY', lease_owner = null, lease_id = null, lease_expires_at = null,
             next_attempt_at = $6::timestamptz, updated_at = transaction_timestamp()
         where tenant_id = $1 and command_id = $2 and command_state = 'LEASED'
           and lease_owner = $3 and lease_version = $4
           and lease_expires_at > $5::timestamptz`,
        [input.tenantId, input.commandId, input.workerId, input.leaseVersion, input.now, input.retryAt],
      );
      if (result.rowCount > 1) throw new Error("CCLUB_STRIPE_CUSTOMER_WORKER_RETRY_CARDINALITY_INVALID");
      return result.rowCount === 1;
    });
  }

  async markDeadLetter(input: Readonly<{
    tenantId: string;
    commandId: string;
    workerId: string;
    leaseVersion: number;
    now: string;
  }>): Promise<boolean> {
    assertId(input.commandId, "COMMAND_ID");
    assertId(input.workerId, "WORKER_ID");
    assertPositiveInteger(input.leaseVersion, "LEASE_VERSION");
    assertInstant(input.now, "NOW");
    return this.inTenantTransaction(input.tenantId, async (client) => {
      const result = await client.query(
        `update crays_core.clubs_stripe_customer_create_commands
         set command_state = 'DEAD_LETTER', lease_owner = null, lease_id = null, lease_expires_at = null,
             updated_at = transaction_timestamp()
         where tenant_id = $1 and command_id = $2 and command_state = 'LEASED'
           and lease_owner = $3 and lease_version = $4
           and lease_expires_at > $5::timestamptz`,
        [input.tenantId, input.commandId, input.workerId, input.leaseVersion, input.now],
      );
      if (result.rowCount > 1) throw new Error("CCLUB_STRIPE_CUSTOMER_WORKER_DEAD_LETTER_CARDINALITY_INVALID");
      return result.rowCount === 1;
    });
  }
}
