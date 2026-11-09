import {
  getEvidenceForAudience,
  getGuestCandidateJourneyContract,
  getVisibleJourneyStagesForRole,
  type WebPlatformAudience,
} from "@/lib/guest-candidate-journey";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

function audienceForRole(role: string): WebPlatformAudience {
  return role === "guest" ? "guest" : "franchise-candidate";
}

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const audience = audienceForRole(role);
  const contract = getGuestCandidateJourneyContract();

  return Response.json({
    role,
    audience,
    contract,
    rolePreview: {
      surfaces: contract.surfaces.filter((surface) => surface.audience === audience),
      visibleStages: getVisibleJourneyStagesForRole(role).map((stage) => ({
        key: stage.key,
        label: stage.label,
        accessLevel: stage.accessLevel,
        status: stage.status,
      })),
      evidence: getEvidenceForAudience(audience).map((evidence) => ({
        category: evidence.category,
        label: evidence.label,
        guestAccess: evidence.guestAccess,
        candidateAccess: evidence.candidateAccess,
        bankAccess: evidence.bankAccess,
      })),
      bankHandoff: {
        bankStartsAt: contract.bankHandoff.bankStartsAt,
        candidateBrowsingVisibleToBank: contract.bankHandoff.candidateBrowsingVisibleToBank,
        requiredChecks: contract.bankHandoff.requires.length,
      },
    },
    note: "This is the CRAYS Guest/Candidate journey contract. No live deals, candidate data or bank data are returned.",
  });
}
