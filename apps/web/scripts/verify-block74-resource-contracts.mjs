import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "src/lib/resources/types.ts",
  "src/lib/resources/errors.ts",
  "src/lib/resources/registry.ts",
  "src/lib/resources/query.ts",
  "src/lib/resources/pagination.ts",
  "src/lib/resources/commands.ts",
  "src/lib/resources/saved-views.ts",
  "src/lib/resources/contract-read-model.ts",
  "src/app/api/crays/resources/contract/route.ts",
];

const requiredResources = [
  "prepared-offers",
  "deals",
  "properties",
  "bank-packages",
  "workflow-events",
  "core-command-requests",
  "workbench-saved-views",
  "public-deal-packages",
  "crm-companies",
  "crm-people",
  "project-work-items",
  "project-states",
  "project-comments",
  "erp-documents",
];

const requiredErrorCodes = [
  "unauthenticated",
  "forbidden",
  "not_found",
  "invalid_query",
  "validation_failed",
  "conflict",
  "rate_limited",
  "source_unavailable",
  "partial_data",
  "operation_gated",
  "unexpected",
];

const failures = [];

for (const relativePath of requiredFiles) {
  if (!existsSync(path.join(root, relativePath))) {
    failures.push(`${relativePath} is missing.`);
  }
}

const registrySource = readFileSync(path.join(root, "src/lib/resources/registry.ts"), "utf8");
for (const resource of requiredResources) {
  if (!registrySource.includes(`key: "${resource}"`)) {
    failures.push(`Resource ${resource} is not registered.`);
  }
}

for (const token of [
  "twenty-discovery-required",
  "plane-cursor",
  "frappe-offset",
  "requires-discovery",
  "exposesNativeIdsToClient: false",
]) {
  if (!registrySource.includes(token)) failures.push(`Registry is missing ${token}.`);
}

const querySource = readFileSync(path.join(root, "src/lib/resources/query.ts"), "utf8");
for (const token of ["not registered", "not allowed", "Cursor and offset pagination cannot be mixed", "requires deployed-source discovery"]) {
  if (!querySource.includes(token)) failures.push(`Query validator is missing fail-closed token: ${token}.`);
}

const errorsSource = readFileSync(path.join(root, "src/lib/resources/errors.ts"), "utf8");
for (const code of requiredErrorCodes) {
  if (!errorsSource.includes(`"${code}"`)) failures.push(`Error taxonomy is missing ${code}.`);
}

const commandSource = readFileSync(path.join(root, "src/lib/resources/commands.ts"), "utf8");
for (const token of ["idempotencyKey", "targetApplyEnabled: false", "sourceWritesEnabled: false", "syncApplyEnabled: false"]) {
  if (!commandSource.includes(token)) failures.push(`Command envelope is missing ${token}.`);
}

const savedViewSource = readFileSync(path.join(root, "src/lib/resources/saved-views.ts"), "utf8");
for (const token of ["resourceSavedViewSchemaVersion = 1", "validateSavedView", "Unsupported saved-view schema version"]) {
  if (!savedViewSource.includes(token)) failures.push(`Saved-view contract is missing ${token}.`);
}

const routeSource = readFileSync(path.join(root, "src/app/api/crays/resources/contract/route.ts"), "utf8");
for (const token of ["resolveCraysRouteRole", "serverAuthority", "vendorRequestsFromBrowserEnabled: false", "secretsReturned: false"]) {
  if (!routeSource.includes(token)) failures.push(`Resource contract route is missing ${token}.`);
}

const result = {
  checkedFiles: requiredFiles.length,
  checkedResources: requiredResources.length,
  checkedErrorCodes: requiredErrorCodes.length,
  status: failures.length === 0 ? "passed" : "failed",
  failures,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

if (failures.length > 0) process.exitCode = 1;
