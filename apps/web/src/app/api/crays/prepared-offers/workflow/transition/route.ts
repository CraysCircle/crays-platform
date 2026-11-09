import { transitionPreparedOfferToReview } from "@/db/prepared-offer-review-repository";
import { assertDomainDevWriteAllowed } from "@/lib/domain-write-guard";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const guard = assertDomainDevWriteAllowed(request, process.env, "transition-prepared-offer");
  if (!guard.allowed) return guard.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
    const offerId = cleanText(body.offerId);
    const transition = cleanText(body.transition) || "start_review";

    if (!offerId) {
      throw new Error("offerId is required.");
    }

    if (transition !== "start_review") {
      throw new Error("Only start_review is supported for this workflow action.");
    }

    const result = await transitionPreparedOfferToReview({
      offerId,
      role,
      transition,
    });

    return Response.json({
      status: result.status,
      writeEnabled: true,
      result,
      liveBusinessRecordReturned: true,
      candidateReleaseEnabled: false,
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: "Prepared offer transitioned inside CRAYS Core DB only. No candidate release, public teaser, uploads, provider calls or external messages were performed.",
    });
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        error: error instanceof Error ? error.message : "Invalid request.",
        liveBusinessRecordReturned: false,
        candidateReleaseEnabled: false,
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
