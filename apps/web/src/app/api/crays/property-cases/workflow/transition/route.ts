import {
  markPropertyCaseHandoffReady,
  transitionPropertyCaseToAnalysis,
  transitionPropertyCaseToReview,
} from "@/db/property-case-review-repository";
import { assertDomainDevWriteAllowed } from "@/lib/domain-write-guard";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const guard = assertDomainDevWriteAllowed(request, process.env, "transition-property-case");
  if (!guard.allowed) return guard.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
    const caseId = cleanText(body.caseId);
    const transition = cleanText(body.transition) || "start_analysis";

    if (!caseId) {
      throw new Error("caseId is required.");
    }

    if (transition !== "start_analysis" && transition !== "start_review" && transition !== "mark_handoff_ready") {
      throw new Error("Only start_analysis, start_review and mark_handoff_ready are supported for this workflow action.");
    }

    const result =
      transition === "mark_handoff_ready"
        ? await markPropertyCaseHandoffReady({
            caseId,
            role,
            transition,
          })
        : transition === "start_review"
        ? await transitionPropertyCaseToReview({
            caseId,
            role,
            transition,
          })
        : await transitionPropertyCaseToAnalysis({
            caseId,
            role,
            transition,
          });

    return Response.json({
      status: result.status,
      writeEnabled: true,
      result,
      liveBusinessRecordReturned: true,
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: "Property case workflow transitioned inside CRAYS Core DB only. No uploads, provider calls, external messages or public release were performed.",
    });
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        error: error instanceof Error ? error.message : "Invalid request.",
        liveBusinessRecordReturned: false,
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
