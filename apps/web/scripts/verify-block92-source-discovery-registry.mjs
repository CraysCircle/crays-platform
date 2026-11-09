import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  contract: path.join(root, "src/lib/phase3/source-discovery-contract.ts"),
  repository: path.join(root, "src/db/source-metadata-discovery-read-model-repository.ts"),
  route: path.join(root, "src/app/api/crays/sources/discovery/registry/route.ts"),
  packageJson: path.join(root, "package.json"),
};

function read(file) {
  return readFileSync(file, "utf8");
}

const contract = read(files.contract);
const repository = read(files.repository);
const route = read(files.route);
const packageJson = JSON.parse(read(files.packageJson));

const failures = [];
function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(contract.includes("systemKey: \"twenty\""), "Twenty discovery contract is missing.");
expect(contract.includes("systemKey: \"plane\""), "Plane discovery contract is missing.");
expect(contract.includes("systemKey: \"frappe\""), "Frappe discovery contract is missing.");
expect(contract.includes("browserNativeApiAccess: false"), "Browser native API access is not closed in the contract.");
expect(contract.includes("nativeWritesEnabled: false"), "Native writes are not explicitly closed in the contract.");
expect(repository.includes("liveSourceProbePerformed: false"), "Read model must not perform live source probes.");
expect(repository.includes("sourceApiCalled: false"), "Read model must prove source APIs are not called.");
expect(repository.includes("process.env[requirement.name]") && repository.includes("present: Boolean"), "Read model must return env-name presence only.");
expect(!repository.includes("CRAYS_CRM_PASSWORD:") && !repository.includes("CRAYS_PROJECT_SOURCE_API_KEY:"), "Read model appears to expose secret values.");
expect(route.includes("resolveCraysRouteContext"), "Route must use server trust context.");
expect(route.includes("getSourceMetadataDiscoveryReadModel"), "Route must use the source discovery read model.");
expect(packageJson.scripts["verify:block92:source-discovery-registry"] === "node scripts/verify-block92-source-discovery-registry.mjs", "package script verify:block92:source-discovery-registry is missing.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, block: 92, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, block: 92, systems: ["twenty", "plane", "frappe"] }, null, 2));
