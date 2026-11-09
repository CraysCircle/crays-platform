import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const propertyCaseReviewRoles: RoleKey[] = ["deal-manager", "expansion-manager", "reviewer", "crays-management", "admin"];

export type PropertyCaseReviewItem = {
  caseId: string;
  propertyId: string;
  title: string;
  city: string | null;
  country: string | null;
  propertyType: string;
  intakeSource: string;
  propertyStatus: string;
  caseStatus: string;
  currentPhase: string;
  handoffRequired: boolean;
  handoffStatus: string;
  ownerRole: string;
  eventCount: number;
  latestEventAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PropertyCaseReviewReadModel = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  records: PropertyCaseReviewItem[];
  summary: {
    total: number;
    intake: number;
    analysis: number;
    review: number;
    handoffReady: number;
    handedToDeal: number;
    rejected: number;
    archived: number;
    handoffRequired: number;
  };
  liveBusinessRecordsReturned: boolean;
  ownerPrivateDataReturned: false;
  candidateDataReturned: false;
  bankDataReturned: false;
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type PropertyCaseTransitionInput = {
  caseId: string;
  role: RoleKey;
  transition: "start_analysis" | "start_review" | "mark_handoff_ready";
};

export type PropertyCaseTransitionResult = {
  status: "transitioned" | "already_transitioned";
  caseId: string;
  fromStatus: string;
  toStatus: "analysis" | "review" | "handoff_ready";
  fromPhase: string;
  toPhase: "property_analysis" | "property_review" | "handoff_ready";
  eventId: string;
  updatedRows: {
    propertyCases: number;
    properties: number;
    workflowEvents: number;
  };
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type PropertyCaseAnalysisGate = {
  key: "analysis-started" | "location-evidence" | "evidence-package" | "document-readiness" | "handoff-preparation";
  label: string;
  status: "ready" | "pending" | "blocked";
  current: string;
  requiredFor: string;
};

export type PropertyCaseAnalysisReadiness = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  case:
    | {
        caseId: string;
        propertyId: string;
        title: string;
        city: string | null;
        country: string | null;
        propertyStatus: string;
        caseStatus: string;
        currentPhase: string;
        handoffRequired: boolean;
        handoffStatus: string;
        ownerRole: string;
      }
    | null;
  counts: {
    locationAnalyses: number;
    reviewedLocationAnalyses: number;
    evidencePackages: number;
    releasableEvidencePackages: number;
    documentLinks: number;
    approvedDocumentLinks: number;
    workflowEvents: number;
  };
  gates: PropertyCaseAnalysisGate[];
  handoffPreparation: {
    status: "not_ready" | "ready_for_review";
    explicitHandoffRequired: boolean;
    dealManagerAccessGranted: false;
    candidateReleaseEnabled: false;
    bankReleaseEnabled: false;
    publicReleaseEnabled: false;
    requiredNextActions: string[];
  };
  liveBusinessRecordReturned: boolean;
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

type PropertyCaseReviewRow = {
  case_id: string;
  property_id: string;
  title: string;
  city: string | null;
  country: string | null;
  property_type: string;
  intake_source: string;
  property_status: string;
  case_status: string;
  current_phase: string;
  handoff_required: boolean;
  handoff_status: string;
  owner_role: string;
  event_count: number;
  latest_event_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type PropertyCaseTransitionRow = {
  case_id: string;
  property_id: string;
  status: string;
  current_phase: string;
  owner_role: string;
};

type PropertyCaseAnalysisReadinessRow = {
  case_id: string;
  property_id: string;
  title: string;
  city: string | null;
  country: string | null;
  property_status: string;
  case_status: string;
  current_phase: string;
  handoff_required: boolean;
  handoff_status: string;
  owner_role: string;
  location_analyses: number;
  reviewed_location_analyses: number;
  evidence_packages: number;
  releasable_evidence_packages: number;
  document_links: number;
  approved_document_links: number;
  workflow_events: number;
};

type PropertyCaseGateCountRow = {
  location_analyses: number;
  reviewed_location_analyses: number;
  evidence_packages: number;
  approved_document_links: number;
};

function emptySummary() {
  return {
    total: 0,
    intake: 0,
    analysis: 0,
    review: 0,
    handoffReady: 0,
    handedToDeal: 0,
    rejected: 0,
    archived: 0,
    handoffRequired: 0,
  };
}

function accessForRole(role: RoleKey) {
  if (propertyCaseReviewRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can review property fit, manual intake and digital owner handoff readiness before prepared-deal packaging.",
    };
  }

  return {
    allowed: false,
    reason: "Property-case review requires Deal Manager, Expansion Manager or review scope.",
  };
}

export function canReviewPropertyCases(role: RoleKey) {
  return accessForRole(role).allowed;
}

function transitionEventId(caseId: string, transition: PropertyCaseTransitionInput["transition"]) {
  return `event_${caseId}_${transition}`;
}

function summarize(records: PropertyCaseReviewItem[]) {
  return records.reduce((summary, record) => {
    summary.total += 1;
    if (record.caseStatus === "intake") summary.intake += 1;
    if (record.caseStatus === "analysis") summary.analysis += 1;
    if (record.caseStatus === "review") summary.review += 1;
    if (record.caseStatus === "handoff_ready") summary.handoffReady += 1;
    if (record.caseStatus === "handed_to_deal") summary.handedToDeal += 1;
    if (record.caseStatus === "rejected") summary.rejected += 1;
    if (record.caseStatus === "archived") summary.archived += 1;
    if (record.handoffRequired) summary.handoffRequired += 1;
    return summary;
  }, emptySummary());
}

export async function getPropertyCaseReviewReadModel(role: RoleKey): Promise<PropertyCaseReviewReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured || !access.allowed) {
    return {
      configured: runtime.configured,
      role,
      access,
      records: [],
      summary: emptySummary(),
      liveBusinessRecordsReturned: false,
      ownerPrivateDataReturned: false,
      candidateDataReturned: false,
      bankDataReturned: false,
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  }

  const result = await getCorePgPool().query<PropertyCaseReviewRow>(
    `
      with event_counts as (
        select
          related_entity_id,
          count(*)::int as event_count,
          max(occurred_at) as latest_event_at
        from crays_core.workflow_events
        where related_entity_type = 'property-case'
        group by related_entity_id
      )
      select
        property_cases.case_id,
        properties.property_id,
        properties.title,
        properties.city,
        properties.country,
        properties.property_type,
        properties.intake_source,
        properties.status as property_status,
        property_cases.status as case_status,
        property_cases.current_phase,
        property_cases.handoff_required,
        property_cases.handoff_status,
        property_cases.owner_role,
        coalesce(event_counts.event_count, 0)::int as event_count,
        event_counts.latest_event_at,
        property_cases.created_at,
        property_cases.updated_at
      from crays_core.property_cases
      join crays_core.properties on properties.property_id = property_cases.property_id
      left join event_counts on event_counts.related_entity_id = property_cases.case_id
      where property_cases.owner_role = 'expansion-manager'
        and coalesce(property_cases.metadata -> '__seed' ->> 'seed_batch_id', '') <> 'crays-benchmark-20260710-v1'
      order by property_cases.created_at desc
      limit 25
    `,
  );

  const records = result.rows.map((row) => ({
    caseId: row.case_id,
    propertyId: row.property_id,
    title: row.title,
    city: row.city,
    country: row.country,
    propertyType: row.property_type,
    intakeSource: row.intake_source,
    propertyStatus: row.property_status,
    caseStatus: row.case_status,
    currentPhase: row.current_phase,
    handoffRequired: row.handoff_required,
    handoffStatus: row.handoff_status,
    ownerRole: row.owner_role,
    eventCount: row.event_count,
    latestEventAt: row.latest_event_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));

  return {
    configured: true,
    role,
    access,
    records,
    summary: summarize(records),
    liveBusinessRecordsReturned: records.length > 0,
    ownerPrivateDataReturned: false,
    candidateDataReturned: false,
    bankDataReturned: false,
    fileUploadEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function buildAnalysisGates(row: PropertyCaseAnalysisReadinessRow): PropertyCaseAnalysisGate[] {
  const analysisStarted = row.case_status === "analysis" || row.case_status === "review" || row.case_status === "handoff_ready";
  const hasReviewedLocation = row.reviewed_location_analyses > 0;
  const hasEvidencePackage = row.evidence_packages > 0;
  const hasApprovedDocuments = row.approved_document_links > 0;
  const handoffReady = analysisStarted && hasReviewedLocation && hasEvidencePackage && hasApprovedDocuments;

  return [
    {
      key: "analysis-started",
      label: "Analysis started",
      status: analysisStarted ? "ready" : "blocked",
      current: `${row.case_status} / ${row.current_phase}`,
      requiredFor: "Property fit review",
    },
    {
      key: "location-evidence",
      label: "Location evidence",
      status: hasReviewedLocation ? "ready" : row.location_analyses > 0 ? "pending" : "blocked",
      current: `${row.reviewed_location_analyses} reviewed of ${row.location_analyses}`,
      requiredFor: "Reviewed property analysis",
    },
    {
      key: "evidence-package",
      label: "Evidence package",
      status: hasEvidencePackage ? "ready" : "blocked",
      current: `${row.evidence_packages} internal packages, ${row.releasable_evidence_packages} releasable`,
      requiredFor: "Candidate-safe and owner-safe release review",
    },
    {
      key: "document-readiness",
      label: "Document readiness",
      status: hasApprovedDocuments ? "ready" : row.document_links > 0 ? "pending" : "blocked",
      current: `${row.approved_document_links} approved of ${row.document_links}`,
      requiredFor: "Deal handoff package",
    },
    {
      key: "handoff-preparation",
      label: "Handoff preparation",
      status: handoffReady ? "ready" : "blocked",
      current: row.handoff_status,
      requiredFor: "Explicit Deal Manager handoff",
    },
  ];
}

export async function getPropertyCaseAnalysisReadiness(role: RoleKey, caseId?: string): Promise<PropertyCaseAnalysisReadiness> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured || !access.allowed) {
    return {
      configured: runtime.configured,
      role,
      access,
      case: null,
      counts: {
        locationAnalyses: 0,
        reviewedLocationAnalyses: 0,
        evidencePackages: 0,
        releasableEvidencePackages: 0,
        documentLinks: 0,
        approvedDocumentLinks: 0,
        workflowEvents: 0,
      },
      gates: [],
      handoffPreparation: {
        status: "not_ready",
        explicitHandoffRequired: true,
        dealManagerAccessGranted: false,
        candidateReleaseEnabled: false,
        bankReleaseEnabled: false,
        publicReleaseEnabled: false,
        requiredNextActions: ["review_location_evidence", "prepare_evidence_package", "approve_documents"],
      },
      liveBusinessRecordReturned: false,
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  }

  const requestedCaseId = caseId?.trim() ?? "";
  const result = await getCorePgPool().query<PropertyCaseAnalysisReadinessRow>(
    `
      select
        property_cases.case_id,
        properties.property_id,
        properties.title,
        properties.city,
        properties.country,
        properties.status as property_status,
        property_cases.status as case_status,
        property_cases.current_phase,
        property_cases.handoff_required,
        property_cases.handoff_status,
        property_cases.owner_role,
        (
          select count(*)::int
          from crays_core.location_analyses
          where location_analyses.property_case_id = property_cases.case_id
        ) as location_analyses,
        (
          select count(*)::int
          from crays_core.location_analyses
          where location_analyses.property_case_id = property_cases.case_id
            and location_analyses.status in ('review', 'approved', 'released')
        ) as reviewed_location_analyses,
        (
          select count(*)::int
          from crays_core.evidence_packages
          where evidence_packages.related_entity_type = 'property-case'
            and evidence_packages.related_entity_id = property_cases.case_id
        ) as evidence_packages,
        (
          select count(*)::int
          from crays_core.evidence_packages
          where evidence_packages.related_entity_type = 'property-case'
            and evidence_packages.related_entity_id = property_cases.case_id
            and evidence_packages.release_state in ('candidate_released', 'bank_released', 'owner_released')
        ) as releasable_evidence_packages,
        (
          select count(*)::int
          from crays_core.document_package_links
          where document_package_links.package_type = 'property-case'
            and document_package_links.package_id = property_cases.case_id
        ) as document_links,
        (
          select count(*)::int
          from crays_core.document_package_links
          where document_package_links.package_type = 'property-case'
            and document_package_links.package_id = property_cases.case_id
            and document_package_links.status = 'approved'
        ) as approved_document_links,
        (
          select count(*)::int
          from crays_core.workflow_events
          where workflow_events.related_entity_type = 'property-case'
            and workflow_events.related_entity_id = property_cases.case_id
        ) as workflow_events
      from crays_core.property_cases
      join crays_core.properties on properties.property_id = property_cases.property_id
      where property_cases.owner_role = 'expansion-manager'
        and coalesce(property_cases.metadata -> '__seed' ->> 'seed_batch_id', '') <> 'crays-benchmark-20260710-v1'
        and ($1 = '' or property_cases.case_id = $1)
      order by
        case when property_cases.case_id = $1 then 0 else 1 end,
        property_cases.updated_at desc
      limit 1
    `,
    [requestedCaseId],
  );
  const row = result.rows[0];

  if (!row) {
    return {
      configured: true,
      role,
      access,
      case: null,
      counts: {
        locationAnalyses: 0,
        reviewedLocationAnalyses: 0,
        evidencePackages: 0,
        releasableEvidencePackages: 0,
        documentLinks: 0,
        approvedDocumentLinks: 0,
        workflowEvents: 0,
      },
      gates: [],
      handoffPreparation: {
        status: "not_ready",
        explicitHandoffRequired: true,
        dealManagerAccessGranted: false,
        candidateReleaseEnabled: false,
        bankReleaseEnabled: false,
        publicReleaseEnabled: false,
        requiredNextActions: ["select_property_case"],
      },
      liveBusinessRecordReturned: false,
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  }

  const gates = buildAnalysisGates(row);
  const blockingActions = gates.filter((gate) => gate.status !== "ready").map((gate) => gate.key);
  const handoffReady = blockingActions.length === 0;

  return {
    configured: true,
    role,
    access,
    case: {
      caseId: row.case_id,
      propertyId: row.property_id,
      title: row.title,
      city: row.city,
      country: row.country,
      propertyStatus: row.property_status,
      caseStatus: row.case_status,
      currentPhase: row.current_phase,
      handoffRequired: row.handoff_required,
      handoffStatus: row.handoff_status,
      ownerRole: row.owner_role,
    },
    counts: {
      locationAnalyses: row.location_analyses,
      reviewedLocationAnalyses: row.reviewed_location_analyses,
      evidencePackages: row.evidence_packages,
      releasableEvidencePackages: row.releasable_evidence_packages,
      documentLinks: row.document_links,
      approvedDocumentLinks: row.approved_document_links,
      workflowEvents: row.workflow_events,
    },
    gates,
    handoffPreparation: {
      status: handoffReady ? "ready_for_review" : "not_ready",
      explicitHandoffRequired: row.handoff_required,
      dealManagerAccessGranted: false,
      candidateReleaseEnabled: false,
      bankReleaseEnabled: false,
      publicReleaseEnabled: false,
      requiredNextActions: blockingActions,
    },
    liveBusinessRecordReturned: true,
    fileUploadEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export async function transitionPropertyCaseToAnalysis(input: PropertyCaseTransitionInput): Promise<PropertyCaseTransitionResult> {
  if (!canReviewPropertyCases(input.role)) {
    throw new Error("Role is not allowed to transition property cases.");
  }

  if (input.transition !== "start_analysis") {
    throw new Error("Unsupported property-case transition.");
  }

  const pool = getCorePgPool();
  const client = await pool.connect();
  const eventId = transitionEventId(input.caseId, input.transition);

  try {
    await client.query("begin");

    const currentResult = await client.query<PropertyCaseTransitionRow>(
      `
        select case_id, property_id, status, current_phase, owner_role
        from crays_core.property_cases
        where case_id = $1
        for update
      `,
      [input.caseId],
    );
    const current = currentResult.rows[0];

    if (!current) {
      throw new Error("Property case was not found.");
    }

    if (current.owner_role !== "expansion-manager") {
      throw new Error("Only Expansion-owned property cases can enter analysis through this workflow action.");
    }

    const alreadyTransitioned = current.status === "analysis" && current.current_phase === "property_analysis";
    const propertyCaseUpdate = alreadyTransitioned
      ? { rowCount: 0 }
      : await client.query(
          `
            update crays_core.property_cases
            set status = 'analysis',
                current_phase = 'property_analysis',
                review_summary = review_summary || $2::jsonb,
                updated_at = now()
            where case_id = $1
          `,
          [
            input.caseId,
            JSON.stringify({
              analysisStarted: true,
              startedByRole: input.role,
            }),
          ],
        );

    const propertyUpdate = alreadyTransitioned
      ? { rowCount: 0 }
      : await client.query(
          `
            update crays_core.properties
            set status = 'screening',
                metadata = metadata || $2::jsonb,
                updated_at = now()
            where property_id = $1
          `,
          [
            current.property_id,
            JSON.stringify({
              propertyCaseStatus: "analysis",
              analysisStartedByRole: input.role,
            }),
          ],
        );

    const eventResult = await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'property_case.analysis_started', 'property-case', $2, $3, $4::jsonb, 'recorded', $5::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        eventId,
        input.caseId,
        input.role,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          transition: input.transition,
          fromStatus: current.status,
          toStatus: "analysis",
          fromPhase: current.current_phase,
          toPhase: "property_analysis",
        }),
      ],
    );

    await client.query("commit");

    return {
      status: alreadyTransitioned ? "already_transitioned" : "transitioned",
      caseId: input.caseId,
      fromStatus: current.status,
      toStatus: "analysis",
      fromPhase: current.current_phase,
      toPhase: "property_analysis",
      eventId,
      updatedRows: {
        propertyCases: propertyCaseUpdate.rowCount ?? 0,
        properties: propertyUpdate.rowCount ?? 0,
        workflowEvents: eventResult.rowCount ?? 0,
      },
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function transitionPropertyCaseToReview(input: PropertyCaseTransitionInput): Promise<PropertyCaseTransitionResult> {
  if (!canReviewPropertyCases(input.role)) {
    throw new Error("Role is not allowed to transition property cases.");
  }

  if (input.transition !== "start_review") {
    throw new Error("Unsupported property-case transition.");
  }

  const pool = getCorePgPool();
  const client = await pool.connect();
  const eventId = transitionEventId(input.caseId, input.transition);

  try {
    await client.query("begin");

    const currentResult = await client.query<PropertyCaseTransitionRow>(
      `
        select case_id, property_id, status, current_phase, owner_role
        from crays_core.property_cases
        where case_id = $1
        for update
      `,
      [input.caseId],
    );
    const current = currentResult.rows[0];

    if (!current) {
      throw new Error("Property case was not found.");
    }

    if (current.owner_role !== "expansion-manager") {
      throw new Error("Only Expansion-owned property cases can enter review through this workflow action.");
    }

    const readinessResult = await client.query<PropertyCaseGateCountRow>(
      `
        select
          (
            select count(*)::int
            from crays_core.location_analyses
            where location_analyses.property_case_id = $1
          ) as location_analyses,
          (
            select count(*)::int
            from crays_core.location_analyses
            where location_analyses.property_case_id = $1
              and location_analyses.status in ('review', 'approved', 'released')
          ) as reviewed_location_analyses,
          (
            select count(*)::int
            from crays_core.evidence_packages
            where evidence_packages.related_entity_type = 'property-case'
              and evidence_packages.related_entity_id = $1
          ) as evidence_packages,
          (
            select count(*)::int
            from crays_core.document_package_links
            where document_package_links.package_type = 'property-case'
              and document_package_links.package_id = $1
              and document_package_links.status = 'approved'
          ) as approved_document_links
      `,
      [input.caseId],
    );
    const readiness = readinessResult.rows[0];
    const readinessReady =
      readiness.reviewed_location_analyses > 0 && readiness.evidence_packages > 0 && readiness.approved_document_links > 0;

    if (!readinessReady) {
      throw new Error("Property case cannot enter review before location evidence, evidence package and approved document readiness exist.");
    }

    const alreadyTransitioned = current.status === "review" && current.current_phase === "property_review";

    if (!alreadyTransitioned && (current.status !== "analysis" || current.current_phase !== "property_analysis")) {
      throw new Error("Property case must be in analysis before it can enter review.");
    }

    const propertyCaseUpdate = alreadyTransitioned
      ? { rowCount: 0 }
      : await client.query(
          `
            update crays_core.property_cases
            set status = 'review',
                current_phase = 'property_review',
                review_summary = review_summary || $2::jsonb,
                updated_at = now()
            where case_id = $1
          `,
          [
            input.caseId,
            JSON.stringify({
              analysisReadinessComplete: true,
              reviewStarted: true,
              startedByRole: input.role,
            }),
          ],
        );

    const propertyUpdate = alreadyTransitioned
      ? { rowCount: 0 }
      : await client.query(
          `
            update crays_core.properties
            set metadata = metadata || $2::jsonb,
                updated_at = now()
            where property_id = $1
          `,
          [
            current.property_id,
            JSON.stringify({
              propertyCaseStatus: "review",
              reviewStartedByRole: input.role,
            }),
          ],
        );

    const eventResult = await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'property_case.review_started', 'property-case', $2, $3, $4::jsonb, 'recorded', $5::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        eventId,
        input.caseId,
        input.role,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          transition: input.transition,
          fromStatus: current.status,
          toStatus: "review",
          fromPhase: current.current_phase,
          toPhase: "property_review",
        }),
      ],
    );

    await client.query("commit");

    return {
      status: alreadyTransitioned ? "already_transitioned" : "transitioned",
      caseId: input.caseId,
      fromStatus: current.status,
      toStatus: "review",
      fromPhase: current.current_phase,
      toPhase: "property_review",
      eventId,
      updatedRows: {
        propertyCases: propertyCaseUpdate.rowCount ?? 0,
        properties: propertyUpdate.rowCount ?? 0,
        workflowEvents: eventResult.rowCount ?? 0,
      },
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function markPropertyCaseHandoffReady(input: PropertyCaseTransitionInput): Promise<PropertyCaseTransitionResult> {
  if (!canReviewPropertyCases(input.role)) {
    throw new Error("Role is not allowed to transition property cases.");
  }

  if (input.transition !== "mark_handoff_ready") {
    throw new Error("Unsupported property-case transition.");
  }

  const pool = getCorePgPool();
  const client = await pool.connect();
  const eventId = transitionEventId(input.caseId, input.transition);

  try {
    await client.query("begin");

    const currentResult = await client.query<PropertyCaseTransitionRow>(
      `
        select case_id, property_id, status, current_phase, owner_role
        from crays_core.property_cases
        where case_id = $1
        for update
      `,
      [input.caseId],
    );
    const current = currentResult.rows[0];

    if (!current) {
      throw new Error("Property case was not found.");
    }

    if (current.owner_role !== "expansion-manager") {
      throw new Error("Only Expansion-owned property cases can be marked handoff ready through this workflow action.");
    }

    const readinessResult = await client.query<PropertyCaseGateCountRow>(
      `
        select
          (
            select count(*)::int
            from crays_core.location_analyses
            where location_analyses.property_case_id = $1
              and location_analyses.status in ('review', 'approved', 'released')
          ) as reviewed_location_analyses,
          (
            select count(*)::int
            from crays_core.evidence_packages
            where evidence_packages.related_entity_type = 'property-case'
              and evidence_packages.related_entity_id = $1
          ) as evidence_packages,
          (
            select count(*)::int
            from crays_core.document_package_links
            where document_package_links.package_type = 'property-case'
              and document_package_links.package_id = $1
              and document_package_links.status = 'approved'
          ) as approved_document_links,
          0::int as location_analyses
      `,
      [input.caseId],
    );
    const readiness = readinessResult.rows[0];
    const readinessReady =
      readiness.reviewed_location_analyses > 0 && readiness.evidence_packages > 0 && readiness.approved_document_links > 0;

    if (!readinessReady) {
      throw new Error("Property case cannot become handoff-ready before evidence and document readiness gates are complete.");
    }

    const alreadyTransitioned = current.status === "handoff_ready" && current.current_phase === "handoff_ready";

    if (!alreadyTransitioned && (current.status !== "review" || current.current_phase !== "property_review")) {
      throw new Error("Property case must be in review before it can become handoff-ready.");
    }

    const propertyCaseUpdate = alreadyTransitioned
      ? { rowCount: 0 }
      : await client.query(
          `
            update crays_core.property_cases
            set status = 'handoff_ready',
                current_phase = 'handoff_ready',
                handoff_status = 'ready',
                review_summary = review_summary || $2::jsonb,
                updated_at = now()
            where case_id = $1
          `,
          [
            input.caseId,
            JSON.stringify({
              handoffReady: true,
              markedByRole: input.role,
              dealManagerAccessGranted: false,
            }),
          ],
        );

    const propertyUpdate = alreadyTransitioned
      ? { rowCount: 0 }
      : await client.query(
          `
            update crays_core.properties
            set status = 'qualified',
                metadata = metadata || $2::jsonb,
                updated_at = now()
            where property_id = $1
          `,
          [
            current.property_id,
            JSON.stringify({
              propertyCaseStatus: "handoff_ready",
              dealManagerAccessGranted: false,
            }),
          ],
        );

    const eventResult = await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'property_case.handoff_ready', 'property-case', $2, $3, $4::jsonb, 'recorded', $5::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        eventId,
        input.caseId,
        input.role,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          transition: input.transition,
          fromStatus: current.status,
          toStatus: "handoff_ready",
          fromPhase: current.current_phase,
          toPhase: "handoff_ready",
          dealManagerAccessGranted: false,
        }),
      ],
    );

    await client.query("commit");

    return {
      status: alreadyTransitioned ? "already_transitioned" : "transitioned",
      caseId: input.caseId,
      fromStatus: current.status,
      toStatus: "handoff_ready",
      fromPhase: current.current_phase,
      toPhase: "handoff_ready",
      eventId,
      updatedRows: {
        propertyCases: propertyCaseUpdate.rowCount ?? 0,
        properties: propertyUpdate.rowCount ?? 0,
        workflowEvents: eventResult.rowCount ?? 0,
      },
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
