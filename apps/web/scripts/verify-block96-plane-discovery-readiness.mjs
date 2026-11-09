import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const repository = readFileSync(path.join(root, "src/db/plane-native-discovery-readiness-repository.ts"), "utf8");
const route = readFileSync(path.join(root, "src/app/api/crays/project/plane-discovery/readiness/route.ts"), "utf8");
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(repository.includes("getOpeningProjectReadModel"), "Opening Project projection is not used.");
expect(repository.includes("getSourceMetadataDiscoveryReadModel"), "Source discovery registry is not used.");
expect(repository.includes("planeNativeWritesEnabled: false"), "Plane native writes must be closed.");
expect(repository.includes("cursorPaginationRequired: true"), "Cursor pagination requirement is missing.");
expect(route.includes("resolveCraysRouteContext"), "Route must use server trust context.");
expect(packageJson.scripts["verify:block96:plane-discovery-readiness"] === "node scripts/verify-block96-plane-discovery-readiness.mjs", "package script missing.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, block: 96, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, block: 96 }, null, 2));
