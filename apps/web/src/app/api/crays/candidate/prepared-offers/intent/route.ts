import { assertDomainDevWriteAllowed } from "@/lib/domain-write-guard";
import { createCandidateIntentDevRecord } from "@/db/candidate-intent-repository";
import { getCandidateIntentPersistenceReadiness } from "@/db/candidate-intent-persistence-readiness-repository";
import { getCandidateIntentContract } from "@/lib/candidate-intent-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getCandidateIntentContract(role);
  const persistence = await getCandidateIntentPersistenceReadiness();

  return Response.json(
    {
      status: contract.access.allowed ? "ready" : "forbidden",
      contract,
      persistence,
      migrationApplyRequired: !persistence.migrationApplied,
      liveBusinessRecordReturned: false,
      note: contract.access.allowed
        ? "This endpoint returns the CRAYS Candidate purchase and financing intent contract only. No intent records are written and no regulated checks are started."
        : "Candidate intent requires Candidate, Deal Manager or review scope.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}

export async function POST(request: Request) {
  const guard = assertDomainDevWriteAllowed(request, process.env, "create-candidate-intent");
  if (!guard.allowed) return guard.response;

  const cleanText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const boolFromValue = (value: unknown) => value === true || value === "true";

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const intentType = cleanText(body.intentType);
    const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;

    if (intentType !== "purchase" && intentType !== "financing") {
      throw new Error("intentType must be purchase or financing.");
    }

    const result = await createCandidateIntentDevRecord({
      offerId: cleanText(body.offerId),
      intentType,
      role,
      candidateAccountId: cleanText(body.candidateAccountId),
      candidateOrganizationId: cleanText(body.candidateOrganizationId),
      candidateAcknowledgedBoundary: boolFromValue(body.candidateAcknowledgedBoundary),
    });

    const statusCode = result.status === "created" ? 201 : result.status === "already_exists" ? 200 : 409;

    return Response.json(
      {
        status: result.status,
        writeEnabled: true,
        result,
        liveBusinessRecordReturned: result.status === "created" || result.status === "already_exists",
        purchaseIntentRecorded: result.purchaseIntentRecorded,
        financingIntentRecorded: result.financingIntentRecorded,
        kycAmlStarted: false,
        equityCheckStarted: false,
        bankPackageCreated: false,
        candidatePrivateDataReturned: false,
        bankDataReturned: false,
        fileUploadEnabled: false,
        providerCallsEnabled: false,
        externalSendingEnabled: false,
        publicReleaseEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
        note: "Candidate intent write boundary is dev-confirmed and release-gated. It does not start KYC/AML, equity check, bank package creation or external sending.",
      },
      { status: statusCode },
    );
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        writeEnabled: true,
        error: error instanceof Error ? error.message : "Invalid request.",
        liveBusinessRecordReturned: false,
        purchaseIntentRecorded: false,
        financingIntentRecorded: false,
        kycAmlStarted: false,
        equityCheckStarted: false,
        bankPackageCreated: false,
        candidatePrivateDataReturned: false,
        bankDataReturned: false,
        fileUploadEnabled: false,
        providerCallsEnabled: false,
        externalSendingEnabled: false,
        publicReleaseEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 400 },
    );
  }
}
