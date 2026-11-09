import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import {
  decodeHolidayManagerShiftCursor,
  encodeHolidayManagerShiftCursor,
  normalizeHolidayManagerShiftPageSize,
  type HolidayManagerShiftKind,
} from "@/lib/clubs/holiday-manager-shift-query";

export type HolidayManagerShiftItem = {
  workItemId: string;
  sortKey: string;
  kind: HolidayManagerShiftKind;
  publicReference: string;
  propertyId: string;
  propertyName: string;
  unitId: string | null;
  status: string;
  version: number;
  priority: number;
  reasonCode: string;
  localBusinessDate: string;
  sourceAuthority: "crays-booking-core";
  paymentState: "not_asserted";
};

type ShiftQueryRow = {
  total_count: string;
  authorized_property_count: string;
  snapshot_found: boolean;
  next_continuation_token: string | null;
  items: Array<{
    ordinal: number;
    work_item_id: string;
    sort_key: string;
    kind: HolidayManagerShiftItem["kind"];
    public_reference: string;
    property_id: string;
    property_name: string;
    unit_id: string | null;
    status: string;
    version: number;
    priority: number;
    reason_code: string;
    local_business_date: string;
  }>;
};

export async function readHolidayManagerShiftQueue(input: {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  cursor?: string | null;
  pageSize?: number;
  evaluationAt?: Date;
}, database: Pick<PoolClient, "query"> = getCorePgPool()) {
  const cursor = decodeHolidayManagerShiftCursor(input.cursor);
  if (input.cursor && !cursor) throw new Error("invalid_holiday_manager_shift_cursor");
  const requestedPageSize = normalizeHolidayManagerShiftPageSize(input.pageSize);
  if (cursor && input.pageSize !== undefined && requestedPageSize !== cursor.pageSize) {
    throw new Error("holiday_manager_shift_cursor_page_size_mismatch");
  }
  const pageSize = cursor?.pageSize ?? requestedPageSize;
  const snapshotAt = cursor?.snapshotAt ?? (input.evaluationAt ?? new Date()).toISOString();
  const snapshotId = cursor?.snapshotId ?? `clubs_shift_snapshot_${randomUUID()}`;
  const queryRevision = "holiday_manager_shift_v2";
  const querySha256 = createHash("sha256").update(queryRevision).digest("hex");
  const candidateNextToken = `clubs_shift_cursor_${randomUUID()}`;
  let result;
  if (cursor) {
    result = await database.query<ShiftQueryRow>(
      `with authorized_properties as (
         select distinct property.property_id,scope.partner_tenant_id,
           scope.operator_legal_entity_id,store.store_id
         from crays_core.tenant_sessions session
         join crays_core.partner_role_scopes scope
           on scope.account_id=session.account_id
          and scope.role_key='holiday-manager'
          and scope.vertical_root='clubs'
          and scope.relationship_type='clubs-franchise-partner'
          and scope.status='active'
          and scope.valid_from<=now()
          and (scope.valid_until is null or scope.valid_until>now())
          and scope.capabilities @> '["clubs.holiday.reservation.operate"]'::jsonb
         join crays_core.role_assignments role_assignment
           on role_assignment.assignment_id=scope.role_assignment_id
          and role_assignment.organization_id=session.organization_id
          and role_assignment.account_id=session.account_id
          and role_assignment.role_key=session.role_key
          and role_assignment.status='active'
         join crays_core.clubs_properties property
           on property.property_id=scope.property_id
          and property.partner_tenant_id=scope.partner_tenant_id
          and property.operator_legal_entity_id=scope.operator_legal_entity_id
         join crays_core.stores store
           on store.store_id=property.store_id and store.vertical_root='clubs'
         join crays_core.store_operator_assignments assignment
           on assignment.store_id=store.store_id
          and assignment.partner_tenant_id=scope.partner_tenant_id
          and assignment.operator_legal_entity_id=scope.operator_legal_entity_id
          and assignment.status='active'
          and assignment.valid_from<=now()
          and (assignment.valid_until is null or assignment.valid_until>now())
         where session.session_id=$2 and session.account_id=$1
           and session.organization_id=$3 and session.role_key='holiday-manager'
           and session.status='active' and session.expires_at>now()
       ), selected_snapshot as (
         select snapshot.shift_snapshot_id
         from crays_core.clubs_holiday_manager_shift_snapshots snapshot
         join crays_core.clubs_holiday_manager_shift_snapshot_cursors cursor_token
           on cursor_token.shift_snapshot_id=snapshot.shift_snapshot_id
          and cursor_token.after_ordinal=$5
          and cursor_token.continuation_token=$11
         where snapshot.shift_snapshot_id=$4
           and snapshot.actor_account_id=$1
           and snapshot.tenant_session_id=$2
           and snapshot.organization_id=$3
           and snapshot.snapshot_at=$7::timestamptz
           and snapshot.query_revision=$8
           and snapshot.query_sha256=$9
           and snapshot.page_size=$10
           and snapshot.expires_at>now()
       ), visible_items as (
         select item.*
         from crays_core.clubs_holiday_manager_shift_snapshot_items item
         join selected_snapshot snapshot on snapshot.shift_snapshot_id=item.shift_snapshot_id
         join authorized_properties property
           on property.property_id=item.property_id
          and property.partner_tenant_id=item.partner_tenant_id
          and property.operator_legal_entity_id=item.operator_legal_entity_id
          and property.store_id=item.store_id
       ), totals as (
         select count(*)::text total_count,
           (select count(*)::text from authorized_properties) authorized_property_count,
           exists(select 1 from selected_snapshot) snapshot_found
         from visible_items
       ), page_items as (
         select * from visible_items
         where ordinal>$5
         order by ordinal
         limit $6
       ), continuation_insert as (
         insert into crays_core.clubs_holiday_manager_shift_snapshot_cursors(
           shift_snapshot_id,after_ordinal,continuation_token)
         select $4,max(boundary.ordinal),$12
         from (select ordinal from page_items order by ordinal limit $10) boundary
         having (select count(*) from page_items)>$10
         on conflict (shift_snapshot_id,after_ordinal) do update
           set continuation_token=clubs_holiday_manager_shift_snapshot_cursors.continuation_token
         returning continuation_token
       )
       select totals.total_count,totals.authorized_property_count,totals.snapshot_found,
         (select continuation_token from continuation_insert) next_continuation_token,
         coalesce(jsonb_agg(to_jsonb(page_items) - 'shift_snapshot_id' - 'created_at'
           - 'partner_tenant_id' - 'operator_legal_entity_id' - 'store_id'
           order by page_items.ordinal)
           filter (where page_items.work_item_id is not null),'[]'::jsonb) items
       from totals left join page_items on true
       group by totals.total_count,totals.authorized_property_count,totals.snapshot_found`,
      [
        input.accountId, input.tenantSessionId, input.organizationId,
        snapshotId, cursor.afterOrdinal, pageSize + 1, snapshotAt,
        queryRevision, querySha256, pageSize, cursor.continuationToken, candidateNextToken,
      ],
    );
  } else result = await database.query<ShiftQueryRow>(
    `with authorized_properties as (
       select distinct property.property_id,store.display_name property_name,
          store.timezone,scope.partner_tenant_id,scope.operator_legal_entity_id,
          store.store_id
       from crays_core.tenant_sessions session
       join crays_core.partner_role_scopes scope
         on scope.account_id=session.account_id
        and scope.role_key='holiday-manager'
        and scope.vertical_root='clubs'
        and scope.relationship_type='clubs-franchise-partner'
        and scope.status='active'
        and scope.valid_from<=now()
        and (scope.valid_until is null or scope.valid_until>now())
        and scope.capabilities @> '["clubs.holiday.reservation.operate"]'::jsonb
       join crays_core.role_assignments role_assignment
         on role_assignment.assignment_id=scope.role_assignment_id
        and role_assignment.organization_id=session.organization_id
        and role_assignment.account_id=session.account_id
        and role_assignment.role_key=session.role_key
        and role_assignment.status='active'
       join crays_core.clubs_properties property
         on property.property_id=scope.property_id
        and property.partner_tenant_id=scope.partner_tenant_id
        and property.operator_legal_entity_id=scope.operator_legal_entity_id
       join crays_core.stores store
         on store.store_id=property.store_id and store.vertical_root='clubs'
       join crays_core.store_operator_assignments assignment
         on assignment.store_id=store.store_id
        and assignment.partner_tenant_id=scope.partner_tenant_id
        and assignment.operator_legal_entity_id=scope.operator_legal_entity_id
        and assignment.status='active'
        and assignment.valid_from<=now()
        and (assignment.valid_until is null or assignment.valid_until>now())
       where session.session_id=$2 and session.account_id=$1
         and session.organization_id=$3 and session.role_key='holiday-manager'
         and session.status='active' and session.expires_at>now()
     ), work_items as (
       select 'request:'||request.booking_request_id||':'||request.version work_item_id,
         'request:'||request.booking_request_id sort_key,
         'request'::text kind,request.public_reference,request.property_id,
         scope.property_name,request.unit_id,request.status,request.version,
          case when hold.status<>'active' or hold.expires_at<=$5::timestamptz then 0 else 20 end priority,
          case when hold.status<>'active' or hold.expires_at<=$5::timestamptz
           then 'inventory_hold_reconciliation_required'
           when request.status='submitted' then 'new_booking_request'
           else 'booking_request_review_open' end reason_code,
          ($5::timestamptz at time zone scope.timezone)::date::text local_business_date,
          scope.partner_tenant_id,scope.operator_legal_entity_id,scope.store_id
       from crays_core.clubs_booking_requests request
       join authorized_properties scope on scope.property_id=request.property_id
       join crays_core.clubs_units unit
         on unit.unit_id=request.unit_id and unit.property_id=request.property_id
        and unit.lifecycle not in ('suspended','archived')
       join crays_core.clubs_reservation_holds hold
         on hold.reservation_hold_id=request.reservation_hold_id
       where request.status in ('submitted','under_review')
       union all
       select 'arrival:'||booking.booking_id||':'||stay.version,
         'arrival:'||booking.booking_id,'arrival',
         booking.public_reference,booking.property_id,scope.property_name,
          booking.unit_id,stay.status,stay.version,
           case when reservation.arrival_date<($5::timestamptz at time zone scope.timezone)::date then 5 else 10 end,
           case when reservation.arrival_date<($5::timestamptz at time zone scope.timezone)::date
            then 'overdue_arrival_no_show_decision_required' else 'arrival_today' end,
           reservation.arrival_date::text,
           scope.partner_tenant_id,scope.operator_legal_entity_id,scope.store_id
       from crays_core.clubs_bookings booking
       join authorized_properties scope on scope.property_id=booking.property_id
       join crays_core.clubs_units unit
         on unit.unit_id=booking.unit_id and unit.property_id=booking.property_id
        and unit.lifecycle not in ('suspended','archived')
       join crays_core.clubs_reservations reservation
         on reservation.reservation_id=booking.reservation_id
       join crays_core.clubs_stays stay on stay.booking_id=booking.booking_id
        where booking.status in ('confirmed','change_requested')
          and stay.status in ('not_started','ready_for_check_in')
           and reservation.arrival_date<=($5::timestamptz at time zone scope.timezone)::date
       union all
       select 'departure:'||booking.booking_id||':'||stay.version,
         'departure:'||booking.booking_id,'departure',
         booking.public_reference,booking.property_id,scope.property_name,
         booking.unit_id,stay.status,stay.version,10,'departure_today',
          reservation.departure_date::text,
          scope.partner_tenant_id,scope.operator_legal_entity_id,scope.store_id
       from crays_core.clubs_bookings booking
       join authorized_properties scope on scope.property_id=booking.property_id
       join crays_core.clubs_units unit
         on unit.unit_id=booking.unit_id and unit.property_id=booking.property_id
        and unit.lifecycle not in ('suspended','archived')
       join crays_core.clubs_reservations reservation
         on reservation.reservation_id=booking.reservation_id
       join crays_core.clubs_stays stay on stay.booking_id=booking.booking_id
       where booking.status='in_stay' and stay.status='checked_in'
          and reservation.departure_date=($5::timestamptz at time zone scope.timezone)::date
       union all
       select 'in-house:'||booking.booking_id||':'||stay.version,
         'in-house:'||booking.booking_id,'in_house',
         booking.public_reference,booking.property_id,scope.property_name,
         booking.unit_id,stay.status,stay.version,30,'guest_in_house',
          ($5::timestamptz at time zone scope.timezone)::date::text,
          scope.partner_tenant_id,scope.operator_legal_entity_id,scope.store_id
       from crays_core.clubs_bookings booking
       join authorized_properties scope on scope.property_id=booking.property_id
       join crays_core.clubs_units unit
         on unit.unit_id=booking.unit_id and unit.property_id=booking.property_id
        and unit.lifecycle not in ('suspended','archived')
       join crays_core.clubs_stays stay on stay.booking_id=booking.booking_id
       where booking.status='in_stay' and stay.status='checked_in'
       union all
       select 'service:'||selection.booking_service_selection_id||':'||selection.version,
         'service:'||selection.booking_service_selection_id sort_key,
         'service',selection.public_reference,booking.property_id,
         scope.property_name,booking.unit_id,selection.status,selection.version,
          40,'service_request_open',($5::timestamptz at time zone scope.timezone)::date::text,
          scope.partner_tenant_id,scope.operator_legal_entity_id,scope.store_id
       from crays_core.clubs_booking_service_selections selection
       join crays_core.clubs_bookings booking on booking.booking_id=selection.booking_id
       join authorized_properties scope on scope.property_id=booking.property_id
       join crays_core.clubs_units unit
         on unit.unit_id=booking.unit_id and unit.property_id=booking.property_id
        and unit.lifecycle not in ('suspended','archived')
       where selection.status='requested'
       union all
       select 'entitlement:'||entitlement.access_entitlement_id||':'||entitlement.version,
         'entitlement:'||entitlement.access_entitlement_id sort_key,
         'entitlement',entitlement.public_reference,booking.property_id,
         scope.property_name,booking.unit_id,entitlement.status,entitlement.version,
          40,'access_entitlement_pending',($5::timestamptz at time zone scope.timezone)::date::text,
          scope.partner_tenant_id,scope.operator_legal_entity_id,scope.store_id
       from crays_core.clubs_access_entitlements entitlement
       join crays_core.clubs_bookings booking on booking.booking_id=entitlement.booking_id
       join authorized_properties scope on scope.property_id=booking.property_id
       join crays_core.clubs_units unit
         on unit.unit_id=booking.unit_id and unit.property_id=booking.property_id
        and unit.lifecycle not in ('suspended','archived')
       where entitlement.status='pending'
          and entitlement.valid_from<=$5::timestamptz
          and entitlement.valid_until>$5::timestamptz
      ), ordered_items as (
        select row_number() over (
          order by priority,local_business_date,kind,sort_key,work_item_id
        )::integer ordinal,work_items.*
        from work_items
      ), snapshot_insert as (
        insert into crays_core.clubs_holiday_manager_shift_snapshots(
          shift_snapshot_id,actor_account_id,tenant_session_id,organization_id,
          query_revision,query_sha256,page_size,snapshot_at,expires_at,
          authorized_property_count,total_count)
        select $4,$1,$2,$3,$6,$7,$8,$5::timestamptz,now()+interval '10 minutes',
          (select count(*) from authorized_properties),count(*)
        from ordered_items
        returning total_count::text,authorized_property_count::text
      ), item_insert as (
        insert into crays_core.clubs_holiday_manager_shift_snapshot_items(
          shift_snapshot_id,ordinal,work_item_id,sort_key,kind,public_reference,
          partner_tenant_id,operator_legal_entity_id,store_id,property_id,
          property_name,unit_id,status,version,priority,reason_code,local_business_date)
        select $4,ordinal,work_item_id,sort_key,kind,public_reference,
          partner_tenant_id,operator_legal_entity_id,store_id,property_id,
          property_name,unit_id,status,version,priority,reason_code,local_business_date::date
        from ordered_items cross join snapshot_insert
        returning *
      ), page_items as (
        select * from item_insert order by ordinal limit $9
      ), continuation_insert as (
        insert into crays_core.clubs_holiday_manager_shift_snapshot_cursors(
          shift_snapshot_id,after_ordinal,continuation_token)
        select $4,max(boundary.ordinal),$10
        from (select ordinal from page_items order by ordinal limit $8) boundary
        having (select count(*) from page_items)>$8
        on conflict (shift_snapshot_id,after_ordinal) do update
          set continuation_token=clubs_holiday_manager_shift_snapshot_cursors.continuation_token
        returning continuation_token
      )
      select snapshot_insert.total_count,snapshot_insert.authorized_property_count,
        true snapshot_found,
        (select continuation_token from continuation_insert) next_continuation_token,
        coalesce(jsonb_agg(to_jsonb(page_items) - 'shift_snapshot_id' - 'created_at'
          - 'partner_tenant_id' - 'operator_legal_entity_id' - 'store_id'
          order by page_items.ordinal)
          filter (where page_items.work_item_id is not null),'[]'::jsonb) items
      from snapshot_insert left join page_items on true
      group by snapshot_insert.total_count,snapshot_insert.authorized_property_count`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      snapshotId,
      snapshotAt,
      queryRevision,
      querySha256,
      pageSize,
      pageSize + 1,
      candidateNextToken,
    ],
  );

  if (
    cursor
    && Number(result.rows[0]?.authorized_property_count ?? 0) > 0
    && result.rows[0]?.snapshot_found !== true
  ) {
    throw new Error("holiday_manager_shift_snapshot_expired_or_invalid");
  }
  const pageRows = result.rows[0]?.items ?? [];
  const hasNext = pageRows.length > pageSize;
  const visibleRows = pageRows.slice(0, pageSize);
  const last = visibleRows.at(-1);

  return {
    items: visibleRows.map((row) => ({
      workItemId: row.work_item_id,
      sortKey: row.sort_key,
      kind: row.kind,
      publicReference: row.public_reference,
      propertyId: row.property_id,
      propertyName: row.property_name,
      unitId: row.unit_id,
      status: row.status,
      version: row.version,
      priority: row.priority,
      reasonCode: row.reason_code,
      localBusinessDate: row.local_business_date,
      sourceAuthority: "crays-booking-core" as const,
      paymentState: "not_asserted" as const,
    })),
    totalCount: Number(result.rows[0]?.total_count ?? 0),
    authorityState: Number(result.rows[0]?.authorized_property_count ?? 0) > 0 ? "authorized" as const : "denied" as const,
    snapshotAt,
    truncated: hasNext,
    nextCursor: hasNext && last
        ? encodeHolidayManagerShiftCursor({
          snapshotId,
          snapshotAt,
          afterOrdinal: last.ordinal,
          pageSize,
          continuationToken: result.rows[0]?.next_continuation_token ?? candidateNextToken,
        })
      : null,
  };
}
