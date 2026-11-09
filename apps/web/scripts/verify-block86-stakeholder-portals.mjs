import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requiredFiles = [
  "src/db/stakeholder-portal-read-model-repository.ts",
  "src/app/api/crays/stakeholder/portal/read-model/route.ts",
  "src/components/stakeholder-portal-page.tsx",
  "src/app/(web)/franchise/partner/page.tsx",
  "src/app/(web)/funding-partner-bank/portal/page.tsx",
  "src/app/(web)/real-estate/portal/page.tsx",
];

const failures = [];

try {
  for (const file of requiredFiles) {
    assert(fs.existsSync(path.join(root, file)), `Missing required Block 86 file: ${file}`);
  }

  const repository = read("src/db/stakeholder-portal-read-model-repository.ts");
  for (const marker of [
    'StakeholderPortalKey = "franchise-partner" | "bank-partner" | "landlord"',
    "getFranchisePartnerDecisionReadModel",
    "getFranchisePartnerPerformanceReadModel",
    "getBankPackageReadiness",
    "getRealEstateDecisionReadModel",
    "relationshipScopeRequired: true",
    "externalSendingEnabled: false",
    "bankSendEnabled: false",
    "paymentInitiationEnabled: false",
    "financePostingEnabled: false",
    "leaseSigningEnabled: false",
    "nativeAdapterWritesEnabled: false",
  ]) {
    assert(repository.includes(marker), `Stakeholder portal repository missing marker: ${marker}`);
  }

  const route = read("src/app/api/crays/stakeholder/portal/read-model/route.ts");
  assert(route.includes("resolveCraysRouteContext"), "Stakeholder portal API must resolve server-side route context.");
  assert(route.includes("parseStakeholderPortal"), "Stakeholder portal API must parse allowlisted portal keys.");
  assert(!route.includes("roleByKey("), "Stakeholder portal API must not directly trust query role parsing.");

  const page = read("src/components/stakeholder-portal-page.tsx");
  for (const marker of [
    "Relationship-scoped workspace",
    "Document boundary",
    "Finance and bank gates",
    "External stakeholder sending is closed",
    "No sends, payments, uploads, releases, lease signing or source-system writes",
  ]) {
    assert(page.includes(marker), `Stakeholder Portal page missing visible gate/copy marker: ${marker}`);
  }

  const bridge = read("src/lib/portal-access-bridge.ts");
  for (const marker of [
    '"franchise-partner": "franchise-partner-portal"',
    '"bank-partner": "bank-partner-portal"',
    "landlord: \"landlord-portal\"",
    "key: \"franchise-partner-portal\"",
    "path: \"/franchise/partner\"",
    "key: \"bank-partner-portal\"",
    "path: \"/funding-partner-bank/portal\"",
    "key: \"landlord-portal\"",
    "path: \"/real-estate/portal\"",
  ]) {
    assert(bridge.includes(marker), `Portal bridge missing marker: ${marker}`);
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

if (failures.length) {
  console.error("Block 86 Stakeholder Portal verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Block 86 Stakeholder Portal verification passed.");
