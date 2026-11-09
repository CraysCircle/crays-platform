import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  [97, "src/db/opening-portfolio-execution-room-repository.ts", ["activeProjects", "planeNativeWritesEnabled: false"]],
  [98, "src/db/frappe-doctype-discovery-readiness-repository.ts", ["doctypeAllowlistRequired: true", "financePostingEnabled: false"]],
  [99, "src/db/evidence-vault-read-model-repository.ts", ["privatePreviewEnabled: false", "packageReleaseEnabled: false"]],
  [100, "src/db/command-center-v2-read-model-repository.ts", ["openApplyGates: 0", "sourceWritesEnabled"]],
  [101, "src/db/sync-reconciliation-workbench-repository.ts", ["automaticApplyEnabled: false", "destructiveReconciliationEnabled: false"]],
  [102, "src/db/portal-bridge-sunset-readiness-repository.ts", ["temporary_bridge_active", "requestRoleAuthorityAccepted: false"]],
  [103, "src/db/tenant-field-scope-readiness-repository.ts", ["routeRoleAuthorityAccepted: false", "fieldScopeDescriptorsPresent: true"]],
];
const routes = [
  "src/app/api/crays/project/opening-portfolio/execution-room/route.ts",
  "src/app/api/crays/erp/frappe-discovery/readiness/route.ts",
  "src/app/api/crays/files/evidence-vault/read-model/route.ts",
  "src/app/api/crays/command-center/v2/read-model/route.ts",
  "src/app/api/crays/sync/reconciliation/read-model/route.ts",
  "src/app/api/crays/auth/portal-bridge/sunset-readiness/route.ts",
  "src/app/api/crays/security/tenant-field-scope/readiness/route.ts",
];
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

for (const [block, file, needles] of checks) {
  const full = path.join(root, file);
  expect(existsSync(full), `Block ${block} repository is missing.`);
  const content = existsSync(full) ? readFileSync(full, "utf8") : "";
  for (const needle of needles) expect(content.includes(needle), `Block ${block} missing evidence: ${needle}`);
}
for (const file of routes) {
  const full = path.join(root, file);
  expect(existsSync(full), `Route ${file} is missing.`);
  const content = existsSync(full) ? readFileSync(full, "utf8") : "";
  expect(content.includes("resolveCraysRouteContext"), `${file} must use server trust context.`);
}
expect(packageJson.scripts["verify:block97-103:operating-hardening"] === "node scripts/verify-block97-103-operating-hardening.mjs", "package script missing.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, blocks: "97-103", failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, blocks: [97, 98, 99, 100, 101, 102, 103] }, null, 2));
