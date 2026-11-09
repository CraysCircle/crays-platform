import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";

const { Pool } = pg;

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), "..", ".env.local"));

function digest(value, length = 24) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}

function safeKey(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function safeFieldValue(value) {
  if (value === undefined || value === null || /^null$/i.test(String(value))) return null;
  if (value === "1") return true;
  if (value === "0") return false;
  if (/^-?\d+(\.\d+)?$/.test(value) && !/^0\d/.test(value)) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return value;
}

function parseTsv(stdout, columns) {
  return String(stdout || "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const cells = line.split("\t");
      return Object.fromEntries(columns.map((column, index) => [column, cells[index] || ""]));
    });
}

function runSourceSql(sql, columns) {
  const container = process.env.CRAYS_ERP_DB_CONTAINER || "crays-" + "erp" + "next-db-1";
  const database = process.env.CRAYS_ERP_DB_NAME || "";
  const command = `
$ErrorActionPreference = 'Stop'
$container = $env:CRAYS_BACK_OFFICE_DB_CONTAINER
$database = $env:CRAYS_BACK_OFFICE_DB_NAME
$sql = $env:CRAYS_BACK_OFFICE_SYNC_SQL
$password = $env:CRAYS_BACK_OFFICE_DB_PASSWORD
if (-not $password) {
  $password = (wsl.exe -e docker exec $container printenv MYSQL_ROOT_PASSWORD).Trim()
}
if (-not $password) { throw 'The local back-office database password could not be resolved.' }
if (-not $database) {
  $database = (wsl.exe -e docker exec -e MYSQL_PWD=$password $container mariadb -uroot -B -N -e "select schema_name from information_schema.schemata where schema_name not in ('information_schema','mysql','performance_schema','sys') order by schema_name limit 1").Trim()
}
if (-not $database) { throw 'The local back-office database name could not be resolved.' }
wsl.exe -e docker exec -e MYSQL_PWD=$password $container mariadb -uroot -B -N --database $database -e $sql
if ($LASTEXITCODE -ne 0) { throw 'The local back-office database rejected the snapshot query.' }
`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    env: {
      ...process.env,
      CRAYS_BACK_OFFICE_DB_CONTAINER: container,
      CRAYS_BACK_OFFICE_DB_NAME: database,
      CRAYS_BACK_OFFICE_SYNC_SQL: sql,
    },
    encoding: "utf8",
    timeout: 15_000,
    windowsHide: true,
  });

  if (result.status !== 0) {
    return { rows: [], error: "source_query_failed" };
  }
  return { rows: parseTsv(result.stdout, columns), error: "" };
}

const sourceQueries = [
  {
    key: "accounts",
    label: "Accounts",
    owner: "Finance",
    columns: ["id", "label", "status", "modified_at", "account_type", "root_type", "company"],
    sql: "select name, coalesce(account_name, name), case when disabled = 1 then 'disabled' else 'active' end, modified, account_type, root_type, company from tabAccount order by modified desc limit 5",
  },
  {
    key: "cost-centers",
    label: "Cost centers",
    owner: "Finance",
    columns: ["id", "label", "status", "modified_at", "company", "parent", "group"],
    sql: "select name, coalesce(cost_center_name, name), case when disabled = 1 then 'disabled' else 'active' end, modified, company, parent_cost_center, is_group from `tabCost Center` order by modified desc limit 5",
  },
  {
    key: "budgets",
    label: "Budgets",
    owner: "Finance",
    columns: ["id", "label", "status", "modified_at", "company", "cost_center", "project"],
    sql: "select name, coalesce(cost_center, name), case when docstatus = 1 then 'submitted' else 'draft' end, modified, company, cost_center, project from tabBudget order by modified desc limit 5",
  },
  {
    key: "invoices",
    label: "Invoices",
    owner: "Finance",
    columns: ["id", "label", "status", "modified_at", "kind", "posting_date", "due_date", "amount", "currency", "company"],
    sql: "select name, coalesce(customer, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end), modified, 'Sales Invoice', posting_date, due_date, grand_total, currency, company from `tabSales Invoice` order by modified desc limit 5",
  },
  {
    key: "suppliers",
    label: "Suppliers",
    owner: "Procurement",
    columns: ["id", "label", "status", "modified_at", "group", "country", "currency"],
    sql: "select name, coalesce(supplier_name, name), case when disabled = 1 then 'disabled' else 'active' end, modified, supplier_group, country, coalesce(default_currency, 'EUR') from tabSupplier order by modified desc limit 5",
  },
  {
    key: "customers",
    label: "Customers",
    owner: "Customer Experience",
    columns: ["id", "label", "status", "modified_at", "group", "territory", "type"],
    sql: "select name, coalesce(customer_name, name), case when disabled = 1 then 'disabled' else 'active' end, modified, customer_group, territory, customer_type from tabCustomer order by modified desc limit 5",
  },
  {
    key: "items",
    label: "Items",
    owner: "Procurement",
    columns: ["id", "label", "status", "modified_at", "group", "stock_unit", "fixed_asset", "maintain_stock"],
    sql: "select name, coalesce(item_name, name), case when disabled = 1 then 'disabled' else 'active' end, modified, item_group, stock_uom, is_fixed_asset, is_stock_item from tabItem order by modified desc limit 5",
  },
  {
    key: "purchase-orders",
    label: "Purchase orders",
    owner: "Procurement",
    columns: ["id", "label", "status", "modified_at", "transaction_date", "schedule_date", "amount", "currency", "company"],
    sql: "select name, coalesce(supplier, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end), modified, transaction_date, schedule_date, grand_total, currency, company from `tabPurchase Order` order by modified desc limit 5",
  },
  {
    key: "material-requests",
    label: "Material requests",
    owner: "Procurement",
    columns: ["id", "label", "status", "modified_at", "request_type", "transaction_date", "schedule_date", "company"],
    sql: "select name, coalesce(material_request_type, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end), modified, material_request_type, transaction_date, schedule_date, company from `tabMaterial Request` order by modified desc limit 5",
  },
  {
    key: "projects",
    label: "Projects",
    owner: "Operations",
    columns: ["id", "label", "status", "modified_at", "company", "priority", "expected_end", "progress"],
    sql: "select name, coalesce(project_name, name), coalesce(status, 'Open'), modified, company, coalesce(priority, 'Medium'), expected_end_date, percent_complete from tabProject order by modified desc limit 5",
  },
  {
    key: "tasks",
    label: "Tasks",
    owner: "Operations",
    columns: ["id", "label", "status", "modified_at", "project", "priority", "expected_end", "progress"],
    sql: "select name, coalesce(subject, name), coalesce(status, 'Open'), modified, project, coalesce(priority, 'Medium'), exp_end_date, progress from tabTask order by modified desc limit 5",
  },
  {
    key: "employees",
    label: "Employees",
    owner: "HR",
    columns: ["id", "label", "status", "modified_at", "department", "designation", "branch", "company"],
    sql: "select name, coalesce(employee_name, name), coalesce(status, 'Active'), modified, department, designation, branch, company from tabEmployee order by modified desc limit 5",
  },
  {
    key: "departments",
    label: "Departments",
    owner: "HR",
    columns: ["id", "label", "status", "modified_at", "company", "parent", "group"],
    sql: "select name, coalesce(department_name, name), case when disabled = 1 then 'disabled' else 'active' end, modified, company, parent_department, is_group from tabDepartment order by modified desc limit 5",
  },
  {
    key: "job-applicants",
    label: "Job applicants",
    owner: "HR",
    columns: ["id", "label", "status", "modified_at", "email", "phone", "designation", "source"],
    sql: "select name, coalesce(applicant_name, name), coalesce(status, 'Open'), modified, email_id, phone_number, designation, source from `tabJob Applicant` order by modified desc limit 5",
  },
  {
    key: "training-events",
    label: "Training events",
    owner: "Academy",
    columns: ["id", "label", "status", "modified_at", "program", "event_date", "location", "company"],
    sql: "select name, coalesce(event_name, training_program, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end), modified, training_program, event_date, location, company from `tabTraining Event` order by modified desc limit 5",
  },
  {
    key: "assets",
    label: "Assets",
    owner: "Facilities",
    columns: ["id", "label", "status", "modified_at", "item_code", "company", "location", "purchase_date"],
    sql: "select name, coalesce(asset_name, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end), modified, item_code, company, location, purchase_date from tabAsset order by modified desc limit 5",
  },
  {
    key: "maintenance",
    label: "Maintenance",
    owner: "Maintenance",
    columns: ["id", "label", "status", "modified_at", "asset", "company"],
    sql: "select name, coalesce(asset_name, name), 'Planned', modified, asset_name, company from `tabAsset Maintenance` order by modified desc limit 5",
  },
  {
    key: "issues",
    label: "Issues",
    owner: "Support",
    columns: ["id", "label", "status", "modified_at", "priority", "issue_type", "customer"],
    sql: "select name, coalesce(subject, name), coalesce(status, 'Open'), modified, priority, issue_type, customer from tabIssue order by modified desc limit 5",
  },
  {
    key: "quality-inspections",
    label: "Quality inspections",
    owner: "Quality",
    columns: ["id", "label", "status", "modified_at", "inspection_type", "reference_type", "reference_name", "item_code"],
    sql: "select name, coalesce(item_name, item_code, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end), modified, inspection_type, reference_type, reference_name, item_code from `tabQuality Inspection` order by modified desc limit 5",
  },
  {
    key: "communications",
    label: "Communications",
    owner: "Support",
    columns: ["id", "label", "status", "modified_at", "communication_type", "reference_doctype", "reference_name"],
    sql: "select name, coalesce(subject, name), coalesce(status, 'Linked'), modified, communication_type, reference_doctype, reference_name from tabCommunication order by modified desc limit 5",
  },
];

function rowFromSource(query, row) {
  const fields = {};
  for (const column of query.columns.slice(4)) fields[column] = safeFieldValue(row[column]);
  return {
    id: row.id,
    label: row.label || row.id,
    status: row.status || "synced",
    owner: query.owner,
    modifiedAt: row.modified_at || undefined,
    fields,
  };
}

function collectSections() {
  const sections = [];
  const skippedFamilies = [];
  for (const query of sourceQueries) {
    const result = runSourceSql(query.sql, query.columns);
    if (result.error) skippedFamilies.push(query.key);
    sections.push({
      key: query.key,
      label: query.label,
      count: result.rows.length,
      rows: result.rows.map((row) => rowFromSource(query, row)).filter((row) => row.id && row.label),
    });
  }
  return { sections, skippedFamilies };
}

function targetForSection(sectionKey, rowId) {
  const normalizedSection = safeKey(sectionKey);
  const normalizedId = digest(`erp:${normalizedSection}:${rowId}`, 18);
  if (normalizedSection === "customers" || normalizedSection === "suppliers") {
    return { craysEntityType: "organization", craysEntityId: `backoffice_org_${normalizedId}` };
  }
  if (normalizedSection === "employees" || normalizedSection === "job-applicants") {
    return { craysEntityType: "account", craysEntityId: `backoffice_account_${normalizedId}` };
  }
  if (normalizedSection === "communications") {
    return { craysEntityType: "conversation", craysEntityId: `backoffice_thread_${normalizedId}` };
  }
  if (["projects", "tasks", "maintenance", "issues", "quality-inspections", "assets"].includes(normalizedSection)) {
    return { craysEntityType: "property-case", craysEntityId: `studio_ops_${normalizedId}` };
  }
  return { craysEntityType: "financial-model", craysEntityId: `finance_model_${normalizedId}` };
}

function rowMetadata(moduleKey, section, row, jobId, generatedAt) {
  return {
    moduleKey,
    sectionKey: section.key,
    sectionLabel: section.label,
    syncJobId: jobId,
    snapshotGeneratedAt: generatedAt,
    row: {
      id: row.id,
      label: row.label,
      status: row.status,
      owner: row.owner,
      modifiedAt: row.modifiedAt ?? null,
      fields: row.fields,
      fieldKeys: Object.keys(row.fields).sort(),
      sourceDigest: digest({ id: row.id, label: row.label, status: row.status, modifiedAt: row.modifiedAt, fields: row.fields }, 32),
    },
  };
}

function corePool() {
  if (!process.env.CRAYS_DATABASE_URL) {
    throw new Error("CRAYS_DATABASE_URL is required for Core snapshot sync.");
  }
  const hostname = new URL(process.env.CRAYS_DATABASE_URL).hostname;
  const managed = hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.endsWith(".local");
  return new Pool({
    connectionString: process.env.CRAYS_DATABASE_URL,
    max: 2,
    ssl: process.env.CRAYS_DATABASE_SSL === "disable" ? undefined : managed || process.env.CRAYS_DATABASE_SSL === "require" ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
    options: "-c crays.app_role=core_service",
  });
}

async function persistSnapshot(sections, skippedFamilies) {
  const moduleKey = "erp";
  const connectionId = "core_source_erp";
  const systemKey = "erp-engine";
  const generatedAt = new Date().toISOString();
  const rows = sections.flatMap((section) => section.rows.map((row) => ({ section, row })));
  const jobId = `sync_job_${digest({ moduleKey, generatedAt, rows: rows.length }, 28)}`;
  const pool = corePool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("select set_config('crays.app_role', 'core_service', true)");
    await client.query(
      `
        insert into crays_core.integration_connections (
          connection_id, module_key, system_key, connection_name, owner_role, status,
          connection_mode, secret_reference_status, connection_health, metadata, updated_at
        )
        values ($1, $2, $3, $4, 'finance', 'active', 'sync_read_model', 'configured_reference', $5, $6::jsonb, now())
        on conflict (connection_id) do update set
          status = excluded.status,
          connection_mode = excluded.connection_mode,
          secret_reference_status = excluded.secret_reference_status,
          connection_health = excluded.connection_health,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        connectionId,
        moduleKey,
        systemKey,
        "ERP source read model",
        skippedFamilies.length ? "degraded" : "healthy",
        JSON.stringify({
          sourceConnection: "snapshot-local-source",
          generatedAt,
          sections: sections.map((section) => ({ key: section.key, count: section.count })),
          skippedFamilies,
        }),
      ],
    );

    await client.query(
      `
        insert into crays_core.sync_jobs (
          job_id, connection_id, job_type, direction, status, attempt_count,
          payload_summary, scheduled_at, started_at, finished_at, updated_at
        )
        values ($1, $2, 'read_sync', 'read', 'succeeded', 1, $3::jsonb, now(), now(), now(), now())
        on conflict (job_id) do update set
          status = excluded.status,
          attempt_count = crays_core.sync_jobs.attempt_count + 1,
          payload_summary = excluded.payload_summary,
          started_at = excluded.started_at,
          finished_at = excluded.finished_at,
          updated_at = now()
      `,
      [
        jobId,
        connectionId,
        JSON.stringify({
          moduleKey,
          rowsSeen: rows.length,
          sectionsSeen: sections.length,
          sourceConnection: "snapshot-local-source",
          skippedFamilies,
        }),
      ],
    );

    let mapsWritten = 0;
    for (const { section, row } of rows) {
      const target = targetForSection(section.key, row.id);
      const mapId = `map_${digest({ moduleKey, sectionKey: section.key, rowId: row.id }, 30)}`;
      const result = await client.query(
        `
          insert into crays_core.external_record_maps (
            map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type,
            external_entity_id, sync_direction, sync_status, last_synced_at, metadata, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, 'read', 'synced', now(), $7::jsonb, now())
          on conflict (external_system, external_entity_type, external_entity_id) do update set
            crays_entity_type = excluded.crays_entity_type,
            crays_entity_id = excluded.crays_entity_id,
            sync_status = 'synced',
            last_synced_at = now(),
            metadata = excluded.metadata,
            updated_at = now()
        `,
        [mapId, target.craysEntityType, target.craysEntityId, systemKey, section.key, row.id, JSON.stringify(rowMetadata(moduleKey, section, row, jobId, generatedAt))],
      );
      mapsWritten += result.rowCount ?? 0;
    }

    await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key,
          visibility_roles, event_status, payload, occurred_at
        )
        values ($1, 'source.snapshot.persisted', 'sync-job', $2, 'finance', $3::jsonb, 'recorded', $4::jsonb, now())
      `,
      [
        `workflow_event_${randomUUID()}`,
        jobId,
        JSON.stringify(["admin", "crays-management", "reviewer", "finance"]),
        JSON.stringify({ moduleKey, connectionId, rowsSeen: rows.length, mapsWritten, sourceConnection: "snapshot-local-source", skippedFamilies }),
      ],
    );

    await client.query("commit");
    return { jobId, mapsWritten, rowsSeen: rows.length, sectionsSeen: sections.length };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

const { sections, skippedFamilies } = collectSections();
const rowsSeen = sections.reduce((sum, section) => sum + section.rows.length, 0);
if (!rowsSeen) {
  console.error(JSON.stringify({ status: "failed", rowsSeen, skippedFamilies }, null, 2));
  process.exit(1);
}

const result = await persistSnapshot(sections, skippedFamilies);
console.log(
  JSON.stringify(
    {
      status: "persisted",
      ...result,
      sectionCounts: Object.fromEntries(sections.map((section) => [section.key, section.count])),
      skippedFamilies,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    null,
    2,
  ),
);
