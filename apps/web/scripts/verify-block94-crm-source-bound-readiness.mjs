import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const repository = readFileSync(path.join(root, "src/db/crm-source-bound-readiness-repository.ts"), "utf8");
const route = readFileSync(path.join(root, "src/app/api/crays/crm/source-bound/readiness/route.ts"), "utf8");
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(repository.includes("getCrmOperationalReadModel"), "CRM Core projection is not used.");
expect(repository.includes("getSourceMetadataDiscoveryReadModel"), "Source discovery registry is not used.");
expect(repository.includes("nativeTwentyWritesEnabled: false"), "Twenty native writes must be closed.");
expect(repository.includes("sourceApiCalledFromBrowser: false"), "Browser source API access must be closed.");
expect(route.includes("resolveCraysRouteContext"), "Route must use server trust context.");
expect(packageJson.scripts["verify:block94:crm-source-bound-readiness"] === "node scripts/verify-block94-crm-source-bound-readiness.mjs", "package script missing.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, block: 94, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, block: 94 }, null, 2));
