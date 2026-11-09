import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.CRAYS_CLOSEOUT_BASE_URL ?? "http://127.0.0.1:3001";
const timeoutMs = Number(process.env.CRAYS_CLOSEOUT_TIMEOUT_MS ?? 60_000);
const startedAt = new Date().toISOString();

const checks = [
  [42, "Analytics Management KPI", "/api/crays/analytics/management-kpis/read-model?role=crays-management", "/analytics?role=crays-management", "block42-analytics-management-kpi-drilldown"],
  [43, "Financial Workbook", "/api/crays/financial-model/workbook/read-model?role=finance", "/analytics?role=finance&view=financial-model", "block43-financial-workbook"],
  [44, "Financial Forecast 5Y", "/api/crays/financial-model/forecast-5y/read-model?role=finance", "/analytics?role=finance&view=reports", "block44-financial-forecast-5y"],
  [45, "Location Intelligence", "/api/crays/location-intelligence/read-model?role=crays-management", "/analytics?role=crays-management&view=risk", "block45-location-intelligence"],
  [46, "Role Metric Access", "/api/crays/analytics/role-metric-access/read-model?role=crays-management", "/analytics?role=crays-management&view=settings", "block46-role-metric-access"],
  [47, "B2C Member Database", "/api/crays/operations/member-database/read-model?role=studio-manager", "/operations?role=studio-manager", "block47-b2c-member-database"],
  [48, "Member Payment Recovery", "/api/crays/erp/member-payment-recovery/read-model?role=finance", "/erp?role=finance", "block48-member-payment-recovery"],
  [49, "Studio Operations Recovery", "/api/crays/operations/recovery/read-model?role=studio-manager", "/operations?role=studio-manager", "block49-studio-operations-recovery"],
  [50, "Franchise Partner Performance", "/api/crays/analytics/franchise-partner-performance/read-model?role=franchise-partner", "/analytics?role=franchise-partner&view=portfolio", "block50-franchise-partner-performance"],
  [51, "ERP Finance Ledger", "/api/crays/erp/finance-ledger/read-model?role=finance", "/erp?role=finance&view=ledger", "block51-erp-finance-ledger"],
  [52, "Bank Package", "/api/crays/loans/bank-package/read-model?role=finance", "/loans?role=finance&view=bank-package", "block52-bank-package-workflow"],
  [53, "Real Estate Decision", "/api/crays/project/real-estate-decision/read-model?role=expansion-manager", "/project?role=expansion-manager&view=real-estate-decision", "block53-real-estate-decision"],
  [54, "Candidate Offer", "/api/crays/candidate/offer-workflow/read-model?role=deal-manager", "/crm?role=deal-manager&view=offer", "block54-candidate-offer-workflow"],
  [55, "Franchise Partner Decision", "/api/crays/analytics/franchise-partner-decision/read-model?role=deal-manager", "/analytics?role=deal-manager", "block55-franchise-partner-decision"],
  [56, "Opening Project", "/api/crays/project/opening-project/read-model?role=deal-manager", "/project?role=deal-manager&view=work-items", "block56-opening-project"],
  [57, "Support Recovery", "/api/crays/support/recovery/read-model?role=studio-manager", "/support?role=studio-manager", "block57-support-recovery"],
  [58, "Evidence Packages", "/api/crays/files/evidence-packages/read-model?role=reviewer", "/files?role=reviewer", "block58-evidence-packages"],
  [59, "Sync Data Health", "/api/crays/sync/data-health/read-model?role=admin", "/sync?role=admin", "block59-sync-data-health"],
];

const hardGateKeys = new Set([
  "sourceWritesEnabled", "syncWritesEnabled", "syncApplyEnabled", "toolApplyEnabled", "targetApplyEnabled",
  "destructiveSourceApplyEnabled", "destructiveReconciliationEnabled", "mappingOverrideEnabled", "retryExecutionEnabled",
  "externalSendingEnabled", "bankSendEnabled", "paymentInitiationEnabled", "financePostingEnabled", "accountingExportEnabled",
  "uploadsEnabled", "privatePreviewEnabled", "privatePreviewsEnabled", "fileBodyAccessEnabled", "packageReleaseEnabled",
  "candidateReleaseEnabled", "publicReleaseEnabled", "stakeholderReleaseEnabled", "releaseEnabled", "liveAiEnabled",
  "productionDeployEnabled", "vpsChangesEnabled",
]);

function findOpenGates(value, path = "payload", found = []) {
  if (!value || typeof value !== "object") return found;
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (hardGateKeys.has(key) && nested === true) found.push(nextPath);
    if (nested && typeof nested === "object") findOpenGates(nested, nextPath, found);
  }
  return found;
}

async function get(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal, headers: { accept: "application/json,text/html" } });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();
    return { status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const results = [];
  const failures = [];
  for (const [block, label, apiPath, pagePath, artifactDirectory] of checks) {
    const api = await get(apiPath);
    const page = await get(pagePath);
    const openGates = findOpenGates(api.body);
    const secretsReturned = api.body?.secretsReturned === true || api.body?.readModel?.secretsReturned === true;
    const privateKeysReturned = api.body?.privateKeysReturned === true || api.body?.readModel?.privateKeysReturned === true;
    const artifactPath = resolve("output", "playwright", artifactDirectory);
    const screenshots = existsSync(artifactPath) ? readdirSync(artifactPath).filter((name) => name.endsWith(".png")).length : 0;
    const row = { block, label, apiPath, apiStatus: api.status, pagePath, pageStatus: page.status, openGates, secretsReturned, privateKeysReturned, artifactDirectory, screenshots };
    results.push(row);
    if (api.status !== 200) failures.push(`Block ${block} API returned HTTP ${api.status}.`);
    if (page.status !== 200) failures.push(`Block ${block} page returned HTTP ${page.status}.`);
    if (openGates.length) failures.push(`Block ${block} returned open hard gates: ${openGates.join(", ")}.`);
    if (secretsReturned || privateKeysReturned) failures.push(`Block ${block} returned secret or private-key material.`);
    if (screenshots < 1) failures.push(`Block ${block} has no browser screenshot artifact.`);
  }
  const report = { status: failures.length ? "failed" : "passed", startedAt, finishedAt: new Date().toISOString(), baseUrl, checks: results.length, apiPassed: results.filter((row) => row.apiStatus === 200).length, pagesPassed: results.filter((row) => row.pageStatus === 200).length, artifactDirectoriesPassed: results.filter((row) => row.screenshots > 0).length, openHardGates: results.reduce((total, row) => total + row.openGates.length, 0), failures, results };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(JSON.stringify({ status: "failed", message: error instanceof Error ? error.message : "Prototype closeout verifier failed." }, null, 2)); process.exit(1); });
