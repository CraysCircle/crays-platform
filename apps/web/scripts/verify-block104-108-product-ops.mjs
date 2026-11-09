import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  [104, "src/db/public-publication-pipeline-v2-repository.ts", ["PublicDealPackageDTO-only", "preparedFranchiseOffersFallbackUsed: false", "publishCommandEnabled"]],
  [105, "src/db/stakeholder-interaction-loops-repository.ts", ["getCandidatePortalReadModel", "relationshipScopeRequired: true", "externalSendingEnabled"]],
  [106, "src/db/studio-daily-os-read-model-repository.ts", ["member-exceptions", "bookings", "trainers", "support"]],
  [107, "src/db/management-kpi-contracts-repository.ts", ["definition: kpi.context", "reportPublicationEnabled"]],
  [108, "src/db/observability-incident-response-repository.ts", ["incidentRunbooks", "production-data-zero", "retryExecutionEnabled"]],
];
const routes = [
  "src/app/api/crays/public/publication-pipeline/v2/read-model/route.ts",
  "src/app/api/crays/stakeholders/interaction-loops/read-model/route.ts",
  "src/app/api/crays/operations/studio-daily-os/read-model/route.ts",
  "src/app/api/crays/analytics/management-kpi-contracts/read-model/route.ts",
  "src/app/api/crays/observability/incident-response/read-model/route.ts",
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
}
expect(packageJson.scripts["verify:block104-108:product-ops"] === "node scripts/verify-block104-108-product-ops.mjs", "package script missing.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, blocks: "104-108", failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, blocks: [104, 105, 106, 107, 108] }, null, 2));
