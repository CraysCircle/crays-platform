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

function walkFiles(dir, extensions, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkFiles(fullPath, extensions, results);
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      results.push(fullPath);
    }
  }
  return results;
}

const packageJson = JSON.parse(read("package.json"));
const publicContract = read("src/lib/public-deal-package.ts");
const publicRepository = read("src/db/public-deal-package-read-model-repository.ts");
const publicRoute = read("src/app/api/crays/public/deal-packages/route.ts");
const commandRoute = read("src/app/api/crays/public/deal-packages/command/route.ts");
const publicPage = read("src/app/(web)/pre-packed-deals/page.tsx");
const candidatePage = read("src/app/(web)/pre-packed-deals/candidate/page.tsx");
const component = read("src/components/franchise-web-platform.tsx");

const sourceFiles = walkFiles(path.join(root, "src"), [".ts", ".tsx"]);
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("preparedFranchiseOffers")) failures.push(`Static preparedFranchiseOffers reference remains in ${path.relative(root, file)}.`);
}

for (const marker of [
  "PUBLIC_DEAL_PACKAGE_DTO_VERSION",
  "PublicDealPackageDTO",
  "PUBLIC_DEAL_PACKAGE_ALLOWED_FIELDS",
  "PUBLIC_DEAL_PACKAGE_FORBIDDEN_FIELD_PATTERNS",
  "staticFallbackUsed: false",
  "unreleasedPreparedOffersReturned: false",
  "internalFieldsReturned: false",
]) {
  if (!publicContract.includes(marker)) failures.push(`Public DTO contract missing ${marker}.`);
}

for (const marker of [
  "getPublicDealPackageReadModel",
  "metadata.publicDealPackage",
  "isPublicDealPackage",
  "assertPublicDealPackageAllowlist",
  "public_teaser_enabled = true",
]) {
  if (!publicRepository.includes(marker)) failures.push(`Public read model missing ${marker}.`);
}

for (const marker of [
  "getPublicDealPackageReadModel",
  "Static productive offer fallbacks are not used",
]) {
  if (!publicRoute.includes(marker)) failures.push(`Public API route missing ${marker}.`);
}

for (const marker of [
  "resolveCraysRouteContext",
  "publish",
  "update",
  "unpublish",
  "OPEN_DEV_PUBLIC_DEAL_PUBLICATION_APPLY",
  "targetApplyEnabled: false",
]) {
  if (!commandRoute.includes(marker)) failures.push(`Public command route missing ${marker}.`);
}

for (const [label, content] of [
  ["public page", publicPage],
  ["candidate page", candidatePage],
]) {
  if (!content.includes("getPublicDealPackageReadModel")) failures.push(`${label} does not fetch Public Deal Package DTOs.`);
  if (!content.includes("publicDealPackages={publicDealPackages.packages}")) failures.push(`${label} does not pass Public Deal Package DTOs into the UI.`);
}

if (!component.includes("publicDealPackages: PreparedFranchiseOffer[]")) failures.push("Franchise UI does not require public deal package props.");
if (!component.includes("props.publicDealPackages.filter")) failures.push("Franchise UI is not filtering the public package prop list.");
if (component.includes("preparedFranchiseOffers")) failures.push("Franchise UI still references the static prepared offers list.");
if (!packageJson.scripts?.["verify:block83:public-publication"]) failures.push("Missing npm verification script.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  staticPreparedOffersRemoved: true,
  publicDtoContractPresent: true,
  publicReadModelUsesCoreMetadata: true,
  publicationCommandsGated: true,
  publicPagesUseServerDtoProps: true,
}, null, 2));
