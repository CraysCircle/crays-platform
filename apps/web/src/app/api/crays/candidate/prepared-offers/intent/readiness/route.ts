import { getCandidateIntentPersistenceReadiness } from "@/db/candidate-intent-persistence-readiness-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const readiness = await getCandidateIntentPersistenceReadiness();

  return Response.json({
    status: readiness.migrationApplied ? "ready" : readiness.migrationDraftReady ? "draft_ready" : "incomplete",
    readiness,
    migrationApplyRequired: !readiness.migrationApplied,
    liveIntentRecordsReturned: false,
    purchaseIntentWriteEnabled: false,
    financingIntentWriteEnabled: false,
    kycAmlStarted: false,
    equityCheckStarted: false,
    bankPackageCreated: false,
    externalSendingEnabled: false,
    providerCallsEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
    note: "This endpoint checks the CRAYS Candidate intent persistence draft and schema readiness. It returns no intent records and does not start regulated checks or bank handoff.",
  });
}
