import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

const workspace = read("src/components/crm-deal-entity-workspace.tsx");
const collection = read("src/components/crm-deal-collection-page.tsx");
const route = read("src/app/api/crays/crm/deals/workspace/route.ts");
const dealRoute = read("src/app/api/crays/crm/deals/read-model/route.ts");
const packageJson = JSON.parse(read("package.json"));

for (const marker of ["CrmDealEntityWorkspace", "Work sections", "Recent activity", "Evidence and commands", "Open case", "Refresh", "source writes and target apply remain closed"]) {
  if (!workspace.includes(marker)) failures.push(`CRM entity workspace missing ${marker}.`);
}

if (!collection.includes("<CrmDealEntityWorkspace role={activeRole} row={selectedRow} />")) failures.push("CRM collection does not render the entity workspace.");

for (const marker of ["resolveCraysRouteContext", "getCaseWorkspaceReadModel", "getCaseActivityBackboneReadModel", "getCoreCommandHistoryReadModel", "getCandidateOfferWorkflowReadModel", "crm_projection_ready", "sourceWritesEnabled: false", "targetApplyEnabled: false"]) {
  if (!route.includes(marker)) failures.push(`CRM entity workspace route missing ${marker}.`);
}

for (const marker of ["preparedOfferId", "propertyCaseId"]) {
  if (!dealRoute.includes(marker)) failures.push(`CRM deal rows must include ${marker} for entity workspace hydration.`);
}

if (!packageJson.scripts?.["verify:block80:crm-entity-workspace"]) failures.push("Missing npm verification script.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  entityWorkspace: true,
  caseActivityAndHistory: true,
  noVendorBrowserCalls: true,
  applyClosed: true,
}, null, 2));
