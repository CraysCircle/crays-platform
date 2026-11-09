import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { resolveClubsPropertyAdmission } from "@/db/clubs-property-admission-repository";
import { getCorePgPool } from "@/db/client";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const strongKey = /^[A-Za-z0-9:_.-]{16,200}$/;
const commandIdempotencyNamespace = "cclub063.forest-city-booking.command-idempotency.v1";

function commandIdempotencyHash(idempotencyKey: string) {
  return createHash("sha256")
    .update(commandIdempotencyNamespace + "\n" + idempotencyKey, "utf8")
    .digest("hex");
}

export type ForestCityBookingInput = {
  accountId: string | null;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  idempotencyKey: string;
};

function nightsBetween(checkIn: string, checkOut: string) {
  if (!isoDate.test(checkIn) || !isoDate.test(checkOut)) throw new Error("invalid_dates");
  const start = Date.parse(checkIn + "T00:00:00Z");
  const end = Date.parse(checkOut + "T00:00:00Z");
  const nights = Math.round((end - start) / 86400000);
  if (!Number.isInteger(nights) || nights < 1 || nights > 30) throw new Error("invalid_dates");
  return nights;
}

function requestHash(input: ForestCityBookingInput) {
  return createHash("sha256").update(JSON.stringify({
    accountId: input.accountId,
    roomTypeId: input.roomTypeId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    rooms: input.rooms,
    adults: input.adults,
    children: input.children,
    guestName: input.guestName.trim(),
    guestEmail: input.guestEmail.trim().toLowerCase(),
    guestPhone: input.guestPhone?.trim() || null,
  })).digest("hex");
}

export class ForestCityPropertyAdmissionDeniedError extends Error {
  readonly code = "FOREST_CITY_PROPERTY_ADMISSION_REQUIRED" as const;

  constructor() {
    super("forest_city_property_admission_denied");
    this.name = "ForestCityPropertyAdmissionDeniedError";
  }
}
type AdmissionReceiptRow = {
  tenant_id:string; operator_legal_entity_id:string;
  assignment_id:string; assignment_version:number|string;
  access_mode:"open"|"property_admission_required"; admitted:boolean;
  account_id:string|null; grant_id:string|null; grant_version:number|string|null;
  policy_version:string; authority_at:string; decision_key_sha256:string|null;
  command_idempotency_sha256:string|null; decision_receipt_id:string; decision_sha256:string;
};
async function transaction<T>(idempotencyKey: string, run: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  let sessionLockAcquired = false;
  let transactionOpen = false;
  let result: T | undefined;
  let operationError: unknown;
  try {
    await client.query("select pg_advisory_lock(hashtextextended($1,0))",[idempotencyKey]);
    sessionLockAcquired = true;
    await client.query("begin isolation level serializable");
    transactionOpen = true;
    try {
      result = await run(client);
      await client.query("commit");
      transactionOpen = false;
    } catch (error) {
      if (error instanceof ForestCityPropertyAdmissionDeniedError) {
        await client.query("commit");
      } else {
        await client.query("rollback").catch(() => undefined);
      }
      transactionOpen = false;
      operationError = error;
    }
  } catch (error) {
    operationError = error;
    if (transactionOpen) {
      await client.query("rollback").catch(() => undefined);
      transactionOpen = false;
    }
  }
  let unlockError: unknown;
  if (sessionLockAcquired) {
    try {
      const unlocked = await client.query<{unlocked:boolean}>(
        "select pg_advisory_unlock(hashtextextended($1,0)) unlocked",[idempotencyKey],
      );
      if (unlocked.rows.length !== 1 || unlocked.rows[0]?.unlocked !== true) {
        throw new Error("forest_city_booking_idempotency_unlock_failed");
      }
    } catch (error) {
      unlockError = error;
    }
  }
  client.release();
  if (unlockError !== undefined) throw unlockError;
  if (operationError !== undefined) throw operationError;
  return result as T;
}

export async function readForestCityCatalog(input: {
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
}) {
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const result = await getCorePgPool().query<{
    property_id: string; property_name: string; location_name: string; address_text: string;
    access_mode: "open" | "property_admission_required";
    property_description: string; check_in_time: string; check_out_time: string;
    physical_room_count: number | null; physical_room_count_status: string; launch_status: string;
    official_source_url: string; room_type_id: string; room_code: string; room_name: string;
    room_description: string; bedding: string; max_adults: number; max_children: number;
    size_sqm: number | null; hero_image_path: string; image_source_url: string;
    currency: string; nightly_amount_minor: number; available_rooms: number;
  }>(
    `select hp.property_id,hp.display_name property_name,hp.location_name,hp.address_text,
       property.access_mode::text access_mode,
       hp.description property_description,hp.check_in_time::text,hp.check_out_time::text,
       hp.physical_room_count,hp.physical_room_count_status,hp.launch_status,hp.official_source_url,
       rt.room_type_id,rt.room_code,rt.display_name room_name,rt.description room_description,
       rt.bedding,rt.max_adults,rt.max_children,rt.size_sqm,rt.hero_image_path,rt.image_source_url,
       rate.currency,rate.nightly_amount_minor,
       min(inv.allotment_quantity-inv.booked_quantity-inv.held_quantity)::int available_rooms
     from crays_core.clubs_hotel_profiles hp
     join crays_core.clubs_properties property on property.property_id=hp.property_id and property.lifecycle='published'
     join crays_core.clubs_hotel_room_types rt on rt.property_id=hp.property_id and rt.status='active'
     join lateral (
       select r.currency,r.nightly_amount_minor
       from crays_core.clubs_hotel_room_rates r
       where r.room_type_id=rt.room_type_id
         and r.status in ('test','contracted','active')
         and r.valid_from<=$1::date and r.valid_until>=$2::date-1
       order by case r.status when 'active' then 1 when 'contracted' then 2 else 3 end,r.version desc
       limit 1
     ) rate on true
     join crays_core.clubs_hotel_inventory_days inv on inv.room_type_id=rt.room_type_id
       and inv.stay_date>=$1::date and inv.stay_date<$2::date
     where hp.property_id in('property-clubs-forest-city-golf','property-clubs-forest-city-marina')
       and hp.launch_status in('prelaunch-test','contracted','live')
       and rt.max_adults*$3 >= $4 and rt.max_children*$3 >= $5
     group by hp.property_id,hp.display_name,hp.location_name,hp.address_text,property.access_mode,hp.description,
       hp.check_in_time,hp.check_out_time,hp.physical_room_count,hp.physical_room_count_status,
       hp.launch_status,hp.official_source_url,rt.room_type_id,rt.room_code,rt.display_name,
       rt.description,rt.bedding,rt.max_adults,rt.max_children,rt.size_sqm,rt.hero_image_path,
       rt.image_source_url,rate.currency,rate.nightly_amount_minor
     having count(*)=$6 and min(inv.allotment_quantity-inv.booked_quantity-inv.held_quantity)>=$3
     order by hp.display_name,rate.nightly_amount_minor,rt.display_name`,
    [input.checkIn,input.checkOut,input.rooms,input.adults,input.children,nights],
  );
  return {
    status: result.rowCount ? "ready" : "no_availability",
    authority: { price: "crays-allotment-contract", availability: "crays-allotment-contract" },
    dates: { checkIn: input.checkIn, checkOut: input.checkOut, nights },
    rooms: result.rows.map((row) => ({
      propertyId: row.property_id, propertyName: row.property_name, location: row.location_name,
      address: row.address_text, accessMode: row.access_mode,
      propertyDescription: row.property_description,
      checkInTime: row.check_in_time, checkOutTime: row.check_out_time,
      physicalRoomCount: row.physical_room_count, roomCountStatus: row.physical_room_count_status,
      launchStatus: row.launch_status, officialSourceUrl: row.official_source_url,
      roomTypeId: row.room_type_id, roomCode: row.room_code, roomName: row.room_name,
      roomDescription: row.room_description, bedding: row.bedding,
      maxAdults: row.max_adults, maxChildren: row.max_children, sizeSqm: row.size_sqm,
      imagePath: row.hero_image_path, imageSourceUrl: row.image_source_url,
      currency: row.currency, nightlyAmountMinor: row.nightly_amount_minor,
      totalAmountMinor: row.nightly_amount_minor * nights * input.rooms,
      availableRooms: row.available_rooms,
    })),
  };
}

type ExistingBooking = {
  booking_id: string; booking_reference: string; request_sha256: string;
  booking_status: string; payment_status: string; pms_delivery_status: string;
  currency: string; total_amount_minor: number;
};

function bookingResponse(row: ExistingBooking, replayed: boolean) {
  return {
    outcome: "applied" as const,
    replayed,
    bookingId: row.booking_id,
    bookingReference: row.booking_reference,
    bookingStatus: row.booking_status,
    paymentStatus: row.payment_status,
    pmsDeliveryStatus: row.pms_delivery_status,
    currency: row.currency,
    totalAmountMinor: row.total_amount_minor,
  };
}

type PreparedForestCityBooking = {
  nights: number;
  requestSha256: string;
  normalizedIdempotencyKey: string;
  commandIdempotencySha256: string;
};

export type ForestCityBookingTransactionClient = Pick<PoolClient,"query">;

function prepareForestCityBooking(input: ForestCityBookingInput): PreparedForestCityBooking {
  const nights = nightsBetween(input.checkIn,input.checkOut);
  if (!strongKey.test(input.idempotencyKey)) throw new Error("invalid_idempotency_key");
  if (!Number.isInteger(input.rooms) || input.rooms<1 || input.rooms>10) throw new Error("invalid_rooms");
  const normalizedIdempotencyKey = input.idempotencyKey.trim();
  return {nights,requestSha256:requestHash(input),normalizedIdempotencyKey,
    commandIdempotencySha256:commandIdempotencyHash(normalizedIdempotencyKey)};
}

export async function createForestCityBookingInTransaction(
  client: ForestCityBookingTransactionClient,
  input: ForestCityBookingInput,
  prepared: PreparedForestCityBooking = prepareForestCityBooking(input),
) {
  const {nights,requestSha256:hash,normalizedIdempotencyKey,commandIdempotencySha256}=prepared;
    const existing = await client.query<ExistingBooking>(
      `select booking_id,booking_reference,request_sha256,booking_status,payment_status,
         pms_delivery_status,currency,total_amount_minor
       from crays_core.clubs_hotel_bookings where idempotency_key=$1`,
      [normalizedIdempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].request_sha256 !== hash) throw new Error("idempotency_conflict");
      return bookingResponse(existing.rows[0],true);
    }

    const offer = await client.query<{
      property_id:string; room_type_id:string; store_id:string; assignment_id:string;
      assignment_version:number; partner_tenant_id:string; operator_legal_entity_id:string;
      max_adults:number; max_children:number;
      currency:string; nightly_amount_minor:number; provider_binding_id:string|null;
      connector_binding_id:string|null;
      connector_provider_kind:"qlo"|"channel-manager"|"pms"|null;
    }>(
      `select hp.property_id,rt.room_type_id,p.store_id,a.assignment_id,a.version assignment_version,
         a.partner_tenant_id,a.operator_legal_entity_id,
         rt.max_adults,rt.max_children,rate.currency,rate.nightly_amount_minor,
         binding.binding_id provider_binding_id,
         connector.connector_binding_id,connector.provider_kind connector_provider_kind
       from crays_core.clubs_hotel_room_types rt
       join crays_core.clubs_hotel_profiles hp on hp.property_id=rt.property_id
       join crays_core.clubs_properties p on p.property_id=hp.property_id and p.lifecycle='published'
       join crays_core.store_operator_assignments a on a.store_id=p.store_id and a.status='active'
         and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())
       join lateral (
         select r.currency,r.nightly_amount_minor from crays_core.clubs_hotel_room_rates r
         where r.room_type_id=rt.room_type_id and r.status in('test','contracted','active')
           and r.valid_from<=$2::date and r.valid_until>=$3::date-1
         order by case r.status when 'active' then 1 when 'contracted' then 2 else 3 end,r.version desc limit 1
       ) rate on true
       left join lateral (
         select b.binding_id,b.qlo_shop_id,b.qlo_hotel_id from crays_core.provider_scope_bindings b
         where b.assignment_id=a.assignment_id and b.assignment_version=a.version and b.status='active'
         order by b.binding_version desc limit 1
       ) binding on true
       left join lateral (
         select c.connector_binding_id,c.provider_kind
         from crays_core.clubs_pms_connector_bindings c
         join crays_core.clubs_pms_room_mappings mapping
           on mapping.connector_binding_id=c.connector_binding_id
          and mapping.room_type_id=rt.room_type_id and mapping.status='active'
         where c.assignment_id=a.assignment_id and c.assignment_version=a.version
           and c.property_id=hp.property_id and c.environment='sandbox' and c.status='active'
         order by c.binding_version desc limit 1
       ) connector on true
       where rt.room_type_id=$1 and rt.status='active'
         and hp.property_id in('property-clubs-forest-city-golf','property-clubs-forest-city-marina')
         and hp.launch_status in('prelaunch-test','contracted','live')`,
      [input.roomTypeId,input.checkIn,input.checkOut],
    );
    const selected = offer.rows[0];
    if (!selected) throw new Error("offer_unavailable");
    if (selected.max_adults*input.rooms<input.adults || selected.max_children*input.rooms<input.children) {
      throw new Error("occupancy_exceeded");
    }

    await client.query("select set_config('crays.app_role','core_service',true)");
    await client.query("select set_config('crays.tenant_id',$1,true)",[selected.partner_tenant_id]);
    const admission=await resolveClubsPropertyAdmission(client,{
      propertyId:selected.property_id,accountId:input.accountId,decisionKeySha256:hash,
      commandIdempotencySha256,
    });
    const admissionRows=await client.query<AdmissionReceiptRow>(
      `select tenant_id,operator_legal_entity_id,assignment_id,assignment_version,
       access_mode::text access_mode,admitted,account_id,grant_id,grant_version,policy_version,
       authority_at::text,decision_key_sha256,command_idempotency_sha256,
       decision_receipt_id,decision_sha256
       from crays_core.clubs_property_admission_decision_receipts
       where decision_receipt_id=$1 and decision_sha256=$2 and property_id=$3 and store_id=$4 limit 2`,
      [admission.decisionReceiptId,admission.decisionSha256,selected.property_id,selected.store_id],
    );
    const admissionReceipt=admissionRows.rows[0];
    if(admissionRows.rows.length!==1||!admissionReceipt||
      admissionReceipt.tenant_id!==selected.partner_tenant_id||
      admissionReceipt.operator_legal_entity_id!==selected.operator_legal_entity_id||
      admission.assignmentId!==selected.assignment_id||
      admission.assignmentVersion!==Number(selected.assignment_version)||
      admissionReceipt.assignment_id!==admission.assignmentId||
      Number(admissionReceipt.assignment_version)!==admission.assignmentVersion||
      admissionReceipt.access_mode!==admission.accessMode||
      admissionReceipt.admitted!==admission.admitted||
      admissionReceipt.account_id!==admission.accountId||
      admissionReceipt.grant_id!==admission.grantId||
      (admissionReceipt.grant_version===null?null:Number(admissionReceipt.grant_version))!==admission.grantVersion||
      admissionReceipt.policy_version!==admission.policyVersion||
      new Date(admissionReceipt.authority_at).toISOString()!==admission.authorityAt||
      admissionReceipt.decision_key_sha256!==hash||admission.decisionKeySha256!==hash||
      admissionReceipt.command_idempotency_sha256!==commandIdempotencySha256||
      admission.commandIdempotencySha256!==commandIdempotencySha256||
      admissionReceipt.decision_receipt_id!==admission.decisionReceiptId||
      admissionReceipt.decision_sha256!==admission.decisionSha256)
      throw new Error("forest_city_property_admission_authority_mismatch");
    if(!admission.admitted)throw new ForestCityPropertyAdmissionDeniedError();

    const locked = await client.query<{stay_date:string; available:number}>(
      `select stay_date::text,(allotment_quantity-booked_quantity-held_quantity)::int available
       from crays_core.clubs_hotel_inventory_days
       where room_type_id=$1 and stay_date>=$2::date and stay_date<$3::date
       order by stay_date for update`,
      [input.roomTypeId,input.checkIn,input.checkOut],
    );
    if (locked.rowCount!==nights || locked.rows.some((row)=>row.available<input.rooms)) {
      throw new Error("inventory_conflict");
    }

    const bookingId = "clubs-booking-" + randomUUID();
    const bookingReference = "FC-" + randomUUID().replaceAll("-","").slice(0,10).toUpperCase();
    const totalAmountMinor = selected.nightly_amount_minor*nights*input.rooms;
    const pmsState = selected.connector_binding_id ? "pending" : "awaiting-configuration";
    await client.query(
      `insert into crays_core.clubs_hotel_bookings(
        booking_id,booking_reference,idempotency_key,request_sha256,property_id,room_type_id,
        store_id,assignment_id,assignment_version,check_in_date,check_out_date,rooms,adults,children,
        guest_name,guest_email,guest_phone,currency,nightly_amount_minor,total_amount_minor,
        booking_status,payment_status,pms_delivery_status,admission_account_id,admission_access_mode,
        admission_admitted,admission_grant_id,admission_grant_version,admission_policy_version,
        admission_authority_at,admission_assignment_id,admission_assignment_version,
        admission_tenant_id,admission_operator_legal_entity_id,admission_decision_receipt_id,
        admission_decision_sha256
       ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        'internally-confirmed','not-required-test',$21,$22,
        $23::crays_core.clubs_property_access_mode,$24,$25,$26,$27,$28::timestamptz,
        $29,$30,$31,$32,$33,$34)`,
      [bookingId,bookingReference,normalizedIdempotencyKey,hash,selected.property_id,selected.room_type_id,
       selected.store_id,admission.assignmentId,admission.assignmentVersion,input.checkIn,input.checkOut,
       input.rooms,input.adults,input.children,input.guestName.trim(),input.guestEmail.trim().toLowerCase(),
       input.guestPhone?.trim()||null,selected.currency,selected.nightly_amount_minor,totalAmountMinor,pmsState,
       admission.accountId,admission.accessMode,admission.admitted,admission.grantId,
       admission.grantVersion,admission.policyVersion,admission.authorityAt,
       admission.assignmentId,admission.assignmentVersion,admissionReceipt.tenant_id,
       admissionReceipt.operator_legal_entity_id,admission.decisionReceiptId,admission.decisionSha256],
    );
    await client.query(
      `insert into crays_core.clubs_hotel_booking_nights(booking_id,room_type_id,stay_date,rooms,nightly_amount_minor)
       select $1,$2,day::date,$3,$4 from generate_series($5::date,$6::date-1,interval '1 day') day`,
      [bookingId,input.roomTypeId,input.rooms,selected.nightly_amount_minor,input.checkIn,input.checkOut],
    );
    await client.query(
      `update crays_core.clubs_hotel_inventory_days set booked_quantity=booked_quantity+$1,
         version=version+1,updated_at=now()
       where room_type_id=$2 and stay_date>=$3::date and stay_date<$4::date`,
      [input.rooms,input.roomTypeId,input.checkIn,input.checkOut],
    );
    const payload = {
      bookingId,bookingReference,propertyId:selected.property_id,roomTypeId:selected.room_type_id,
      checkIn:input.checkIn,checkOut:input.checkOut,rooms:input.rooms,adults:input.adults,
      children:input.children,guest:{name:input.guestName.trim(),email:input.guestEmail.trim().toLowerCase(),
      phone:input.guestPhone?.trim()||null},currency:selected.currency,totalAmountMinor,
    };
    const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    await client.query(
      `insert into crays_core.clubs_pms_delivery_outbox(
        outbox_id,booking_id,assignment_id,provider_binding_id,connector_binding_id,provider_kind,delivery_state,
        idempotency_key,request_payload,request_sha256,next_attempt_at
       ) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`,
      ["clubs-pms-outbox-"+randomUUID(),bookingId,admission.assignmentId,selected.provider_binding_id,
       selected.connector_binding_id,selected.connector_provider_kind||"unconfigured",pmsState,
       "pms:"+bookingId,JSON.stringify(payload),payloadHash,selected.connector_binding_id?new Date():null],
    );
    const outcomePayload = {bookingReference,bookingStatus:"internally-confirmed",pmsDeliveryStatus:pmsState};
    await client.query(
      `insert into crays_core.clubs_hotel_command_receipts(
        receipt_id,booking_id,idempotency_key,request_sha256,outcome,outcome_payload
       ) values($1,$2,$3,$4,'applied',$5::jsonb)`,
      ["clubs-booking-receipt-"+randomUUID(),bookingId,normalizedIdempotencyKey,hash,JSON.stringify(outcomePayload)],
    );
    await client.query(
      `insert into crays_core.clubs_hotel_booking_events(event_id,booking_id,event_type,event_payload)
       values($1,$2,'booking-internally-confirmed',$3::jsonb)`,
      ["clubs-booking-event-"+randomUUID(),bookingId,JSON.stringify(outcomePayload)],
    );
    return bookingResponse({
      booking_id:bookingId,booking_reference:bookingReference,request_sha256:hash,
      booking_status:"internally-confirmed",payment_status:"not-required-test",
      pms_delivery_status:pmsState,currency:selected.currency,total_amount_minor:totalAmountMinor,
    },false);
}

export async function createForestCityBooking(input: ForestCityBookingInput) {
  const prepared=prepareForestCityBooking(input);
  return transaction(prepared.normalizedIdempotencyKey,(client)=>
    createForestCityBookingInTransaction(client,input,prepared));
}
export async function readForestCityBookingStatus(bookingId: string) {
  const result = await getCorePgPool().query<{
    booking_id:string; booking_reference:string; booking_status:string;
    payment_status:string; pms_delivery_status:string; currency:string;
    total_amount_minor:number; created_at:Date;
  }>(
    `select booking_id,booking_reference,booking_status,payment_status,
       pms_delivery_status,currency,total_amount_minor,created_at
     from crays_core.clubs_hotel_bookings
     where booking_id=$1 and property_id in(
       'property-clubs-forest-city-golf','property-clubs-forest-city-marina'
     )`,
    [bookingId],
  );
  const row = result.rows[0];
  return row ? {
    bookingId:row.booking_id,
    bookingReference:row.booking_reference,
    bookingStatus:row.booking_status,
    paymentStatus:row.payment_status,
    pmsDeliveryStatus:row.pms_delivery_status,
    currency:row.currency,
    totalAmountMinor:row.total_amount_minor,
    createdAt:row.created_at.toISOString(),
  } : null;
}
