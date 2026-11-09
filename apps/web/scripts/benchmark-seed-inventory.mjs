import {
  buildBenchmarkSeed,
  buildManifestSummary,
  getSeedBatchId,
  normalizeLimit,
  parseCliArgs,
} from "./benchmark-seed-lib.mjs";

const args = parseCliArgs();
const seedBatchId = getSeedBatchId(args);
const limit = normalizeLimit(args.get("limit"));
const seed = buildBenchmarkSeed({ seedBatchId, limit });

console.log(
  JSON.stringify(
    {
      status: "ready",
      mode: "inventory",
      databaseConnectionOpened: false,
      manifest: buildManifestSummary(seed),
      nextStep: "Run benchmark:seed:dry-run, then apply only against the approved Dev database.",
      liveProviderReadsEnabled: false,
      fileUploadsEnabled: false,
      externalSendingEnabled: false,
      bankSendEnabled: false,
      paymentInitiationEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    null,
    2,
  ),
);
