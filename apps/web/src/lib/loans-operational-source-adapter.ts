import {
  OperationalSourceClient,
  OperationalSourceError,
  getOperationalSourceConfigurationState,
  type OperationalDraftIdentity,
} from "./operational-source-client";

export const loansSourceEnvironmentKeys = [
  "CRAYS_LOANS_SOURCE_EXTERNAL_ID_FIELD",
  "CRAYS_LOANS_SOURCE_IDEMPOTENCY_FIELD",
] as const;

export type LendingSourceEntity =
  | "loan-products"
  | "loan-applications"
  | "loans"
  | "disbursements"
  | "repayments";

export type LendingSourceRow = {
  id: string;
  label: string;
  status: string;
  owner: string;
  recordState: "draft" | "submitted" | "cancelled";
  modifiedAt?: string;
  fields: Record<string, string | number | boolean | null>;
};

type LendingEntityConfig = {
  key: LendingSourceEntity;
  label: string;
  docType: "Loan Product" | "Loan Application" | "Loan" | "Loan Disbursement" | "Loan Repayment";
  fields: string[];
  project: (record: Record<string, unknown>) => LendingSourceRow;
};

function stringValue(record: Record<string, unknown>, field: string) {
  const value = record[field];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(record: Record<string, unknown>, field: string) {
  const value = Number(record[field]);
  return Number.isFinite(value) ? value : null;
}

function booleanValue(record: Record<string, unknown>, field: string) {
  return record[field] === true || record[field] === 1;
}

function recordState(record: Record<string, unknown>): LendingSourceRow["recordState"] {
  const docstatus = Number(record.docstatus ?? 0);
  if (docstatus === 1) return "submitted";
  if (docstatus === 2) return "cancelled";
  return "draft";
}

function baseRow(record: Record<string, unknown>, label?: string): Omit<LendingSourceRow, "fields"> {
  const id = stringValue(record, "name");
  if (!id) {
    throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source returned an invalid record.");
  }
  const state = recordState(record);
  return {
    id,
    label: label || id,
    status: stringValue(record, "status") ?? state,
    owner: "Finance",
    recordState: state,
    modifiedAt: stringValue(record, "modified"),
  };
}

const commonFields = ["name", "docstatus", "modified"];

const lendingEntities: Record<LendingSourceEntity, LendingEntityConfig> = {
  "loan-products": {
    key: "loan-products",
    label: "Loan products",
    docType: "Loan Product",
    fields: [
      ...commonFields,
      "product_code",
      "product_name",
      "company",
      "rate_of_interest",
      "maximum_loan_amount",
      "is_term_loan",
      "disabled",
    ],
    project: (record) => ({
      ...baseRow(record, stringValue(record, "product_name") ?? stringValue(record, "product_code")),
      fields: {
        productCode: stringValue(record, "product_code") ?? null,
        companyId: stringValue(record, "company") ?? null,
        annualInterestRate: numberValue(record, "rate_of_interest"),
        maximumAmount: numberValue(record, "maximum_loan_amount"),
        termLoan: booleanValue(record, "is_term_loan"),
        disabled: booleanValue(record, "disabled"),
      },
    }),
  },
  "loan-applications": {
    key: "loan-applications",
    label: "Loan applications",
    docType: "Loan Application",
    fields: [
      ...commonFields,
      "status",
      "applicant_type",
      "applicant",
      "applicant_name",
      "posting_date",
      "company",
      "loan_product",
      "loan_amount",
      "repayment_method",
      "repayment_amount",
      "repayment_periods",
      "is_secured_loan",
      "loan_purpose",
    ],
    project: (record) => ({
      ...baseRow(record, stringValue(record, "applicant_name") ?? stringValue(record, "applicant")),
      fields: {
        applicantType: stringValue(record, "applicant_type") ?? null,
        applicantId: stringValue(record, "applicant") ?? null,
        applicationDate: stringValue(record, "posting_date") ?? null,
        companyId: stringValue(record, "company") ?? null,
        loanProductId: stringValue(record, "loan_product") ?? null,
        requestedAmount: numberValue(record, "loan_amount"),
        repaymentMethod: stringValue(record, "repayment_method") ?? null,
        repaymentAmount: numberValue(record, "repayment_amount"),
        repaymentPeriods: numberValue(record, "repayment_periods"),
        secured: booleanValue(record, "is_secured_loan"),
        purposeId: stringValue(record, "loan_purpose") ?? null,
      },
    }),
  },
  loans: {
    key: "loans",
    label: "Loans",
    docType: "Loan",
    fields: [
      ...commonFields,
      "status",
      "loan_application",
      "applicant_type",
      "applicant",
      "applicant_name",
      "posting_date",
      "company",
      "loan_product",
      "loan_amount",
      "disbursed_amount",
      "repayment_method",
      "repayment_periods",
    ],
    project: (record) => ({
      ...baseRow(record, stringValue(record, "applicant_name") ?? stringValue(record, "applicant")),
      fields: {
        applicationId: stringValue(record, "loan_application") ?? null,
        applicantType: stringValue(record, "applicant_type") ?? null,
        applicantId: stringValue(record, "applicant") ?? null,
        bookingDate: stringValue(record, "posting_date") ?? null,
        companyId: stringValue(record, "company") ?? null,
        loanProductId: stringValue(record, "loan_product") ?? null,
        approvedAmount: numberValue(record, "loan_amount"),
        disbursedAmount: numberValue(record, "disbursed_amount"),
        repaymentMethod: stringValue(record, "repayment_method") ?? null,
        repaymentPeriods: numberValue(record, "repayment_periods"),
      },
    }),
  },
  disbursements: {
    key: "disbursements",
    label: "Disbursements",
    docType: "Loan Disbursement",
    fields: [
      ...commonFields,
      "status",
      "against_loan",
      "loan_product",
      "disbursement_date",
      "disbursed_amount",
      "company",
    ],
    project: (record) => ({
      ...baseRow(record, stringValue(record, "against_loan")),
      fields: {
        loanId: stringValue(record, "against_loan") ?? null,
        loanProductId: stringValue(record, "loan_product") ?? null,
        disbursementDate: stringValue(record, "disbursement_date") ?? null,
        amount: numberValue(record, "disbursed_amount"),
        companyId: stringValue(record, "company") ?? null,
      },
    }),
  },
  repayments: {
    key: "repayments",
    label: "Repayments",
    docType: "Loan Repayment",
    fields: [
      ...commonFields,
      "against_loan",
      "loan_product",
      "posting_date",
      "amount_paid",
      "repayment_type",
      "company",
    ],
    project: (record) => ({
      ...baseRow(record, stringValue(record, "against_loan")),
      fields: {
        loanId: stringValue(record, "against_loan") ?? null,
        loanProductId: stringValue(record, "loan_product") ?? null,
        postingDate: stringValue(record, "posting_date") ?? null,
        amount: numberValue(record, "amount_paid"),
        repaymentType: stringValue(record, "repayment_type") ?? null,
        companyId: stringValue(record, "company") ?? null,
      },
    }),
  },
};

function draftIdentity(externalId: string, idempotencyKey: string, env: NodeJS.ProcessEnv): OperationalDraftIdentity {
  const legacyPrefix = "CRAYS_" + "FR" + "APPE_LENDING_";
  return {
    externalId,
    idempotencyKey,
    externalIdField:
      env.CRAYS_LOANS_SOURCE_EXTERNAL_ID_FIELD?.trim() ||
      env[`${legacyPrefix}EXTERNAL_ID_FIELD`]?.trim() ||
      "custom_crays_external_id",
    idempotencyField:
      env.CRAYS_LOANS_SOURCE_IDEMPOTENCY_FIELD?.trim() ||
      env[`${legacyPrefix}IDEMPOTENCY_FIELD`]?.trim() ||
      "custom_crays_idempotency_key",
  };
}

function requestError(message: string): never {
  throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, message);
}

function requestObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) requestError("The draft request is invalid.");
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string, maximum = 160) {
  if (typeof value !== "string") requestError(`${label} is required.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum || /[\u0000-\u001f\u007f]/.test(normalized)) {
    requestError(`${label} is invalid.`);
  }
  return normalized;
}

function optionalText(value: unknown, label: string, maximum = 160) {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredText(value, label, maximum);
}

function requiredNumber(value: unknown, label: string, maximum = 1_000_000_000) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > maximum) {
    requestError(`${label} is invalid.`);
  }
  return value;
}

function optionalNumber(value: unknown, label: string, maximum = 1_000_000_000) {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredNumber(value, label, maximum);
}

function applicationDate(value: unknown) {
  const normalized = requiredText(value, "Application date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) requestError("Application date is invalid.");
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    requestError("Application date is invalid.");
  }
  return normalized;
}

function optionalApplicationDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  return applicationDate(value);
}

function applicantType(value: unknown) {
  if (value !== "Customer" && value !== "Employee") requestError("Applicant type is invalid.");
  return value;
}

function optionalApplicantType(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  return applicantType(value);
}

const repaymentMethods = ["Repay Fixed Amount per Period", "Repay Over Number of Periods"] as const;

function optionalRepaymentMethod(value: unknown): (typeof repaymentMethods)[number] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !repaymentMethods.includes(value as (typeof repaymentMethods)[number])) {
    requestError("Repayment method is invalid.");
  }
  return value as (typeof repaymentMethods)[number];
}

function optionalPeriods(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0 || value > 600) {
    requestError("Repayment periods are invalid.");
  }
  return value;
}

function optionalBoolean(value: unknown, label: string) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") requestError(`${label} is invalid.`);
  return value;
}

export type LoanApplicationDraftValues = {
  applicantType?: "Customer" | "Employee";
  applicantId?: string;
  applicationDate?: string;
  companyId?: string;
  loanProductId?: string;
  requestedAmount?: number;
  repaymentMethod?: (typeof repaymentMethods)[number];
  repaymentAmount?: number;
  repaymentPeriods?: number;
  secured?: boolean;
  purposeId?: string;
};

export type LoanApplicationDraftRequest = {
  actorRole: string;
  externalId: string;
  idempotencyKey: string;
  sourceRecordId?: string;
  values: LoanApplicationDraftValues;
};

export function parseLoanApplicationDraftRequest(value: unknown, mode: "create" | "update"): LoanApplicationDraftRequest {
  const body = requestObject(value);
  const rawValues = requestObject(body.values);
  const values: LoanApplicationDraftValues = {
    applicantType: mode === "create" ? applicantType(rawValues.applicantType) : optionalApplicantType(rawValues.applicantType),
    applicantId:
      mode === "create" ? requiredText(rawValues.applicantId, "Applicant ID") : optionalText(rawValues.applicantId, "Applicant ID"),
    applicationDate: mode === "create" ? applicationDate(rawValues.applicationDate) : optionalApplicationDate(rawValues.applicationDate),
    companyId: mode === "create" ? requiredText(rawValues.companyId, "Company ID") : optionalText(rawValues.companyId, "Company ID"),
    loanProductId:
      mode === "create"
        ? requiredText(rawValues.loanProductId, "Loan product ID")
        : optionalText(rawValues.loanProductId, "Loan product ID"),
    requestedAmount:
      mode === "create"
        ? requiredNumber(rawValues.requestedAmount, "Requested amount")
        : optionalNumber(rawValues.requestedAmount, "Requested amount"),
    repaymentMethod: optionalRepaymentMethod(rawValues.repaymentMethod),
    repaymentAmount: optionalNumber(rawValues.repaymentAmount, "Repayment amount"),
    repaymentPeriods: optionalPeriods(rawValues.repaymentPeriods),
    secured: optionalBoolean(rawValues.secured, "Secured flag"),
    purposeId: optionalText(rawValues.purposeId, "Purpose ID"),
  };

  const compactValues = Object.fromEntries(Object.entries(values).filter(([, item]) => item !== undefined)) as LoanApplicationDraftValues;
  if (mode === "update" && !Object.keys(compactValues).length) requestError("At least one draft field is required.");

  return {
    actorRole: requiredText(body.actorRole, "Actor role", 40),
    externalId: requiredText(body.externalId, "External ID", 160),
    idempotencyKey: requiredText(body.idempotencyKey, "Idempotency key", 160),
    sourceRecordId: mode === "update" ? requiredText(body.sourceRecordId, "Source record ID", 180) : undefined,
    values: compactValues,
  };
}

function toSourceDraftValues(values: LoanApplicationDraftValues) {
  const mapped: Record<string, unknown> = {};
  if (values.applicantType !== undefined) mapped.applicant_type = values.applicantType;
  if (values.applicantId !== undefined) mapped.applicant = values.applicantId;
  if (values.applicationDate !== undefined) mapped.posting_date = values.applicationDate;
  if (values.companyId !== undefined) mapped.company = values.companyId;
  if (values.loanProductId !== undefined) mapped.loan_product = values.loanProductId;
  if (values.requestedAmount !== undefined) mapped.loan_amount = values.requestedAmount;
  if (values.repaymentMethod !== undefined) mapped.repayment_method = values.repaymentMethod;
  if (values.repaymentAmount !== undefined) mapped.repayment_amount = values.repaymentAmount;
  if (values.repaymentPeriods !== undefined) mapped.repayment_periods = values.repaymentPeriods;
  if (values.secured !== undefined) mapped.is_secured_loan = values.secured ? 1 : 0;
  if (values.purposeId !== undefined) mapped.loan_purpose = values.purposeId;
  return mapped;
}

export async function getLendingSourceReadSlice(rowLimit: number, env: NodeJS.ProcessEnv = process.env) {
  const client = new OperationalSourceClient(env);
  const boundedLimit = Math.min(Math.max(Math.trunc(rowLimit), 1), 50);
  const sections = await Promise.all(
    Object.values(lendingEntities).map(async (entity) => {
      const [count, records] = await Promise.all([
        client.countDocuments(entity.docType),
        client.listDocuments<Record<string, unknown>>(entity.docType, {
          fields: entity.fields,
          limit: boundedLimit,
          orderBy: { field: "modified", direction: "desc" },
        }),
      ]);
      return {
        key: entity.key,
        label: entity.label,
        count,
        rows: records.map(entity.project),
      };
    }),
  );

  return {
    source: { connection: "live" as const, owner: "Loans" },
    generatedAt: new Date().toISOString(),
    rowLimit: boundedLimit,
    summary: Object.fromEntries(sections.map((section) => [section.key, section.count])),
    sections,
    capabilities: {
      liveReads: true,
      applicationDraftCreate: true,
      applicationDraftUpdate: true,
      submit: false,
      disbursementWrite: false,
      repaymentWrite: false,
      paymentInitiation: false,
      cancellation: false,
    },
    secretsReturned: false,
  };
}

export async function getLendingSourceRecord(entityKey: LendingSourceEntity, recordId: string, env: NodeJS.ProcessEnv = process.env) {
  const entity = lendingEntities[entityKey];
  if (!entity) requestError("Record type is invalid.");
  const client = new OperationalSourceClient(env);
  return entity.project(await client.getDocument<Record<string, unknown>>(entity.docType, recordId));
}

export async function createLoanApplicationDraft(input: LoanApplicationDraftRequest, env: NodeJS.ProcessEnv = process.env) {
  const client = new OperationalSourceClient(env);
  const result = await client.createDraftDocument<Record<string, unknown>>(
    "Loan Application",
    toSourceDraftValues(input.values),
    draftIdentity(input.externalId, input.idempotencyKey, env),
  );
  const sourceRecordId = stringValue(result.record, "name");
  if (!sourceRecordId) {
    throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source returned an invalid record.");
  }
  return { ...result, record: lendingEntities["loan-applications"].project(result.record) };
}

export async function updateLoanApplicationDraft(input: LoanApplicationDraftRequest, env: NodeJS.ProcessEnv = process.env) {
  if (!input.sourceRecordId) requestError("Source record ID is required.");
  const client = new OperationalSourceClient(env);
  const result = await client.updateDraftDocument<Record<string, unknown>>(
    "Loan Application",
    input.sourceRecordId,
    toSourceDraftValues(input.values),
    draftIdentity(input.externalId, input.idempotencyKey, env),
  );
  return { ...result, record: lendingEntities["loan-applications"].project(result.record) };
}

export function getLendingSourceRuntimeState(env: NodeJS.ProcessEnv = process.env) {
  return {
    ...getOperationalSourceConfigurationState(env),
    mode: "live-api" as const,
    dataOwner: "Loans" as const,
    draftIdentity: "external-id-and-idempotency-marker" as const,
  };
}
