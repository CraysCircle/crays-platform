import {createHash} from "node:crypto";

import type {createHotelBookingCancellationAuthority} from "./hotel-booking-cancellation-authority-contract";

export const HOTEL_PMS_CANCELLATION_PROVIDER_SAGA_VERSION =
  "cclub.phase9.hotel-pms-cancellation-provider-saga.v1" as const;

type CancellationAuthority = ReturnType<
  typeof createHotelBookingCancellationAuthority
>;
export type HotelCancellationSagaDb = Readonly<{
  query<T = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<Readonly<{rows: T[]}>>;
  release(): void;
}>;
export type HotelCancellationSagaPool = Readonly<{
  connect(): Promise<HotelCancellationSagaDb>;
}>;
const SHA256 = /^[a-f0-9]{64}$/;
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const instant = (value: string, code: string) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return parsed;
};

export type PrepareHotelPmsCancellationCommandInput = Readonly<{
  cancellationCommandId: string;
  authority: CancellationAuthority;
  providerBinding: Readonly<{
    providerBindingReceiptId: string;
    providerCode: string;
    providerConfigurationVaultReference: string;
    providerConfigurationSha256: string;
    providerReservationReferenceVaultReference: string;
    providerReservationReferenceHash: string;
    active: true;
    assignmentBound: true;
    observedAt: string;
  }>;
  availableAt: string;
  createdAt: string;
}>;

export function prepareHotelPmsCancellationCommand(
  input: PrepareHotelPmsCancellationCommandInput,
) {
  const {authority, providerBinding: binding} = input;
  if (
    !input.cancellationCommandId.trim() ||
    !binding.providerBindingReceiptId.trim() ||
    !binding.providerCode.trim()
  ) {
    throw new Error("HOTEL_PMS_CANCELLATION_COMMAND_REFERENCE_REQUIRED");
  }
  if (
    authority.status !== "authorized-awaiting-provider-cancellation" ||
    authority.externalActionPerformed ||
    authority.formalActionAuthorized ||
    !SHA256.test(authority.authoritySha256)
  ) {
    throw new Error("HOTEL_PMS_CANCELLATION_AUTHORITY_INVALID");
  }
  if (
    binding.active !== true ||
    binding.assignmentBound !== true ||
    !binding.providerConfigurationVaultReference.startsWith("vault://") ||
    !binding.providerReservationReferenceVaultReference.startsWith("vault://") ||
    !SHA256.test(binding.providerConfigurationSha256) ||
    !SHA256.test(binding.providerReservationReferenceHash)
  ) {
    throw new Error("HOTEL_PMS_CANCELLATION_PROVIDER_BINDING_INVALID");
  }
  const observedAt = instant(
    binding.observedAt,
    "HOTEL_PMS_CANCELLATION_PROVIDER_BINDING_TIME_INVALID",
  );
  const availableAt = instant(
    input.availableAt,
    "HOTEL_PMS_CANCELLATION_AVAILABLE_AT_INVALID",
  );
  const createdAt = instant(
    input.createdAt,
    "HOTEL_PMS_CANCELLATION_CREATED_AT_INVALID",
  );
  if (observedAt > createdAt || availableAt < createdAt) {
    throw new Error("HOTEL_PMS_CANCELLATION_COMMAND_TIMELINE_INVALID");
  }
  const requestBody = Object.freeze({
    cancellationAuthorityId: authority.cancellationAuthorityId,
    authoritySha256: authority.authoritySha256,
    tenantId: authority.scope.tenantId,
    projectId: authority.scope.projectId,
    siteId: authority.scope.siteId,
    propertyId: authority.scope.propertyId,
    reservationId: authority.scope.reservationId,
    providerBindingReceiptId: binding.providerBindingReceiptId,
    providerCode: binding.providerCode,
    providerConfigurationSha256: binding.providerConfigurationSha256,
    providerReservationReferenceHash: binding.providerReservationReferenceHash,
    requestedOperation: "cancel-confirmed-reservation" as const,
  });
  return Object.freeze({
    contractVersion: HOTEL_PMS_CANCELLATION_PROVIDER_SAGA_VERSION,
    cancellationCommandId: input.cancellationCommandId,
    cancellationAuthorityId: authority.cancellationAuthorityId,
    tenantId: authority.scope.tenantId,
    projectId: authority.scope.projectId,
    siteId: authority.scope.siteId,
    propertyId: authority.scope.propertyId,
    providerBindingReceiptId: binding.providerBindingReceiptId,
    providerCode: binding.providerCode,
    providerConfigurationVaultReference:
      binding.providerConfigurationVaultReference,
    providerConfigurationSha256: binding.providerConfigurationSha256,
    providerReservationReferenceVaultReference:
      binding.providerReservationReferenceVaultReference,
    providerReservationReferenceHash:
      binding.providerReservationReferenceHash,
    requestSha256: digest(requestBody),
    requestBody,
    commandState: "queued" as const,
    attemptCount: 0,
    availableAt: input.availableAt,
    createdAt: input.createdAt,
    providerCallPerformed: false as const,
    refundAuthorized: false as const,
    inventoryReleaseAuthorized: false as const,
    formalActionAuthorized: false as const,
  });
}

export type LeasedHotelPmsCancellationCommand = Readonly<{
  cancellationCommandId: string;
  tenantId: string;
  providerCode: string;
  requestSha256: string;
  commandState: "leased";
  attemptCount: number;
  leaseToken: string;
  leaseOwnerHash: string;
  leaseExpiresAt: string;
}>;

export function createHotelPmsCancellationAttemptReceipt(
  command: LeasedHotelPmsCancellationCommand,
  input: Readonly<{
    attemptReceiptId: string;
    outcome: "accepted" | "retryable" | "unknown" | "terminal";
    responseSha256?: string;
    providerRequestReference?: string;
    errorCode?: string;
    startedAt: string;
    completedAt: string;
    retryAvailableAt?: string;
  }>,
) {
  if (
    command.commandState !== "leased" ||
    !command.cancellationCommandId.trim() ||
    !input.attemptReceiptId.trim() ||
    !SHA256.test(command.requestSha256) ||
    !SHA256.test(command.leaseOwnerHash) ||
    !command.leaseToken.trim() ||
    !Number.isSafeInteger(command.attemptCount) ||
    command.attemptCount < 1
  ) {
    throw new Error("HOTEL_PMS_CANCELLATION_ATTEMPT_LEASE_INVALID");
  }
  if (input.responseSha256 && !SHA256.test(input.responseSha256)) {
    throw new Error("HOTEL_PMS_CANCELLATION_RESPONSE_HASH_INVALID");
  }
  const startedAt = instant(
    input.startedAt,
    "HOTEL_PMS_CANCELLATION_ATTEMPT_TIME_INVALID",
  );
  const completedAt = instant(
    input.completedAt,
    "HOTEL_PMS_CANCELLATION_ATTEMPT_TIME_INVALID",
  );
  const leaseExpiresAt = instant(
    command.leaseExpiresAt,
    "HOTEL_PMS_CANCELLATION_LEASE_EXPIRY_INVALID",
  );
  if (completedAt < startedAt || completedAt > leaseExpiresAt) {
    throw new Error("HOTEL_PMS_CANCELLATION_ATTEMPT_OUTSIDE_LEASE");
  }
  if (
    input.outcome === "accepted" &&
    (!input.providerRequestReference?.trim() || !input.responseSha256)
  ) {
    throw new Error("HOTEL_PMS_CANCELLATION_ACCEPTANCE_EVIDENCE_REQUIRED");
  }
  if (
    input.outcome === "retryable" &&
    (!input.retryAvailableAt ||
      instant(input.retryAvailableAt, "HOTEL_PMS_CANCELLATION_RETRY_TIME_INVALID") <=
        completedAt)
  ) {
    throw new Error("HOTEL_PMS_CANCELLATION_RETRY_TIME_INVALID");
  }
  const nextState = {
    accepted: "accepted-awaiting-confirmation",
    retryable: "retryable-failure",
    unknown: "reconciliation-required",
    terminal: "terminal-failure",
  } as const;
  const body = Object.freeze({
    attemptReceiptId: input.attemptReceiptId,
    cancellationCommandId: command.cancellationCommandId,
    tenantId: command.tenantId,
    attemptNumber: command.attemptCount,
    leaseToken: command.leaseToken,
    leaseOwnerHash: command.leaseOwnerHash,
    requestSha256: command.requestSha256,
    outcome: input.outcome,
    responseSha256: input.responseSha256 ?? null,
    providerRequestReference: input.providerRequestReference ?? null,
    errorCode: input.errorCode ?? null,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  });
  return Object.freeze({
    ...body,
    attemptReceiptSha256: digest(body),
    nextCommandState: nextState[input.outcome],
    retryAvailableAt: input.retryAvailableAt ?? null,
    providerCancellationConfirmed: false as const,
    inventoryReleaseAuthorized: false as const,
  });
}

export function acceptAuthenticatedHotelPmsCancellationConfirmation(
  command: Readonly<{
    cancellationCommandId: string;
    tenantId: string;
    providerCode: string;
    commandState: "accepted-awaiting-confirmation";
  }>,
  acceptedAttempt: ReturnType<typeof createHotelPmsCancellationAttemptReceipt>,
  input: Readonly<{
    confirmationReceiptId: string;
    acceptedAttemptReceiptId: string;
    providerCode: string;
    providerStatus: "canceled";
    providerConfirmationReference: string;
    eventPayloadSha256: string;
    authenticationMethod: "hmac-sha256" | "mtls" | "signed-webhook";
    signatureVerified: boolean;
    observedAt: string;
    receivedAt: string;
  }>,
) {
  if (
    command.commandState !== "accepted-awaiting-confirmation" ||
    acceptedAttempt.outcome !== "accepted" ||
    acceptedAttempt.cancellationCommandId !== command.cancellationCommandId ||
    input.acceptedAttemptReceiptId !== acceptedAttempt.attemptReceiptId ||
    input.providerCode !== command.providerCode ||
    input.providerStatus !== "canceled"
  ) {
    throw new Error("HOTEL_PMS_CANCELLATION_CONFIRMATION_SCOPE_MISMATCH");
  }
  if (
    !input.confirmationReceiptId.trim() ||
    !input.providerConfirmationReference.trim() ||
    !SHA256.test(input.eventPayloadSha256) ||
    !input.signatureVerified
  ) {
    throw new Error("HOTEL_PMS_CANCELLATION_CONFIRMATION_AUTH_INVALID");
  }
  const observedAt = instant(
    input.observedAt,
    "HOTEL_PMS_CANCELLATION_CONFIRMATION_TIME_INVALID",
  );
  const receivedAt = instant(
    input.receivedAt,
    "HOTEL_PMS_CANCELLATION_CONFIRMATION_TIME_INVALID",
  );
  if (receivedAt < observedAt || receivedAt - observedAt > 300_000) {
    throw new Error("HOTEL_PMS_CANCELLATION_CONFIRMATION_REPLAY_WINDOW_INVALID");
  }
  const body = Object.freeze({
    ...input,
    cancellationCommandId: command.cancellationCommandId,
    tenantId: command.tenantId,
    signatureVerified: true as const,
  });
  return Object.freeze({
    ...body,
    confirmationSha256: digest(body),
    nextCommandState: "provider-confirmed" as const,
    providerCancellationConfirmed: true as const,
    stripeRefundAuthorized: false as const,
    inventoryReleaseAuthorized: false as const,
    externalActionPerformedByThisFunction: false as const,
    formalActionAuthorized: false as const,
  });
}

async function transaction<T>(
  pool: HotelCancellationSagaPool,
  tenantId: string,
  work: (db: HotelCancellationSagaDb) => Promise<T>,
) {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query(
      "select set_config('crays.app_role','integration_service',true),set_config('crays.tenant_id',$1,true)",
      [tenantId],
    );
    const result = await work(db);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    db.release();
  }
}

export function persistHotelPmsCancellationCommand(
  pool: HotelCancellationSagaPool,
  input: PrepareHotelPmsCancellationCommandInput,
) {
  const command = prepareHotelPmsCancellationCommand(input);
  const authority = input.authority;
  return transaction(pool, command.tenantId, async (db) => {
    const prior = (
      await db.query<Readonly<{
        cancellation_authority_id: string;
        authority_sha256: string;
      }>>(
        `select cancellation_authority_id,authority_sha256
           from crays_core.clubs_hotel_booking_cancellation_authorities
          where tenant_id=$1 and idempotency_key=$2`,
        [command.tenantId, authority.idempotencyKey],
      )
    ).rows[0];
    if (prior) {
      if (
        prior.cancellation_authority_id !== authority.cancellationAuthorityId ||
        prior.authority_sha256 !== authority.authoritySha256
      ) throw new Error("HOTEL_PMS_CANCELLATION_AUTHORITY_REPLAY_CONFLICT");
      return Object.freeze({
        cancellationAuthorityId: prior.cancellation_authority_id,
        cancellationCommandId: command.cancellationCommandId,
        replayed: true as const,
      });
    }
    await db.query(
      `insert into crays_core.clubs_hotel_booking_cancellation_authorities
       (cancellation_authority_id,tenant_id,idempotency_key,authority_sha256,authority_body,
        final_booking_receipt_id,final_booking_snapshot_sha256,project_id,site_id,property_id,
        reservation_id,account_reference_hash,policy_receipt_id,decision_receipt_id,currency,
        paid_amount_minor,refundable_amount_minor,requested_at,created_at)
       values($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [authority.cancellationAuthorityId, command.tenantId, authority.idempotencyKey,
        authority.authoritySha256, JSON.stringify(authority),
        authority.scope.finalBookingReceiptId, authority.scope.finalBookingSnapshotSha256,
        authority.scope.projectId, authority.scope.siteId, authority.scope.propertyId,
        authority.scope.reservationId, authority.scope.accountReferenceHash,
        authority.policyReceiptId, authority.decisionReceiptId, authority.currency,
        authority.paidAmountMinor, authority.refundableAmountMinor, authority.requestedAt,
        command.createdAt],
    );
    await db.query(
      `insert into crays_integration.clubs_hotel_pms_cancellation_commands
       (cancellation_command_id,cancellation_authority_id,tenant_id,project_id,site_id,property_id,
        provider_binding_receipt_id,provider_code,provider_configuration_vault_reference,
        provider_configuration_sha256,provider_reservation_reference_vault_reference,
        provider_reservation_reference_hash,request_sha256,command_state,attempt_count,
        available_at,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'queued',0,$14,$15,$15)`,
      [command.cancellationCommandId, command.cancellationAuthorityId, command.tenantId,
        command.projectId, command.siteId, command.propertyId,
        command.providerBindingReceiptId, command.providerCode,
        command.providerConfigurationVaultReference, command.providerConfigurationSha256,
        command.providerReservationReferenceVaultReference,
        command.providerReservationReferenceHash, command.requestSha256,
        command.availableAt, command.createdAt],
    );
    return Object.freeze({
      cancellationAuthorityId: authority.cancellationAuthorityId,
      cancellationCommandId: command.cancellationCommandId,
      requestSha256: command.requestSha256,
      replayed: false as const,
    });
  });
}

export function leaseHotelPmsCancellationCommand(
  pool: HotelCancellationSagaPool,
  input: Readonly<{
    tenantId: string;
    leaseToken: string;
    leaseOwnerHash: string;
    leasedAt: string;
    leaseExpiresAt: string;
  }>,
) {
  if (!input.tenantId.trim() || !input.leaseToken.trim() || !SHA256.test(input.leaseOwnerHash)) {
    throw new Error("HOTEL_PMS_CANCELLATION_LEASE_INPUT_INVALID");
  }
  const leasedAt = instant(input.leasedAt, "HOTEL_PMS_CANCELLATION_LEASE_TIME_INVALID");
  const leaseExpiresAt = instant(input.leaseExpiresAt, "HOTEL_PMS_CANCELLATION_LEASE_TIME_INVALID");
  if (leaseExpiresAt <= leasedAt || leaseExpiresAt - leasedAt > 300_000) {
    throw new Error("HOTEL_PMS_CANCELLATION_LEASE_WINDOW_INVALID");
  }
  return transaction(pool, input.tenantId, async (db) => {
    await db.query(
      `update crays_integration.clubs_hotel_pms_cancellation_commands
          set command_state='queued',lease_token=null,lease_owner_hash=null,
              lease_expires_at=null,available_at=$2,updated_at=$2
        where tenant_id=$1 and command_state='leased' and lease_expires_at <= $2`,
      [input.tenantId, input.leasedAt],
    );
    const row = (
      await db.query<Readonly<{
        cancellation_command_id: string;
        tenant_id: string;
        provider_code: string;
        request_sha256: string;
        attempt_count: number;
      }>>(
        `with candidate as (
           select cancellation_command_id
             from crays_integration.clubs_hotel_pms_cancellation_commands
            where tenant_id=$1 and command_state in ('queued','retryable-failure')
              and available_at <= $2
            order by available_at,cancellation_command_id
            for update skip locked limit 1
         )
         update crays_integration.clubs_hotel_pms_cancellation_commands c
            set command_state='leased',attempt_count=c.attempt_count+1,lease_token=$3,
                lease_owner_hash=$4,lease_expires_at=$5,updated_at=$2
           from candidate
          where c.cancellation_command_id=candidate.cancellation_command_id
         returning c.cancellation_command_id,c.tenant_id,c.provider_code,c.request_sha256,c.attempt_count`,
        [input.tenantId, input.leasedAt, input.leaseToken, input.leaseOwnerHash,
          input.leaseExpiresAt],
      )
    ).rows[0];
    return row
      ? Object.freeze({
          cancellationCommandId: row.cancellation_command_id,
          tenantId: row.tenant_id,
          providerCode: row.provider_code,
          requestSha256: row.request_sha256,
          commandState: "leased" as const,
          attemptCount: Number(row.attempt_count),
          leaseToken: input.leaseToken,
          leaseOwnerHash: input.leaseOwnerHash,
          leaseExpiresAt: input.leaseExpiresAt,
        })
      : null;
  });
}

export function persistHotelPmsCancellationAttempt(
  pool: HotelCancellationSagaPool,
  command: LeasedHotelPmsCancellationCommand,
  input: Parameters<typeof createHotelPmsCancellationAttemptReceipt>[1],
) {
  const receipt = createHotelPmsCancellationAttemptReceipt(command, input);
  return transaction(pool, command.tenantId, async (db) => {
    await db.query(
      `insert into crays_integration.clubs_hotel_pms_cancellation_attempt_receipts
       (attempt_receipt_id,cancellation_command_id,tenant_id,attempt_number,lease_token,
        lease_owner_hash,request_sha256,outcome,response_sha256,provider_request_reference,
        error_code,started_at,completed_at,created_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)`,
      [receipt.attemptReceiptId, receipt.cancellationCommandId, receipt.tenantId,
        receipt.attemptNumber, receipt.leaseToken, receipt.leaseOwnerHash,
        receipt.requestSha256, receipt.outcome, receipt.responseSha256,
        receipt.providerRequestReference, receipt.errorCode, receipt.startedAt,
        receipt.completedAt],
    );
    const updated = await db.query(
      `update crays_integration.clubs_hotel_pms_cancellation_commands
          set command_state=$6,available_at=coalesce($7,available_at),lease_token=null,
              lease_owner_hash=null,lease_expires_at=null,updated_at=$5
        where cancellation_command_id=$1 and tenant_id=$2 and command_state='leased'
          and lease_token=$3 and lease_owner_hash=$4 and attempt_count=$8
        returning cancellation_command_id`,
      [command.cancellationCommandId, command.tenantId, command.leaseToken,
        command.leaseOwnerHash, receipt.completedAt, receipt.nextCommandState,
        receipt.retryAvailableAt, command.attemptCount],
    );
    if (updated.rows.length !== 1) throw new Error("HOTEL_PMS_CANCELLATION_ATTEMPT_UPDATE_CONFLICT");
    return receipt;
  });
}

export function persistAuthenticatedHotelPmsCancellationConfirmation(
  pool: HotelCancellationSagaPool,
  command: Parameters<typeof acceptAuthenticatedHotelPmsCancellationConfirmation>[0],
  acceptedAttempt: Parameters<typeof acceptAuthenticatedHotelPmsCancellationConfirmation>[1],
  input: Parameters<typeof acceptAuthenticatedHotelPmsCancellationConfirmation>[2],
) {
  const receipt = acceptAuthenticatedHotelPmsCancellationConfirmation(
    command,
    acceptedAttempt,
    input,
  );
  return transaction(pool, command.tenantId, async (db) => {
    await db.query(
      `insert into crays_integration.clubs_hotel_pms_cancellation_confirmation_receipts
       (confirmation_receipt_id,cancellation_command_id,accepted_attempt_receipt_id,tenant_id,
        provider_code,provider_status,provider_confirmation_reference,event_payload_sha256,
        authentication_method,signature_verified,observed_at,received_at,created_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11,$11)`,
      [receipt.confirmationReceiptId, receipt.cancellationCommandId,
        receipt.acceptedAttemptReceiptId, receipt.tenantId, receipt.providerCode,
        receipt.providerStatus, receipt.providerConfirmationReference,
        receipt.eventPayloadSha256, receipt.authenticationMethod, receipt.observedAt,
        receipt.receivedAt],
    );
    const updated = await db.query(
      `update crays_integration.clubs_hotel_pms_cancellation_commands
          set command_state='provider-confirmed',updated_at=$3
        where cancellation_command_id=$1 and tenant_id=$2
          and command_state='accepted-awaiting-confirmation'
        returning cancellation_command_id`,
      [command.cancellationCommandId, command.tenantId, receipt.receivedAt],
    );
    if (updated.rows.length !== 1) throw new Error("HOTEL_PMS_CANCELLATION_CONFIRMATION_UPDATE_CONFLICT");
    return receipt;
  });
}
