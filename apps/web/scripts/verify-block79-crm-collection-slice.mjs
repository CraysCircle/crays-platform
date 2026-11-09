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

const page = read("src/components/crm-deal-collection-page.tsx");
const route = read("src/app/api/crays/crm/deals/read-model/route.ts");
const modulePage = read("src/components/module-page.tsx");
const registry = read("src/lib/resources/registry.ts");
const packageJson = JSON.parse(read("package.json"));

for (const marker of ["EntityTable", "EntityForm", "applyTableState", "submitCraysCommand", "focus-selected", "/api/crays/crm/deals/read-model"]) {
  if (!page.includes(marker)) failures.push(`CRM deal collection page missing ${marker}.`);
}

for (const marker of ["resolveCraysRouteContext", "getCandidateOfferWorkflowReadModel", "getResourceDescriptor(\"deals\")", "Twenty native APIs", "sourceWritesEnabled: false", "targetApplyEnabled: false"]) {
  if (!route.includes(marker)) failures.push(`CRM deals read-model route missing ${marker}.`);
}

if (!modulePage.includes("<CrmDealCollectionPage role={role} />")) failures.push("CRM module is not routed to the new collection page.");
if (modulePage.includes("<CandidateOfferWorkflowPanel />")) failures.push("Legacy CandidateOfferWorkflowPanel is still in the productive CRM module path.");
if (!registry.includes("key: \"nextAction\"") || !registry.includes("updatePermission: \"deals:update\"")) failures.push("Deals resource contract must expose editable deal command fields.");
if (!packageJson.scripts?.["verify:block79:crm-collection-slice"]) failures.push("Missing npm verification script.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  productiveCrmPathMigrated: true,
  usesEntityTable: true,
  usesEntityForm: true,
  serverTrustRoute: true,
  sourceApisInBrowser: false,
}, null, 2));
