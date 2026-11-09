import "server-only";
import { randomUUID } from "node:crypto";
import { getCorePgPool } from "@/db/client";
import { FOREST_CITY_MEMBER_PROPERTY_STATE_CONTRACT } from "@/lib/clubs/forest-city-member-property-state-contract";

type ClubsMemberCommerceClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
  release(): void;
};

export type ClubsMemberCommercePool = {
  connect(): Promise<ClubsMemberCommerceClient>;
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

type Command =
  | { type: "save_property"; propertyId: string }
  | { type: "remove_saved_property"; propertyId: string }
  | { type: "add_cart"; propertyId: string }
  | { type: "remove_cart"; propertyId: string }
  | {
      type: "request_booking";
      propertyId: string;
      checkIn?: string;
      checkOut?: string;
      guests?: number;
    };

export class ClubsMemberCommandValidationError extends Error {
  constructor() {
    super("Clubs Member command validation failed");
    this.name = "ClubsMemberCommandValidationError";
  }
}

export class ClubsMemberCommandReplayConflictError extends Error {
  constructor() {
    super("Clubs Member command replay conflict");
    this.name = "ClubsMemberCommandReplayConflictError";
  }
}

export class ClubsMemberLegacyBookingClosedError extends Error {
  constructor() {
    super(
      "Legacy Property-only booking intent is closed. Issue a governed Quote, create its Hold and submit the canonical Booking Request.",
    );
    this.name = "ClubsMemberLegacyBookingClosedError";
  }
}

function identifier(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function propertyId(value: string) {
  const result = value.trim();
  if (!/^[A-Za-z0-9:_-]{3,160}$/.test(result)) {
    throw new ClubsMemberCommandValidationError();
  }
  return result;
}

async function transaction<T>(
  pool: ClubsMemberCommercePool,
  run: (client: ClubsMemberCommerceClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

type DiscoveryProperty = {
  property_id: string;
  public_path: string;
  display_name: string;
  access_mode: "public" | "membership_only";
  allowed_stay_units: string[];
  membership_required: boolean;
  rate_authority: string;
  availability_authority: string;
  booking_authority: string;
  identity_authority_receipt_id: string;
  identity_authority_sha256: string;
};

async function resolveDiscoveryProperty(
  client: Pick<ClubsMemberCommerceClient, "query">,
  requestedPropertyId: string,
) {
  const result = await client.query<DiscoveryProperty>(
    `select property_id,public_path,display_name,access_mode,allowed_stay_units,
       membership_required,rate_authority,availability_authority,booking_authority,
       identity_authority_receipt_id,identity_authority_sha256
     from crays_core.clubs_public_property_identities
     where property_id=$1 and lifecycle_state='active'
     limit 1`,
    [propertyId(requestedPropertyId)],
  );
  return result.rows[0] ?? null;
}

function discoveryAuthoritySnapshot(discovery: DiscoveryProperty) {
  return {
    schema: FOREST_CITY_MEMBER_PROPERTY_STATE_CONTRACT.schema,
    propertyId: discovery.property_id,
    publicPath: discovery.public_path,
    displayName: discovery.display_name,
    accessMode: discovery.access_mode,
    allowedStayUnits: discovery.allowed_stay_units,
    membershipRequired: discovery.membership_required,
    rateAuthority: discovery.rate_authority,
    availabilityAuthority: discovery.availability_authority,
    bookingAuthority: discovery.booking_authority,
    identityAuthorityReceiptId: discovery.identity_authority_receipt_id,
    identityAuthoritySha256: discovery.identity_authority_sha256,
    persistedAt: new Date().toISOString(),
  };
}

async function resolvePropertySeller(
  client: ClubsMemberCommerceClient,
  requestedPropertyId: string,
) {
  const result = await client.query<{
    property_id: string;
    assignment_id: string;
    assignment_version: number;
    partner_tenant_id: string;
    operator_legal_entity_id: string;
    vendure_seller_id: string | null;
    vendure_channel_id: string | null;
    stripe_connected_account_id: string | null;
    qlo_shop_id: string | null;
    qlo_hotel_id: string | null;
  }>(
    `select p.property_id, assignment.assignment_id, assignment.version assignment_version,
       assignment.partner_tenant_id, assignment.operator_legal_entity_id,
       binding.vendure_seller_id, binding.vendure_channel_id,
       binding.stripe_connected_account_id, binding.qlo_shop_id, binding.qlo_hotel_id
     from crays_core.clubs_properties p
     join crays_core.store_operator_assignments assignment
       on assignment.store_id=p.store_id
      and assignment.vertical_root='clubs'
      and assignment.status='active'
      and assignment.valid_from<=now()
      and (assignment.valid_until is null or assignment.valid_until>now())
     join lateral (
       select b.*
       from crays_core.provider_scope_bindings b
       where b.assignment_id=assignment.assignment_id
         and b.assignment_version=assignment.version
         and b.status='active'
       order by b.binding_version desc
       limit 1
     ) binding on true
     where p.property_id=$1 and p.lifecycle='published'
     limit 1
     for share of p, assignment`,
    [propertyId(requestedPropertyId)],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    sellerSnapshot: {
      verticalRoot: "clubs",
      propertyId: row.property_id,
      assignmentId: row.assignment_id,
      assignmentVersion: row.assignment_version,
      partnerTenantId: row.partner_tenant_id,
      operatorLegalEntityId: row.operator_legal_entity_id,
      vendureSellerId: row.vendure_seller_id,
      vendureChannelId: row.vendure_channel_id,
      stripeConnectedAccountId: row.stripe_connected_account_id,
      qloShopId: row.qlo_shop_id,
      qloHotelId: row.qlo_hotel_id,
      frozenAt: new Date().toISOString(),
    },
  };
}

export async function readClubsMemberStateWithPool(
  pool: ClubsMemberCommercePool,
  accountId: string,
) {
  const [saved, cart, bookings] = await Promise.all([
    pool.query<{ property_id: string }>(
      `select distinct on (property_id) property_id
       from (
         select property_id,created_at activity_at
         from crays_core.clubs_member_saved_properties
         where account_id=$1
         union all
         select property_id,updated_at activity_at
         from crays_core.clubs_member_discovery_list_items
         where account_id=$1 and list_kind='saved' and status='active'
       ) saved
       order by property_id,activity_at desc`,
      [accountId],
    ),
    pool.query<{
      cart_item_id: string;
      property_id: string;
      version: number;
      cart_state: "commercially_bound" | "planning";
      commercial_binding: boolean;
      booking_authority: boolean;
    }>(
      `select distinct on (property_id)
         cart_item_id,property_id,version,cart_state,commercial_binding,booking_authority
       from (
         select cart_item_id,property_id,version,'commercially_bound'::text cart_state,
           true commercial_binding,false booking_authority,created_at
         from crays_core.clubs_member_cart_items
         where account_id=$1 and status='active'
         union all
         select list_item_id cart_item_id,property_id,version,'planning'::text cart_state,
           false commercial_binding,false booking_authority,created_at
         from crays_core.clubs_member_discovery_list_items
         where account_id=$1 and list_kind='planning_cart' and status='active'
       ) cart
       order by property_id,commercial_binding desc,created_at desc`,
      [accountId],
    ),
    pool.query<{
      booking_intent_id: string;
      property_id: string;
      requested_check_in: string | null;
      requested_check_out: string | null;
      requested_guests: number;
      status: string;
      created_at: Date;
    }>(
      `select booking_intent_id,property_id,requested_check_in::text,requested_check_out::text,
         requested_guests,status,created_at
       from crays_core.clubs_member_booking_intents
       where account_id=$1 order by created_at desc limit 50`,
      [accountId],
    ),
  ]);
  return {
    savedPropertyIds: saved.rows.map((row) => row.property_id),
    cartItems: cart.rows.map((row) => ({
      cartItemId: row.cart_item_id,
      propertyId: row.property_id,
      version: row.version,
      cartState: row.cart_state,
      commercialBinding: row.commercial_binding,
      bookingAuthority: row.booking_authority,
    })),
    bookingIntents: bookings.rows.map((row) => ({
      bookingIntentId: row.booking_intent_id,
      propertyId: row.property_id,
      checkIn: row.requested_check_in,
      checkOut: row.requested_check_out,
      guests: row.requested_guests,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    })),
  };
}

export async function readClubsMemberState(accountId: string) {
  return readClubsMemberStateWithPool(getCorePgPool(), accountId);
}

export async function executeClubsMemberCommandWithPool(
  pool: ClubsMemberCommercePool,
  accountId: string,
  idempotencyKey: string,
  command: Command,
) {
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(idempotencyKey)) {
    throw new ClubsMemberCommandValidationError();
  }
  if (command.type === "request_booking") {
    throw new ClubsMemberLegacyBookingClosedError();
  }
  return transaction(pool, async (client) => {
    const replay = await client.query<{
      command_type: string;
      response_payload: { propertyId?: unknown };
    }>(
      `select command_type,response_payload from crays_core.clubs_member_command_receipts
       where account_id=$1 and idempotency_key=$2`,
      [accountId, idempotencyKey],
    );
    if (replay.rows[0]) {
      const receipt = replay.rows[0];
      if (
        receipt.command_type !== command.type ||
        receipt.response_payload?.propertyId !== command.propertyId.trim()
      ) {
        throw new ClubsMemberCommandReplayConflictError();
      }
      return receipt.response_payload;
    }

    const normalizedPropertyId = propertyId(command.propertyId);
    let aggregateType = "saved-property";
    let aggregateId = normalizedPropertyId;
    let result: Record<string, unknown> | null = null;

    if (command.type === "save_property") {
      const discovery = await resolveDiscoveryProperty(
        client,
        normalizedPropertyId,
      );
      if (discovery) {
        aggregateId = identifier("clubs_saved");
        const persisted = await client.query<{
          list_item_id: string;
          version: number;
        }>(
          `insert into crays_core.clubs_member_discovery_list_items
            (list_item_id,account_id,property_id,list_kind,status,authority_snapshot)
           values ($1,$2,$3,'saved','active',$4::jsonb)
           on conflict (account_id,property_id,list_kind) do update
             set status='active',version=crays_core.clubs_member_discovery_list_items.version+1,
               authority_snapshot=excluded.authority_snapshot,updated_at=now()
           returning list_item_id,version`,
          [
            aggregateId,
            accountId,
            discovery.property_id,
            JSON.stringify(discoveryAuthoritySnapshot(discovery)),
          ],
        );
        aggregateId = persisted.rows[0]?.list_item_id ?? aggregateId;
      } else {
        const resolved = await resolvePropertySeller(
          client,
          normalizedPropertyId,
        );
        if (!resolved) throw new ClubsMemberCommandValidationError();
        await client.query(
          `insert into crays_core.clubs_member_saved_properties(account_id,property_id)
           values ($1,$2) on conflict do nothing`,
          [accountId, resolved.property_id],
        );
        aggregateId = resolved.property_id;
      }
      result = {
        status: "persisted",
        saved: true,
        propertyId: normalizedPropertyId,
        bookingAuthority: false,
      };
    } else if (command.type === "remove_saved_property") {
      const discoveryRemoved = await client.query<{ list_item_id: string }>(
        `update crays_core.clubs_member_discovery_list_items
         set status='removed',version=version+1,updated_at=now()
         where account_id=$1 and property_id=$2 and list_kind='saved' and status='active'
         returning list_item_id`,
        [accountId, normalizedPropertyId],
      );
      const legacyRemoved = await client.query<{ property_id: string }>(
        `delete from crays_core.clubs_member_saved_properties where account_id=$1 and property_id=$2`,
        [accountId, normalizedPropertyId],
      );
      result = {
        status: "persisted",
        saved: false,
        removed: Boolean(discoveryRemoved.rows[0] || legacyRemoved.rows[0]),
        propertyId: normalizedPropertyId,
        bookingAuthority: false,
      };
    } else if (command.type === "add_cart") {
      aggregateType = "cart-item";
      const resolved = await resolvePropertySeller(
        client,
        normalizedPropertyId,
      );
      if (resolved) {
        const existing = await client.query<{ cart_item_id: string }>(
          `select cart_item_id from crays_core.clubs_member_cart_items
           where account_id=$1 and property_id=$2 and status='active'`,
          [accountId, resolved.property_id],
        );
        aggregateId =
          existing.rows[0]?.cart_item_id ?? identifier("clubs_cart");
        if (!existing.rows[0]) {
          await client.query(
            `insert into crays_core.clubs_member_cart_items
              (cart_item_id,account_id,property_id,assignment_id,assignment_version,
               partner_tenant_id,operator_legal_entity_id,seller_snapshot)
             values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
            [
              aggregateId,
              accountId,
              resolved.property_id,
              resolved.assignment_id,
              resolved.assignment_version,
              resolved.partner_tenant_id,
              resolved.operator_legal_entity_id,
              JSON.stringify(resolved.sellerSnapshot),
            ],
          );
        }
        result = {
          status: "persisted",
          cartItemId: aggregateId,
          propertyId: resolved.property_id,
          cartState: "commercially_bound",
          commercialBinding: true,
          bookingAuthority: false,
        };
      } else {
        const discovery = await resolveDiscoveryProperty(
          client,
          normalizedPropertyId,
        );
        if (!discovery) throw new ClubsMemberCommandValidationError();
        aggregateId = identifier("clubs_planning_cart");
        const persisted = await client.query<{ list_item_id: string }>(
          `insert into crays_core.clubs_member_discovery_list_items
            (list_item_id,account_id,property_id,list_kind,status,authority_snapshot)
           values ($1,$2,$3,'planning_cart','active',$4::jsonb)
           on conflict (account_id,property_id,list_kind) do update
             set status='active',version=crays_core.clubs_member_discovery_list_items.version+1,
               authority_snapshot=excluded.authority_snapshot,updated_at=now()
           returning list_item_id`,
          [
            aggregateId,
            accountId,
            discovery.property_id,
            JSON.stringify(discoveryAuthoritySnapshot(discovery)),
          ],
        );
        aggregateId = persisted.rows[0]?.list_item_id ?? aggregateId;
        result = {
          status: "persisted",
          cartItemId: aggregateId,
          propertyId: discovery.property_id,
          cartState: "planning",
          commercialBinding: false,
          bookingAuthority: false,
          authorityStatus: "commercial_binding_not_ready",
        };
      }
    } else if (command.type === "remove_cart") {
      aggregateType = "cart-item";
      const commercialRemoved = await client.query<{ cart_item_id: string }>(
        `update crays_core.clubs_member_cart_items
         set status='removed',version=version+1,updated_at=now()
         where account_id=$1 and property_id=$2 and status='active'
         returning cart_item_id`,
        [accountId, normalizedPropertyId],
      );
      const planningRemoved = await client.query<{ list_item_id: string }>(
        `update crays_core.clubs_member_discovery_list_items
         set status='removed',version=version+1,updated_at=now()
         where account_id=$1 and property_id=$2 and list_kind='planning_cart' and status='active'
         returning list_item_id`,
        [accountId, normalizedPropertyId],
      );
      aggregateId =
        commercialRemoved.rows[0]?.cart_item_id ??
        planningRemoved.rows[0]?.list_item_id ??
        normalizedPropertyId;
      result = {
        status: "persisted",
        removed: Boolean(commercialRemoved.rows[0] || planningRemoved.rows[0]),
        propertyId: normalizedPropertyId,
        bookingAuthority: false,
      };
    }

    if (!result) throw new ClubsMemberCommandValidationError();
    const receiptId = identifier("clubs_member_receipt");
    const response = { ...result, receiptId };
    await client.query(
      `insert into crays_core.clubs_member_command_receipts
        (receipt_id,account_id,idempotency_key,command_type,aggregate_type,aggregate_id,result,response_payload)
       values ($1,$2,$3,$4,$5,$6,'persisted',$7::jsonb)`,
      [
        receiptId,
        accountId,
        idempotencyKey,
        command.type,
        aggregateType,
        aggregateId,
        JSON.stringify(response),
      ],
    );
    return response;
  });
}

export async function executeClubsMemberCommand(
  accountId: string,
  idempotencyKey: string,
  command: Command,
) {
  return executeClubsMemberCommandWithPool(
    getCorePgPool(),
    accountId,
    idempotencyKey,
    command,
  );
}
