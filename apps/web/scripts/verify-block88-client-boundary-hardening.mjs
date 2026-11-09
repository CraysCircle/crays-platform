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
  const workbenchControls = read("src/components/workbench-view-controls.tsx");
  for (const marker of [
    "export type WorkbenchViewControlsPayload",
    "initialPayload = null",
    "initialPayload?: WorkbenchViewControlsPayload | null",
    "initialPayload ? { status: \"ready\", data: initialPayload, error: null }",
    "if (initialPayload && refreshKey === 0)",
  ]) {
    assert(workbenchControls.includes(marker), `WorkbenchViewControls missing server-initialized marker: ${marker}`);
  }

  const modulePage = read("src/components/module-page.tsx");
  for (const marker of [
    "type WorkbenchViewControlsPayload",
    "export function ModulePage",
    "initialViews = null",
    "initialPayload={initialViews}",
  ]) {
    assert(modulePage.includes(marker), `ModulePage missing Block 88 server-first marker: ${marker}`);
  }
  assert(!modulePage.includes("getWorkbenchSavedViewsReadModel"), "ModulePage must not import DB/read-model code; server data loading belongs in the route page.");
  assert(!modulePage.includes("async function getInitialWorkbenchViews"), "ModulePage must stay a synchronous renderer.");

  const platformPage = read("src/app/(platform)/[module]/page.tsx");
  for (const marker of [
    "import { getWorkbenchSavedViewsReadModel }",
    "serverInitializedWorkbenchModules",
    "async function getInitialWorkbenchViews",
    "const initialViews = await getInitialWorkbenchViews(moduleDefinition.key, role);",
    "initialViews={initialViews}",
  ]) {
    assert(platformPage.includes(marker), `Platform page missing server initialization marker: ${marker}`);
  }

  const savedViewsRoute = read("src/app/api/crays/workbench/views/read-model/route.ts");
  assert(savedViewsRoute.includes("resolveCraysRouteContext"), "Saved views API must stay behind server trust context.");

  const verifier87 = read("scripts/verify-block87-remaining-workspace-migration.mjs");
  assert(verifier87.includes("resolveCraysRouteContext"), "Block 87 trust-boundary verifier must remain present.");

  const packageJson = read("package.json");
  assert(packageJson.includes('"verify:block88:client-boundary-hardening"'), "package.json missing Block 88 verifier script.");
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

if (failures.length) {
  console.error("Block 88 Client Boundary Hardening verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Block 88 Client Boundary Hardening verification passed.");
