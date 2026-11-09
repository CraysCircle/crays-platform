import type { createPartnerEmployeeJourney } from "./partner-employee-journey-contract";

type Journey = ReturnType<typeof createPartnerEmployeeJourney>;
type Step = Journey["steps"][number]["step"];
type QueryResult<Row> = Readonly<{ rows: Row[] }>;

export type PartnerEmployeeDb = Readonly<{
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
}>;
export type PartnerEmployeePool = Readonly<{
  connect(): Promise<PartnerEmployeeDb & Readonly<{ release(): void }>>;
}>;
export type EmployeeAttention = Readonly<{
  ownerAssignmentId: string;
  requiredInformation: string;
  dueAt: string;
  expiresAt: string;
  escalationOwnerRole: string;
}>;
export type EmployeePersistence = Readonly<{
  tenantId: string;
  journeyId: string;
  journey: Journey;
  identityBindingVersion: number;
  attention: Readonly<Record<Step, EmployeeAttention>>;
  createdAt: string;
}>;
export type EmployeeStepReceipt = Readonly<{
  providerReceiptId: string;
  stepId: string;
  journeyId: string;
  tenantId: string;
  canonicalPersonId: string;
  employmentRelationshipId: string;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  provider: string;
  providerSubjectOrResourceId: string;
  providerEventId: string;
  observedJourneySha256: string;
  signatureVerified: true;
  acknowledgedAt: string;
  receiptSha256: string;
}>;
export type AdditionalCalendarRequestReceipt = Readonly<{
  calendarRequestReceiptId: string;
  journeyId: string;
  tenantId: string;
  canonicalPersonId: string;
  requestedCalendarId: string;
  requestedByCanonicalPersonId: string;
  requestedAt: string;
  receiptSha256: string;
}>;
export type EmployeeReconciliation = Readonly<{
  reconciliationReceiptId: string;
  journeyId: string;
  tenantId: string;
  canonicalPersonId: string;
  employmentRelationshipId: string;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  expectedJourneySha256: string;
  observedJourneySha256: string;
  reconciliationState: "MATCHED" | "MISMATCH";
  reconciledByAssignmentId: string;
  reconciledAt: string;
  receiptSha256: string;
}>;

const SHA256 = /^[a-f0-9]{64}$/;
const requireStrings = (values: readonly string[], code: string) => {
  if (values.some((value) => typeof value !== "string" || value.trim() === "")) throw new Error(code);
};
const requireTimestamp = (value: string, code: string) => {
  if (!Number.isFinite(Date.parse(value))) throw new Error(code);
};

async function transaction<T>(pool: PartnerEmployeePool, tenantId: string, work: (db: PartnerEmployeeDb) => Promise<T>) {
  if (!tenantId.trim()) throw new Error("EMPLOYEE_REPOSITORY_TENANT_INVALID");
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)", [tenantId]);
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

export function prepareEmployeePersistence(
  journey: Journey,
  input: Readonly<{
    tenantId: string;
    journeyId: string;
    identityBindingVersion: number;
    attention: Readonly<Record<Step, EmployeeAttention>>;
    createdAt: string;
  }>,
): EmployeePersistence {
  if (!input.tenantId.trim() || !input.journeyId.trim() || !Number.isSafeInteger(input.identityBindingVersion) ||
      input.identityBindingVersion < 1 || journey.steps.length !== 6 || !SHA256.test(journey.journeySha256)) {
    throw new Error("EMPLOYEE_PERSISTENCE_INPUT_INVALID");
  }
  requireTimestamp(input.createdAt, "EMPLOYEE_PERSISTENCE_INPUT_INVALID");
  const attentionEntries: Array<readonly [Step, EmployeeAttention]> = [];
  for (const step of journey.steps) {
    const attention = input.attention[step.step];
    if (!attention) throw new Error("EMPLOYEE_ATTENTION_INVALID");
    requireStrings([attention.ownerAssignmentId, attention.requiredInformation, attention.escalationOwnerRole], "EMPLOYEE_ATTENTION_INVALID");
    requireTimestamp(attention.dueAt, "EMPLOYEE_ATTENTION_INVALID");
    requireTimestamp(attention.expiresAt, "EMPLOYEE_ATTENTION_INVALID");
    if (Date.parse(attention.expiresAt) <= Date.parse(attention.dueAt)) {
      throw new Error("EMPLOYEE_ATTENTION_INVALID");
    }
    attentionEntries.push([step.step, Object.freeze({ ...attention })]);
  }
  const attention = Object.freeze(Object.fromEntries(attentionEntries)) as Readonly<Record<Step, EmployeeAttention>>;
  return Object.freeze({ ...input, attention, journey });
}

export function persistEmployeeJourney(pool: PartnerEmployeePool, persistence: EmployeePersistence) {
  return transaction(pool, persistence.tenantId, async (db) => {
    const j = persistence.journey;
    const inserted = await db.query<Readonly<{ employee_journey_id: string; journey_sha256: string }>>(
      `insert into crays_core.partner_employee_journeys(employee_journey_id,tenant_id,employee_case_id,employee_case_version,canonical_person_id,canonical_organization_id,employment_relationship_id,relationship_state,partner_tenant_id,operator_legal_entity_id,store_id,auth0_subject,identity_binding_version,nextcloud_host_session_binding_id,primary_personal_calendar_id,additional_personal_calendar_id,additional_calendar_request_receipt_id,authorized_hr_principal_ids,document_artifact_ids,signature_authority_binding_id,journey_sha256,idempotency_key,journey_state,created_at,updated_at)values($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19,$20,$21,'IN_PROGRESS',$22,$22)on conflict(tenant_id,idempotency_key)do nothing returning employee_journey_id,journey_sha256`,
      [persistence.journeyId, persistence.tenantId, j.employeeCaseId, j.employeeCaseVersion, j.canonicalPersonId,
        j.canonicalOrganizationId, j.employmentRelationshipId, j.partnerTenantId, j.operatorLegalEntityId, j.storeId,
        j.auth0Subject, persistence.identityBindingVersion, j.nextcloudHostSessionBindingId, j.primaryPersonalCalendarId,
        j.additionalPersonalCalendarId, j.additionalCalendarRequestReceiptId, JSON.stringify(j.authorizedHrPrincipalIds),
        JSON.stringify(j.documentArtifactIds), j.signatureAuthorityBindingId, j.journeySha256, j.idempotencyKey, persistence.createdAt],
    );
    const row = inserted.rows[0] ?? (await db.query<Readonly<{ employee_journey_id: string; journey_sha256: string }>>(
      "select employee_journey_id,journey_sha256 from crays_core.partner_employee_journeys where tenant_id=$1 and idempotency_key=$2",
      [persistence.tenantId, j.idempotencyKey],
    )).rows[0];
    if (!row || row.employee_journey_id !== persistence.journeyId || row.journey_sha256 !== j.journeySha256) {
      throw new Error("EMPLOYEE_JOURNEY_REPLAY_CONFLICT");
    }
    for (const step of j.steps) {
      const attention = persistence.attention[step.step];
      const stepId = `${persistence.journeyId}:${step.step}`;
      const created = await db.query<Readonly<{ employee_step_id: string }>>(
        `insert into crays_core.partner_employee_journey_steps(employee_step_id,employee_journey_id,tenant_id,step_kind,provider,partner_tenant_id,operator_legal_entity_id,store_id,step_state,owner_assignment_id,required_information,due_at,expires_at,attention_state,escalation_owner_role,next_safe_action,created_at,updated_at)values($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9,$10,$11,$12,'UNACKNOWLEDGED',$13,'deliver',$14,$14)on conflict(tenant_id,employee_journey_id,step_kind)do nothing returning employee_step_id`,
        [stepId, persistence.journeyId, persistence.tenantId, step.step, step.provider, j.partnerTenantId,
          j.operatorLegalEntityId, j.storeId, attention.ownerAssignmentId, attention.requiredInformation,
          attention.dueAt, attention.expiresAt, attention.escalationOwnerRole, persistence.createdAt],
      );
      const stored = created.rows[0] ?? (await db.query<Readonly<{ employee_step_id: string }>>(
        "select employee_step_id from crays_core.partner_employee_journey_steps where tenant_id=$1 and employee_journey_id=$2 and step_kind=$3",
        [persistence.tenantId, persistence.journeyId, step.step],
      )).rows[0];
      if (!stored || stored.employee_step_id !== stepId) throw new Error("EMPLOYEE_STEP_REPLAY_CONFLICT");
    }
    return Object.freeze({ journeyId: persistence.journeyId, state: "IN_PROGRESS" as const, stepCount: 6 as const });
  });
}

export function prepareEmployeeStepReceiptInput(value: EmployeeStepReceipt): EmployeeStepReceipt {
  const receipt = { ...value };
  requireStrings([receipt.providerReceiptId, receipt.stepId, receipt.journeyId, receipt.tenantId,
    receipt.canonicalPersonId, receipt.employmentRelationshipId, receipt.partnerTenantId,
    receipt.operatorLegalEntityId, receipt.storeId, receipt.provider, receipt.providerSubjectOrResourceId,
    receipt.providerEventId], "EMPLOYEE_STEP_RECEIPT_INVALID");
  if (receipt.signatureVerified !== true || !SHA256.test(receipt.observedJourneySha256) || !SHA256.test(receipt.receiptSha256)) {
    throw new Error("EMPLOYEE_STEP_RECEIPT_INVALID");
  }
  requireTimestamp(receipt.acknowledgedAt, "EMPLOYEE_STEP_RECEIPT_INVALID");
  return Object.freeze(receipt);
}

export function persistEmployeeStepReceipt(pool: PartnerEmployeePool, input: EmployeeStepReceipt) {
  const receipt = prepareEmployeeStepReceiptInput(input);
  return transaction(pool, receipt.tenantId, async (db) => {
    const inserted = await db.query<Readonly<{ provider_receipt_id: string; receipt_sha256: string }>>(
      `insert into crays_core.partner_employee_step_receipts(provider_receipt_id,employee_step_id,employee_journey_id,tenant_id,canonical_person_id,employment_relationship_id,partner_tenant_id,operator_legal_entity_id,store_id,provider,provider_subject_or_resource_id,provider_event_id,observed_journey_sha256,signature_verified,provider_state,acknowledged_at,receipt_sha256)values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'ACKNOWLEDGED_PENDING_RECONCILIATION',$15,$16)on conflict(tenant_id,provider,provider_event_id)do nothing returning provider_receipt_id,receipt_sha256`,
      [receipt.providerReceiptId, receipt.stepId, receipt.journeyId, receipt.tenantId, receipt.canonicalPersonId,
        receipt.employmentRelationshipId, receipt.partnerTenantId, receipt.operatorLegalEntityId, receipt.storeId,
        receipt.provider, receipt.providerSubjectOrResourceId, receipt.providerEventId, receipt.observedJourneySha256,
        receipt.signatureVerified, receipt.acknowledgedAt, receipt.receiptSha256],
    );
    const row = inserted.rows[0] ?? (await db.query<Readonly<{ provider_receipt_id: string; receipt_sha256: string }>>(
      "select provider_receipt_id,receipt_sha256 from crays_core.partner_employee_step_receipts where tenant_id=$1 and provider=$2 and provider_event_id=$3",
      [receipt.tenantId, receipt.provider, receipt.providerEventId],
    )).rows[0];
    if (!row || row.provider_receipt_id !== receipt.providerReceiptId || row.receipt_sha256 !== receipt.receiptSha256) {
      throw new Error("EMPLOYEE_RECEIPT_REPLAY_CONFLICT");
    }
    const updated = await db.query(
      "update crays_core.partner_employee_journey_steps set step_state='ACKNOWLEDGED_PENDING_RECONCILIATION',attention_state='ACKNOWLEDGED',next_safe_action='reconcile',updated_at=$1 where employee_step_id=$2 and employee_journey_id=$3 and tenant_id=$4 and step_state in('PENDING','ACKNOWLEDGED_PENDING_RECONCILIATION') returning employee_step_id",
      [receipt.acknowledgedAt, receipt.stepId, receipt.journeyId, receipt.tenantId],
    );
    if (!updated.rows[0]) throw new Error("EMPLOYEE_RECEIPT_STATE_CONFLICT");
    return Object.freeze({ providerReceiptId: receipt.providerReceiptId, state: "ACKNOWLEDGED_PENDING_RECONCILIATION" as const });
  });
}

export function prepareAdditionalCalendarRequestInput(value: AdditionalCalendarRequestReceipt): AdditionalCalendarRequestReceipt {
  const receipt = { ...value };
  requireStrings([receipt.calendarRequestReceiptId, receipt.journeyId, receipt.tenantId, receipt.canonicalPersonId,
    receipt.requestedCalendarId, receipt.requestedByCanonicalPersonId], "EMPLOYEE_CALENDAR_REQUEST_INVALID");
  if (!SHA256.test(receipt.receiptSha256)) throw new Error("EMPLOYEE_CALENDAR_REQUEST_INVALID");
  requireTimestamp(receipt.requestedAt, "EMPLOYEE_CALENDAR_REQUEST_INVALID");
  if (receipt.requestedByCanonicalPersonId !== receipt.canonicalPersonId) throw new Error("EMPLOYEE_CALENDAR_SELF_REQUEST_REQUIRED");
  return Object.freeze(receipt);
}

export function persistAdditionalCalendarRequest(pool: PartnerEmployeePool, input: AdditionalCalendarRequestReceipt) {
  let receipt: AdditionalCalendarRequestReceipt;
  try { receipt = prepareAdditionalCalendarRequestInput(input); }
  catch (error) { return Promise.reject(error); }
  return transaction(pool, receipt.tenantId, async (db) => {
    const inserted = await db.query<Readonly<{ calendar_request_receipt_id: string; receipt_sha256: string }>>(
      `insert into crays_core.partner_employee_additional_calendar_request_receipts(calendar_request_receipt_id,employee_journey_id,tenant_id,canonical_person_id,requested_calendar_id,requested_by_canonical_person_id,request_state,requested_at,receipt_sha256)values($1,$2,$3,$4,$5,$6,'EXPLICITLY_REQUESTED_PENDING_RECONCILIATION',$7,$8)on conflict(tenant_id,canonical_person_id,requested_calendar_id)do nothing returning calendar_request_receipt_id,receipt_sha256`,
      [receipt.calendarRequestReceiptId, receipt.journeyId, receipt.tenantId, receipt.canonicalPersonId,
        receipt.requestedCalendarId, receipt.requestedByCanonicalPersonId, receipt.requestedAt, receipt.receiptSha256],
    );
    const row = inserted.rows[0] ?? (await db.query<Readonly<{ calendar_request_receipt_id: string; receipt_sha256: string }>>(
      "select calendar_request_receipt_id,receipt_sha256 from crays_core.partner_employee_additional_calendar_request_receipts where tenant_id=$1 and canonical_person_id=$2 and requested_calendar_id=$3",
      [receipt.tenantId, receipt.canonicalPersonId, receipt.requestedCalendarId],
    )).rows[0];
    if (!row || row.calendar_request_receipt_id !== receipt.calendarRequestReceiptId || row.receipt_sha256 !== receipt.receiptSha256) {
      throw new Error("EMPLOYEE_CALENDAR_REQUEST_REPLAY_CONFLICT");
    }
    return Object.freeze({ calendarRequestReceiptId: receipt.calendarRequestReceiptId, state: "EXPLICITLY_REQUESTED_PENDING_RECONCILIATION" as const });
  });
}

export function prepareEmployeeReconciliationInput(value: EmployeeReconciliation): EmployeeReconciliation {
  const receipt = { ...value };
  requireStrings([receipt.reconciliationReceiptId, receipt.journeyId, receipt.tenantId, receipt.canonicalPersonId,
    receipt.employmentRelationshipId, receipt.partnerTenantId, receipt.operatorLegalEntityId, receipt.storeId,
    receipt.reconciledByAssignmentId], "EMPLOYEE_RECONCILIATION_INVALID");
  if (!SHA256.test(receipt.expectedJourneySha256) || !SHA256.test(receipt.observedJourneySha256) || !SHA256.test(receipt.receiptSha256)) {
    throw new Error("EMPLOYEE_RECONCILIATION_INVALID");
  }
  requireTimestamp(receipt.reconciledAt, "EMPLOYEE_RECONCILIATION_INVALID");
  if ((receipt.reconciliationState === "MATCHED") !== (receipt.expectedJourneySha256 === receipt.observedJourneySha256)) {
    throw new Error("EMPLOYEE_RECONCILIATION_CONTRADICTION");
  }
  return Object.freeze(receipt);
}

export function persistEmployeeReconciliation(pool: PartnerEmployeePool, input: EmployeeReconciliation) {
  const receipt = prepareEmployeeReconciliationInput(input);
  return transaction(pool, receipt.tenantId, async (db) => {
    const next = receipt.reconciliationState === "MATCHED" ? "close" : "repair";
    const inserted = await db.query<Readonly<{ reconciliation_receipt_id: string; receipt_sha256: string }>>(
      `insert into crays_core.partner_employee_reconciliation_receipts(reconciliation_receipt_id,employee_journey_id,tenant_id,canonical_person_id,employment_relationship_id,partner_tenant_id,operator_legal_entity_id,store_id,expected_journey_sha256,observed_journey_sha256,reconciled_step_count,reconciliation_state,reconciled_by_assignment_id,reconciled_at,next_safe_action,receipt_sha256)values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,6,$11,$12,$13,$14,$15)on conflict(tenant_id,employee_journey_id)do nothing returning reconciliation_receipt_id,receipt_sha256`,
      [receipt.reconciliationReceiptId, receipt.journeyId, receipt.tenantId, receipt.canonicalPersonId,
        receipt.employmentRelationshipId, receipt.partnerTenantId, receipt.operatorLegalEntityId, receipt.storeId,
        receipt.expectedJourneySha256, receipt.observedJourneySha256, receipt.reconciliationState,
        receipt.reconciledByAssignmentId, receipt.reconciledAt, next, receipt.receiptSha256],
    );
    const row = inserted.rows[0] ?? (await db.query<Readonly<{ reconciliation_receipt_id: string; receipt_sha256: string }>>(
      "select reconciliation_receipt_id,receipt_sha256 from crays_core.partner_employee_reconciliation_receipts where tenant_id=$1 and employee_journey_id=$2",
      [receipt.tenantId, receipt.journeyId],
    )).rows[0];
    if (!row || row.reconciliation_receipt_id !== receipt.reconciliationReceiptId || row.receipt_sha256 !== receipt.receiptSha256) {
      throw new Error("EMPLOYEE_RECONCILIATION_REPLAY_CONFLICT");
    }
    const matched = receipt.reconciliationState === "MATCHED";
    const steps = await db.query(
      "update crays_core.partner_employee_journey_steps set step_state=$1,attention_state=$2,next_safe_action=$3,updated_at=$4 where employee_journey_id=$5 and tenant_id=$6 and step_state='ACKNOWLEDGED_PENDING_RECONCILIATION' returning employee_step_id",
      [matched ? "RECONCILED" : "FAILED", matched ? "ACKNOWLEDGED" : "ESCALATED", next, receipt.reconciledAt, receipt.journeyId, receipt.tenantId],
    );
    if (steps.rows.length !== 6) throw new Error("EMPLOYEE_RECONCILIATION_STEP_STATE_CONFLICT");
    const journey = await db.query(
      "update crays_core.partner_employee_journeys set journey_state=$1,updated_at=$2 where employee_journey_id=$3 and tenant_id=$4 and journey_state in('IN_PROGRESS','READY_FOR_RECONCILIATION') returning employee_journey_id",
      [matched ? "RECONCILED" : "FAILED", receipt.reconciledAt, receipt.journeyId, receipt.tenantId],
    );
    if (!journey.rows[0]) throw new Error("EMPLOYEE_RECONCILIATION_JOURNEY_STATE_CONFLICT");
    return Object.freeze({ reconciliationReceiptId: receipt.reconciliationReceiptId, state: receipt.reconciliationState });
  });
}
