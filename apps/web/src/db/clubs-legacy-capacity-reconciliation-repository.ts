import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";

const algorithmRevision = "clubs_capacity_legacy_component_v1";
const sourceEligibilityRevision = "ledgerless_confirm_receipt_precedes_admission_v1";

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}
function overlaps(a: LegacyBookingRow, start: string, end: string) {
  return a.arrival_date < end && a.departure_date > start;
}
function occupiedDates(arrival: string, departure: string) {
  const dates: string[] = [];
  for (let value = new Date(`${arrival}T00:00:00.000Z`), end = new Date(`${departure}T00:00:00.000Z`);
    value < end; value = new Date(value.getTime() + 86_400_000)) {
    dates.push(value.toISOString().slice(0, 10));
  }
  return dates;
}

type LegacyBookingRow = {
  booking_id: string; booking_version: number; booking_status: string;
  reservation_id: string; reservation_version: number; reservation_status: string;
  booking_request_id: string; request_version: number; request_status: string;
  quote_snapshot_id: string; reservation_hold_id: string; hold_version: number;
  hold_status: string; stay_id: string; stay_version: number; stay_status: string;
  property_id: string; unit_id: string; inventory_calendar_id: string;
  arrival_date: string; departure_date: string; reserved_capacity: number;
  seller_snapshot: unknown; pricing_snapshot_sha256: string;
};
type SourceConfirmation = {
  booking_id: string; source_request_id: string; source_receipt_id: string;
  correlation_id: string; occurred_at: string;
};
type AdmissionReceipt = {
  receiptId: string; requestId: string;
  correlationId: string;
  outcome: "applied" | "recovery_required" | "conflict" | "denied" | "noop";
  reason: string | null; recoveryCaseId: string | null;
  admittedBookingCount: number; admittedDayCount: number; admittedMovementCount: number;
  replayed: boolean;
};

async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
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

async function appendReceipt(client: PoolClient, input: {
  requestId: string; correlationId:string; outcome: AdmissionReceipt["outcome"]; reason: string | null;
  componentKey?: string | null; evidenceSha256?: string | null; recoveryCaseId?: string | null;
  bookingCount?: number; dayCount?: number; movementCount?: number;
  preSha?: string | null; postSha?: string | null;
}) {
  const receiptId = id("clubs_capacity_legacy_admission_receipt");
  await client.query(
    `insert into crays_core.clubs_capacity_legacy_admission_receipts(
       legacy_admission_receipt_id,legacy_admission_request_id,outcome,reason_code,
       component_key,evidence_sha256,legacy_recovery_case_id,admitted_booking_count,
       admitted_day_count,admitted_movement_count,pre_reconciliation_sha256,
       post_reconciliation_sha256)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [receiptId,input.requestId,input.outcome,input.reason,input.componentKey ?? null,
      input.evidenceSha256 ?? null,input.recoveryCaseId ?? null,input.bookingCount ?? 0,
      input.dayCount ?? 0,input.movementCount ?? 0,input.preSha ?? null,input.postSha ?? null],
  );
  return {
    receiptId,requestId:input.requestId,correlationId:input.correlationId,outcome:input.outcome,reason:input.reason,
    recoveryCaseId:input.recoveryCaseId ?? null,admittedBookingCount:input.bookingCount ?? 0,
    admittedDayCount:input.dayCount ?? 0,admittedMovementCount:input.movementCount ?? 0,
    replayed:false,
  } satisfies AdmissionReceipt;
}

async function replay(client: PoolClient, accountId: string, key: string, payloadSha: string) {
  const result = await client.query<{
    legacy_admission_request_id: string; payload_sha256: string; correlation_id:string;
    legacy_admission_receipt_id: string | null; outcome: AdmissionReceipt["outcome"] | null;
    reason_code: string | null; legacy_recovery_case_id: string | null;
    admitted_booking_count: number | null; admitted_day_count: number | null;
    admitted_movement_count: number | null;
  }>(
    `select request.legacy_admission_request_id,request.payload_sha256,request.correlation_id,
       receipt.legacy_admission_receipt_id,receipt.outcome,receipt.reason_code,
       receipt.legacy_recovery_case_id,receipt.admitted_booking_count,
       receipt.admitted_day_count,receipt.admitted_movement_count
     from crays_core.clubs_capacity_legacy_admission_requests request
     left join crays_core.clubs_capacity_legacy_admission_receipts receipt
       on receipt.legacy_admission_request_id=request.legacy_admission_request_id
     where request.actor_account_id=$1 and request.idempotency_key=$2`,
    [accountId,key],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.payload_sha256 !== payloadSha) throw new ClubsIdempotencyReplayConflictError();
  if (!row.legacy_admission_receipt_id || !row.outcome) throw new Error("legacy_capacity_admission_outcome_unknown");
  return {
    receiptId:row.legacy_admission_receipt_id,requestId:row.legacy_admission_request_id,
    correlationId:row.correlation_id,
    outcome:row.outcome,reason:row.reason_code,recoveryCaseId:row.legacy_recovery_case_id,
    admittedBookingCount:row.admitted_booking_count ?? 0,admittedDayCount:row.admitted_day_count ?? 0,
    admittedMovementCount:row.admitted_movement_count ?? 0,replayed:true,
  } satisfies AdmissionReceipt;
}

export async function executeLegacyCapacityAdmission(input: {
  accountId: string; tenantSessionId: string; organizationId: string;
  roleKey: string; bookingId: string; expectedBookingVersion: number;
  idempotencyKey: string; correlationId: string;
}, transactionClient?: PoolClient): Promise<AdmissionReceipt> {
  if (!/^[A-Za-z0-9:_.-]{3,180}$/.test(input.bookingId)
    || !/^[A-Za-z0-9:_.-]{8,220}$/.test(input.idempotencyKey)
    || !Number.isSafeInteger(input.expectedBookingVersion) || input.expectedBookingVersion<1) {
    throw new Error("invalid_legacy_capacity_admission_command");
  }
  const payloadSha = digest({
    command:"admit_legacy_capacity_component",bookingId:input.bookingId,
    expectedBookingVersion:input.expectedBookingVersion,
  });
  const run = async (client: PoolClient) => {
    const prior = await replay(client,input.accountId,input.idempotencyKey,payloadSha);
    if (prior) return prior;
    const requestId = id("clubs_capacity_legacy_admission_request");
    await client.query(
      `insert into crays_core.clubs_capacity_legacy_admission_requests(
         legacy_admission_request_id,actor_account_id,tenant_session_id,organization_id,
         role_key,command_type,target_booking_id,expected_booking_version,
         idempotency_key,payload_sha256,correlation_id)
       values($1,$2,$3,$4,$5,'admit_legacy_capacity_component',$6,$7,$8,$9,$10)`,
      [requestId,input.accountId,input.tenantSessionId,input.organizationId,input.roleKey,
        input.bookingId,input.expectedBookingVersion,input.idempotencyKey,payloadSha,input.correlationId],
    );
    const target = await client.query<{ property_id: string; unit_id: string; booking_version: number }>(
      `select property_id,unit_id,version booking_version from crays_core.clubs_bookings
       where booking_id=$1 for update`,[input.bookingId],
    );
    const targetRow = target.rows[0];
    if (!targetRow) return appendReceipt(client,{requestId,correlationId:input.correlationId,outcome:"denied",reason:"authorized_legacy_booking_required"});
    const authority = await client.query<{
      role_assignment_id:string; partner_tenant_id:string; operator_legal_entity_id:string;
      store_id:string;
    }>(
      `select scope.role_assignment_id,scope.partner_tenant_id,
         scope.operator_legal_entity_id,store.store_id
       from crays_core.tenant_sessions session
       join crays_core.partner_role_scopes scope
         on scope.account_id=session.account_id and scope.role_key='holiday-manager'
        and scope.vertical_root='clubs' and scope.relationship_type='clubs-franchise-partner'
        and scope.status='active' and scope.valid_from<=now()
        and (scope.valid_until is null or scope.valid_until>now())
        and scope.capabilities @> '["clubs.holiday.capacity.reconcile"]'::jsonb
       join crays_core.role_assignments role_assignment
         on role_assignment.assignment_id=scope.role_assignment_id
        and role_assignment.organization_id=session.organization_id
        and role_assignment.account_id=session.account_id
        and role_assignment.role_key=session.role_key and role_assignment.status='active'
       join crays_core.clubs_properties property
         on property.property_id=scope.property_id
        and property.partner_tenant_id=scope.partner_tenant_id
        and property.operator_legal_entity_id=scope.operator_legal_entity_id
       join crays_core.stores store on store.store_id=property.store_id and store.vertical_root='clubs'
       join crays_core.store_operator_assignments assignment
         on assignment.store_id=store.store_id
        and assignment.partner_tenant_id=scope.partner_tenant_id
        and assignment.operator_legal_entity_id=scope.operator_legal_entity_id
        and assignment.status='active' and assignment.valid_from<=now()
        and (assignment.valid_until is null or assignment.valid_until>now())
       where session.session_id=$2 and session.account_id=$1
         and session.organization_id=$3 and session.role_key='holiday-manager'
         and session.status='active' and session.expires_at>now()
         and scope.property_id=$4 and $5='holiday-manager'
       for share of session,scope,role_assignment,assignment`,
      [input.accountId,input.tenantSessionId,input.organizationId,targetRow.property_id,input.roleKey],
    );
    const scope = authority.rows[0];
    if (!scope) return appendReceipt(client,{requestId,correlationId:input.correlationId,outcome:"denied",reason:"capacity_reconciliation_authority_required"});
    if (targetRow.booking_version!==input.expectedBookingVersion) {
      return appendReceipt(client,{requestId,correlationId:input.correlationId,outcome:"conflict",reason:"booking_version_conflict"});
    }
    const graph = await client.query<LegacyBookingRow>(
      `select booking.booking_id,booking.version booking_version,booking.status booking_status,
         reservation.reservation_id,reservation.version reservation_version,
         reservation.status reservation_status,reservation.booking_request_id,
         request.version request_version,request.status request_status,
         reservation.quote_snapshot_id,reservation.reservation_hold_id,
         hold.version hold_version,hold.status hold_status,stay.stay_id,
         stay.version stay_version,stay.status stay_status,booking.property_id,
         booking.unit_id,hold.inventory_calendar_id,reservation.arrival_date::text,
         reservation.departure_date::text,reservation.reserved_capacity,
         reservation.seller_snapshot,reservation.pricing_snapshot_sha256
       from crays_core.clubs_bookings booking
       join crays_core.clubs_reservations reservation on reservation.reservation_id=booking.reservation_id
       join crays_core.clubs_booking_requests request on request.booking_request_id=reservation.booking_request_id
       join crays_core.clubs_reservation_holds hold on hold.reservation_hold_id=reservation.reservation_hold_id
       join crays_core.clubs_stays stay on stay.booking_id=booking.booking_id and stay.reservation_id=reservation.reservation_id
       where booking.property_id=$1 and booking.unit_id=$2
         and booking.status in ('confirmed','change_requested','in_stay')
       order by booking.booking_id for update of booking,reservation,request,hold,stay`,
      [targetRow.property_id,targetRow.unit_id],
    );
    const targetGraph = graph.rows.find((row)=>row.booking_id===input.bookingId);
    if (!targetGraph) return appendReceipt(client,{requestId,correlationId:input.correlationId,outcome:"denied",reason:"complete_outstanding_booking_graph_required"});
    let componentStart=targetGraph.arrival_date, componentEnd=targetGraph.departure_date;
    let component: LegacyBookingRow[]=[];
    for (;;) {
      const next=graph.rows.filter((row)=>overlaps(row,componentStart,componentEnd));
      const start=next.reduce((value,row)=>row.arrival_date<value?row.arrival_date:value,componentStart);
      const end=next.reduce((value,row)=>row.departure_date>value?row.departure_date:value,componentEnd);
      if(next.length===component.length&&start===componentStart&&end===componentEnd){component=next;break;}
      component=next;componentStart=start;componentEnd=end;
    }
    const bookingIds=component.map((row)=>row.booking_id).sort();
    const componentKey=digest({propertyId:targetRow.property_id,unitId:targetRow.unit_id,bookingIds});
    const ledger = await client.query<{
      booking_capacity_ledger_id:string;booking_id:string;inventory_day_id:string;
      local_date:string;movement_type:"allocate"|"release";capacity_units:number;
      signed_capacity_delta:number;inventory_calendar_id:string;property_id:string;unit_id:string;
    }>(
      `select booking_capacity_ledger_id,booking_id,inventory_day_id,local_date::text,
         movement_type,capacity_units,signed_capacity_delta,inventory_calendar_id,property_id,unit_id
       from crays_core.clubs_booking_capacity_ledger where booking_id=any($1::text[])
       order by booking_id,local_date,movement_type for update`,[bookingIds],
    );
    const ledgerByBooking=new Map<string,typeof ledger.rows>();
    for(const row of ledger.rows) ledgerByBooking.set(row.booking_id,[...(ledgerByBooking.get(row.booking_id)??[]),row]);
    const missing:LegacyBookingRow[]=[]; const blockers=new Set<string>();
    for(const row of component){
      const rows=ledgerByBooking.get(row.booking_id)??[];
      const dates=occupiedDates(row.arrival_date,row.departure_date);
      const nights=dates.length;
      if(rows.length===0) missing.push(row);
      else if(rows.length!==nights || rows.some((entry)=>entry.movement_type!=="allocate")) blockers.add("partial_or_terminal_ledger_history");
      else if(rows.some((entry)=>!dates.includes(entry.local_date)
        || entry.capacity_units!==row.reserved_capacity
        || entry.inventory_calendar_id!==row.inventory_calendar_id
        || entry.property_id!==row.property_id
        || entry.unit_id!==row.unit_id)) blockers.add("ledger_scope_or_quantity_mismatch");
      if(row.request_status!=="accepted"||row.hold_status!=="converted"||row.reservation_status!=="confirmed") blockers.add("incoherent_booking_graph");
      if(!((['confirmed','change_requested'].includes(row.booking_status)&&['not_started','ready_for_check_in'].includes(row.stay_status))
        ||(row.booking_status==='in_stay'&&row.stay_status==='checked_in'))) blockers.add("unsupported_lifecycle_state");
      if(row.arrival_date>=row.departure_date||row.reserved_capacity<1) blockers.add("invalid_dates_or_capacity");
    }
    if(!missing.some((row)=>row.booking_id===input.bookingId)) {
      return appendReceipt(client,{requestId,correlationId:input.correlationId,outcome:"noop",reason:"booking_capacity_already_admitted"});
    }
    const sourceResult=await client.query<SourceConfirmation>(
      `select receipt.aggregate_id booking_id,request.booking_lifecycle_command_request_id source_request_id,
         receipt.booking_lifecycle_command_receipt_id source_receipt_id,
         request.correlation_id,receipt.occurred_at::text
       from crays_core.clubs_booking_lifecycle_command_requests request
       join crays_core.clubs_booking_lifecycle_command_receipts receipt
         on receipt.booking_lifecycle_command_request_id=request.booking_lifecycle_command_request_id
       join crays_core.clubs_reservations reservation on reservation.booking_request_id=request.target_id
       join crays_core.clubs_bookings booking on booking.reservation_id=reservation.reservation_id
        and booking.booking_id=receipt.aggregate_id
       where booking.booking_id=any($1::text[]) and request.command_type='confirm_request'
         and receipt.outcome='applied' and receipt.aggregate_type='booking'
         and receipt.occurred_at < (
           select admission_request.requested_at
           from crays_core.clubs_capacity_legacy_admission_requests admission_request
           where admission_request.legacy_admission_request_id=$2)
       order by booking.booking_id,receipt.occurred_at`,[missing.map((row)=>row.booking_id),requestId],
    );
    const sourceByBooking=new Map<string,SourceConfirmation[]>();
    for(const row of sourceResult.rows)sourceByBooking.set(row.booking_id,[...(sourceByBooking.get(row.booking_id)??[]),row]);
    for(const row of missing)if((sourceByBooking.get(row.booking_id)??[]).length!==1)blockers.add("exact_confirmation_receipt_required");
    const eventResult=await client.query<{booking_id:string;event_count:string;hold_event_count:string}>(
      `select booking.booking_id,
         (select count(*)::text from crays_core.clubs_booking_lifecycle_events event
           where event.correlation_id=source_request.correlation_id
             and ((event.aggregate_type='reservation' and event.aggregate_id=reservation.reservation_id and event.event_type='confirmed')
               or (event.aggregate_type='booking' and event.aggregate_id=booking.booking_id and event.event_type='confirmed')
               or (event.aggregate_type='stay' and event.aggregate_id=stay.stay_id and event.event_type='created'))) event_count,
         (select count(*)::text from crays_core.clubs_reservation_hold_events hold_event
           where hold_event.reservation_hold_id=reservation.reservation_hold_id
             and hold_event.event_type='converted'
             and hold_event.correlation_id=source_request.correlation_id||':hold-converted') hold_event_count
       from crays_core.clubs_bookings booking
       join crays_core.clubs_reservations reservation on reservation.reservation_id=booking.reservation_id
       join crays_core.clubs_stays stay on stay.booking_id=booking.booking_id
       join crays_core.clubs_booking_lifecycle_command_receipts source_receipt on source_receipt.aggregate_id=booking.booking_id and source_receipt.outcome='applied'
       join crays_core.clubs_booking_lifecycle_command_requests source_request
         on source_request.booking_lifecycle_command_request_id=source_receipt.booking_lifecycle_command_request_id
        and source_request.command_type='confirm_request'
       where booking.booking_id=any($1::text[])`,[missing.map((row)=>row.booking_id)],
    );
    const eventByBooking=new Map(eventResult.rows.map((row)=>[row.booking_id,row]));
    for(const row of missing){const evidence=eventByBooking.get(row.booking_id);if(!evidence||evidence.event_count!=="3"||evidence.hold_event_count!=="1")blockers.add("confirmation_event_chain_required");}
    const calendarIds=[...new Set(component.map((row)=>row.inventory_calendar_id))];
    if(calendarIds.length!==1)blockers.add("single_inventory_calendar_required");
    const calendarId=targetGraph.inventory_calendar_id;
    const lockedDays=await client.query<{
      inventory_day_id:string;local_date:string;version:number;booked_capacity:number;
      inventory_calendar_id:string;unit_id:string;property_id:string;
    }>(
      `select day.inventory_day_id,day.local_date::text,day.version,day.booked_capacity,
         day.inventory_calendar_id,day.unit_id,calendar.property_id
       from crays_core.clubs_inventory_days day
       join crays_core.clubs_inventory_calendars calendar on calendar.inventory_calendar_id=day.inventory_calendar_id
       where day.inventory_calendar_id=$1 and day.local_date>=$2::date and day.local_date<$3::date
       order by day.local_date for update of day`,[calendarId,componentStart,componentEnd],
    );
    const dayLedger=await client.query<{inventory_day_id:string;ledger_outstanding:number}>(
      `select day.inventory_day_id,coalesce(sum(all_ledger.signed_capacity_delta),0)::integer ledger_outstanding
       from crays_core.clubs_inventory_days day
       left join crays_core.clubs_booking_capacity_ledger all_ledger
         on all_ledger.inventory_day_id=day.inventory_day_id
       where day.inventory_day_id=any($1::text[])
       group by day.inventory_day_id`,[lockedDays.rows.map((row)=>row.inventory_day_id)],
    );
    const ledgerOutstanding=new Map(dayLedger.rows.map((row)=>[row.inventory_day_id,row.ledger_outstanding]));
    const days=lockedDays.rows.map((row)=>({...row,ledger_outstanding:ledgerOutstanding.get(row.inventory_day_id)??0}));
    const dayMap=new Map(days.map((row)=>[row.local_date,row]));
    const affectedDates=[...new Set(missing.flatMap((row)=>occupiedDates(row.arrival_date,row.departure_date)))].sort();
    for(const date of affectedDates){
      const day=dayMap.get(date);
      if(!day){blockers.add("complete_inventory_days_required");continue;}
      if(day.property_id!==targetRow.property_id||day.unit_id!==targetRow.unit_id)blockers.add("inventory_scope_mismatch");
      const missingUnits=missing.filter((row)=>row.arrival_date<=date&&row.departure_date>date).reduce((sum,row)=>sum+row.reserved_capacity,0);
      if(day.ledger_outstanding+missingUnits<day.booked_capacity)blockers.add("unknown_capacity_owner");
      if(day.ledger_outstanding+missingUnits>day.booked_capacity)blockers.add("inventory_capacity_deficit");
    }
    const manifest={algorithmRevision,sourceEligibilityRevision,componentKey,
      scope:{partnerTenantId:scope.partner_tenant_id,operatorLegalEntityId:scope.operator_legal_entity_id,storeId:scope.store_id,propertyId:targetRow.property_id,unitId:targetRow.unit_id,inventoryCalendarId:calendarId},
      authority:{accountId:input.accountId,tenantSessionId:input.tenantSessionId,organizationId:input.organizationId,roleAssignmentId:scope.role_assignment_id},
      bookings:component.map((row)=>({bookingId:row.booking_id,bookingVersion:row.booking_version,bookingStatus:row.booking_status,reservationId:row.reservation_id,reservationVersion:row.reservation_version,reservationStatus:row.reservation_status,requestId:row.booking_request_id,requestVersion:row.request_version,holdId:row.reservation_hold_id,holdVersion:row.hold_version,holdStatus:row.hold_status,stayId:row.stay_id,stayVersion:row.stay_version,stayStatus:row.stay_status,arrivalDate:row.arrival_date,departureDate:row.departure_date,reservedCapacity:row.reserved_capacity,sellerSnapshotSha256:digest(row.seller_snapshot),pricingSnapshotSha256:row.pricing_snapshot_sha256,sourceConfirmation:sourceByBooking.get(row.booking_id)??[],ledgerRows:ledgerByBooking.get(row.booking_id)??[]})),
      inventoryDays:days,blockerCodes:[...blockers].sort()};
    const evidenceSha=digest(manifest); const preSha=digest(days.map((row)=>({date:row.local_date,stored:row.booked_capacity,ledger:row.ledger_outstanding})));
    if(blockers.size){
      const caseId=id("clubs_capacity_legacy_recovery_case");
      await client.query(
        `insert into crays_core.clubs_capacity_legacy_recovery_cases(
           legacy_recovery_case_id,component_key,evidence_sha256,partner_tenant_id,
           operator_legal_entity_id,store_id,property_id,unit_id,inventory_calendar_id,
           target_booking_id,affected_booking_ids,affected_local_dates,blocker_codes,
           evidence_manifest,algorithm_revision,source_eligibility_revision,
           attention_owner_assignment_id,attention_owner_account_id,due_at,expires_at,
           next_safe_action,created_from_request_id)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,
           $14::jsonb,$15,$16,$17,$18,now()+interval '1 day',now()+interval '7 days',$19,$20)
         on conflict(component_key,evidence_sha256) do nothing`,
        [caseId,componentKey,evidenceSha,scope.partner_tenant_id,scope.operator_legal_entity_id,
          scope.store_id,targetRow.property_id,targetRow.unit_id,calendarId,input.bookingId,
          JSON.stringify(bookingIds),JSON.stringify(affectedDates),JSON.stringify([...blockers].sort()),
          JSON.stringify(manifest),algorithmRevision,sourceEligibilityRevision,scope.role_assignment_id,
          input.accountId,blockers.has("unknown_capacity_owner")||blockers.has("inventory_capacity_deficit")?"repair_inventory_truth":"resolve_source_evidence",requestId],
      );
      const selected=await client.query<{legacy_recovery_case_id:string}>(
        `select legacy_recovery_case_id from crays_core.clubs_capacity_legacy_recovery_cases
         where component_key=$1 and evidence_sha256=$2`,[componentKey,evidenceSha],
      );
      const recoveryCaseId=selected.rows[0]!.legacy_recovery_case_id;
      await client.query(
        `insert into crays_core.clubs_capacity_legacy_recovery_case_events(
           legacy_recovery_case_event_id,legacy_recovery_case_id,event_type,
           actor_account_id,actor_assignment_id,evidence_sha256,reason)
         values($1,$2,'detected',$3,$4,$5,$6) on conflict do nothing`,
        [id("clubs_capacity_legacy_recovery_event"),recoveryCaseId,input.accountId,
          scope.role_assignment_id,evidenceSha,[...blockers].sort().join(",")],
      );
      return appendReceipt(client,{requestId,correlationId:input.correlationId,outcome:"recovery_required",reason:[...blockers].sort().join(","),componentKey,evidenceSha256:evidenceSha,recoveryCaseId});
    }
    const inserts:{ledgerId:string;booking:LegacyBookingRow;day:typeof days[number];source:SourceConfirmation}[]=[];
    for(const booking of missing){const source=sourceByBooking.get(booking.booking_id)![0]!;for(const date of occupiedDates(booking.arrival_date,booking.departure_date)){const day=dayMap.get(date)!;const ledgerId=id("clubs_booking_capacity_ledger");await client.query(
      `insert into crays_core.clubs_booking_capacity_ledger(
         booking_capacity_ledger_id,booking_id,reservation_id,inventory_calendar_id,
         inventory_day_id,property_id,unit_id,local_date,movement_type,capacity_units,
         booking_lifecycle_command_request_id,booking_lifecycle_command_receipt_id,correlation_id)
       values($1,$2,$3,$4,$5,$6,$7,$8::date,'allocate',$9,$10,$11,$12)`,
      [ledgerId,booking.booking_id,booking.reservation_id,calendarId,day.inventory_day_id,
        targetRow.property_id,targetRow.unit_id,date,booking.reserved_capacity,
        source.source_request_id,source.source_receipt_id,source.correlation_id]);inserts.push({ledgerId,booking,day,source});}}
    const post=await client.query<{inventory_day_id:string;reconciliation_status:string;capacity_delta:number}>(
      `select inventory_day_id,reconciliation_status,capacity_delta
       from crays_core.clubs_booking_capacity_day_reconciliation
       where inventory_day_id=any($1::text[]) order by local_date`,[affectedDates.map((date)=>dayMap.get(date)!.inventory_day_id)],
    );
    if(post.rows.length!==affectedDates.length||post.rows.some((row)=>row.reconciliation_status!=="matched"||row.capacity_delta!==0))throw new Error("legacy_capacity_post_reconciliation_failed");
    const postSha=digest(post.rows); const receipt=await appendReceipt(client,{requestId,correlationId:input.correlationId,outcome:"applied",reason:null,componentKey,evidenceSha256:evidenceSha,bookingCount:missing.length,dayCount:affectedDates.length,movementCount:inserts.length,preSha,postSha});
    for(const entry of inserts)await client.query(
      `insert into crays_core.clubs_capacity_legacy_admission_entries(
         legacy_admission_entry_id,legacy_admission_receipt_id,booking_capacity_ledger_id,
         booking_id,inventory_day_id,source_confirmation_request_id,
         source_confirmation_receipt_id,admission_classification,source_occurred_at)
       values($1,$2,$3,$4,$5,$6,$7,'outstanding_allocate',$8::timestamptz)`,
      [id("clubs_capacity_legacy_admission_entry"),receipt.receiptId,entry.ledgerId,
        entry.booking.booking_id,entry.day.inventory_day_id,entry.source.source_request_id,
        entry.source.source_receipt_id,entry.source.occurred_at],
    );
    const openCases=await client.query<{legacy_recovery_case_id:string;evidence_sha256:string}>(
      `select legacy_recovery_case_id,evidence_sha256 from crays_core.clubs_capacity_legacy_recovery_queue
       where component_key=$1 and recovery_state not in ('reconciled','rejected')`,[componentKey],
    );
    for(const recovery of openCases.rows)await client.query(
      `insert into crays_core.clubs_capacity_legacy_recovery_case_events(
         legacy_recovery_case_event_id,legacy_recovery_case_id,event_type,
         actor_account_id,actor_assignment_id,legacy_admission_receipt_id,evidence_sha256,reason)
       values($1,$2,'reconciled',$3,$4,$5,$6,'component admitted after exact reconciliation')
       on conflict do nothing`,[id("clubs_capacity_legacy_recovery_event"),recovery.legacy_recovery_case_id,
        input.accountId,scope.role_assignment_id,receipt.receiptId,recovery.evidence_sha256],
    );
    return receipt;
  };
  return transactionClient?run(transactionClient):transaction(run);
}

export async function readLegacyCapacityRecoveryQueue(input:{
  accountId:string;tenantSessionId:string;organizationId:string;roleKey:string;
},database:Pick<PoolClient,"query">=getCorePgPool()){
  const result=await database.query<{
    legacy_recovery_case_id:string;component_key:string;property_id:string;unit_id:string;
    affected_booking_ids:unknown;affected_local_dates:unknown;blocker_codes:unknown;
    due_at:string;expires_at:string;next_safe_action:string;recovery_state:string;
  }>(
    `with authority as (
       select scope.partner_tenant_id,scope.operator_legal_entity_id,scope.property_id,
         store.store_id
       from crays_core.tenant_sessions session
       join crays_core.partner_role_scopes scope
         on scope.account_id=session.account_id and scope.role_key='holiday-manager'
        and scope.status='active' and scope.vertical_root='clubs'
        and scope.relationship_type='clubs-franchise-partner'
        and scope.valid_from<=now() and (scope.valid_until is null or scope.valid_until>now())
        and scope.capabilities @> '["clubs.holiday.capacity.reconcile"]'::jsonb
       join crays_core.role_assignments role_assignment on role_assignment.assignment_id=scope.role_assignment_id
        and role_assignment.account_id=session.account_id and role_assignment.organization_id=session.organization_id
        and role_assignment.role_key=session.role_key and role_assignment.status='active'
       join crays_core.clubs_properties property on property.property_id=scope.property_id
        and property.partner_tenant_id=scope.partner_tenant_id and property.operator_legal_entity_id=scope.operator_legal_entity_id
       join crays_core.stores store on store.store_id=property.store_id and store.vertical_root='clubs'
       join crays_core.store_operator_assignments assignment on assignment.store_id=store.store_id
        and assignment.partner_tenant_id=scope.partner_tenant_id and assignment.operator_legal_entity_id=scope.operator_legal_entity_id
        and assignment.status='active' and assignment.valid_from<=now() and (assignment.valid_until is null or assignment.valid_until>now())
       where session.session_id=$2 and session.account_id=$1 and session.organization_id=$3
         and session.role_key='holiday-manager' and session.status='active' and session.expires_at>now() and $4='holiday-manager'
     ) select queue.legacy_recovery_case_id,queue.component_key,queue.property_id,queue.unit_id,
       queue.affected_booking_ids,queue.affected_local_dates,queue.blocker_codes,
       queue.due_at::text,queue.expires_at::text,queue.next_safe_action,queue.recovery_state
     from crays_core.clubs_capacity_legacy_recovery_queue queue join authority
       on authority.partner_tenant_id=queue.partner_tenant_id
      and authority.operator_legal_entity_id=queue.operator_legal_entity_id
      and authority.property_id=queue.property_id and authority.store_id=queue.store_id
     where queue.recovery_state not in ('reconciled','rejected')
     order by queue.due_at,queue.created_at limit 100`,
    [input.accountId,input.tenantSessionId,input.organizationId,input.roleKey],
  );
  return result.rows.map((row)=>({caseId:row.legacy_recovery_case_id,componentKey:row.component_key,
    propertyId:row.property_id,unitId:row.unit_id,bookingIds:row.affected_booking_ids,
    localDates:row.affected_local_dates,blockerCodes:row.blocker_codes,dueAt:row.due_at,
    expiresAt:row.expires_at,nextSafeAction:row.next_safe_action,state:row.recovery_state}));
}

export async function readLegacyCapacityAdmissionCandidates(input:{
  accountId:string;tenantSessionId:string;organizationId:string;roleKey:string;
},database:Pick<PoolClient,"query">=getCorePgPool()){
  const result=await database.query<{
    booking_id:string;booking_version:number;booking_status:string;public_reference:string;
    property_id:string;property_name:string;unit_id:string;unit_code:string;
    arrival_date:string;departure_date:string;reserved_capacity:number;
    expected_night_count:number;allocation_count:number;release_count:number;
  }>(
    `with authority as (
       select scope.partner_tenant_id,scope.operator_legal_entity_id,scope.property_id,store.store_id
       from crays_core.tenant_sessions session
       join crays_core.partner_role_scopes scope
         on scope.account_id=session.account_id and scope.role_key='holiday-manager'
        and scope.status='active' and scope.vertical_root='clubs'
        and scope.relationship_type='clubs-franchise-partner'
        and scope.valid_from<=now() and (scope.valid_until is null or scope.valid_until>now())
        and scope.capabilities @> '["clubs.holiday.capacity.reconcile"]'::jsonb
       join crays_core.role_assignments role_assignment
         on role_assignment.assignment_id=scope.role_assignment_id
        and role_assignment.account_id=session.account_id
        and role_assignment.organization_id=session.organization_id
        and role_assignment.role_key=session.role_key and role_assignment.status='active'
       join crays_core.clubs_properties property on property.property_id=scope.property_id
        and property.partner_tenant_id=scope.partner_tenant_id
        and property.operator_legal_entity_id=scope.operator_legal_entity_id
       join crays_core.stores store on store.store_id=property.store_id and store.vertical_root='clubs'
       join crays_core.store_operator_assignments assignment on assignment.store_id=store.store_id
        and assignment.partner_tenant_id=scope.partner_tenant_id
        and assignment.operator_legal_entity_id=scope.operator_legal_entity_id
        and assignment.status='active' and assignment.valid_from<=now()
        and (assignment.valid_until is null or assignment.valid_until>now())
       where session.session_id=$2 and session.account_id=$1 and session.organization_id=$3
        and session.role_key='holiday-manager' and session.status='active'
        and session.expires_at>now() and $4='holiday-manager'
     ), ledger_counts as (
       select ledger.booking_id,
         count(*) filter(where ledger.movement_type='allocate')::integer allocation_count,
         count(*) filter(where ledger.movement_type='release')::integer release_count
       from crays_core.clubs_booking_capacity_ledger ledger group by ledger.booking_id
     )
     select booking.booking_id,booking.version booking_version,booking.status booking_status,
       booking.public_reference,property.property_id,store.display_name property_name,
       unit.unit_id,unit.canonical_code unit_code,reservation.arrival_date::text,
       reservation.departure_date::text,reservation.reserved_capacity,
       (reservation.departure_date-reservation.arrival_date)::integer expected_night_count,
       coalesce(ledger_counts.allocation_count,0) allocation_count,
       coalesce(ledger_counts.release_count,0) release_count
     from authority
     join crays_core.clubs_properties property on property.property_id=authority.property_id
     join crays_core.stores store on store.store_id=authority.store_id
     join crays_core.clubs_bookings booking on booking.property_id=property.property_id
     join crays_core.clubs_reservations reservation on reservation.reservation_id=booking.reservation_id
     join crays_core.clubs_units unit on unit.unit_id=booking.unit_id and unit.property_id=property.property_id
     left join ledger_counts on ledger_counts.booking_id=booking.booking_id
     where booking.status in ('confirmed','change_requested','in_stay')
       and (coalesce(ledger_counts.allocation_count,0)<>(reservation.departure_date-reservation.arrival_date)
         or coalesce(ledger_counts.release_count,0)<>0)
     order by reservation.arrival_date,booking.public_reference,booking.booking_id limit 100`,
    [input.accountId,input.tenantSessionId,input.organizationId,input.roleKey],
  );
  return result.rows.map((row)=>({
    bookingId:row.booking_id,bookingVersion:row.booking_version,bookingStatus:row.booking_status,
    publicReference:row.public_reference,propertyId:row.property_id,propertyName:row.property_name,
    unitId:row.unit_id,unitCode:row.unit_code,arrivalDate:row.arrival_date,
    departureDate:row.departure_date,reservedCapacity:row.reserved_capacity,
    expectedNightCount:row.expected_night_count,allocationCount:row.allocation_count,
    releaseCount:row.release_count,
  }));
}

export async function hasLegacyCapacityReconciliationAuthority(input:{
  accountId:string;tenantSessionId:string;organizationId:string;roleKey:string;
},database:Pick<PoolClient,"query">=getCorePgPool()){
  const result=await database.query<{authorized:boolean}>(
    `select exists(
       select 1 from crays_core.tenant_sessions session
       join crays_core.partner_role_scopes scope
         on scope.account_id=session.account_id and scope.role_key='holiday-manager'
        and scope.status='active' and scope.vertical_root='clubs'
        and scope.relationship_type='clubs-franchise-partner'
        and scope.valid_from<=now() and (scope.valid_until is null or scope.valid_until>now())
        and scope.capabilities @> '["clubs.holiday.capacity.reconcile"]'::jsonb
       join crays_core.role_assignments role_assignment
         on role_assignment.assignment_id=scope.role_assignment_id
        and role_assignment.account_id=session.account_id
        and role_assignment.organization_id=session.organization_id
        and role_assignment.role_key=session.role_key and role_assignment.status='active'
       join crays_core.clubs_properties property on property.property_id=scope.property_id
        and property.partner_tenant_id=scope.partner_tenant_id
        and property.operator_legal_entity_id=scope.operator_legal_entity_id
       join crays_core.stores store on store.store_id=property.store_id and store.vertical_root='clubs'
       join crays_core.store_operator_assignments assignment on assignment.store_id=store.store_id
        and assignment.partner_tenant_id=scope.partner_tenant_id
        and assignment.operator_legal_entity_id=scope.operator_legal_entity_id
        and assignment.status='active' and assignment.valid_from<=now()
        and (assignment.valid_until is null or assignment.valid_until>now())
       where session.session_id=$2 and session.account_id=$1 and session.organization_id=$3
        and session.role_key='holiday-manager' and session.status='active'
        and session.expires_at>now() and $4='holiday-manager'
     ) authorized`,[input.accountId,input.tenantSessionId,input.organizationId,input.roleKey],
  );
  return result.rows[0]?.authorized===true;
}
