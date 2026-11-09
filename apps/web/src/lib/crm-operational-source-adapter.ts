import {
  firstJsonObject,
  LocalEngineError,
  quotePgIdentifier,
  readCrmWorkspaceSchema,
  runCrmSourcePg,
} from "./local-engine-runtime";
import { getCorePgPool } from "../db/client";
import { privateEnvValue } from "./private-env";

export type CrmSourceEntity = "companies" | "people" | "leads" | "opportunities" | "tasks" | "notes" | "emails" | "calendar-events" | "activities" | "files";

export type CrmSourceRow = {
  id: string;
  label: string;
  status: string;
  owner: string;
  modifiedAt?: string;
  fields: Record<string, string | number | boolean | null>;
};

type CrmSnapshotPayload = {
  workspaceSchema?: string;
  rawCounts?: Record<string, number>;
  companies?: Array<Record<string, unknown>>;
  people?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
};

type CrmHttpConfig = {
  baseUrl: string;
  email: string;
  password: string;
  timeoutMs: number;
};

function stringValue(record: Record<string, unknown>, field: string) {
  const value = record[field];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function nestedStringValue(record: Record<string, unknown>, field: string, nestedField: string) {
  const nested = objectValue(record[field]);
  return nested ? stringValue(nested, nestedField) : undefined;
}

function relationshipCount(record: Record<string, unknown>, directCountField: string, ...relationshipFields: string[]) {
  const direct = Number(record[directCountField] ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  for (const field of relationshipFields) {
    const relationship = record[field];
    if (Array.isArray(relationship)) return relationship.length;
  }
  return 0;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function cleanOwner(value: string | undefined, fallback = "Deal Manager") {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(trimmed)) return fallback;
  if (/^(system|crays seed|seed)$/i.test(trimmed)) return fallback;
  return trimmed;
}

const fallbackPeople = [
  "Johannes Adler",
  "Anna Schneider",
  "Lukas Weber",
  "Miriam Hoffmann",
  "Jonas Becker",
  "Sophie Keller",
  "Felix Wagner",
  "Laura Fischer",
];

const fallbackMarkets = ["Munich Schwabing", "Berlin Mitte", "Hamburg Eppendorf", "Cologne Ehrenfeld", "Frankfurt Westend", "Stuttgart Mitte"];

function indexFromSeed(seed: string, length: number) {
  const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return length ? Math.abs(total) % length : 0;
}

function fallbackPersonLabel(seed: string) {
  return fallbackPeople[indexFromSeed(seed, fallbackPeople.length)];
}

function fallbackOpportunityLabel(seed: string) {
  return `Prepared Franchise Deal - ${fallbackMarkets[indexFromSeed(seed, fallbackMarkets.length)]}`;
}

function fallbackTaskLabel(seed: string) {
  return `Follow-up review - ${fallbackMarkets[indexFromSeed(seed, fallbackMarkets.length)]}`;
}

function arrayValue(record: Record<string, unknown> | null, field: string): unknown[] {
  return Array.isArray(record?.[field]) ? (record[field] as unknown[]) : [];
}

function moneyFromMicros(value: unknown, currencyCode = "EUR") {
  const amount = Number(value ?? 0) / 1_000_000;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "EUR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function createdByCrays(record: Record<string, unknown>) {
  return (
    record.createdByName === "CRAYS Seed" ||
    record.updatedByName === "CRAYS Seed" ||
    nestedStringValue(record, "createdBy", "name") === "CRAYS Seed" ||
    nestedStringValue(record, "updatedBy", "name") === "CRAYS Seed"
  );
}

function stageLabel(stage: string | undefined) {
  const labels: Record<string, string> = {
    NEW: "New",
    SCREENING: "Screening",
    MEETING: "Meeting",
    PROPOSAL: "Proposal",
    CUSTOMER: "Customer",
    DONE: "Done",
  };
  return labels[stage ?? ""] ?? stage ?? "Active";
}

function normalizeCompany(row: Record<string, unknown>): CrmSourceRow {
  const id = stringValue(row, "id") ?? "company";
  const city = stringValue(row, "city") ?? nestedStringValue(row, "address", "addressCity") ?? null;
  const country = stringValue(row, "country") ?? nestedStringValue(row, "address", "addressCountry") ?? null;
  const revenueMicros = row.annualRevenueAmountMicros ?? objectValue(row.annualRevenue)?.amountMicros;
  const revenueCurrency = stringValue(row, "annualRevenueCurrencyCode") ?? nestedStringValue(row, "annualRevenue", "currencyCode");
  return {
    id,
    label:
      stringValue(row, "name") ??
      stringValue(row, "domainLabel") ??
      nestedStringValue(row, "domainName", "primaryLinkLabel") ??
      "Adler Fitness Beteiligungs GmbH",
    status: createdByCrays(row) ? "active" : "source-record",
    owner: cleanOwner(stringValue(row, "createdByName") ?? nestedStringValue(row, "createdBy", "name"), "Deal Manager"),
    modifiedAt: stringValue(row, "updatedAt"),
    fields: {
      city,
      country,
      domain:
        stringValue(row, "domainUrl") ??
        stringValue(row, "domainLabel") ??
        nestedStringValue(row, "domainName", "primaryLinkUrl") ??
        nestedStringValue(row, "domainName", "primaryLinkLabel") ??
        null,
      annualRevenue: moneyFromMicros(revenueMicros, revenueCurrency),
      people: relationshipCount(row, "peopleCount", "people"),
      opportunities: relationshipCount(row, "opportunityCount", "opportunities"),
    },
  };
}

function normalizePerson(row: Record<string, unknown>): CrmSourceRow {
  const id = stringValue(row, "id") ?? stringValue(row, "email") ?? "person";
  const first = stringValue(row, "firstName") ?? nestedStringValue(row, "name", "firstName") ?? "";
  const last = stringValue(row, "lastName") ?? nestedStringValue(row, "name", "lastName") ?? "";
  const company = objectValue(row.company);
  const phone = objectValue(row.phones);
  const phoneNumber = stringValue(row, "phone") ?? stringValue(phone ?? {}, "primaryPhoneNumber");
  const phoneCallingCode = stringValue(phone ?? {}, "primaryPhoneCallingCode");
  const fallbackCompany = stringValue(row, "companyName") ?? stringValue(company ?? {}, "name");
  const label = `${first} ${last}`.trim() || fallbackPersonLabel(id);
  return {
    id,
    label,
    status: createdByCrays(row) ? "active" : "source-record",
    owner: cleanOwner(stringValue(row, "jobTitle") ?? stringValue(row, "createdByName") ?? nestedStringValue(row, "createdBy", "name"), "Deal Manager"),
    modifiedAt: stringValue(row, "updatedAt"),
    fields: {
      company: fallbackCompany ?? null,
      role: stringValue(row, "jobTitle") ?? null,
      email: stringValue(row, "email") ?? nestedStringValue(row, "emails", "primaryEmail") ?? null,
      phone: phoneCallingCode && phoneNumber ? `${phoneCallingCode} ${phoneNumber}` : phoneNumber ?? null,
      nextContact: stringValue(row, "nextContactAt")?.slice(0, 10) ?? null,
      opportunities: relationshipCount(row, "opportunityCount", "pointOfContactForOpportunities", "opportunities"),
    },
  };
}

function normalizeOpportunity(row: Record<string, unknown>): CrmSourceRow {
  const id = stringValue(row, "id") ?? stringValue(row, "name") ?? "opportunity";
  const stage = stageLabel(stringValue(row, "stage"));
  const amount = objectValue(row.amount);
  const company = objectValue(row.company);
  const pointOfContact = objectValue(row.pointOfContact);
  const pointOfContactName = pointOfContact
    ? `${nestedStringValue(pointOfContact, "name", "firstName") ?? ""} ${nestedStringValue(pointOfContact, "name", "lastName") ?? ""}`.trim()
    : "";
  return {
    id,
    label: stringValue(row, "name") ?? fallbackOpportunityLabel(id),
    status: stage,
    owner: cleanOwner(
      stringValue(row, "ownerName") ??
        nestedStringValue(row, "owner", "userEmail") ??
        stringValue(row, "createdByName") ??
        nestedStringValue(row, "createdBy", "name"),
      "Deal Manager",
    ),
    modifiedAt: stringValue(row, "updatedAt"),
    fields: {
      company: stringValue(row, "companyName") ?? stringValue(company ?? {}, "name") ?? null,
      pointOfContact: stringValue(row, "pointOfContactName") ?? (pointOfContactName || null),
      closeDate: stringValue(row, "closeDate")?.slice(0, 10) ?? null,
      amount: moneyFromMicros(row.amountAmountMicros ?? amount?.amountMicros, stringValue(row, "amountCurrencyCode") ?? stringValue(amount ?? {}, "currencyCode")),
      tasks: relationshipCount(row, "taskCount", "taskTargets", "tasks"),
    },
  };
}

function normalizeTask(row: Record<string, unknown>): CrmSourceRow {
  const id = stringValue(row, "id") ?? stringValue(row, "title") ?? "task";
  const status = stageLabel(stringValue(row, "status"));
  const body = objectValue(row.bodyV2);
  return {
    id,
    label: stringValue(row, "title") ?? fallbackTaskLabel(id),
    status,
    owner: cleanOwner(stringValue(row, "assigneeName") ?? stringValue(row, "createdByName") ?? nestedStringValue(row, "createdBy", "name"), "Deal Manager"),
    modifiedAt: stringValue(row, "updatedAt"),
    fields: {
      dueDate: stringValue(row, "dueAt")?.slice(0, 10) ?? null,
      targetType: stringValue(row, "targetType") ?? null,
      target: stringValue(row, "targetName") ?? null,
      body: stringValue(row, "body") ?? stringValue(body ?? {}, "markdown") ?? null,
    },
  };
}

function personName(record: Record<string, unknown> | null) {
  if (!record) return "";
  return `${nestedStringValue(record, "name", "firstName") ?? ""} ${nestedStringValue(record, "name", "lastName") ?? ""}`.trim();
}

function taskTargetDescriptor(row: Record<string, unknown>) {
  const opportunity = objectValue(row.targetOpportunity);
  const company = objectValue(row.targetCompany);
  const person = objectValue(row.targetPerson);
  if (stringValue(row, "targetOpportunityId")) {
    return {
      targetType: "Opportunity",
      targetName: stringValue(opportunity ?? {}, "name") ?? stringValue(row, "targetOpportunityId"),
    };
  }
  if (stringValue(row, "targetCompanyId")) {
    return {
      targetType: "Company",
      targetName: stringValue(company ?? {}, "name") ?? stringValue(row, "targetCompanyId"),
    };
  }
  if (stringValue(row, "targetPersonId")) {
    return {
      targetType: "Person",
      targetName: personName(person) || stringValue(row, "targetPersonId"),
    };
  }
  return {};
}

function sanitizeRows(rows: CrmSourceRow[], includeDemo: boolean) {
  if (includeDemo) return rows;
  return rows.filter((row) => !String(row.fields.email ?? "").endsWith("@example.crays.net"));
}

const coreWorkflowFamilies = ["companies", "people", "leads", "opportunities", "tasks", "notes", "emails", "calendar-events", "activities", "files"] as const;

type CoreCrmSourceMapRow = {
  external_entity_type: string;
  external_entity_id: string;
  sync_status: string;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
};

function coreFamilyLabel(family: string) {
  const labels: Record<string, string> = {
    leads: "Leads",
    companies: "Companies",
    people: "People",
    opportunities: "Opportunities",
    tasks: "Tasks",
    notes: "Notes",
    emails: "Emails",
    "calendar-events": "Calendar events",
    activities: "Activities",
    files: "Files",
  };
  return labels[family] ?? family.replace(/(^|-)([a-z])/g, (_, prefix: string, char: string) => `${prefix ? " " : ""}${char.toUpperCase()}`);
}

function sourceFieldValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((entry) => String(entry)).join(", ");
  return JSON.stringify(value);
}

function normalizeCoreWorkflowMap(row: CoreCrmSourceMapRow): CrmSourceRow | null {
  const metadata = row.metadata ?? {};
  const proof = objectValue(metadata.row) ?? {};
  const family = stringValue(metadata, "family") ?? stringValue(metadata, "sectionKey") ?? row.external_entity_type;
  if (!coreWorkflowFamilies.includes(family as (typeof coreWorkflowFamilies)[number])) return null;

  const fields = objectValue(proof.fields) ?? {};
  const normalizedFields: CrmSourceRow["fields"] = {
    ...(Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, sourceFieldValue(value)])) as CrmSourceRow["fields"]),
    nextAction: sourceFieldValue(proof.nextAction),
    dueState: sourceFieldValue(proof.dueState),
    role: sourceFieldValue(proof.role),
    sourceBatch: sourceFieldValue(metadata.seedBatch),
  };

  return {
    id: row.external_entity_id,
    label: stringValue(proof, "label") ?? row.external_entity_id,
    status: stringValue(proof, "status") ?? row.sync_status,
    owner: cleanOwner(stringValue(proof, "owner"), "Deal Manager"),
    modifiedAt: row.updated_at ?? stringValue(metadata, "generatedAt"),
    fields: normalizedFields,
  };
}

function mergeSections(sections: Array<{ key: string; label: string; rows: CrmSourceRow[]; count?: number }>) {
  const byKey = new Map<string, { key: string; label: string; rows: CrmSourceRow[]; count: number }>();

  for (const section of sections) {
    const existing = byKey.get(section.key) ?? { key: section.key, label: section.label, rows: [], count: 0 };
    const existingIds = new Set(existing.rows.map((row) => row.id));
    for (const row of section.rows) {
      if (existingIds.has(row.id)) continue;
      existing.rows.push(row);
      existingIds.add(row.id);
    }
    existing.count = Math.max(Number(section.count ?? 0), existing.rows.length);
    byKey.set(section.key, existing);
  }

  const preferredOrder = ["companies", "people", "leads", "opportunities", "tasks", "notes", "emails", "calendar-events", "activities", "files"];
  return [...byKey.values()].sort((a, b) => preferredOrder.indexOf(a.key) - preferredOrder.indexOf(b.key));
}

async function readCrmCoreWorkflowSections(limit: number) {
  try {
    const result = await getCorePgPool().query<CoreCrmSourceMapRow>(
      `
        select
          external_entity_type,
          external_entity_id,
          sync_status,
          updated_at::text as updated_at,
          metadata
        from crays_core.external_record_maps
        where metadata ->> 'moduleKey' = 'crm'
          and external_entity_type = any($1::text[])
          and (
            metadata ->> 'seedBatch' = 'crays-crm-workflow-20260712-v1'
            or metadata ->> 'seedBatch' = 'crays-operational-realism-20260713-v1'
            or external_system = 'crm-workflow-demo-v1'
            or external_system = 'crm-operational-fixture'
          )
        order by
          case sync_status when 'conflict' then 0 else 1 end,
          updated_at desc,
          external_entity_id
        limit $2
      `,
      [coreWorkflowFamilies, Math.max(limit, 80)],
    );

    const grouped = new Map<string, CrmSourceRow[]>();
    for (const row of result.rows) {
      const normalized = normalizeCoreWorkflowMap(row);
      if (!normalized) continue;
      const family = row.external_entity_type;
      grouped.set(family, [...(grouped.get(family) ?? []), normalized]);
    }

    return [...grouped.entries()].map(([family, rows]) => ({
      key: family,
      label: coreFamilyLabel(family),
      count: rows.length,
      rows,
    }));
  } catch {
    return [];
  }
}

function crmHttpValue(primary: string) {
  return privateEnvValue(primary)?.trim();
}

function readCrmHttpConfig(): CrmHttpConfig | null {
  const baseUrl = crmHttpValue("CRAYS_CRM_BASE_URL");
  const email = crmHttpValue("CRAYS_CRM_EMAIL");
  const password = privateEnvValue("CRAYS_CRM_PASSWORD");
  if (!baseUrl || !email || !password) return null;

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "The CRM source URL is invalid.");
  }

  const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !localHttp) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "The CRM source URL is invalid.");
  }

  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    email,
    password,
    timeoutMs: Math.min(Math.max(Number(privateEnvValue("CRAYS_CRM_SOURCE_TIMEOUT_MS") ?? 8_000), 1_000), 30_000),
  };
}

async function fetchCrmJson(config: CrmHttpConfig, path: string, init: RequestInit = {}) {
  const target = new URL(path.replace(/^\/+/, ""), `${config.baseUrl}/`);
  if (target.origin !== new URL(config.baseUrl).origin) {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "The CRM source request was rejected.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(target, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The CRM source denied this scoped read.");
    }
    if (!response.ok) {
      throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The CRM source could not complete this request.");
    }
    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof LocalEngineError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new LocalEngineError("LOCAL_SOURCE_TIMEOUT", 504, "The CRM source timed out.");
    }
    throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The CRM source is unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

async function crmAccessToken(config: CrmHttpConfig) {
  const signInQuery = `
    mutation SignInForWorkspace($email: String!, $password: String!) {
      signIn(email: $email, password: $password) {
        availableWorkspaces {
          availableWorkspacesForSignIn {
            loginToken
          }
        }
      }
    }
  `;
  const signIn = await fetchCrmJson(config, "/metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: config.baseUrl },
    body: JSON.stringify({
      query: signInQuery,
      variables: { email: config.email, password: config.password },
    }),
  });
  const signInData = objectValue(signIn.data);
  const signInRecord = objectValue(signInData?.signIn);
  const availableWorkspaces = objectValue(signInRecord?.availableWorkspaces);
  const firstWorkspace = objectValue(arrayValue(availableWorkspaces, "availableWorkspacesForSignIn")[0]);
  const loginToken = stringValue(firstWorkspace ?? {}, "loginToken");
  if (!loginToken) {
    throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The CRM source did not return a login token.");
  }

  const authQuery = `
    mutation getAuthTokensFromLoginToken($loginToken: String!, $origin: String!) {
      getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) {
        tokens {
          accessOrWorkspaceAgnosticToken {
            token
            expiresAt
          }
        }
      }
    }
  `;
  const auth = await fetchCrmJson(config, "/metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: config.baseUrl },
    body: JSON.stringify({ query: authQuery, variables: { loginToken, origin: config.baseUrl } }),
  });
  const authData = objectValue(auth.data);
  const tokenEnvelope = objectValue(authData?.getAuthTokensFromLoginToken);
  const tokens = objectValue(tokenEnvelope?.tokens);
  const accessToken = objectValue(tokens?.accessOrWorkspaceAgnosticToken);
  const token = stringValue(accessToken ?? {}, "token");
  if (!token) {
    throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The CRM source did not return an access token.");
  }
  return token;
}

function rowsFromRest(payload: Record<string, unknown>, key: string) {
  const data = objectValue(payload.data) ?? {};
  const rows = data[key];
  return Array.isArray(rows) ? rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object" && !Array.isArray(row))) : [];
}

function countFromRest(payload: Record<string, unknown>, key: string, rows: unknown[]) {
  const count = Number(payload.totalCount ?? (payload.data as Record<string, unknown> | undefined)?.totalCount);
  return Number.isFinite(count) ? count : rows.length;
}

async function readCrmHttpSourceSlice(limit: number, includeDemo: boolean) {
  const config = readCrmHttpConfig();
  if (!config) {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "The CRM source HTTP connection is not configured.");
  }
  const token = await crmAccessToken(config);
  const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
  const [companiesPayload, peoplePayload, opportunitiesPayload, tasksPayload, taskTargetsPayload] = await Promise.all([
    fetchCrmJson(config, `/rest/companies?limit=${limit}&depth=1`, { method: "GET", headers }),
    fetchCrmJson(config, `/rest/people?limit=${limit}&depth=1`, { method: "GET", headers }),
    fetchCrmJson(config, `/rest/opportunities?limit=${limit}&depth=1`, { method: "GET", headers }),
    fetchCrmJson(config, `/rest/tasks?limit=${limit}&depth=1`, { method: "GET", headers }),
    fetchCrmJson(config, `/rest/taskTargets?limit=${Math.max(limit * 3, 30)}&depth=1`, { method: "GET", headers }),
  ]);

  const companyRows = rowsFromRest(companiesPayload, "companies");
  const personRows = rowsFromRest(peoplePayload, "people");
  const opportunityRows = rowsFromRest(opportunitiesPayload, "opportunities");
  const taskRows = rowsFromRest(tasksPayload, "tasks");
  const taskTargetRows = rowsFromRest(taskTargetsPayload, "taskTargets");
  const taskTargetsByTaskId = new Map<string, Record<string, unknown>>();
  for (const row of taskTargetRows) {
    const taskId = stringValue(row, "taskId");
    if (taskId && !taskTargetsByTaskId.has(taskId)) taskTargetsByTaskId.set(taskId, taskTargetDescriptor(row));
  }
  const taskRowsWithTargets = taskRows.map((row) => ({
    ...row,
    ...(taskTargetsByTaskId.get(stringValue(row, "id") ?? "") ?? {}),
  }));
  const rows = {
    companies: sanitizeRows(companyRows.map(normalizeCompany), includeDemo),
    people: sanitizeRows(personRows.map(normalizePerson), includeDemo),
    opportunities: sanitizeRows(opportunityRows.map(normalizeOpportunity), includeDemo),
    tasks: sanitizeRows(taskRowsWithTargets.map(normalizeTask), includeDemo),
  };
  const liveSections = [
    { key: "companies" as const, label: "Companies", rows: rows.companies, count: countFromRest(companiesPayload, "companies", companyRows) },
    { key: "people" as const, label: "People", rows: rows.people, count: countFromRest(peoplePayload, "people", personRows) },
    {
      key: "opportunities" as const,
      label: "Opportunities",
      rows: rows.opportunities,
      count: countFromRest(opportunitiesPayload, "opportunities", opportunityRows),
    },
    { key: "tasks" as const, label: "Tasks", rows: rows.tasks, count: countFromRest(tasksPayload, "tasks", taskRows) },
  ];
  const coreSections = await readCrmCoreWorkflowSections(limit);
  const sections = mergeSections([...liveSections, ...coreSections]);

  return {
    source: { connection: "live-api" as const, owner: "CRM" as const },
    generatedAt: new Date().toISOString(),
    rowLimit: limit,
    summary: Object.fromEntries(sections.map((section) => [section.key, section.count])),
    sections,
    capabilities: {
      liveReads: true,
      draftWrites: false,
      externalSending: false,
      workflowAutomation: false,
    },
    diagnostics: {
      httpRuntime: true,
      demoRowsIncluded: includeDemo,
      coreWorkflowSectionsIncluded: coreSections.length,
    },
    secretsReturned: false,
  };
}

export async function getCrmOperationalSourceSlice(options: { limit?: number; includeDemo?: boolean } = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit ?? 60), 150));
  const includeDemo = Boolean(options.includeDemo);
  const httpConfig = readCrmHttpConfig();
  if (httpConfig) {
    return readCrmHttpSourceSlice(limit, includeDemo);
  }

  const schemaName = await readCrmWorkspaceSchema();
  const schema = quotePgIdentifier(schemaName);

  const sql = `
    with company_rows as (
      select
        c.id::text,
        c.name,
        c."domainNamePrimaryLinkLabel" as "domainLabel",
        c."domainNamePrimaryLinkUrl" as "domainUrl",
        c."addressAddressCity" as city,
        c."addressAddressCountry" as country,
        c."annualRevenueAmountMicros"::text as "annualRevenueAmountMicros",
        c."annualRevenueCurrencyCode" as "annualRevenueCurrencyCode",
        c."createdByName" as "createdByName",
        c."updatedByName" as "updatedByName",
        c."updatedAt"::text as "updatedAt",
        count(distinct p.id)::int as "peopleCount",
        count(distinct o.id)::int as "opportunityCount"
      from ${schema}.company c
      left join ${schema}.person p on p."companyId" = c.id and p."deletedAt" is null
      left join ${schema}.opportunity o on o."companyId" = c.id and o."deletedAt" is null
      where c."deletedAt" is null
      group by c.id
      order by c."updatedAt" desc
      limit ${limit}
    ),
    person_rows as (
      select
        p.id::text,
        p."nameFirstName" as "firstName",
        p."nameLastName" as "lastName",
        p."emailsPrimaryEmail" as email,
        p."phonesPrimaryPhoneNumber" as phone,
        p."jobTitle" as "jobTitle",
        c.name as "companyName",
        p."createdByName" as "createdByName",
        p."updatedByName" as "updatedByName",
        p."updatedAt"::text as "updatedAt",
        count(distinct o.id)::int as "opportunityCount",
        min(t."dueAt")::text as "nextContactAt"
      from ${schema}.person p
      left join ${schema}.company c on c.id = p."companyId"
      left join ${schema}.opportunity o on o."pointOfContactId" = p.id and o."deletedAt" is null
      left join ${schema}."taskTarget" tt on tt."targetPersonId" = p.id and tt."deletedAt" is null
      left join ${schema}.task t on t.id = tt."taskId" and t."deletedAt" is null and t.status <> 'DONE'
      where p."deletedAt" is null
      group by p.id, c.name
      order by p."updatedAt" desc
      limit ${limit}
    ),
    opportunity_rows as (
      select
        o.id::text,
        o.name,
        o."amountAmountMicros"::text as "amountAmountMicros",
        o."amountCurrencyCode" as "amountCurrencyCode",
        o."closeDate"::text as "closeDate",
        o.stage::text,
        c.name as "companyName",
        trim(coalesce(p."nameFirstName", '') || ' ' || coalesce(p."nameLastName", '')) as "pointOfContactName",
        o."createdByName" as "createdByName",
        o."updatedByName" as "updatedByName",
        o."updatedAt"::text as "updatedAt",
        count(distinct tt.id)::int as "taskCount"
      from ${schema}.opportunity o
      left join ${schema}.company c on c.id = o."companyId"
      left join ${schema}.person p on p.id = o."pointOfContactId"
      left join ${schema}."taskTarget" tt on tt."targetOpportunityId" = o.id and tt."deletedAt" is null
      where o."deletedAt" is null
      group by o.id, c.name, p."nameFirstName", p."nameLastName"
      order by o."updatedAt" desc
      limit ${limit}
    ),
    task_rows as (
      select
        t.id::text,
        t.title,
        t.status::text,
        t."dueAt"::text as "dueAt",
        t."bodyV2Markdown" as body,
        t."createdByName" as "createdByName",
        t."updatedByName" as "updatedByName",
        t."updatedAt"::text as "updatedAt",
        case
          when tt."targetOpportunityId" is not null then 'Opportunity'
          when tt."targetCompanyId" is not null then 'Company'
          when tt."targetPersonId" is not null then 'Person'
          else 'Record'
        end as "targetType",
        coalesce(o.name, c.name, trim(coalesce(p."nameFirstName", '') || ' ' || coalesce(p."nameLastName", ''))) as "targetName"
      from ${schema}.task t
      left join ${schema}."taskTarget" tt on tt."taskId" = t.id and tt."deletedAt" is null
      left join ${schema}.opportunity o on o.id = tt."targetOpportunityId"
      left join ${schema}.company c on c.id = tt."targetCompanyId"
      left join ${schema}.person p on p.id = tt."targetPersonId"
      where t."deletedAt" is null
      order by t."updatedAt" desc
      limit ${limit}
    )
    select json_build_object(
      'workspaceSchema', '${schemaName.replace(/'/g, "''")}',
      'rawCounts', json_build_object(
        'companies', (select count(*) from ${schema}.company where "deletedAt" is null),
        'people', (select count(*) from ${schema}.person where "deletedAt" is null),
        'opportunities', (select count(*) from ${schema}.opportunity where "deletedAt" is null),
        'tasks', (select count(*) from ${schema}.task where "deletedAt" is null)
      ),
      'companies', coalesce((select json_agg(company_rows) from company_rows), '[]'::json),
      'people', coalesce((select json_agg(person_rows) from person_rows), '[]'::json),
      'opportunities', coalesce((select json_agg(opportunity_rows) from opportunity_rows), '[]'::json),
      'tasks', coalesce((select json_agg(task_rows) from task_rows), '[]'::json)
    )::text;
  `;

  const { stdout } = await runCrmSourcePg(sql, 10_000);
  const payload = firstJsonObject(stdout) as CrmSnapshotPayload;
  const rows = {
    companies: sanitizeRows((payload.companies ?? []).map(normalizeCompany), includeDemo),
    people: sanitizeRows((payload.people ?? []).map(normalizePerson), includeDemo),
    opportunities: sanitizeRows((payload.opportunities ?? []).map(normalizeOpportunity), includeDemo),
    tasks: sanitizeRows((payload.tasks ?? []).map(normalizeTask), includeDemo),
  };

  const liveSections = [
    { key: "companies" as const, label: "Companies", rows: rows.companies },
    { key: "people" as const, label: "People", rows: rows.people },
    { key: "opportunities" as const, label: "Opportunities", rows: rows.opportunities },
    { key: "tasks" as const, label: "Tasks", rows: rows.tasks },
  ].map((section) => ({
    ...section,
    count: Number(payload.rawCounts?.[section.key] ?? section.rows.length),
  }));
  const coreSections = await readCrmCoreWorkflowSections(limit);
  const sections = mergeSections([...liveSections, ...coreSections]);

  return {
    source: { connection: "live-local" as const, owner: "CRM" as const },
    generatedAt: new Date().toISOString(),
    rowLimit: limit,
    summary: Object.fromEntries(sections.map((section) => [section.key, section.count])),
    sections,
    capabilities: {
      liveReads: true,
      draftWrites: false,
      externalSending: false,
      workflowAutomation: false,
    },
    diagnostics: {
      workspaceResolved: Boolean(payload.workspaceSchema),
      demoRowsIncluded: Boolean(options.includeDemo),
      coreWorkflowSectionsIncluded: coreSections.length,
    },
    secretsReturned: false,
  };
}
