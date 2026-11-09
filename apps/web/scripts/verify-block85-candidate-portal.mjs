import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const errors = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

const repository = read("src/db/candidate-portal-read-model-repository.ts");
const route = read("src/app/api/crays/candidate/portal/read-model/route.ts");
const component = read("src/components/candidate-portal-page.tsx");
const page = read("src/app/(web)/pre-packed-deals/candidate/page.tsx");

for (const marker of [
  "publicDtoOnly: true",
  "candidateSelfScopeRequired: true",
  "internalFieldsReturned: false",
  "candidatePrivateDataReturned: false",
  "bankDataReturned: false",
  "fileUploadEnabled: false",
  "providerCallsEnabled: false",
  "externalSendingEnabled: false",
  "horizontalAccessPrevented: true",
]) {
  assert(repository.includes(marker), `Candidate portal read model is missing boundary marker: ${marker}`);
}

for (const tab of ["overview", "deals", "documents", "finance", "messages"]) {
  assert(component.includes(`"${tab}"`), `Candidate portal component is missing ${tab} tab.`);
}

assert(route.includes("resolveCraysRouteContext"), "Candidate portal API must use the server trust boundary.");
assert(route.includes("getCandidatePortalReadModel"), "Candidate portal API must use the candidate portal read model.");
assert(page.includes("CandidatePortalPage"), "Candidate page must render the CandidatePortalPage component.");
assert(!page.includes("FranchiseWebPlatform"), "Candidate page must not render the generic FranchiseWebPlatform path.");
assert(component.includes("No released offers") === false, "Candidate portal should not be the old no-released-offers-only page.");
assert(component.includes("External sending is closed"), "Candidate portal must explain the message sending gate.");
assert(component.includes("File bodies, uploads and private previews remain closed"), "Candidate portal must explain document boundaries.");
assert(component.includes("Horizontal access prevention"), "Candidate portal must expose horizontal access prevention in the UI.");

if (errors.length) {
  console.error("Block 85 Candidate Portal verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Block 85 Candidate Portal verification passed.");
