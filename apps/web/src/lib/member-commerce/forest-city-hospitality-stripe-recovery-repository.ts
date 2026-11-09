import { createHash } from "node:crypto";

export type HotelStripeRecoveryClient = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    parameters?: readonly unknown[],
  ): Promise<{ rows: T[]; rowCount?: number }>;
  release(): void;
};

export type HotelStripeRecoveryPool = {
  connect(): Promise<HotelStripeRecoveryClient>;
};

type RecoveryPolicyRow = {
  recovery_policy_id: string;
  max_payment_method_retries: number;
  retry_schedule_seconds: number[];
  action_required_timeout_seconds: number;
  processing_reconciliation_seconds: number;
  checkout_abandonment_seconds: number;
  authority_receipt_sha256: string;
};

type CheckoutAuthorityRow = {
  checkout_command_id: string;
  hold_id: string;
  command_created_at: string;
  command_request_sha256: string;
  hold_status: string;
  hold_expires_at: string;
};

type WebhookRecoveryRow = CheckoutAuthorityRow & {
  webhook_receipt_id: string;
  application_receipt_id: string;
  stripe_created_at: string;
  event_payload_sha256: string;
  derived_payment_state: string;
};

type DeadlineKind =
  | "ACTION_REQUIRED_TIMEOUT"
  | "PROCESSING_RECONCILIATION"
  | "CHECKOUT_ABANDONMENT"
  | "HOLD_EXPIRY";

type RecoveryOutcome =
  | "CUSTOMER_ACTION_REQUIRED"
  | "PROCESSING_OBSERVED"
  | "RETRY_ELIGIBLE"
  | "RETRY_DENIED_POLICY"
  | "RETRY_DENIED_EXPIRED"
  | "RECONCILIATION_REQUIRED"
  | "ABANDONED_RELEASED"
  | "HOLD_EXPIRED_RELEASED"
  | "NO_ACTION_PROVIDER_EVENT_PRESENT"
  | "NO_ACTION_NEWER_PROVIDER_EVENT"
  | "NO_ACTION_ALREADY_TERMINAL";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

function assertUuid(value: string, label: string): void {
  if (!UUID.test(value)) throw new Error(`${label} must be a UUID`);
}

function assertTenant(value: string): void {
  if (value.trim().length === 0) throw new Error("tenantId must be non-empty");
}

function addSeconds(iso: string, seconds: number): string {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString();
}

function earlier(left: string, right: string): string {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

async function transaction<T>(pool: HotelStripeRecoveryPool, run: (client: HotelStripeRecoveryClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  await client.query("BEGIN");
  try {
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function loadCheckoutAuthority(
  client: HotelStripeRecoveryClient,
  tenantId: string,
  checkoutCommandId: string,
): Promise<CheckoutAuthorityRow> {
  const result = await client.query<CheckoutAuthorityRow>(
    `SELECT c.checkout_command_id, c.hold_id, c.created_at AS command_created_at,
            c.request_sha256 AS command_request_sha256, h.hold_status,
            h.expires_at AS hold_expires_at
       FROM crays_core.clubs_hotel_stripe_checkout_commands c
       JOIN crays_core.clubs_hotel_booking_inventory_holds h
         ON h.tenant_id = c.tenant_id AND h.hold_id = c.hold_id
      WHERE c.tenant_id = $1 AND c.checkout_command_id = $2
      FOR UPDATE OF h`,
    [tenantId, checkoutCommandId],
  );
  if (!result.rows[0]) throw new Error("hotel Stripe checkout authority not found");
  return result.rows[0];
}

async function loadRecoveryPolicy(
  client: HotelStripeRecoveryClient,
  tenantId: string,
  checkoutCommandId: string,
  observedAt: string,
): Promise<RecoveryPolicyRow | null> {
  const result = await client.query<RecoveryPolicyRow>(
    `SELECT p.recovery_policy_id, p.max_payment_method_retries, p.retry_schedule_seconds,
            p.action_required_timeout_seconds, p.processing_reconciliation_seconds,
            p.checkout_abandonment_seconds, p.authority_receipt_sha256
       FROM crays_core.clubs_hotel_stripe_recovery_policies p
       JOIN crays_core.clubs_hotel_stripe_checkout_commands c
         ON c.tenant_id = p.tenant_id AND c.checkout_command_id = $2
       JOIN crays_core.clubs_hotel_booking_inventory_holds h
         ON h.tenant_id = c.tenant_id AND h.hold_id = c.hold_id
      WHERE p.tenant_id = $1
        AND p.franchise_project_id = h.franchise_project_id
        AND p.property_id = h.property_id
        AND p.store_id = h.store_id
        AND p.legal_entity_id = h.legal_entity_id
        AND p.stripe_environment = c.stripe_environment
        AND p.lifecycle_state = 'ACTIVE'
        AND p.persisted_record = true
        AND p.synthetic_source = false
        AND p.valid_from <= $3 AND p.valid_until > $3
      ORDER BY p.policy_version DESC
      LIMIT 1`,
    [tenantId, checkoutCommandId, observedAt],
  );
  return result.rows[0] ?? null;
}

async function insertDeadline(
  client: HotelStripeRecoveryClient,
  input: {
    deadlineId: string;
    tenantId: string;
    checkoutCommandId: string;
    holdId: string;
    policyId: string | null;
    sourceWebhookReceiptId: string | null;
    kind: DeadlineKind;
    sourceEvidenceSha256: string;
    dueAt: string;
    idempotencyKey: string;
    createdAt: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO crays_core.clubs_hotel_stripe_recovery_deadlines (
       recovery_deadline_id, tenant_id, checkout_command_id, hold_id, recovery_policy_id,
       source_webhook_receipt_id, deadline_kind, source_evidence_sha256, due_at,
       deadline_state, attempt_count, next_attempt_at, idempotency_key, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',0,$9,$10,$11,$11)
     ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`,
    [input.deadlineId,input.tenantId,input.checkoutCommandId,input.holdId,input.policyId,
     input.sourceWebhookReceiptId,input.kind,input.sourceEvidenceSha256,input.dueAt,
     input.idempotencyKey,input.createdAt],
  );
}

async function insertRecoveryReceipt(
  client: HotelStripeRecoveryClient,
  input: {
    receiptId: string;
    tenantId: string;
    checkoutCommandId: string;
    holdId: string;
    policyId: string | null;
    webhookReceiptId: string | null;
    deadlineId: string | null;
    observation: "ACTION_REQUIRED" | "DECLINED" | "PROCESSING" | "PROCESSING_TIMEOUT" | "CHECKOUT_ABANDONED" | "HOLD_EXPIRED";
    outcome: RecoveryOutcome;
    retryAttemptNo: number | null;
    nextRetryAt: string | null;
    normalizedReasonSha256: string | null;
    evidenceSha256: string;
    idempotencyKey: string;
    observedAt: string;
  },
): Promise<{ receiptId: string; decisionSha256: string }> {
  const decisionSha256 = sha256(canonicalJson({
    checkoutCommandId: input.checkoutCommandId,
    evidenceSha256: input.evidenceSha256,
    observation: input.observation,
    outcome: input.outcome,
    policyId: input.policyId,
    retryAttemptNo: input.retryAttemptNo,
    nextRetryAt: input.nextRetryAt,
  }));
  await client.query(
    `INSERT INTO crays_core.clubs_hotel_stripe_recovery_receipts (
       recovery_receipt_id, tenant_id, checkout_command_id, hold_id, recovery_policy_id,
       source_webhook_receipt_id, recovery_deadline_id, observation_kind, outcome,
       retry_attempt_no, next_retry_at, normalized_reason_sha256, evidence_sha256,
       decision_sha256, idempotency_key, observed_at, provider_mutation_performed,
       formal_applied, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,false,false,$16)
     ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`,
    [input.receiptId,input.tenantId,input.checkoutCommandId,input.holdId,input.policyId,
     input.webhookReceiptId,input.deadlineId,input.observation,input.outcome,
     input.retryAttemptNo,input.nextRetryAt,input.normalizedReasonSha256,input.evidenceSha256,
     decisionSha256,input.idempotencyKey,input.observedAt],
  );
  const persisted = await client.query<{ recovery_receipt_id: string; decision_sha256: string }>(
    `SELECT recovery_receipt_id, decision_sha256
       FROM crays_core.clubs_hotel_stripe_recovery_receipts
      WHERE tenant_id = $1 AND idempotency_key = $2`,
    [input.tenantId,input.idempotencyKey],
  );
  const row = persisted.rows[0];
  if (!row || row.decision_sha256 !== decisionSha256) {
    throw new Error("hotel Stripe recovery receipt replay conflict");
  }
  return { receiptId:row.recovery_receipt_id, decisionSha256 };
}

async function prepareCustomerPaymentMethodRetry(
  client: HotelStripeRecoveryClient,
  input: {
    tenantId: string;
    authority: CheckoutAuthorityRow;
    policy: RecoveryPolicyRow | null;
    webhookReceiptId: string;
    deadlineId: string | null;
    receiptId: string;
    retryCommandId: string;
    observedAt: string;
    evidenceSha256: string;
    observation: "DECLINED" | "ACTION_REQUIRED";
  },
): Promise<RecoveryOutcome> {
  const previous = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM crays_core.clubs_hotel_stripe_payment_retry_commands
      WHERE tenant_id = $1 AND checkout_command_id = $2`,
    [input.tenantId, input.authority.checkout_command_id],
  );
  const attempt = Number(previous.rows[0]?.count ?? "0") + 1;
  const idempotencyKey = `hotel-stripe-recovery:${input.authority.checkout_command_id}:${input.webhookReceiptId}:${input.observation}`;
  const normalizedReasonSha256 = sha256(input.observation === "DECLINED" ? "PAYMENT_METHOD_DECLINED" : "CUSTOMER_ACTION_TIMED_OUT");

  if (input.policy === null || attempt > input.policy.max_payment_method_retries) {
    await insertRecoveryReceipt(client, {
      receiptId:input.receiptId,tenantId:input.tenantId,checkoutCommandId:input.authority.checkout_command_id,
      holdId:input.authority.hold_id,policyId:input.policy?.recovery_policy_id ?? null,
      webhookReceiptId:input.webhookReceiptId,deadlineId:input.deadlineId,observation:input.observation,
      outcome:"RETRY_DENIED_POLICY",retryAttemptNo:null,nextRetryAt:null,normalizedReasonSha256,
      evidenceSha256:input.evidenceSha256,idempotencyKey,observedAt:input.observedAt,
    });
    return "RETRY_DENIED_POLICY";
  }

  const delay = Number(input.policy.retry_schedule_seconds[attempt - 1]);
  const nextRetryAt = addSeconds(input.observedAt, delay);
  if (Date.parse(nextRetryAt) >= Date.parse(input.authority.hold_expires_at)) {
    await insertRecoveryReceipt(client, {
      receiptId:input.receiptId,tenantId:input.tenantId,checkoutCommandId:input.authority.checkout_command_id,
      holdId:input.authority.hold_id,policyId:input.policy.recovery_policy_id,
      webhookReceiptId:input.webhookReceiptId,deadlineId:input.deadlineId,observation:input.observation,
      outcome:"RETRY_DENIED_EXPIRED",retryAttemptNo:null,nextRetryAt:null,normalizedReasonSha256,
      evidenceSha256:input.evidenceSha256,idempotencyKey,observedAt:input.observedAt,
    });
    return "RETRY_DENIED_EXPIRED";
  }

  const recoveryReceipt = await insertRecoveryReceipt(client, {
    receiptId:input.receiptId,tenantId:input.tenantId,checkoutCommandId:input.authority.checkout_command_id,
    holdId:input.authority.hold_id,policyId:input.policy.recovery_policy_id,
    webhookReceiptId:input.webhookReceiptId,deadlineId:input.deadlineId,observation:input.observation,
    outcome:"RETRY_ELIGIBLE",retryAttemptNo:attempt,nextRetryAt,normalizedReasonSha256,
    evidenceSha256:input.evidenceSha256,idempotencyKey,observedAt:input.observedAt,
  });
  const requestSha256 = sha256(canonicalJson({
    checkoutCommandId: input.authority.checkout_command_id,
    holdId: input.authority.hold_id,
    retryAttemptNo: attempt,
    notBefore: nextRetryAt,
    policyAuthoritySha256: input.policy.authority_receipt_sha256,
    purpose: "CUSTOMER_SUPPLIES_PAYMENT_METHOD",
  }));
  await client.query(
    `INSERT INTO crays_core.clubs_hotel_stripe_payment_retry_commands (
       retry_command_id, tenant_id, checkout_command_id, hold_id, recovery_policy_id,
       recovery_receipt_id, retry_attempt_no, not_before, expires_at, command_state,
       idempotency_key, request_sha256, provider_mutation_performed, formal_applied, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PERSISTED_PENDING_CUSTOMER_PAYMENT_METHOD',$10,$11,false,false,$12)
     ON CONFLICT (tenant_id, checkout_command_id, retry_attempt_no) DO NOTHING`,
    [input.retryCommandId,input.tenantId,input.authority.checkout_command_id,input.authority.hold_id,
     input.policy.recovery_policy_id,recoveryReceipt.receiptId,attempt,nextRetryAt,input.authority.hold_expires_at,
     `${idempotencyKey}:attempt:${attempt}`,requestSha256,input.observedAt],
  );
  return "RETRY_ELIGIBLE";
}

export async function scheduleHotelStripeCheckoutRecovery(input: {
  pool: HotelStripeRecoveryPool;
  tenantId: string;
  checkoutCommandId: string;
  holdExpiryDeadlineId: string;
  abandonmentDeadlineId: string;
  observedAt: string;
}): Promise<{ holdExpiryScheduled: true; abandonmentScheduled: boolean; policyMissing: boolean }> {
  assertTenant(input.tenantId);
  [input.checkoutCommandId,input.holdExpiryDeadlineId,input.abandonmentDeadlineId].forEach((id) => assertUuid(id, "recovery id"));
  return transaction(input.pool, async (client) => {
    const authority = await loadCheckoutAuthority(client, input.tenantId, input.checkoutCommandId);
    const policy = await loadRecoveryPolicy(client, input.tenantId, input.checkoutCommandId, input.observedAt);
    await insertDeadline(client, {
      deadlineId:input.holdExpiryDeadlineId,tenantId:input.tenantId,checkoutCommandId:input.checkoutCommandId,
      holdId:authority.hold_id,policyId:null,sourceWebhookReceiptId:null,kind:"HOLD_EXPIRY",
      sourceEvidenceSha256:authority.command_request_sha256,dueAt:authority.hold_expires_at,
      idempotencyKey:`hotel-stripe-hold-expiry:${input.checkoutCommandId}`,createdAt:input.observedAt,
    });
    if (policy !== null) {
      await insertDeadline(client, {
        deadlineId:input.abandonmentDeadlineId,tenantId:input.tenantId,checkoutCommandId:input.checkoutCommandId,
        holdId:authority.hold_id,policyId:policy.recovery_policy_id,sourceWebhookReceiptId:null,
        kind:"CHECKOUT_ABANDONMENT",sourceEvidenceSha256:sha256(canonicalJson({command:authority.command_request_sha256,policy:policy.authority_receipt_sha256})),
        dueAt:earlier(addSeconds(authority.command_created_at,policy.checkout_abandonment_seconds),authority.hold_expires_at),
        idempotencyKey:`hotel-stripe-abandonment:${input.checkoutCommandId}:${policy.recovery_policy_id}`,createdAt:input.observedAt,
      });
    }
    return { holdExpiryScheduled:true, abandonmentScheduled:policy !== null, policyMissing:policy === null };
  });
}

export async function observeHotelStripeWebhookRecovery(input: {
  pool: HotelStripeRecoveryPool;
  tenantId: string;
  applicationReceiptId: string;
  recoveryReceiptId: string;
  recoveryDeadlineId: string;
  retryCommandId: string;
  observedAt: string;
}): Promise<{ outcome: RecoveryOutcome | "NO_RECOVERY_ACTION"; deadlineScheduled: boolean }> {
  assertTenant(input.tenantId);
  [input.applicationReceiptId,input.recoveryReceiptId,input.recoveryDeadlineId,input.retryCommandId].forEach((id) => assertUuid(id, "recovery id"));
  return transaction(input.pool, async (client) => {
    const result = await client.query<WebhookRecoveryRow>(
      `SELECT c.checkout_command_id, c.hold_id, c.created_at AS command_created_at,
              c.request_sha256 AS command_request_sha256, h.hold_status,
              h.expires_at AS hold_expires_at, w.webhook_receipt_id,
              a.application_receipt_id, a.stripe_created_at, a.event_payload_sha256,
              a.derived_payment_state
         FROM crays_core.clubs_hotel_stripe_webhook_application_receipts a
         JOIN crays_core.clubs_hotel_stripe_webhook_inbox w
           ON w.webhook_receipt_id = a.webhook_receipt_id AND w.tenant_id = a.tenant_id
         JOIN crays_core.clubs_hotel_stripe_checkout_commands c
           ON c.checkout_command_id = a.checkout_command_id AND c.tenant_id = a.tenant_id
         JOIN crays_core.clubs_hotel_booking_inventory_holds h
           ON h.hold_id = c.hold_id AND h.tenant_id = c.tenant_id
        WHERE a.tenant_id = $1 AND a.application_receipt_id = $2
          AND a.disposition = 'APPLIED_CURRENT'
        FOR UPDATE OF h`,
      [input.tenantId, input.applicationReceiptId],
    );
    const event = result.rows[0];
    if (!event) throw new Error("verified current Stripe webhook application not found");
    const policy = await loadRecoveryPolicy(client, input.tenantId, event.checkout_command_id, input.observedAt);

    if (event.derived_payment_state === "FAILED") {
      const outcome = await prepareCustomerPaymentMethodRetry(client, {
        tenantId:input.tenantId,authority:event,policy,webhookReceiptId:event.webhook_receipt_id,
        deadlineId:null,receiptId:input.recoveryReceiptId,retryCommandId:input.retryCommandId,
        observedAt:input.observedAt,evidenceSha256:event.event_payload_sha256,observation:"DECLINED",
      });
      return { outcome, deadlineScheduled:false };
    }

    if (event.derived_payment_state === "REQUIRES_ACTION") {
      await insertRecoveryReceipt(client, {
        receiptId:input.recoveryReceiptId,tenantId:input.tenantId,checkoutCommandId:event.checkout_command_id,
        holdId:event.hold_id,policyId:policy?.recovery_policy_id ?? null,webhookReceiptId:event.webhook_receipt_id,
        deadlineId:null,observation:"ACTION_REQUIRED",outcome:"CUSTOMER_ACTION_REQUIRED",retryAttemptNo:null,
        nextRetryAt:null,normalizedReasonSha256:sha256("CUSTOMER_3DS_ACTION_REQUIRED"),
        evidenceSha256:event.event_payload_sha256,idempotencyKey:`hotel-stripe-action:${event.webhook_receipt_id}`,
        observedAt:input.observedAt,
      });
      if (policy !== null) {
        await insertDeadline(client, {
          deadlineId:input.recoveryDeadlineId,tenantId:input.tenantId,checkoutCommandId:event.checkout_command_id,
          holdId:event.hold_id,policyId:policy.recovery_policy_id,sourceWebhookReceiptId:event.webhook_receipt_id,
          kind:"ACTION_REQUIRED_TIMEOUT",sourceEvidenceSha256:event.event_payload_sha256,
          dueAt:earlier(addSeconds(event.stripe_created_at,policy.action_required_timeout_seconds),event.hold_expires_at),
          idempotencyKey:`hotel-stripe-action-timeout:${event.webhook_receipt_id}:${policy.recovery_policy_id}`,
          createdAt:input.observedAt,
        });
      }
      return { outcome:"CUSTOMER_ACTION_REQUIRED", deadlineScheduled:policy !== null };
    }

    if (event.derived_payment_state === "PROCESSING") {
      await insertRecoveryReceipt(client, {
        receiptId:input.recoveryReceiptId,tenantId:input.tenantId,checkoutCommandId:event.checkout_command_id,
        holdId:event.hold_id,policyId:policy?.recovery_policy_id ?? null,webhookReceiptId:event.webhook_receipt_id,
        deadlineId:null,observation:"PROCESSING",outcome:"PROCESSING_OBSERVED",retryAttemptNo:null,
        nextRetryAt:null,normalizedReasonSha256:null,evidenceSha256:event.event_payload_sha256,
        idempotencyKey:`hotel-stripe-processing:${event.webhook_receipt_id}`,observedAt:input.observedAt,
      });
      if (policy !== null) {
        await insertDeadline(client, {
          deadlineId:input.recoveryDeadlineId,tenantId:input.tenantId,checkoutCommandId:event.checkout_command_id,
          holdId:event.hold_id,policyId:policy.recovery_policy_id,sourceWebhookReceiptId:event.webhook_receipt_id,
          kind:"PROCESSING_RECONCILIATION",sourceEvidenceSha256:event.event_payload_sha256,
          dueAt:earlier(addSeconds(event.stripe_created_at,policy.processing_reconciliation_seconds),event.hold_expires_at),
          idempotencyKey:`hotel-stripe-processing-timeout:${event.webhook_receipt_id}:${policy.recovery_policy_id}`,
          createdAt:input.observedAt,
        });
      }
      return { outcome:"PROCESSING_OBSERVED", deadlineScheduled:policy !== null };
    }

    return { outcome:"NO_RECOVERY_ACTION", deadlineScheduled:false };
  });
}

export async function claimDueHotelStripeRecoveryDeadline(input: {
  pool: HotelStripeRecoveryPool;
  tenantId: string;
  leaseToken: string;
  workerIdentity: string;
  observedAt: string;
  leaseSeconds: number;
}): Promise<{ deadlineId: string; kind: DeadlineKind } | null> {
  assertTenant(input.tenantId);
  assertUuid(input.leaseToken, "leaseToken");
  if (input.workerIdentity.trim().length === 0) throw new Error("workerIdentity is required");
  if (!Number.isSafeInteger(input.leaseSeconds) || input.leaseSeconds < 30 || input.leaseSeconds > 900) throw new Error("invalid leaseSeconds");
  return transaction(input.pool, async (client) => {
    await client.query(
      `UPDATE crays_core.clubs_hotel_stripe_recovery_deadlines
          SET deadline_state = 'PENDING', lease_token = NULL, lease_owner_sha256 = NULL,
              lease_expires_at = NULL, next_attempt_at = LEAST(next_attempt_at, $2), updated_at = $2
        WHERE tenant_id = $1 AND deadline_state = 'LEASED' AND lease_expires_at <= $2`,
      [input.tenantId,input.observedAt],
    );
    const claimed = await client.query<{ recovery_deadline_id: string; deadline_kind: DeadlineKind }>(
      `WITH candidate AS (
         SELECT recovery_deadline_id
           FROM crays_core.clubs_hotel_stripe_recovery_deadlines
          WHERE tenant_id = $1 AND deadline_state = 'PENDING'
            AND due_at <= $2 AND next_attempt_at <= $2
          ORDER BY CASE deadline_kind WHEN 'HOLD_EXPIRY' THEN 0 ELSE 1 END, due_at, created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1
       )
       UPDATE crays_core.clubs_hotel_stripe_recovery_deadlines d
          SET deadline_state = 'LEASED', lease_token = $3, lease_owner_sha256 = $4,
              lease_expires_at = $5, attempt_count = attempt_count + 1, updated_at = $2
         FROM candidate
        WHERE d.recovery_deadline_id = candidate.recovery_deadline_id
       RETURNING d.recovery_deadline_id, d.deadline_kind`,
      [input.tenantId,input.observedAt,input.leaseToken,sha256(input.workerIdentity),
       addSeconds(input.observedAt,input.leaseSeconds)],
    );
    const row = claimed.rows[0];
    return row ? { deadlineId:row.recovery_deadline_id, kind:row.deadline_kind } : null;
  });
}

async function appendHoldTerminalEvent(
  client: HotelStripeRecoveryClient,
  input: { eventId:string; tenantId:string; holdId:string; toStatus:"expired"|"released"; evidenceSha256:string; observedAt:string },
): Promise<void> {
  const sequence = await client.query<{ next_sequence: number }>(
    `SELECT COALESCE(max(sequence_no),0) + 1 AS next_sequence
       FROM crays_core.clubs_hotel_booking_inventory_hold_events
      WHERE tenant_id = $1 AND hold_id = $2`,
    [input.tenantId,input.holdId],
  );
  await client.query(
    `INSERT INTO crays_core.clubs_hotel_booking_inventory_hold_events (
       event_id, tenant_id, hold_id, sequence_no, event_type, from_status, to_status,
       evidence_sha256, event_payload, occurred_at
     ) VALUES ($1,$2,$3,$4,$5,'held-pending-payment',$6,$7,$8::jsonb,$9)`,
    [input.eventId,input.tenantId,input.holdId,Number(sequence.rows[0]?.next_sequence ?? 1),
     input.toStatus === "expired" ? "stripe-hold-expired" : "stripe-checkout-abandoned",
     input.toStatus,input.evidenceSha256,canonicalJson({source:"CCLUB-074_RECOVERY",providerMutationPerformed:false}),input.observedAt],
  );
}

export async function applyClaimedHotelStripeRecoveryDeadline(input: {
  pool: HotelStripeRecoveryPool;
  tenantId: string;
  deadlineId: string;
  leaseToken: string;
  recoveryReceiptId: string;
  retryCommandId: string;
  holdEventId: string;
  observedAt: string;
}): Promise<{ outcome: RecoveryOutcome }> {
  assertTenant(input.tenantId);
  [input.deadlineId,input.leaseToken,input.recoveryReceiptId,input.retryCommandId,input.holdEventId].forEach((id) => assertUuid(id, "recovery id"));
  return transaction(input.pool, async (client) => {
    const deadlineResult = await client.query<{
      recovery_deadline_id:string; checkout_command_id:string; hold_id:string; recovery_policy_id:string|null;
      source_webhook_receipt_id:string|null; deadline_kind:DeadlineKind; source_evidence_sha256:string;
      due_at:string; lease_expires_at:string;
    }>(
      `SELECT recovery_deadline_id, checkout_command_id, hold_id, recovery_policy_id,
              source_webhook_receipt_id, deadline_kind, source_evidence_sha256, due_at, lease_expires_at
         FROM crays_core.clubs_hotel_stripe_recovery_deadlines
        WHERE tenant_id = $1 AND recovery_deadline_id = $2 AND deadline_state = 'LEASED'
          AND lease_token = $3
        FOR UPDATE`,
      [input.tenantId,input.deadlineId,input.leaseToken],
    );
    const deadline = deadlineResult.rows[0];
    if (!deadline || Date.parse(deadline.lease_expires_at) < Date.parse(input.observedAt)) throw new Error("recovery deadline lease is missing or expired");
    if (Date.parse(deadline.due_at) > Date.parse(input.observedAt)) throw new Error("recovery deadline is not due");
    const authority = await loadCheckoutAuthority(client,input.tenantId,deadline.checkout_command_id);
    const policy = await loadRecoveryPolicy(client,input.tenantId,deadline.checkout_command_id,input.observedAt);

    let outcome: RecoveryOutcome;
    let observation: "ACTION_REQUIRED"|"DECLINED"|"PROCESSING"|"PROCESSING_TIMEOUT"|"CHECKOUT_ABANDONED"|"HOLD_EXPIRED";
    const normalizedReasonSha256: string | null = null;

    if (authority.hold_status !== "held-pending-payment") {
      outcome = "NO_ACTION_ALREADY_TERMINAL";
      observation = deadline.deadline_kind === "HOLD_EXPIRY" ? "HOLD_EXPIRED" : deadline.deadline_kind === "CHECKOUT_ABANDONMENT" ? "CHECKOUT_ABANDONED" : deadline.deadline_kind === "PROCESSING_RECONCILIATION" ? "PROCESSING_TIMEOUT" : "ACTION_REQUIRED";
    } else if (Date.parse(authority.hold_expires_at) <= Date.parse(input.observedAt)) {
      outcome = "HOLD_EXPIRED_RELEASED";
      observation = "HOLD_EXPIRED";
      await client.query(
        `UPDATE crays_core.clubs_hotel_booking_inventory_holds
            SET hold_status = 'expired', terminal_reason = 'STRIPE_PAYMENT_HOLD_EXPIRED', updated_at = $3
          WHERE tenant_id = $1 AND hold_id = $2 AND hold_status = 'held-pending-payment'`,
        [input.tenantId,authority.hold_id,input.observedAt],
      );
      await client.query(
        `UPDATE crays_core.clubs_hotel_booking_inventory_hold_allocations
            SET allocation_status = 'expired', updated_at = $3
          WHERE tenant_id = $1 AND hold_id = $2 AND allocation_status = 'held'`,
        [input.tenantId,authority.hold_id,input.observedAt],
      );
      await appendHoldTerminalEvent(client,{eventId:input.holdEventId,tenantId:input.tenantId,holdId:authority.hold_id,toStatus:"expired",evidenceSha256:deadline.source_evidence_sha256,observedAt:input.observedAt});
    } else if (deadline.deadline_kind === "CHECKOUT_ABANDONMENT") {
      observation = "CHECKOUT_ABANDONED";
      const providerEvent = await client.query<{ present:boolean }>(
        `SELECT true AS present FROM crays_core.clubs_hotel_stripe_webhook_inbox
          WHERE tenant_id = $1 AND checkout_command_id = $2 LIMIT 1`,
        [input.tenantId,authority.checkout_command_id],
      );
      if (providerEvent.rows[0]?.present) {
        outcome = "NO_ACTION_PROVIDER_EVENT_PRESENT";
      } else {
        outcome = "ABANDONED_RELEASED";
        await client.query(
          `UPDATE crays_core.clubs_hotel_booking_inventory_holds
              SET hold_status = 'released', terminal_reason = 'STRIPE_CHECKOUT_ABANDONED', updated_at = $3
            WHERE tenant_id = $1 AND hold_id = $2 AND hold_status = 'held-pending-payment'`,
          [input.tenantId,authority.hold_id,input.observedAt],
        );
        await client.query(
          `UPDATE crays_core.clubs_hotel_booking_inventory_hold_allocations
              SET allocation_status = 'released', updated_at = $3
            WHERE tenant_id = $1 AND hold_id = $2 AND allocation_status = 'held'`,
          [input.tenantId,authority.hold_id,input.observedAt],
        );
        await appendHoldTerminalEvent(client,{eventId:input.holdEventId,tenantId:input.tenantId,holdId:authority.hold_id,toStatus:"released",evidenceSha256:deadline.source_evidence_sha256,observedAt:input.observedAt});
      }
    } else if (deadline.deadline_kind === "PROCESSING_RECONCILIATION") {
      observation = "PROCESSING_TIMEOUT";
      const newer = await client.query<{ present:boolean }>(
        `SELECT true AS present
           FROM crays_core.clubs_hotel_stripe_webhook_application_receipts a
           JOIN crays_core.clubs_hotel_stripe_webhook_inbox w ON w.webhook_receipt_id = a.webhook_receipt_id
          WHERE a.tenant_id = $1 AND a.checkout_command_id = $2 AND a.disposition = 'APPLIED_CURRENT'
            AND w.webhook_receipt_id <> $3 AND a.stripe_created_at > (
              SELECT stripe_created_at FROM crays_core.clubs_hotel_stripe_webhook_inbox WHERE webhook_receipt_id = $3
            ) LIMIT 1`,
        [input.tenantId,authority.checkout_command_id,deadline.source_webhook_receipt_id],
      );
      outcome = newer.rows[0]?.present ? "NO_ACTION_NEWER_PROVIDER_EVENT" : "RECONCILIATION_REQUIRED";
    } else if (deadline.deadline_kind === "ACTION_REQUIRED_TIMEOUT") {
      observation = "ACTION_REQUIRED";
      const newer = await client.query<{ present:boolean }>(
        `SELECT true AS present
           FROM crays_core.clubs_hotel_stripe_webhook_application_receipts a
           JOIN crays_core.clubs_hotel_stripe_webhook_inbox w ON w.webhook_receipt_id = a.webhook_receipt_id
          WHERE a.tenant_id = $1 AND a.checkout_command_id = $2 AND a.disposition = 'APPLIED_CURRENT'
            AND w.webhook_receipt_id <> $3 AND a.stripe_created_at > (
              SELECT stripe_created_at FROM crays_core.clubs_hotel_stripe_webhook_inbox WHERE webhook_receipt_id = $3
            ) LIMIT 1`,
        [input.tenantId,authority.checkout_command_id,deadline.source_webhook_receipt_id],
      );
      if (newer.rows[0]?.present) {
        outcome = "NO_ACTION_NEWER_PROVIDER_EVENT";
      } else {
        outcome = await prepareCustomerPaymentMethodRetry(client,{
          tenantId:input.tenantId,authority,policy,webhookReceiptId:String(deadline.source_webhook_receipt_id),
          deadlineId:deadline.recovery_deadline_id,receiptId:input.recoveryReceiptId,retryCommandId:input.retryCommandId,
          observedAt:input.observedAt,evidenceSha256:deadline.source_evidence_sha256,observation:"ACTION_REQUIRED",
        });
        await client.query(
          `UPDATE crays_core.clubs_hotel_stripe_recovery_deadlines
              SET deadline_state = 'RESOLVED', lease_token = NULL, lease_owner_sha256 = NULL,
                  lease_expires_at = NULL, updated_at = $3
            WHERE tenant_id = $1 AND recovery_deadline_id = $2 AND lease_token = $4`,
          [input.tenantId,input.deadlineId,input.observedAt,input.leaseToken],
        );
        return { outcome };
      }
    } else {
      observation = "HOLD_EXPIRED";
      outcome = "RETRY_DENIED_EXPIRED";
    }

    await insertRecoveryReceipt(client,{
      receiptId:input.recoveryReceiptId,tenantId:input.tenantId,checkoutCommandId:authority.checkout_command_id,
      holdId:authority.hold_id,policyId:deadline.recovery_policy_id,
      webhookReceiptId:observation === "HOLD_EXPIRED" ? null : deadline.source_webhook_receipt_id,
      deadlineId:deadline.recovery_deadline_id,observation,outcome,retryAttemptNo:null,nextRetryAt:null,
      normalizedReasonSha256,evidenceSha256:deadline.source_evidence_sha256,
      idempotencyKey:`hotel-stripe-deadline:${deadline.recovery_deadline_id}:${outcome}`,observedAt:input.observedAt,
    });
    await client.query(
      `UPDATE crays_core.clubs_hotel_stripe_recovery_deadlines
          SET deadline_state = 'RESOLVED', lease_token = NULL, lease_owner_sha256 = NULL,
              lease_expires_at = NULL, updated_at = $3
        WHERE tenant_id = $1 AND recovery_deadline_id = $2 AND lease_token = $4`,
      [input.tenantId,input.deadlineId,input.observedAt,input.leaseToken],
    );
    return { outcome };
  });
}
