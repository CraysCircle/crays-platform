import { parseTsv, runBackOfficeSql } from "./local-engine-runtime";

export type BackOfficeSourceEntity =
  | "accounts"
  | "cost-centers"
  | "budgets"
  | "invoices"
  | "customers"
  | "suppliers"
  | "items"
  | "purchase-orders"
  | "material-requests"
  | "projects"
  | "tasks"
  | "employees"
  | "departments"
  | "job-applicants"
  | "training-events"
  | "assets"
  | "maintenance"
  | "issues"
  | "quality-inspections"
  | "communications";

export type BackOfficeSourceRow = {
  id: string;
  label: string;
  status: string;
  owner: string;
  modifiedAt?: string;
  fields: Record<string, string | number | boolean | null>;
};

type QueryResult = {
  rows: Array<Record<string, string>>;
  error: string;
};

function text(row: Record<string, string>, field: string, fallback = "") {
  const value = row[field]?.trim();
  if (!value || /^null$/i.test(value)) return fallback;
  return value;
}

function number(row: Record<string, string>, field: string) {
  const value = Number(row[field] || 0);
  return Number.isFinite(value) ? value : 0;
}

function money(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function optionalRows(sql: string, columns: string[], timeoutMs = 12_000): Promise<QueryResult> {
  try {
    const { stdout } = await runBackOfficeSql(sql, timeoutMs);
    return { rows: parseTsv(stdout, columns), error: "" };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : "Source query failed.",
    };
  }
}

const unifiedColumns = ["section_key", "section_label", "id", "label", "status", "owner", "modified_at", "fields_json"];

const unifiedSectionOrder: Array<{ key: BackOfficeSourceEntity; label: string }> = [
  { key: "accounts", label: "Accounts" },
  { key: "cost-centers", label: "Cost centers" },
  { key: "budgets", label: "Budgets" },
  { key: "invoices", label: "Invoices" },
  { key: "customers", label: "Customers" },
  { key: "suppliers", label: "Suppliers" },
  { key: "items", label: "Items" },
  { key: "purchase-orders", label: "Purchase orders" },
  { key: "material-requests", label: "Material requests" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "employees", label: "Employees" },
  { key: "departments", label: "Departments" },
  { key: "job-applicants", label: "Job applicants" },
  { key: "training-events", label: "Training events" },
  { key: "assets", label: "Assets" },
  { key: "maintenance", label: "Maintenance" },
  { key: "issues", label: "Issues" },
  { key: "quality-inspections", label: "Quality inspections" },
  { key: "communications", label: "Communications" },
];

function safeFieldValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function fieldsFromJson(value: string) {
  try {
    const parsed = JSON.parse(value || "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, fieldValue]) => [key, safeFieldValue(fieldValue)]));
  } catch {
    return {};
  }
}

function normalizeUnifiedBackOfficeRow(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "id", "source-record"),
    label: text(row, "label", "Source record"),
    status: text(row, "status", "open"),
    owner: text(row, "owner", "Operations"),
    modifiedAt: text(row, "modified_at") || undefined,
    fields: fieldsFromJson(text(row, "fields_json", "{}")),
  };
}

function unifiedBackOfficeSql(limit: number) {
  return `
(select 'accounts' as section_key, 'Accounts' as section_label, name as id, coalesce(account_name, name) as label,
  case when disabled = 1 then 'disabled' else 'active' end as status, 'Finance' as owner, modified as modified_at,
  json_object('accountNumber', account_number, 'accountType', account_type, 'rootType', root_type, 'company', company, 'balanceMustBe', balance_must_be) as fields_json
 from tabAccount order by modified desc limit ${limit})
union all
(select 'cost-centers', 'Cost centers', name, coalesce(cost_center_name, name),
  case when disabled = 1 then 'disabled' else 'active' end, 'Finance', modified,
  json_object('company', company, 'parent', parent_cost_center, 'group', is_group = 1)
 from \`tabCost Center\` order by modified desc limit ${limit})
union all
(select 'budgets', 'Budgets', name, coalesce(cost_center, name),
  case when docstatus = 1 then 'submitted' else 'draft' end, 'Finance', modified,
  json_object('fiscalYear', coalesce(from_fiscal_year, year(curdate())), 'company', company, 'costCenter', cost_center, 'project', project)
 from tabBudget order by modified desc limit ${limit})
union all
(select 'invoices', 'Invoices', name, coalesce(customer, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end),
  'Finance', modified, json_object('kind', 'Sales Invoice', 'postingDate', posting_date, 'dueDate', due_date, 'amount', grand_total, 'currency', currency, 'company', company)
 from \`tabSales Invoice\` order by modified desc limit ${limit})
union all
(select 'invoices', 'Invoices', name, coalesce(supplier, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end),
  'Finance', modified, json_object('kind', 'Purchase Invoice', 'postingDate', posting_date, 'dueDate', due_date, 'amount', grand_total, 'currency', currency, 'company', company)
 from \`tabPurchase Invoice\` order by modified desc limit ${limit})
union all
(select 'customers', 'Customers', name, coalesce(customer_name, name),
  case when disabled = 1 then 'disabled' else 'active' end, 'Customer Experience', modified,
  json_object('group', customer_group, 'territory', territory, 'type', customer_type, 'leadName', lead_name)
 from tabCustomer order by modified desc limit ${limit})
union all
(select 'suppliers', 'Suppliers', name, coalesce(supplier_name, name),
  case when disabled = 1 then 'disabled' else 'active' end, 'Procurement', modified,
  json_object('group', supplier_group, 'country', country, 'currency', coalesce(default_currency, 'EUR'))
 from tabSupplier order by modified desc limit ${limit})
union all
(select 'items', 'Items', name, coalesce(item_name, name),
  case when disabled = 1 then 'disabled' else 'active' end, 'Procurement', modified,
  json_object('group', item_group, 'stockUnit', stock_uom, 'fixedAsset', is_fixed_asset = 1, 'maintainStock', is_stock_item = 1, 'valuationRate', valuation_rate)
 from tabItem order by modified desc limit ${limit})
union all
(select 'purchase-orders', 'Purchase orders', name, coalesce(supplier, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end),
  'Procurement', modified, json_object('transactionDate', transaction_date, 'scheduleDate', schedule_date, 'amount', grand_total, 'currency', currency, 'company', company)
 from \`tabPurchase Order\` order by modified desc limit ${limit})
union all
(select 'material-requests', 'Material requests', name, coalesce(material_request_type, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end),
  'Procurement', modified, json_object('requestType', material_request_type, 'transactionDate', transaction_date, 'scheduleDate', schedule_date, 'company', company)
 from \`tabMaterial Request\` order by modified desc limit ${limit})
union all
(select 'projects', 'Projects', name, coalesce(project_name, name), coalesce(status, 'Open'), 'Operations', modified,
  json_object('company', company, 'priority', coalesce(priority, 'Medium'), 'expectedEnd', expected_end_date, 'progress', percent_complete, 'estimatedCost', estimated_costing)
 from tabProject order by modified desc limit ${limit})
union all
(select 'tasks', 'Tasks', name, coalesce(subject, name), coalesce(status, 'Open'), 'Operations', modified,
  json_object('project', project, 'priority', coalesce(priority, 'Medium'), 'expectedEnd', exp_end_date, 'progress', progress, 'company', company)
 from tabTask order by modified desc limit ${limit})
union all
(select 'employees', 'Employees', name, coalesce(employee_name, name), coalesce(status, 'Active'), 'HR', modified,
  json_object('department', department, 'designation', designation, 'branch', branch, 'company', company, 'dateOfJoining', date_of_joining, 'relievingDate', relieving_date)
 from tabEmployee order by modified desc limit ${limit})
union all
(select 'departments', 'Departments', name, coalesce(department_name, name),
  case when disabled = 1 then 'disabled' else 'active' end, 'HR', modified,
  json_object('company', company, 'parent', parent_department, 'group', is_group = 1)
 from tabDepartment order by modified desc limit ${limit})
union all
(select 'assets', 'Assets', name, coalesce(asset_name, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end),
  'Facilities', modified, json_object('itemCode', item_code, 'company', company, 'location', location, 'purchaseDate', purchase_date, 'grossPurchaseAmount', purchase_amount)
 from tabAsset order by modified desc limit ${limit})
union all
(select 'maintenance', 'Maintenance', name, coalesce(asset_name, name), 'Planned', 'Maintenance', modified,
  json_object('asset', asset_name, 'maintenanceDate', modified, 'company', company)
 from \`tabAsset Maintenance\` order by modified desc limit ${limit})
union all
(select 'maintenance', 'Maintenance', name, coalesce(customer, name), coalesce(status, completion_status, 'Open'), 'Maintenance', modified,
  json_object('asset', customer, 'maintenanceDate', mntc_date, 'completionStatus', completion_status, 'company', company)
 from \`tabMaintenance Visit\` order by modified desc limit ${limit})
union all
(select 'issues', 'Issues', name, coalesce(subject, name), coalesce(status, 'Open'), 'Support', modified,
  json_object('priority', priority, 'issueType', issue_type, 'customer', customer, 'raisedBy', raised_by, 'openingDate', opening_date)
 from tabIssue order by modified desc limit ${limit})
union all
(select 'quality-inspections', 'Quality inspections', name, coalesce(item_name, item_code, name), coalesce(status, case when docstatus = 1 then 'submitted' else 'draft' end),
  'Quality', modified, json_object('inspectionType', inspection_type, 'referenceType', reference_type, 'referenceName', reference_name, 'itemCode', item_code, 'inspectedBy', inspected_by)
 from \`tabQuality Inspection\` order by modified desc limit ${limit})
union all
(select 'communications', 'Communications', name, coalesce(subject, name), coalesce(status, 'Linked'), 'Support', modified,
  json_object('communicationType', communication_type, 'referenceDoctype', reference_doctype, 'referenceName', reference_name, 'sender', sender, 'recipients', recipients)
 from tabCommunication order by modified desc limit ${limit})
`;
}

async function getUnifiedBackOfficeSourceSlice(limit: number) {
  try {
    const { stdout } = await runBackOfficeSql(unifiedBackOfficeSql(limit), 10_000);
    const rows = parseTsv(stdout, unifiedColumns);
    const rowsBySection = new Map<BackOfficeSourceEntity, BackOfficeSourceRow[]>();
    for (const row of rows) {
      const sectionKey = text(row, "section_key") as BackOfficeSourceEntity;
      const currentRows = rowsBySection.get(sectionKey) ?? [];
      currentRows.push(normalizeUnifiedBackOfficeRow(row));
      rowsBySection.set(sectionKey, currentRows);
    }

    const sections = unifiedSectionOrder.map((section) => {
      const sectionRows = rowsBySection.get(section.key) ?? [];
      return {
        key: section.key,
        label: section.label,
        rows: sectionRows,
        count: sectionRows.length,
      };
    });

    return {
      source: { connection: "live-local", owner: "ERP" as const },
      generatedAt: new Date().toISOString(),
      rowLimit: limit,
      summary: Object.fromEntries(sections.map((section) => [section.key, section.count])),
      sections,
      capabilities: {
        liveReads: true,
        financeDraftWrites: false,
        accountingExports: false,
        bankSends: false,
        paymentInitiation: false,
      },
      diagnostics: {
        skippedFamilies: sections.filter((section) => section.count === 0).map((section) => section.key),
        warnings: sections.some((section) => section.count === 0) ? ["Some expected back-office source families are not installed or have no local test records."] : [],
      },
      secretsReturned: false,
    };
  } catch {
    return null;
  }
}

function unavailableBackOfficeSourceSlice(limit: number) {
  const sections = unifiedSectionOrder.map((section) => ({
    key: section.key,
    label: section.label,
    rows: [] as BackOfficeSourceRow[],
    count: 0,
  }));

  return {
    source: { connection: "unavailable", owner: "ERP" as const },
    generatedAt: new Date().toISOString(),
    rowLimit: limit,
    summary: Object.fromEntries(sections.map((section) => [section.key, section.count])),
    sections,
    capabilities: {
      liveReads: false,
      financeDraftWrites: false,
      accountingExports: false,
      bankSends: false,
      paymentInitiation: false,
    },
    diagnostics: {
      skippedFamilies: sections.map((section) => section.key),
      warnings: ["The live back-office source did not respond inside the local workbench timeout."],
    },
    secretsReturned: false,
  };
}

function normalizeAccount(row: Record<string, string>): BackOfficeSourceRow {
  const disabled = text(row, "disabled") === "1";
  return {
    id: text(row, "name", "account"),
    label: text(row, "account_name", text(row, "name", "Account")),
    status: disabled ? "disabled" : "active",
    owner: "Finance",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      accountNumber: text(row, "account_number") || null,
      accountType: text(row, "account_type") || null,
      rootType: text(row, "root_type") || null,
      company: text(row, "company") || null,
      balanceMustBe: text(row, "balance_must_be") || null,
    },
  };
}

function normalizeCostCenter(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "cost-center"),
    label: text(row, "cost_center_name", text(row, "name", "Cost center")),
    status: text(row, "disabled") === "1" ? "disabled" : "active",
    owner: "Finance",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      company: text(row, "company") || null,
      parent: text(row, "parent_cost_center") || null,
      group: text(row, "is_group") === "1",
    },
  };
}

function normalizeBudget(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "budget"),
    label: text(row, "cost_center", text(row, "name", "Budget")),
    status: text(row, "docstatus") === "1" ? "submitted" : "draft",
    owner: "Finance",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      fiscalYear: text(row, "fiscal_year") || null,
      company: text(row, "company") || null,
      costCenter: text(row, "cost_center") || null,
      project: text(row, "project") || null,
    },
  };
}

function normalizeInvoice(row: Record<string, string>): BackOfficeSourceRow {
  const grandTotal = number(row, "grand_total");
  const currency = text(row, "currency", "EUR");
  return {
    id: text(row, "name", "invoice"),
    label: text(row, "party", text(row, "name", "Invoice")),
    status: text(row, "status", text(row, "docstatus") === "1" ? "submitted" : "draft"),
    owner: "Finance",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      kind: text(row, "kind") || null,
      postingDate: text(row, "posting_date") || null,
      amount: money(grandTotal, currency),
      currency,
      company: text(row, "company") || null,
      dueDate: text(row, "due_date") || null,
    },
  };
}

function normalizeSupplier(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "supplier"),
    label: text(row, "supplier_name", text(row, "name", "Supplier")),
    status: text(row, "disabled") === "1" ? "disabled" : "active",
    owner: "Procurement",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      group: text(row, "supplier_group") || null,
      country: text(row, "country") || null,
      currency: text(row, "default_currency", "EUR"),
    },
  };
}

function normalizeCustomer(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "customer"),
    label: text(row, "customer_name", text(row, "name", "Customer")),
    status: text(row, "disabled") === "1" ? "disabled" : "active",
    owner: "Customer Experience",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      group: text(row, "customer_group") || null,
      territory: text(row, "territory") || null,
      type: text(row, "customer_type") || null,
      leadName: text(row, "lead_name") || null,
    },
  };
}

function normalizeItem(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "item"),
    label: text(row, "item_name", text(row, "name", "Item")),
    status: text(row, "disabled") === "1" ? "disabled" : "active",
    owner: "Procurement",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      group: text(row, "item_group") || null,
      stockUnit: text(row, "stock_uom") || null,
      fixedAsset: text(row, "is_fixed_asset") === "1",
      maintainStock: text(row, "is_stock_item") === "1",
      valuationRate: money(number(row, "valuation_rate")),
    },
  };
}

function normalizePurchaseOrder(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "purchase-order"),
    label: text(row, "supplier", text(row, "name", "Purchase order")),
    status: text(row, "status", text(row, "docstatus") === "1" ? "submitted" : "draft"),
    owner: "Procurement",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      transactionDate: text(row, "transaction_date") || null,
      scheduleDate: text(row, "schedule_date") || null,
      amount: money(number(row, "grand_total"), text(row, "currency", "EUR")),
      currency: text(row, "currency", "EUR"),
      company: text(row, "company") || null,
    },
  };
}

function normalizeMaterialRequest(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "material-request"),
    label: text(row, "material_request_type", text(row, "name", "Material request")),
    status: text(row, "status", text(row, "docstatus") === "1" ? "submitted" : "draft"),
    owner: "Procurement",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      requestType: text(row, "material_request_type") || null,
      transactionDate: text(row, "transaction_date") || null,
      scheduleDate: text(row, "schedule_date") || null,
      company: text(row, "company") || null,
    },
  };
}

function normalizeProject(row: Record<string, string>): BackOfficeSourceRow {
  const amount = number(row, "estimated_costing");
  return {
    id: text(row, "name", "project"),
    label: text(row, "project_name", text(row, "name", "Project")),
    status: text(row, "status", "Open"),
    owner: "Operations",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      company: text(row, "company") || null,
      priority: text(row, "priority", "Medium"),
      expectedEnd: text(row, "expected_end_date") || null,
      progress: `${number(row, "percent_complete")}%`,
      estimatedCost: money(amount),
    },
  };
}

function normalizeTask(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "task"),
    label: text(row, "subject", text(row, "name", "Task")),
    status: text(row, "status", "Open"),
    owner: "Operations",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      project: text(row, "project") || null,
      priority: text(row, "priority", "Medium"),
      expectedEnd: text(row, "exp_end_date") || null,
      progress: `${number(row, "progress")}%`,
      company: text(row, "company") || null,
    },
  };
}

function normalizeEmployee(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "employee"),
    label: text(row, "employee_name", text(row, "name", "Employee")),
    status: text(row, "status", "Active"),
    owner: "HR",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      department: text(row, "department") || null,
      designation: text(row, "designation") || null,
      branch: text(row, "branch") || null,
      company: text(row, "company") || null,
      dateOfJoining: text(row, "date_of_joining") || null,
      relievingDate: text(row, "relieving_date") || null,
    },
  };
}

function normalizeDepartment(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "department"),
    label: text(row, "department_name", text(row, "name", "Department")),
    status: text(row, "disabled") === "1" ? "disabled" : "active",
    owner: "HR",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      company: text(row, "company") || null,
      parent: text(row, "parent_department") || null,
      group: text(row, "is_group") === "1",
    },
  };
}

function normalizeJobApplicant(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "job-applicant"),
    label: text(row, "applicant_name", text(row, "name", "Job applicant")),
    status: text(row, "status", "Open"),
    owner: "HR",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      email: text(row, "email_id") || null,
      phone: text(row, "phone_number") || null,
      designation: text(row, "designation") || null,
      source: text(row, "source") || null,
    },
  };
}

function normalizeTrainingEvent(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "training-event"),
    label: text(row, "event_name", text(row, "training_program", text(row, "name", "Training event"))),
    status: text(row, "status", text(row, "docstatus") === "1" ? "submitted" : "draft"),
    owner: "Academy",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      program: text(row, "training_program") || null,
      eventDate: text(row, "event_date") || null,
      location: text(row, "location") || null,
      company: text(row, "company") || null,
    },
  };
}

function normalizeAsset(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "asset"),
    label: text(row, "asset_name", text(row, "name", "Asset")),
    status: text(row, "status", text(row, "docstatus") === "1" ? "submitted" : "draft"),
    owner: "Facilities",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      itemCode: text(row, "item_code") || null,
      company: text(row, "company") || null,
      location: text(row, "location") || null,
      purchaseDate: text(row, "purchase_date") || null,
      grossPurchaseAmount: money(number(row, "gross_purchase_amount")),
    },
  };
}

function normalizeMaintenance(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "maintenance"),
    label: text(row, "subject", text(row, "asset_name", text(row, "name", "Maintenance"))),
    status: text(row, "status", text(row, "completion_status", "Open")),
    owner: "Maintenance",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      asset: text(row, "asset_name") || text(row, "asset") || null,
      maintenanceDate: text(row, "maintenance_date") || text(row, "mntc_date") || null,
      completionStatus: text(row, "completion_status") || null,
      company: text(row, "company") || null,
    },
  };
}

function normalizeIssue(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "issue"),
    label: text(row, "subject", text(row, "name", "Issue")),
    status: text(row, "status", "Open"),
    owner: "Support",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      priority: text(row, "priority") || null,
      issueType: text(row, "issue_type") || null,
      customer: text(row, "customer") || null,
      raisedBy: text(row, "raised_by") || null,
      openingDate: text(row, "opening_date") || null,
    },
  };
}

function normalizeQualityInspection(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "quality-inspection"),
    label: text(row, "item_name", text(row, "item_code", text(row, "name", "Quality inspection"))),
    status: text(row, "status", text(row, "docstatus") === "1" ? "submitted" : "draft"),
    owner: "Quality",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      inspectionType: text(row, "inspection_type") || null,
      referenceType: text(row, "reference_type") || null,
      referenceName: text(row, "reference_name") || null,
      itemCode: text(row, "item_code") || null,
      inspectedBy: text(row, "inspected_by") || null,
    },
  };
}

function normalizeCommunication(row: Record<string, string>): BackOfficeSourceRow {
  return {
    id: text(row, "name", "communication"),
    label: text(row, "subject", text(row, "name", "Communication")),
    status: text(row, "status", "Linked"),
    owner: "Support",
    modifiedAt: text(row, "modified") || undefined,
    fields: {
      communicationType: text(row, "communication_type") || null,
      referenceDoctype: text(row, "reference_doctype") || null,
      referenceName: text(row, "reference_name") || null,
      sender: text(row, "sender") || null,
      recipients: text(row, "recipients") || null,
    },
  };
}

export async function getBackOfficeOperationalSourceSlice(options: { limit?: number } = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit ?? 50), 100));
  const unifiedSlice = await getUnifiedBackOfficeSourceSlice(limit);
  if (unifiedSlice) return unifiedSlice;
  if (process.env.CRAYS_ENABLE_BACK_OFFICE_SLOW_FALLBACK !== "true") return unavailableBackOfficeSourceSlice(limit);

  const [
    accounts,
    costCenters,
    budgets,
    salesInvoices,
    purchaseInvoices,
    customers,
    suppliers,
    items,
    purchaseOrders,
    materialRequests,
    projects,
    tasks,
    employees,
    departments,
    jobApplicants,
    trainingEvents,
    assets,
    assetMaintenance,
    maintenanceVisits,
    issues,
    qualityInspections,
    communications,
  ] = await Promise.all([
    optionalRows(
      `select name, account_name, account_number, account_type, root_type, company, balance_must_be, disabled, modified from tabAccount order by modified desc limit ${limit}`,
      ["name", "account_name", "account_number", "account_type", "root_type", "company", "balance_must_be", "disabled", "modified"],
    ),
    optionalRows(
      `select name, cost_center_name, company, parent_cost_center, is_group, disabled, modified from \`tabCost Center\` order by modified desc limit ${limit}`,
      ["name", "cost_center_name", "company", "parent_cost_center", "is_group", "disabled", "modified"],
    ),
    optionalRows(
      `select name, coalesce(from_fiscal_year, year(curdate())) as fiscal_year, company, cost_center, project, docstatus, modified from tabBudget order by modified desc limit ${limit}`,
      ["name", "fiscal_year", "company", "cost_center", "project", "docstatus", "modified"],
    ),
    optionalRows(
      `select 'Sales Invoice' as kind, name, customer as party, status, docstatus, posting_date, due_date, grand_total, currency, company, modified from \`tabSales Invoice\` order by modified desc limit ${limit}`,
      ["kind", "name", "party", "status", "docstatus", "posting_date", "due_date", "grand_total", "currency", "company", "modified"],
    ),
    optionalRows(
      `select 'Purchase Invoice' as kind, name, supplier as party, status, docstatus, posting_date, due_date, grand_total, currency, company, modified from \`tabPurchase Invoice\` order by modified desc limit ${limit}`,
      ["kind", "name", "party", "status", "docstatus", "posting_date", "due_date", "grand_total", "currency", "company", "modified"],
    ),
    optionalRows(
      `select name, customer_name, customer_group, territory, customer_type, lead_name, disabled, modified from tabCustomer order by modified desc limit ${limit}`,
      ["name", "customer_name", "customer_group", "territory", "customer_type", "lead_name", "disabled", "modified"],
    ),
    optionalRows(
      `select name, supplier_name, supplier_group, default_currency, country, disabled, modified from tabSupplier order by modified desc limit ${limit}`,
      ["name", "supplier_name", "supplier_group", "default_currency", "country", "disabled", "modified"],
    ),
    optionalRows(
      `select name, item_name, item_group, stock_uom, is_fixed_asset, is_stock_item, valuation_rate, disabled, modified from tabItem order by modified desc limit ${limit}`,
      ["name", "item_name", "item_group", "stock_uom", "is_fixed_asset", "is_stock_item", "valuation_rate", "disabled", "modified"],
    ),
    optionalRows(
      `select name, supplier, status, docstatus, transaction_date, schedule_date, grand_total, currency, company, modified from \`tabPurchase Order\` order by modified desc limit ${limit}`,
      ["name", "supplier", "status", "docstatus", "transaction_date", "schedule_date", "grand_total", "currency", "company", "modified"],
    ),
    optionalRows(
      `select name, material_request_type, status, docstatus, transaction_date, schedule_date, company, modified from \`tabMaterial Request\` order by modified desc limit ${limit}`,
      ["name", "material_request_type", "status", "docstatus", "transaction_date", "schedule_date", "company", "modified"],
    ),
    optionalRows(
      `select name, project_name, status, percent_complete, expected_end_date, priority, estimated_costing, company, modified from tabProject order by modified desc limit ${limit}`,
      ["name", "project_name", "status", "percent_complete", "expected_end_date", "priority", "estimated_costing", "company", "modified"],
    ),
    optionalRows(
      `select name, subject, project, status, priority, exp_end_date, progress, company, modified from tabTask order by modified desc limit ${limit}`,
      ["name", "subject", "project", "status", "priority", "exp_end_date", "progress", "company", "modified"],
    ),
    optionalRows(
      `select name, employee_name, status, designation, department, branch, company, date_of_joining, relieving_date, modified from tabEmployee order by modified desc limit ${limit}`,
      ["name", "employee_name", "status", "designation", "department", "branch", "company", "date_of_joining", "relieving_date", "modified"],
    ),
    optionalRows(
      `select name, department_name, company, parent_department, is_group, disabled, modified from tabDepartment order by modified desc limit ${limit}`,
      ["name", "department_name", "company", "parent_department", "is_group", "disabled", "modified"],
    ),
    optionalRows(
      `select name, applicant_name, email_id, phone_number, designation, source, status, modified from \`tabJob Applicant\` order by modified desc limit ${limit}`,
      ["name", "applicant_name", "email_id", "phone_number", "designation", "source", "status", "modified"],
    ),
    optionalRows(
      `select name, event_name, training_program, event_date, location, company, status, docstatus, modified from \`tabTraining Event\` order by modified desc limit ${limit}`,
      ["name", "event_name", "training_program", "event_date", "location", "company", "status", "docstatus", "modified"],
    ),
    optionalRows(
      `select name, asset_name, item_code, status, company, location, purchase_date, purchase_amount as gross_purchase_amount, docstatus, modified from tabAsset order by modified desc limit ${limit}`,
      ["name", "asset_name", "item_code", "status", "company", "location", "purchase_date", "gross_purchase_amount", "docstatus", "modified"],
    ),
    optionalRows(
      `select name, asset_name, asset_name as asset, modified as maintenance_date, 'Planned' as status, company, docstatus, modified from \`tabAsset Maintenance\` order by modified desc limit ${limit}`,
      ["name", "asset_name", "asset", "maintenance_date", "status", "company", "docstatus", "modified"],
    ),
    optionalRows(
      `select name, customer, mntc_date, completion_status, status, company, modified from \`tabMaintenance Visit\` order by modified desc limit ${limit}`,
      ["name", "customer", "mntc_date", "completion_status", "status", "company", "modified"],
    ),
    optionalRows(
      `select name, subject, status, priority, issue_type, customer, raised_by, opening_date, modified from tabIssue order by modified desc limit ${limit}`,
      ["name", "subject", "status", "priority", "issue_type", "customer", "raised_by", "opening_date", "modified"],
    ),
    optionalRows(
      `select name, inspection_type, reference_type, reference_name, status, item_code, item_name, inspected_by, docstatus, modified from \`tabQuality Inspection\` order by modified desc limit ${limit}`,
      ["name", "inspection_type", "reference_type", "reference_name", "status", "item_code", "item_name", "inspected_by", "docstatus", "modified"],
    ),
    optionalRows(
      `select name, subject, status, communication_type, reference_doctype, reference_name, sender, recipients, modified from tabCommunication order by modified desc limit ${limit}`,
      ["name", "subject", "status", "communication_type", "reference_doctype", "reference_name", "sender", "recipients", "modified"],
    ),
  ]);

  const sections = [
    { key: "accounts" as const, label: "Accounts", rows: accounts.rows.map(normalizeAccount), error: accounts.error },
    { key: "cost-centers" as const, label: "Cost centers", rows: costCenters.rows.map(normalizeCostCenter), error: costCenters.error },
    { key: "budgets" as const, label: "Budgets", rows: budgets.rows.map(normalizeBudget), error: budgets.error },
    {
      key: "invoices" as const,
      label: "Invoices",
      rows: [...salesInvoices.rows.map(normalizeInvoice), ...purchaseInvoices.rows.map(normalizeInvoice)],
      error: salesInvoices.error || purchaseInvoices.error,
    },
    { key: "customers" as const, label: "Customers", rows: customers.rows.map(normalizeCustomer), error: customers.error },
    { key: "suppliers" as const, label: "Suppliers", rows: suppliers.rows.map(normalizeSupplier), error: suppliers.error },
    { key: "items" as const, label: "Items", rows: items.rows.map(normalizeItem), error: items.error },
    {
      key: "purchase-orders" as const,
      label: "Purchase orders",
      rows: purchaseOrders.rows.map(normalizePurchaseOrder),
      error: purchaseOrders.error,
    },
    {
      key: "material-requests" as const,
      label: "Material requests",
      rows: materialRequests.rows.map(normalizeMaterialRequest),
      error: materialRequests.error,
    },
    { key: "projects" as const, label: "Projects", rows: projects.rows.map(normalizeProject), error: projects.error },
    { key: "tasks" as const, label: "Tasks", rows: tasks.rows.map(normalizeTask), error: tasks.error },
    { key: "employees" as const, label: "Employees", rows: employees.rows.map(normalizeEmployee), error: employees.error },
    { key: "departments" as const, label: "Departments", rows: departments.rows.map(normalizeDepartment), error: departments.error },
    {
      key: "job-applicants" as const,
      label: "Job applicants",
      rows: jobApplicants.rows.map(normalizeJobApplicant),
      error: jobApplicants.error,
    },
    {
      key: "training-events" as const,
      label: "Training events",
      rows: trainingEvents.rows.map(normalizeTrainingEvent),
      error: trainingEvents.error,
    },
    { key: "assets" as const, label: "Assets", rows: assets.rows.map(normalizeAsset), error: assets.error },
    {
      key: "maintenance" as const,
      label: "Maintenance",
      rows: [...assetMaintenance.rows.map(normalizeMaintenance), ...maintenanceVisits.rows.map(normalizeMaintenance)],
      error: assetMaintenance.error || maintenanceVisits.error,
    },
    { key: "issues" as const, label: "Issues", rows: issues.rows.map(normalizeIssue), error: issues.error },
    {
      key: "quality-inspections" as const,
      label: "Quality inspections",
      rows: qualityInspections.rows.map(normalizeQualityInspection),
      error: qualityInspections.error,
    },
    {
      key: "communications" as const,
      label: "Communications",
      rows: communications.rows.map(normalizeCommunication),
      error: communications.error,
    },
  ];

  const errors = sections.map((section) => section.error).filter(Boolean);

  const sourceSections = sections.map((section) => ({
    key: section.key,
    label: section.label,
    rows: section.rows,
    count: section.rows.length,
  }));

  return {
    source: { connection: errors.length === sections.length ? "unavailable" : errors.length ? "partial-local" : "live-local", owner: "ERP" as const },
    generatedAt: new Date().toISOString(),
    rowLimit: limit,
    summary: Object.fromEntries(sourceSections.map((section) => [section.key, section.count])),
    sections: sourceSections,
    capabilities: {
      liveReads: errors.length < sections.length,
      financeDraftWrites: false,
      accountingExports: false,
      bankSends: false,
      paymentInitiation: false,
    },
    diagnostics: {
      skippedFamilies: sections.filter((section) => section.error).map((section) => section.key),
      warnings: errors.length ? [`${errors.length} source families are unavailable right now.`] : [],
    },
    secretsReturned: false,
  };
}
