import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";

type Authority = {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
  propertyId: string;
  correlationId: string;
};

export class ClubsPublicProjectionReplayConflictError extends Error {
  constructor() {
    super("Clubs public projection replay conflict");
    this.name = "ClubsPublicProjectionReplayConflictError";
  }
}

export class ClubsPublicProjectionScopeError extends Error {
  constructor() {
    super("Clubs public projection scope denied");
    this.name = "ClubsPublicProjectionScopeError";
  }
}

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

async function authorizedPublishedProperty(client: PoolClient, input: Authority) {
  const result = await client.query<{
    property_id: string;
    version: number;
    property_version_id: string;
    public_slug: string;
    canonical_name: string;
    public_name: string | null;
    place_name: string | null;
    accommodation_type: string | null;
    summary: string | null;
    rating: string | null;
    locality: string | null;
    country_code: string | null;
    latitude: string | null;
    longitude: string | null;
  }>(
    `select property.property_id,property.version,version.property_version_id,
       property.public_slug,version.canonical_name,
       legacy.public_name,legacy.place_name,legacy.accommodation_type,
       legacy.summary,legacy.rating::text,
       address.locality,address.country_code,
       case when address.public_visibility='public' and address.verification_status='verified'
         then address.latitude::text else null end latitude,
       case when address.public_visibility='public' and address.verification_status='verified'
         then address.longitude::text else null end longitude
     from crays_core.clubs_properties property
     join crays_core.clubs_property_versions version
       on version.property_id=property.property_id and version.version=property.version
     join crays_core.franchise_operator_tenants operator
       on operator.partner_tenant_id=property.partner_tenant_id
      and operator.organization_id=$2 and operator.status='active'
     left join crays_core.clubs_property_public_profiles legacy
       on legacy.property_id=property.property_id
      and legacy.publication_status='published'
     left join crays_core.clubs_property_addresses address
       on address.property_version_id=version.property_version_id
      and address.address_type='physical'
      and address.public_visibility in ('approximate','public')
     where property.property_id=$4
       and property.lifecycle='published'
       and version.lifecycle='published'
       and property.public_slug is not null
       and (
         (
           $3='holiday-manager'
           and exists (
             select 1
             from crays_core.partner_role_scopes scope
             join crays_core.role_assignments assignment
               on assignment.assignment_id=scope.role_assignment_id
              and assignment.organization_id=$2
              and assignment.status='active'
             where scope.account_id=$1 and scope.property_id=property.property_id
               and scope.status='active'
               and scope.capabilities @> '["clubs.holiday.property.operate"]'::jsonb
           )
         )
         or (
           $3 in ('crays-management','admin')
           and exists (
             select 1
             from crays_core.organization_memberships membership
             join crays_core.role_assignments assignment
               on assignment.account_id=membership.account_id
              and assignment.organization_id=membership.organization_id
              and assignment.role_key=$3
              and assignment.status='active'
             where membership.account_id=$1
               and membership.organization_id=$2
               and membership.role_key=$3
               and membership.status='active'
           )
         )
       )
     for update of property`,
    [input.accountId, input.organizationId, input.roleKey, input.propertyId],
  );
  return result.rows[0] ?? null;
}

export async function generateClubsPublicProjection(input: Authority) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const replay = await client.query<{
      projection_id: string;
      payload_sha256: string;
      actor_account_id: string;
      property_id: string;
      organization_id: string | null;
      tenant_session_id: string | null;
      role_key: string | null;
    }>(
      `select receipt.projection_id,receipt.payload_sha256,
         receipt.actor_account_id,receipt.property_id,
         receipt.metadata->>'organizationId' organization_id,
         receipt.metadata->>'tenantSessionId' tenant_session_id,
         receipt.metadata->>'roleKey' role_key
       from crays_core.clubs_public_projection_receipts receipt
       where receipt.correlation_id=$1`,
      [input.correlationId],
    );
    if (replay.rows[0]) {
      const existing = replay.rows[0];
      if (
        existing.actor_account_id !== input.accountId
        || existing.property_id !== input.propertyId
        || existing.organization_id !== input.organizationId
        || existing.tenant_session_id !== input.tenantSessionId
        || existing.role_key !== input.roleKey
      ) {
        throw new ClubsPublicProjectionReplayConflictError();
      }
      await client.query("commit");
      return {
        status: "replayed" as const,
        projection_id: existing.projection_id,
        payload_sha256: existing.payload_sha256,
      };
    }
    const property = await authorizedPublishedProperty(client, input);
    if (!property) {
      throw new ClubsPublicProjectionScopeError();
    }
    const existing = await client.query<{
      projection_id: string;
      payload_sha256: string;
    }>(
      `select projection_id,payload_sha256
       from crays_core.clubs_public_projection_snapshots
       where property_id=$1 and source_version=$2`,
      [property.property_id, property.version],
    );
    if (existing.rows[0]) {
      const receiptId = id("clubs_public_projection_receipt");
      await client.query(
        `insert into crays_core.clubs_public_projection_receipts (
           projection_receipt_id,projection_id,property_id,source_version,
           action,payload_sha256,actor_account_id,correlation_id,metadata
         ) values ($1,$2,$3,$4,'replayed',$5,$6,$7,$8::jsonb)`,
        [
          receiptId,
          existing.rows[0].projection_id,
          property.property_id,
          property.version,
          existing.rows[0].payload_sha256,
          input.accountId,
          input.correlationId,
          JSON.stringify({
            reason: "source_version_already_projected",
            organizationId: input.organizationId,
            tenantSessionId: input.tenantSessionId,
            roleKey: input.roleKey,
          }),
        ],
      );
      await client.query("commit");
      return { status: "replayed" as const, ...existing.rows[0] };
    }

    const [units, amenities, media] = await Promise.all([
      client.query<{
        unit_id: string;
        code: string;
        name: string;
        maximum_guests: number | null;
        bedroom_count: number | null;
        bathroom_count: string | null;
        currency: string | null;
        nightly_minor: string | null;
      }>(
        `select unit.unit_id,unit.canonical_code code,version.canonical_name name,
           facts.maximum_guests,facts.bedroom_count,facts.bathroom_count::text,
           rate.currency,rate.nightly_minor::text
         from crays_core.clubs_units unit
         join crays_core.clubs_unit_versions version
           on version.unit_id=unit.unit_id and version.version=unit.version
         left join crays_core.clubs_unit_facts facts
           on facts.unit_version_id=version.unit_version_id
         left join lateral (
           select plan.currency,plan_version.base_nightly_minor nightly_minor
           from crays_core.clubs_rate_plans plan
           join crays_core.clubs_rate_plan_versions plan_version
             on plan_version.rate_plan_id=plan.rate_plan_id
            and plan_version.version=plan.current_version
           where plan.unit_id=unit.unit_id and plan.lifecycle='published'
             and plan_version.valid_from<=current_date
             and (plan_version.valid_until is null or plan_version.valid_until>=current_date)
           order by plan_version.base_nightly_minor,plan.rate_plan_id
           limit 1
         ) rate on true
         where unit.property_id=$1 and unit.lifecycle='published'
           and version.lifecycle='published'
         order by unit.canonical_code,unit.unit_id`,
        [property.property_id],
      ),
      client.query<{
        amenity_key: string;
        label: string;
        value_boolean: boolean | null;
        value_count: number | null;
        value_text: string | null;
        value_measurement: string | null;
        measurement_unit: string | null;
      }>(
        `select amenity.amenity_key,definition.label,amenity.value_boolean,
           amenity.value_count,amenity.value_text,
           amenity.value_measurement::text,amenity.measurement_unit
         from crays_core.clubs_property_amenities amenity
         join crays_core.clubs_amenity_definitions definition
           on definition.amenity_key=amenity.amenity_key
          and definition.lifecycle='active'
         where amenity.property_version_id=$1
           and amenity.verification_status='verified'
         order by definition.category,definition.label,amenity.amenity_key`,
        [property.property_version_id],
      ),
      client.query<{
        media_asset_id: string;
        target_type: "property" | "unit";
        target_id: string;
        media_kind: string;
        mime_type: string;
        purpose: string;
        sort_order: number;
        alt_text: string | null;
        decorative: boolean;
        caption: string | null;
        pixel_width: number | null;
        pixel_height: number | null;
      }>(
        `select asset.media_asset_id,
           case when placement.property_version_id is not null then 'property' else 'unit' end target_type,
           coalesce(property_version.property_id,unit_version.unit_id) target_id,
           asset.media_kind,asset.mime_type,placement.purpose,
           placement.sort_order,placement.alt_text,placement.decorative,
           placement.caption,asset.pixel_width,asset.pixel_height
         from crays_core.clubs_media_placements placement
         join crays_core.clubs_media_assets asset
           on asset.media_asset_id=placement.media_asset_id
          and asset.lifecycle='active'
         left join crays_core.clubs_property_versions property_version
           on property_version.property_version_id=placement.property_version_id
         left join crays_core.clubs_unit_versions unit_version
           on unit_version.unit_version_id=placement.unit_version_id
         left join crays_core.clubs_units unit on unit.unit_id=unit_version.unit_id
         where placement.visibility='public'
           and placement.approval_status='approved'
           and placement.lifecycle='active'
           and (
             placement.property_version_id=$1
             or (
               unit.property_id=$2 and unit.lifecycle='published'
               and unit.version=unit_version.version
             )
           )
         order by target_type,target_id,placement.purpose,placement.sort_order,asset.media_asset_id`,
        [property.property_version_id, property.property_id],
      ),
    ]);

    const unitItems = units.rows.map((unit) => ({
      unitId: unit.unit_id,
      code: unit.code,
      name: unit.name,
      guests: unit.maximum_guests,
      bedrooms: unit.bedroom_count,
      bathrooms: unit.bathroom_count === null ? null : Number(unit.bathroom_count),
      price:
        unit.nightly_minor === null || unit.currency === null
          ? null
          : { nightlyMinor: Number(unit.nightly_minor), currency: unit.currency },
    }));
    const priced = unitItems
      .map((unit) => unit.price)
      .filter((price): price is NonNullable<typeof price> => price !== null);
    const payload = {
      propertyId: property.property_id,
      slug: property.public_slug,
      name: property.public_name ?? property.canonical_name,
      place: property.place_name ?? property.locality,
      countryCode: property.country_code,
      type: property.accommodation_type,
      text: property.summary,
      rating: property.rating === null ? null : Number(property.rating),
      map: {
        latitude: property.latitude === null ? null : Number(property.latitude),
        longitude: property.longitude === null ? null : Number(property.longitude),
      },
      amenities: amenities.rows.map((amenity) => ({
        key: amenity.amenity_key,
        label: amenity.label,
        value:
          amenity.value_boolean
          ?? amenity.value_count
          ?? amenity.value_text
          ?? (amenity.value_measurement === null
            ? null
            : `${amenity.value_measurement} ${amenity.measurement_unit}`),
      })),
      units: unitItems,
      media: media.rows.map((asset) => ({
        assetId: asset.media_asset_id,
        targetType: asset.target_type,
        targetId: asset.target_id,
        kind: asset.media_kind,
        mimeType: asset.mime_type,
        purpose: asset.purpose,
        order: asset.sort_order,
        alt: asset.alt_text,
        decorative: asset.decorative,
        caption: asset.caption,
        width: asset.pixel_width,
        height: asset.pixel_height,
        url: `/api/crays/clubs/media/${encodeURIComponent(asset.media_asset_id)}`,
      })),
      minimumNightlyPrice:
        priced.length === 0 || new Set(priced.map((price) => price.currency)).size !== 1
          ? null
          : priced.reduce((minimum, price) =>
              price.nightlyMinor < minimum.nightlyMinor ? price : minimum),
      sourceVersion: property.version,
    };
    const payloadJson = JSON.stringify(payload);
    const payloadSha256 = createHash("sha256").update(payloadJson).digest("hex");
    const projectionId = id("clubs_public_projection");
    await client.query(
      `update crays_core.clubs_public_projection_snapshots
       set status='superseded',superseded_at=now()
       where property_id=$1 and status='active'`,
      [property.property_id],
    );
    await client.query(
      `insert into crays_core.clubs_public_projection_snapshots (
         projection_id,property_id,property_version_id,source_version,
         public_slug,payload,payload_sha256,generated_by_account_id
       ) values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
      [
        projectionId,
        property.property_id,
        property.property_version_id,
        property.version,
        property.public_slug,
        payloadJson,
        payloadSha256,
        input.accountId,
      ],
    );
    await client.query(
      `insert into crays_core.clubs_public_projection_receipts (
         projection_receipt_id,projection_id,property_id,source_version,
         action,payload_sha256,actor_account_id,correlation_id,metadata
       ) values ($1,$2,$3,$4,'generated',$5,$6,$7,$8::jsonb)`,
      [
        id("clubs_public_projection_receipt"),
        projectionId,
        property.property_id,
        property.version,
        payloadSha256,
        input.accountId,
        input.correlationId,
        JSON.stringify({
          approvedPublicMediaCount: media.rows.length,
          publishedUnitCount: units.rows.length,
          verifiedAmenityCount: amenities.rows.length,
          organizationId: input.organizationId,
          tenantSessionId: input.tenantSessionId,
          roleKey: input.roleKey,
        }),
      ],
    );
    await client.query("commit");
    return { status: "generated" as const, projectionId, payloadSha256 };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
