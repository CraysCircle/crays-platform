import "server-only";
import { getCorePgPool } from "@/db/client";

export type ClubsPublicCatalogQuery = {
  destination?: string;
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  minimumPriceMinor?: number;
  maximumPriceMinor?: number;
  limit?: number;
  offset?: number;
};

type ProjectionPayload = {
  propertyId: string;
  slug: string;
  name: string;
  place: string | null;
  countryCode: string | null;
  type: string | null;
  text: string | null;
  rating: number | null;
  map: { latitude: number | null; longitude: number | null };
  amenities: Array<{ key: string; label: string; value: unknown }>;
  units: Array<{
    unitId: string;
    guests: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
  }>;
  media: Array<{
    assetId: string;
    targetType: string;
    purpose: string;
    order: number;
    url: string;
  }>;
  minimumNightlyPrice: { nightlyMinor: number; currency: string } | null;
  sourceVersion: number;
};

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value)) return fallback;
  return Math.max(minimum, Math.min(maximum, value as number));
}

export async function searchClubsPublicCatalog(query: ClubsPublicCatalogQuery) {
  const destination = query.destination?.trim().slice(0, 120) || null;
  const guests = boundedInteger(query.guests, 1, 1, 100);
  const bedrooms = boundedInteger(query.bedrooms, 0, 0, 100);
  const bathrooms = boundedInteger(query.bathrooms, 0, 0, 100);
  const minimumPriceMinor = boundedInteger(query.minimumPriceMinor, 0, 0, 1_000_000_000);
  const maximumPriceMinor = boundedInteger(query.maximumPriceMinor, 0, 0, 1_000_000_000);
  const limit = boundedInteger(query.limit, 24, 1, 48);
  const offset = boundedInteger(query.offset, 0, 0, 10_000);
  const result = await getCorePgPool().query<{
    payload: ProjectionPayload;
    payload_sha256: string;
  }>(
    `select projection.payload,projection.payload_sha256
     from crays_core.clubs_public_projection_snapshots projection
     join crays_core.clubs_properties property
       on property.property_id=projection.property_id
      and property.lifecycle='published'
      and property.version=projection.source_version
     where projection.status='active'
       and (
         $1::text is null
         or projection.payload->>'place' ilike '%' || $1 || '%'
         or projection.payload->>'name' ilike '%' || $1 || '%'
       )
       and coalesce((
         select max((unit->>'guests')::int)
         from jsonb_array_elements(projection.payload->'units') unit
       ),0) >= $2
       and coalesce((
         select max((unit->>'bedrooms')::int)
         from jsonb_array_elements(projection.payload->'units') unit
       ),0) >= $3
       and coalesce((
         select max((unit->>'bathrooms')::numeric)
         from jsonb_array_elements(projection.payload->'units') unit
       ),0) >= $4
       and (
         $5::bigint=0
         or (projection.payload#>>'{minimumNightlyPrice,nightlyMinor}')::bigint >= $5
       )
       and (
         $6::bigint=0
         or (projection.payload#>>'{minimumNightlyPrice,nightlyMinor}')::bigint <= $6
       )
     order by projection.payload->>'name',projection.property_id
     limit $7 offset $8`,
    [destination, guests, bedrooms, bathrooms, minimumPriceMinor, maximumPriceMinor, limit, offset],
  );

  return {
    items: result.rows.map((row) => {
      const payload = row.payload;
      const propertyMedia = payload.media
        .filter((media) => media.targetType === "property")
        .sort((left, right) => left.order - right.order);
      const hero = propertyMedia.find((media) => media.purpose === "hero") ?? propertyMedia[0];
      return {
        propertyId: payload.propertyId,
        slug: payload.slug,
        name: payload.name,
        place: payload.place,
        type: payload.type,
        text: payload.text,
        image: hero?.url ?? null,
        gallery: propertyMedia.filter((media) => media.assetId !== hero?.assetId).map((media) => media.url),
        guests: Math.max(0, ...payload.units.map((unit) => unit.guests ?? 0)),
        bedrooms: Math.max(0, ...payload.units.map((unit) => unit.bedrooms ?? 0)),
        bathrooms: Math.max(0, ...payload.units.map((unit) => unit.bathrooms ?? 0)),
        rating: payload.rating,
        tags: payload.amenities.map((amenity) => amenity.key),
        map: payload.map,
        price:
          payload.minimumNightlyPrice === null
            ? null
            : payload.minimumNightlyPrice.nightlyMinor / 100,
        currency: payload.minimumNightlyPrice?.currency ?? null,
        pricingUnit: payload.minimumNightlyPrice ? "night" : null,
        sourceVersion: payload.sourceVersion,
        projectionSha256: row.payload_sha256,
      };
    }),
    page: { limit, offset },
    authority: "crays_core_public_projection",
    syntheticFallbackUsed: false,
  };
}
