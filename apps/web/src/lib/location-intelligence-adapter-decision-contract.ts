import type { RoleKey } from "./roles";

const internalLocationDecisionRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];

export type LocationIntelligenceDecisionAccessLevel = "internal_location_decision" | "forbidden";

export type LocationIntelligenceReadClass = {
  key: string;
  label: string;
  allowedInputs: string[];
  derivedEvidence: string[];
  blockedOutputs: string[];
};

export type LocationIntelligenceFieldPolicy = {
  key: string;
  label: string;
  allowedFields: string[];
  prohibitedFields: string[];
  retentionRule: string;
};

export type LocationIntelligenceQaFixture = {
  key: string;
  label: string;
  fixtureScope: string;
  requiredAssertions: string[];
};

export type LocationIntelligenceFailureRule = {
  key: string;
  label: string;
  behavior: string;
  retryPolicy: string;
};

export type LocationIntelligenceAdapterDecisionContract = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: {
    allowed: boolean;
    level: LocationIntelligenceDecisionAccessLevel;
    reason: string;
  };
  block: "202";
  decision: "location_intelligence_read_only_adapter_contract";
  outcome: string;
  approvedForLiveRead: false;
  recommendedNextBlock: "203";
  readClasses: LocationIntelligenceReadClass[];
  fieldPolicies: LocationIntelligenceFieldPolicy[];
  qaFixtures: LocationIntelligenceQaFixture[];
  failureRules: LocationIntelligenceFailureRule[];
  approvalChecklist: string[];
  boundaries: {
    readOnly: true;
    decisionOnly: true;
    liveProviderReadApproved: false;
    providerCallsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    uploadsEnabled: false;
    ownerSubmissionWritesEnabled: false;
    rawProviderPayloadsReturned: false;
    clientSideProviderCallsEnabled: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    bankReleaseEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    externalSendingEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  liveProviderCallsPerformed: false;
  liveProviderPayloadsReturned: false;
  liveBusinessRecordsReturned: false;
  liveOwnerPrivateDataReturned: false;
  liveCandidateDataReturned: false;
  liveBankDataReturned: false;
};

const readClasses: LocationIntelligenceReadClass[] = [
  {
    key: "reachability-bands",
    label: "Reachability bands",
    allowedInputs: ["Property coordinates", "Travel mode", "Travel-time bands", "Departure window"],
    derivedEvidence: ["Reachable area summary", "Catchment band labels", "Coverage confidence"],
    blockedOutputs: ["Raw geometry payload", "Client-side provider response", "Unreviewed map release"],
  },
  {
    key: "travel-time-matrix",
    label: "Travel-time matrix",
    allowedInputs: ["Origin coordinate", "Target category set", "Travel mode", "Maximum travel time"],
    derivedEvidence: ["Target reach summary", "Accessibility score", "Priority catchment notes"],
    blockedOutputs: ["Raw target list", "Provider request body", "Unbounded target payload"],
  },
  {
    key: "statistics-context",
    label: "Statistics context",
    allowedInputs: ["Reachability area reference", "Approved statistic set", "Aggregation level"],
    derivedEvidence: ["Population context", "Demand context", "Socioeconomic summary", "Confidence note"],
    blockedOutputs: ["Raw statistics table", "Sensitive household-level values", "Unapproved demographic release"],
  },
  {
    key: "places-context",
    label: "Places context",
    allowedInputs: ["Property coordinates", "Approved place category set", "Travel mode"],
    derivedEvidence: ["Amenity access notes", "Competition context", "Complementary demand context"],
    blockedOutputs: ["Raw place payload", "Owner or broker contact data", "Unreviewed competition claims"],
  },
  {
    key: "location-score",
    label: "Location score",
    allowedInputs: ["Reachability evidence", "Statistics context", "Places context", "Weighting profile"],
    derivedEvidence: ["Prepared-deal location score", "Score explanation", "Reviewer confidence state"],
    blockedOutputs: ["Opaque provider score", "Automated approval", "Candidate or bank release without reviewer approval"],
  },
];

const fieldPolicies: LocationIntelligenceFieldPolicy[] = [
  {
    key: "request-fields",
    label: "Request fields",
    allowedFields: ["property_case_id", "coordinate_reference", "travel_mode", "travel_time_minutes", "departure_window", "approved_category_set", "approved_statistics_set"],
    prohibitedFields: ["owner_name", "owner_email", "broker_contact", "candidate_identity", "bank_account_data", "freeform_private_notes"],
    retentionRule: "Persist request metadata only after a later live-read approval; raw request payloads stay out of CRAYS evidence views.",
  },
  {
    key: "derived-fields",
    label: "Derived evidence fields",
    allowedFields: ["catchment_summary", "reachability_band_summary", "target_access_summary", "demand_context_summary", "competition_context_summary", "location_score", "confidence_state"],
    prohibitedFields: ["raw_provider_payload", "client_key", "provider_trace_headers", "unredacted_coordinates_for_public_release"],
    retentionRule: "Derived evidence can be retained in CRAYS evidence packages after review and role-scoped release.",
  },
  {
    key: "cache-fields",
    label: "Cache and retention",
    allowedFields: ["cache_key", "evidence_version", "computed_at", "expires_at", "source_class", "review_status"],
    prohibitedFields: ["secret_key", "authorization_header", "raw_response_body", "request_signature"],
    retentionRule: "Cache duration must be selected in Block 203 before any live request; default state is no cache fill.",
  },
];

const qaFixtures: LocationIntelligenceQaFixture[] = [
  {
    key: "fixture-property-urban",
    label: "Urban property fixture",
    fixtureScope: "Synthetic coordinates and bounded category sets only.",
    requiredAssertions: ["No live call", "No raw payload", "Derived evidence fields present", "Provider calls disabled"],
  },
  {
    key: "fixture-property-low-context",
    label: "Low-context property fixture",
    fixtureScope: "Synthetic location with missing statistics context.",
    requiredAssertions: ["Failure state is explainable", "No retry loop", "No release gate opens", "Reviewer action required"],
  },
  {
    key: "fixture-forbidden-role",
    label: "Forbidden role fixture",
    fixtureScope: "Guest and external roles request the contract.",
    requiredAssertions: ["HTTP 403", "No read classes returned", "No derived evidence returned", "No private data returned"],
  },
];

const failureRules: LocationIntelligenceFailureRule[] = [
  {
    key: "no-live-approval",
    label: "No live approval",
    behavior: "Return decision-ready state and do not attempt a provider request.",
    retryPolicy: "No retry.",
  },
  {
    key: "missing-consent",
    label: "Missing consent",
    behavior: "Block owner-private evidence enrichment and request reviewer action.",
    retryPolicy: "No retry until consent state changes.",
  },
  {
    key: "incomplete-location",
    label: "Incomplete location",
    behavior: "Require normalized coordinate reference before read-only evidence can be requested.",
    retryPolicy: "No retry until property-case data is corrected.",
  },
  {
    key: "provider-unavailable",
    label: "Provider unavailable",
    behavior: "Keep previous reviewed evidence version, mark freshness as stale and prevent release upgrade.",
    retryPolicy: "Manual retry only after operator approval in a later block.",
  },
];

const approvalChecklist = [
  "Approve exact read class and endpoint class.",
  "Approve request fields and prohibited fields.",
  "Approve cache duration and retention policy.",
  "Approve owner-private consent rule.",
  "Approve synthetic QA fixtures.",
  "Approve failure and manual retry behavior.",
  "Confirm no Candidate, Bank or public release is implied.",
];

function accessForRole(role: RoleKey): LocationIntelligenceAdapterDecisionContract["access"] {
  if (internalLocationDecisionRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_location_decision",
      reason: "Role can review the Location Intelligence read-only adapter decision contract. Live reads and writes remain disabled.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Location Intelligence adapter decisions are internal until a release-gated evidence surface is separately approved.",
  };
}

function boundaries(): LocationIntelligenceAdapterDecisionContract["boundaries"] {
  return {
    readOnly: true,
    decisionOnly: true,
    liveProviderReadApproved: false,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    uploadsEnabled: false,
    ownerSubmissionWritesEnabled: false,
    rawProviderPayloadsReturned: false,
    clientSideProviderCallsEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    bankReleaseEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    externalSendingEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export function getLocationIntelligenceAdapterDecision(role: RoleKey): LocationIntelligenceAdapterDecisionContract {
  const access = accessForRole(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    block: "202",
    decision: "location_intelligence_read_only_adapter_contract",
    outcome: "Location Intelligence can proceed to a no-call route scaffold and fixture plan, but no live provider read is approved.",
    approvedForLiveRead: false,
    recommendedNextBlock: "203",
    readClasses: allowed ? readClasses : [],
    fieldPolicies: allowed ? fieldPolicies : [],
    qaFixtures: allowed ? qaFixtures : [],
    failureRules: allowed ? failureRules : [],
    approvalChecklist: allowed ? approvalChecklist : [],
    boundaries: boundaries(),
    liveProviderCallsPerformed: false,
    liveProviderPayloadsReturned: false,
    liveBusinessRecordsReturned: false,
    liveOwnerPrivateDataReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
  };
}
