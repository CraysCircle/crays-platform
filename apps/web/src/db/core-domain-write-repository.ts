import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "./client";

type PropertyType = "retail" | "fitness" | "mixed_use" | "commercial" | "unknown";
type PreparedOfferOwnerRole = "deal-manager" | "expansion-manager" | "crays-management" | "admin";

export type CreatePropertyCaseInput = {
  title: string;
  addressSummary?: string | null;
  city?: string | null;
  country?: string | null;
  propertyType?: PropertyType;
  intakeSource?: "manual" | "owner_portal" | "partner_import" | "internal_review";
  ownerOrganizationId?: string | null;
  ownerAccountId?: string | null;
  assignedAccountId?: string | null;
};

export type CreatePreparedOfferInput = {
  title: string;
  market?: string | null;
  propertyCaseId?: string | null;
  ownerRole?: PreparedOfferOwnerRole;
};

export type DomainWriteResult = {
  created: true;
  entityType: "property-case" | "prepared-offer";
  ids: Record<string, string>;
  liveBusinessRecordReturned: false;
};

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function nullableText(value: unknown) {
  const cleaned = cleanText(value);
  return cleaned ? cleaned : null;
}

function propertyType(value: unknown): PropertyType {
  const cleaned = cleanText(value, "unknown");
  return ["retail", "fitness", "mixed_use", "commercial", "unknown"].includes(cleaned) ? (cleaned as PropertyType) : "unknown";
}

function preparedOfferOwnerRole(value: unknown): PreparedOfferOwnerRole {
  const cleaned = cleanText(value, "deal-manager");
  return ["deal-manager", "expansion-manager", "crays-management", "admin"].includes(cleaned) ? (cleaned as PreparedOfferOwnerRole) : "deal-manager";
}

export function parsePropertyCaseInput(body: unknown): CreatePropertyCaseInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const title = cleanText(input.title);

  if (!title) {
    throw new Error("title is required.");
  }

  return {
    title,
    addressSummary: nullableText(input.addressSummary),
    city: nullableText(input.city),
    country: nullableText(input.country),
    propertyType: propertyType(input.propertyType),
    intakeSource: "manual",
    ownerOrganizationId: nullableText(input.ownerOrganizationId),
    ownerAccountId: nullableText(input.ownerAccountId),
    assignedAccountId: nullableText(input.assignedAccountId),
  };
}

export function parsePreparedOfferInput(body: unknown): CreatePreparedOfferInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const title = cleanText(input.title);

  if (!title) {
    throw new Error("title is required.");
  }

  return {
    title,
    market: nullableText(input.market),
    propertyCaseId: nullableText(input.propertyCaseId),
    ownerRole: preparedOfferOwnerRole(input.ownerRole),
  };
}

async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function createPropertyCase(input: CreatePropertyCaseInput): Promise<DomainWriteResult> {
  const propertyId = `property_${randomUUID()}`;
  const caseId = `property_case_${randomUUID()}`;
  const eventId = `event_${randomUUID()}`;

  return withTransaction(async (client) => {
    await client.query(
      `
        insert into crays_core.properties (
          property_id, owner_organization_id, owner_account_id, title, address_summary, city, country, property_type, intake_source, status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted')
      `,
      [
        propertyId,
        input.ownerOrganizationId ?? null,
        input.ownerAccountId ?? null,
        input.title,
        input.addressSummary ?? null,
        input.city ?? null,
        input.country ?? null,
        input.propertyType ?? "unknown",
        input.intakeSource ?? "manual",
      ],
    );

    await client.query(
      `
        insert into crays_core.property_cases (
          case_id, property_id, owner_role, assigned_account_id, status, current_phase, handoff_required, handoff_status
        )
        values ($1, $2, 'expansion-manager', $3, 'intake', 'owner_intake', true, 'not_ready')
      `,
      [caseId, propertyId, input.assignedAccountId ?? null],
    );

    await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'property_case.created', 'property-case', $2, 'expansion-manager', $3::jsonb, 'recorded', $4::jsonb)
      `,
      [
        eventId,
        caseId,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({ source: input.intakeSource ?? "manual" }),
      ],
    );

    return {
      created: true,
      entityType: "property-case",
      ids: { propertyId, caseId, eventId },
      liveBusinessRecordReturned: false,
    };
  });
}

export async function createPreparedOffer(input: CreatePreparedOfferInput): Promise<DomainWriteResult> {
  const offerId = `prepared_offer_${randomUUID()}`;
  const eventId = `event_${randomUUID()}`;

  return withTransaction(async (client) => {
    await client.query(
      `
        insert into crays_core.prepared_offers (
          offer_id, property_case_id, title, market, owner_role, status, candidate_release_state, public_teaser_enabled
        )
        values ($1, $2, $3, $4, $5, 'draft', 'not_released', false)
      `,
      [offerId, input.propertyCaseId ?? null, input.title, input.market ?? null, input.ownerRole ?? "deal-manager"],
    );

    await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'prepared_offer.created', 'prepared-offer', $2, $3, $4::jsonb, 'recorded', $5::jsonb)
      `,
      [
        eventId,
        offerId,
        input.ownerRole ?? "deal-manager",
        JSON.stringify(["deal-manager", "expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({ candidateReleaseState: "not_released" }),
      ],
    );

    return {
      created: true,
      entityType: "prepared-offer",
      ids: { offerId, eventId },
      liveBusinessRecordReturned: false,
    };
  });
}
