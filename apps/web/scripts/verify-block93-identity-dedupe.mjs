import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  repository: path.join(root, "src/db/canonical-identity-dedupe-read-model-repository.ts"),
  route: path.join(root, "src/app/api/crays/identity/dedupe/read-model/route.ts"),
  packageJson: path.join(root, "package.json"),
};

function read(file) {
  return readFileSync(file, "utf8");
}

const repository = read(files.repository);
const route = read(files.route);
const packageJson = JSON.parse(read(files.packageJson));
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(repository.includes("company-canonical"), "Company canonical cluster is missing.");
expect(repository.includes("person-canonical"), "Person canonical cluster is missing.");
expect(repository.includes("address-collision"), "Address collision cluster is missing.");
expect(repository.includes("lead-opportunity-match"), "Lead/opportunity match cluster is missing.");
expect(repository.includes("sourceNativeIdsReturned: false"), "Native source IDs must not be returned.");
expect(repository.includes("sourceMergeEnabled: false"), "Source merge must remain closed.");
expect(repository.includes("destructiveMergeEnabled: false"), "Destructive merge must remain closed.");
expect(route.includes("resolveCraysRouteContext"), "Route must use server trust context.");
expect(route.includes("getCanonicalIdentityDedupeReadModel"), "Route must use canonical identity read model.");
expect(packageJson.scripts["verify:block93:identity-dedupe"] === "node scripts/verify-block93-identity-dedupe.mjs", "package script verify:block93:identity-dedupe is missing.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, block: 93, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, block: 93, clusters: ["company-canonical", "person-canonical", "address-collision", "lead-opportunity-match"] }, null, 2));
