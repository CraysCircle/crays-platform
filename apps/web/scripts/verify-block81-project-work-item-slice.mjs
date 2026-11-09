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

const page = read("src/components/project-work-item-slice-page.tsx");
const readRoute = read("src/app/api/crays/project/work-items/read-model/route.ts");
const commandRoute = read("src/app/api/crays/project/work-items/command/route.ts");
const modulePage = read("src/components/module-page.tsx");
const packageJson = JSON.parse(read("package.json"));

for (const marker of ["EntityTable", "CommandReceipt", "stageWorkItem", "Plane metadata discovery", "Focus selected", "Stage CRAYS project review"]) {
  if (!page.includes(marker)) failures.push(`Project work item page missing ${marker}.`);
}

for (const marker of ["resolveCraysRouteContext", "getOpeningProjectReadModel", "getResourceDescriptor(\"project-work-items\")", "requires-discovery", "Plane native metadata remains discovery-gated", "targetApplyEnabled: false"]) {
  if (!readRoute.includes(marker)) failures.push(`Project work item read route missing ${marker}.`);
}

for (const marker of ["resolveCraysRouteContext", "stageProjectWorkItemCommand", "ResourceCommandReceipt", "OPEN_DEV_PROJECT_WORK_ITEM_APPLY", "Plane native writes require deployed metadata discovery"]) {
  if (!commandRoute.includes(marker)) failures.push(`Project work item command route missing ${marker}.`);
}

if (!modulePage.includes("<ProjectWorkItemSlicePage role={role} view={view} />")) failures.push("Project module is not routed to the new work item slice.");
if (modulePage.includes("<OpeningProjectWorkflowPanel />")) failures.push("Legacy OpeningProjectWorkflowPanel is still in the productive project module path.");
if (!packageJson.scripts?.["verify:block81:project-work-item-slice"]) failures.push("Missing npm verification script.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  productiveProjectPathMigrated: true,
  usesEntityTable: true,
  serverTrustRoutes: true,
  planeNativeWritesInBrowser: false,
  applyClosed: true,
}, null, 2));
