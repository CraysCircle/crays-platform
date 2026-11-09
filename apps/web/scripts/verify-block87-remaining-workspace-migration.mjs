import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const failures = [];

try {
  const portalEnter = read("src/app/(web)/portal/enter/[role]/[target]/route.ts");
  assert(!portalEnter.includes('redirectUrl.searchParams.set("role"'), "Portal bridge must not append ?role= to protected workspace redirects.");
  assert(portalEnter.includes("response.cookies.set(portalBridgeRoleCookieName"), "Portal bridge must keep the HttpOnly role handoff cookie.");

  const platformPage = read("src/app/(platform)/[module]/page.tsx");
  assert(platformPage.includes("const role = roleByKey(cookieRole ?? queryRole).key"), "Platform module page must prefer portal-cookie role over query role.");

  const platformLayout = read("src/app/(platform)/layout.tsx");
  assert(platformLayout.includes("const initialRole = bridgeRole ? roleByKey(bridgeRole).key : undefined"), "Platform layout must not manufacture a default bridge role when no bridge cookie exists.");

  const modulePage = read("src/components/module-page.tsx");
  assert(modulePage.includes('const partnerDecisionViews = new Set(["scorecards", "partner-decision"])'), "Analytics partner-decision view set must not swallow portfolio/risk/reports/settings.");
  assert(modulePage.indexOf('if (analyticsView === "portfolio")') < modulePage.indexOf("if (showPartnerDecision)"), "Analytics portfolio branch must be checked before partner-decision fallback.");
  for (const marker of [
    '<WorkbenchViewControls moduleKey="analytics" role={role} />',
    '<FranchisePartnerPerformancePanel role={role} />',
    '<FinancialWorkbookPanel role={role} />',
    '<LocationIntelligencePanel role={role} />',
    '<WorkbenchViewControls moduleKey={module.key} role={role} />',
    '<ErpFinanceLedgerPanel role={role} />',
    '<ToolNativeWorkbenchPage moduleKey={module.key} role={role} />',
    '<WorkbenchViewControls moduleKey="operations" role={role} />',
    '<StudioOperationsWorkbenchPanel role={role} />',
    '<B2cMemberDatabasePanel role={role} />',
  ]) {
    assert(modulePage.includes(marker), `Module page missing Block 87 role/view marker: ${marker}`);
  }

  const platformShell = read("src/components/platform-shell.tsx");
  for (const marker of [
    "operations: [",
    'label: "Studio queue"',
    'label: "Recovery"',
    'label: "Members"',
    "sync: [",
    'label: "Data health"',
    'label: "Performance"',
  ]) {
    assert(platformShell.includes(marker), `Platform shell missing Block 87 navigation marker: ${marker}`);
  }

  for (const file of [
    "src/app/api/crays/erp/workbench/read-model/route.ts",
    "src/app/api/crays/files/workbench/read-model/route.ts",
    "src/app/api/crays/analytics/workbench/read-model/route.ts",
    "src/app/api/crays/loans/workbench/read-model/route.ts",
    "src/app/api/crays/sync/workbench/read-model/route.ts",
    "src/app/api/crays/workbench/views/read-model/route.ts",
    "src/app/api/crays/operations/studio-workbench/read-model/route.ts",
    "src/app/api/crays/operations/member-database/read-model/route.ts",
    "src/app/api/crays/operations/recovery/read-model/route.ts",
  ]) {
    const source = read(file);
    assert(source.includes("resolveCraysRouteContext"), `${file} must resolve server trust context.`);
    assert(source.includes("serverAuthority"), `${file} must expose server authority evidence.`);
    assert(!source.includes('roleByKey(url.searchParams.get("role"'), `${file} must not directly parse URL role as its authority.`);
    assert(!source.includes('roleByKey(searchParams.get("role"'), `${file} must not directly parse searchParams role as its authority.`);
  }

  for (const file of [
    "src/components/workbench-view-controls.tsx",
    "src/components/tool-native-workbench-page.tsx",
    "src/components/bank-readiness-loans-page.tsx",
    "src/components/bank-package-workflow-panel.tsx",
    "src/components/evidence-packages-workflow-panel.tsx",
    "src/components/erp-finance-ledger-panel.tsx",
    "src/components/member-payment-recovery-panel.tsx",
    "src/components/b2c-member-database-panel.tsx",
    "src/components/studio-operations-workbench-panel.tsx",
    "src/components/studio-operations-recovery-panel.tsx",
    "src/components/analytics-management-kpi-panel.tsx",
    "src/components/franchise-partner-decision-panel.tsx",
    "src/components/franchise-partner-performance-panel.tsx",
    "src/components/financial-workbook-panel.tsx",
    "src/components/financial-forecast-panel.tsx",
    "src/components/location-intelligence-panel.tsx",
    "src/components/role-metric-access-panel.tsx",
  ]) {
    const source = read(file);
    assert(source.includes("roleOverride"), `${file} must accept a server-provided role override.`);
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

if (failures.length) {
  console.error("Block 87 Remaining Workspace Migration verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Block 87 Remaining Workspace Migration verification passed.");
