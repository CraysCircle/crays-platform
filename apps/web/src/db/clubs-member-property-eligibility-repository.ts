import "server-only";

import { getCorePgPool } from "@/db/client";
import {
  CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT,
  type ClubsMemberEligibilityMembershipStatus,
  type ClubsMemberEligibilityPropertyId,
} from "@/lib/clubs/member-property-eligibility-contract";

export type ClubsMemberPropertyEligibilityClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

type PublicPropertyRow = {
  property_id: ClubsMemberEligibilityPropertyId;
  access_mode: "public" | "membership_only";
  membership_required: boolean;
  allowed_stay_units: string[];
};

type MembershipRow = {
  status: Exclude<ClubsMemberEligibilityMembershipStatus, "not_confirmed">;
  valid_from: string | Date;
  valid_until: string | Date | null;
  decision_authority_role: "CRAYS_TEAM";
};

type ScopeRow = {
  property_id: string;
  store_id: string;
  access_mode: "property_admission_required";
  admission_policy_version: string;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  assignment_id: string;
  assignment_version: number | string;
};

type GrantRow = {
  grant_id: string;
  grant_version: number | string;
  valid_from: string | Date;
  valid_until: string | Date | null;
};

export class ClubsMemberPropertyEligibilityValidationError extends Error {
  constructor() {
    super("Clubs member property eligibility input is invalid");
    this.name = "ClubsMemberPropertyEligibilityValidationError";
  }
}

export class ClubsMemberPropertyEligibilityNotFoundError extends Error {
  constructor() {
    super("Clubs member property is not found");
    this.name = "ClubsMemberPropertyEligibilityNotFoundError";
  }
}

export class ClubsMemberPropertyEligibilityUnavailableError extends Error {
  constructor() {
    super("Clubs member property eligibility is unavailable");
    this.name = "ClubsMemberPropertyEligibilityUnavailableError";
  }
}

function iso(value: string | Date | null) {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ClubsMemberPropertyEligibilityUnavailableError();
  }
  return date.toISOString();
}

function validatePropertyId(
  propertyId: string,
): asserts propertyId is ClubsMemberEligibilityPropertyId {
  if (
    propertyId !== "property-clubs-forest-city-golf" &&
    propertyId !== "property-clubs-forest-city-marina"
  ) {
    throw new ClubsMemberPropertyEligibilityNotFoundError();
  }
}

function validateAccountId(accountId: string | null) {
  if (accountId !== null && !/^[A-Za-z0-9:_.-]{3,180}$/.test(accountId)) {
    throw new ClubsMemberPropertyEligibilityValidationError();
  }
}

function basePayload(
  property: PublicPropertyRow,
  accountId: string | null,
  evaluatedAt: string,
) {
  const isGolf = property.property_id === "property-clubs-forest-city-golf";
  return {
    schema: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.schema,
    version: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.version,
    status: "ready" as const,
    propertyId: property.property_id,
    accessMode: isGolf
      ? ("open" as const)
      : ("property_admission_required" as const),
    membershipRequired: property.membership_required,
    propertyAdmissionRequired: !isGolf,
    allowedStayUnits: property.allowed_stay_units,
    evaluatedAt,
    authentication: {
      status: accountId === null ? ("signed_out" as const) : ("ready" as const),
      accountMapped: accountId !== null,
    },
    membership: {
      status: "not_confirmed" as ClubsMemberEligibilityMembershipStatus,
      confirmed: false,
      decisionAuthority: "CRAYS_TEAM" as const,
      validFrom: null as string | null,
      validUntil: null as string | null,
    },
    propertyAdmission: {
      status: isGolf ? ("not_required" as const) : ("not_admitted" as const),
      admitted: isGolf,
      basis: isGolf ? ("OPEN_ACCESS" as const) : ("NONE" as const),
      validFrom: null as string | null,
      validUntil: null as string | null,
      decisionReceiptCreated: false,
    },
    authorities: {
      propertyAccess: isGolf,
      availability: false,
      quote: false,
      booking: false,
      payment: false,
    },
  };
}

export async function readClubsMemberPropertyEligibilityWithClient(
  client: ClubsMemberPropertyEligibilityClient,
  propertyId: string,
  accountId: string | null,
  now = new Date(),
) {
  validatePropertyId(propertyId);
  validateAccountId(accountId);
  if (!Number.isFinite(now.getTime())) {
    throw new ClubsMemberPropertyEligibilityValidationError();
  }
  const evaluatedAt = now.toISOString();

  const publicProperty = await client.query<PublicPropertyRow>(
    `select property_id,access_mode,membership_required,allowed_stay_units
       from crays_core.clubs_public_property_identities
      where property_id=$1 and lifecycle_state='active'
      limit 2`,
    [propertyId],
  );
  if (publicProperty.rows.length !== 1) {
    throw new ClubsMemberPropertyEligibilityUnavailableError();
  }
  const property = publicProperty.rows[0]!;
  const expectedGolf = propertyId === "property-clubs-forest-city-golf";
  if (
    property.access_mode !== (expectedGolf ? "public" : "membership_only") ||
    property.membership_required !== !expectedGolf ||
    property.allowed_stay_units.join(",") !==
      (expectedGolf ? "night,week,month" : "month")
  ) {
    throw new ClubsMemberPropertyEligibilityUnavailableError();
  }

  const base = basePayload(property, accountId, evaluatedAt);
  if (expectedGolf) {
    return { ...base, eligibility: "public_access" as const };
  }
  if (accountId === null) {
    return {
      ...base,
      status: "authentication_required" as const,
      eligibility: "authentication_required" as const,
    };
  }

  const account = await client.query<{ account_id: string }>(
    `select account_id
       from crays_core.crays_accounts
      where account_id=$1 and status in ('active','review')
      limit 1`,
    [accountId],
  );
  if (!account.rows[0]) {
    throw new ClubsMemberPropertyEligibilityUnavailableError();
  }

  const membershipResult = await client.query<MembershipRow>(
    `select status,valid_from,valid_until,decision_authority_role
       from crays_core.clubs_member_memberships
      where account_id=$1 and program_key='crays-clubs-membership'
      limit 2`,
    [accountId],
  );
  if (membershipResult.rows.length > 1) {
    throw new ClubsMemberPropertyEligibilityUnavailableError();
  }
  const membership = membershipResult.rows[0] ?? null;
  const membershipActive =
    membership?.status === "confirmed" &&
    new Date(membership.valid_from).getTime() <= now.getTime() &&
    (membership.valid_until === null ||
      new Date(membership.valid_until).getTime() > now.getTime()) &&
    membership.decision_authority_role === "CRAYS_TEAM";
  const membershipStatus: ClubsMemberEligibilityMembershipStatus = membership
    ? membership.status === "confirmed" && !membershipActive
      ? "expired"
      : membership.status
    : "not_confirmed";
  const withMembership = {
    ...base,
    membership: {
      status: membershipStatus,
      confirmed: membershipActive,
      decisionAuthority: "CRAYS_TEAM" as const,
      validFrom: membership ? iso(membership.valid_from) : null,
      validUntil: membership ? iso(membership.valid_until) : null,
    },
  };
  if (!membershipActive) {
    return { ...withMembership, eligibility: "membership_required" as const };
  }

  const scopeResult = await client.query<ScopeRow>(
    `select property.property_id,property.store_id,
            property.access_mode::text access_mode,
            property.admission_policy_version,
            assignment.partner_tenant_id,
            assignment.operator_legal_entity_id,
            assignment.assignment_id,
            assignment.version assignment_version
       from crays_core.clubs_properties property
       join crays_core.stores store
         on store.store_id=property.store_id
        and store.vertical_root='clubs' and store.status='active'
       join crays_core.store_operator_assignments assignment
         on assignment.store_id=store.store_id
        and assignment.vertical_root='clubs' and assignment.status='active'
        and assignment.valid_from<=$2::timestamptz
        and (assignment.valid_until is null or assignment.valid_until>$2::timestamptz)
       join crays_core.franchise_operator_tenants tenant
         on tenant.partner_tenant_id=assignment.partner_tenant_id
        and tenant.status='active'
       join crays_core.operator_legal_entities legal
         on legal.legal_entity_id=assignment.operator_legal_entity_id
        and legal.partner_tenant_id=assignment.partner_tenant_id
        and legal.status='active'
      where property.property_id=$1
        and property.access_mode='property_admission_required'
        and assignment.partner_tenant_id=current_setting('crays.tenant_id',true)
      order by assignment.version desc
      limit 2`,
    [propertyId, evaluatedAt],
  );
  if (scopeResult.rows.length !== 1) {
    return {
      ...withMembership,
      status: "property_scope_not_ready" as const,
      eligibility: "property_scope_not_ready" as const,
    };
  }
  const scope = scopeResult.rows[0]!;

  const grantResult = await client.query<GrantRow>(
    `with latest as (
       select distinct on (candidate.grant_id) candidate.*
         from crays_core.clubs_property_admission_grants candidate
        where candidate.tenant_id=$1 and candidate.property_id=$2
          and candidate.account_id=$3 and candidate.store_id=$4
          and candidate.operator_legal_entity_id=$5
          and candidate.assignment_id=$6 and candidate.assignment_version=$7
          and candidate.policy_version=$8 and candidate.valid_from<=$9::timestamptz
        order by candidate.grant_id,candidate.grant_version desc
     )
     select candidate.grant_id,candidate.grant_version,
            candidate.valid_from,candidate.valid_until
       from latest candidate
      where (candidate.valid_until is null or candidate.valid_until>$9::timestamptz)
        and exists (
          select 1 from crays_core.clubs_property_admission_grant_events event
           where event.grant_id=candidate.grant_id
             and event.grant_version=candidate.grant_version
             and event.event_type='GRANTED'
             and event.effective_at<=$9::timestamptz
        )
        and not exists (
          select 1 from crays_core.clubs_property_admission_grant_events event
           where event.grant_id=candidate.grant_id
             and event.grant_version=candidate.grant_version
             and event.event_type='REVOKED'
             and event.effective_at<=$9::timestamptz
        )
      order by candidate.grant_id
      limit 2`,
    [
      scope.partner_tenant_id,
      propertyId,
      accountId,
      scope.store_id,
      scope.operator_legal_entity_id,
      scope.assignment_id,
      Number(scope.assignment_version),
      scope.admission_policy_version,
      evaluatedAt,
    ],
  );
  if (grantResult.rows.length !== 1) {
    return {
      ...withMembership,
      eligibility: "property_admission_required" as const,
      propertyAdmission: {
        ...withMembership.propertyAdmission,
        basis: "GRANT_NOT_FOUND_OR_AMBIGUOUS" as const,
      },
    };
  }
  const grant = grantResult.rows[0]!;
  return {
    ...withMembership,
    eligibility: "property_access_admitted" as const,
    propertyAdmission: {
      status: "active" as const,
      admitted: true,
      basis: "ACTIVE_GRANT" as const,
      validFrom: iso(grant.valid_from),
      validUntil: iso(grant.valid_until),
      decisionReceiptCreated: false,
    },
    authorities: {
      ...withMembership.authorities,
      propertyAccess: true,
    },
  };
}

export async function readClubsMemberPropertyEligibility(
  propertyId: string,
  accountId: string | null,
) {
  return readClubsMemberPropertyEligibilityWithClient(
    getCorePgPool(),
    propertyId,
    accountId,
  );
}
