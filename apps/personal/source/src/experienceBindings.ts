// Traceability only: a source binding is never a completion or acceptance assertion.
export function experienceFunctionIds(id: string): string[] {
  if(id.startsWith("personal-occasion-")||id.startsWith("occasion-message-"))return ["AL-293","AL-249"];
  if(id.startsWith("personal-checklist-"))return ["AL-293","AL-249"];
  if(id.startsWith("appointment-plan-"))return ["AL-293","AL-249"];
  if(id.startsWith("week-plan-")||id.startsWith("week-day-"))return ["AL-293","AL-249"];
  if(id.startsWith("travel-comparison-"))return ["AL-293","AL-273","AL-298"];
  if (id.startsWith("trip-plan-")) return ["AL-293", "AL-273", "AL-249"];
  if (id.startsWith("day-agenda-")) return ["AL-293", "AL-249"];
  if (id.startsWith("venue-catalogue-")) return ["AL-141", "AL-144", "AL-248", "VENUE-CATALOG-001", "VENUE-CATALOG-009"];
  if (id.startsWith("catalogue-service-")) return ["AL-248", "AL-297", "VENUE-CATALOG-004", "VENUE-CATALOG-012"];
  if (id.startsWith("place-"))
    return [
      "AL-033",
      "AL-035",
      "AL-036",
      "AL-040",
      "AL-041",
      "AL-043",
      "AL-044",
      "AL-046",
      "AL-047",
      "AL-048",
      "AL-049",
      "AL-050",
      "AL-051",
      "AL-094",
      "AL-099",
      "AL-141",
      "AL-297",
      "AL-298",
      "AL-305",
      "AL-307",
      "AL-310",
    ];
  if (id.startsWith("space-feed-"))
    return [
      "AL-094",
      "AL-102",
      "AL-103",
      "AL-104",
      "AL-106",
      "AL-108",
      "AL-111",
      "AL-112",
      "AL-113",
      "AL-114",
    ];
  if (id.startsWith("personal-plan-")) return ["AL-248", "AL-249", "AL-293"];
  if (id.startsWith("reminder"))
    return ["AL-123", "AL-124", "AL-125", "AL-249", "AL-293"];
  if (id.startsWith("chuck-brief-") || id === "chuck-possibilities")
    return ["AL-249", "AL-293"];
  return [];
}
export function experienceCapabilityIds(id: string): string[] {
  if(id.startsWith("travel-comparison-")){const cap=id.match(/B2C-CAP-\d{3}/)?.[0];return cap?[cap]:["B2C-CAP-022","B2C-CAP-023","B2C-CAP-024"];}
  if(id.startsWith("personal-occasion-")||id.startsWith("occasion-message-"))return ["B2C-CAP-005"];
  if(id.startsWith("personal-checklist-"))return ["B2C-CAP-006"];
  if(id.startsWith("appointment-plan-"))return ["B2C-CAP-003"];
  if(id.startsWith("week-plan-")||id.startsWith("week-day-"))return ["B2C-CAP-002"];
  if (id.startsWith("trip-plan-")) return ["B2C-CAP-021", "B2C-CAP-026", "B2C-CAP-028"];
  if (id.startsWith("day-agenda-")) return ["B2C-CAP-001"];
  if (id === "personal-plan-edit-movement") return ["B2C-CAP-052"];
  if (id === "personal-plan-edit-meals") return ["B2C-CAP-043"];
  const capability = id.match(/B2C-CAP-\d{3}/)?.[0];
  if (capability) return [capability];
  if (id.startsWith("reminder")) return ["B2C-CAP-004"];
  if (id === "personal-plan-sample-movement-plan") return ["B2C-CAP-054"];
  if (id === "personal-plan-sample-meal-plan") return ["B2C-CAP-043"];
  return [];
}
