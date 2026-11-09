import { getCorePgPool } from "@/db/client";
import {
  decodeClubsPropertyCursor,
  encodeClubsPropertyCursor,
  normalizeClubsPropertyCollectionQuery,
} from "@/lib/clubs/property-collection-query";

export type HolidayManagerPropertySummary = {
  propertyId: string;
  storeId: string;
  propertyName: string;
  partnerTenantId: string;
  legalEntityId: string;
  lifecycle: string;
  assignmentVersion: number;
  providerBindingVersion: number | null;
  qloReady: boolean;
  nextcloudReady: boolean;
};

export type HolidayManagerReadModel = {
  status: "ready" | "empty" | "unavailable";
  properties: HolidayManagerPropertySummary[];
  source: "crays-core";
  freshness: string;
  collection: {
    items: Array<{
      recordType: "property" | "unit";
      recordId: string;
      propertyId: string;
      name: string;
      code: string;
      lifecycle: string;
      version: number;
      updatedAt: string;
    }>;
    query: ReturnType<typeof normalizeClubsPropertyCollectionQuery>;
    nextCursor: string | null;
    resultStatus: "ready" | "empty" | "no_results";
  };
  savedViews: Array<{
    savedViewId: string;
    name: string;
    search: string;
    lifecycle: string | null;
    recordType: string;
    viewMode: "table" | "board";
    pageSize: number;
    version: number;
  }>;
  operationalSnapshot: {
    openBookingRequests: number;
    arrivalsToday: number;
    departuresToday: number;
    activeStays: number;
    pendingServiceWork: number;
    availableCapacityNightsNext30: number;
    occupancyNext30BasisPoints: number | null;
    source: "crays-booking-core";
  };
};

export const emptyHolidayManagerOperationalSnapshot = {
  openBookingRequests: 0,
  arrivalsToday: 0,
  departuresToday: 0,
  activeStays: 0,
  pendingServiceWork: 0,
  availableCapacityNightsNext30: 0,
  occupancyNext30BasisPoints: null,
  source: "crays-booking-core" as const,
};

export async function getHolidayManagerReadModel(
  accountId: string | null | undefined,
  organizationId: string | null | undefined,
  rawQuery: {
    search?: string | null;
    lifecycle?: string | null;
    recordType?: string | null;
    viewMode?: string | null;
    cursor?: string | null;
    pageSize?: number | string | null;
  } = {},
  roleKey: "holiday-manager" | "crays-management" | "admin" = "holiday-manager",
): Promise<HolidayManagerReadModel> {
  const query = normalizeClubsPropertyCollectionQuery(rawQuery);
  const emptyCollection = {
    items: [],
    query,
    nextCursor: null,
    resultStatus: "empty" as const,
  };
  if (!accountId || !organizationId) {
    return {
      status: "empty",
      properties: [],
      source: "crays-core",
      freshness: new Date().toISOString(),
      collection: emptyCollection,
      savedViews: [],
      operationalSnapshot: emptyHolidayManagerOperationalSnapshot,
    };
  }

  try {
    const pool = getCorePgPool();
    const authorizedPropertyScopeSql = `
      select distinct
        p.property_id,
        p.public_slug,
        p.lifecycle,
        p.version,
        p.updated_at,
        s.store_id,
        s.display_name property_name,
        s.timezone,
        assignment.assignment_id,
        assignment.partner_tenant_id,
        assignment.operator_legal_entity_id,
        assignment.version assignment_version,
        binding.binding_version,
        binding.qlo_shop_id,
        binding.qlo_hotel_id,
        binding.nextcloud_tenant_group_id
      from crays_core.clubs_properties p
      join crays_core.stores s
        on s.store_id=p.store_id and s.vertical_root='clubs'
      join crays_core.store_operator_assignments assignment
        on assignment.store_id=s.store_id
       and assignment.vertical_root='clubs'
       and assignment.status='active'
       and assignment.valid_from<=now()
       and (assignment.valid_until is null or assignment.valid_until>now())
      join crays_core.franchise_operator_tenants operator
        on operator.partner_tenant_id=assignment.partner_tenant_id
       and operator.status='active'
      left join lateral (
        select b.binding_version,b.qlo_shop_id,b.qlo_hotel_id,b.nextcloud_tenant_group_id
        from crays_core.provider_scope_bindings b
        where b.assignment_id=assignment.assignment_id
          and b.assignment_version=assignment.version
          and b.status='active'
        order by b.binding_version desc
        limit 1
      ) binding on true
      where p.lifecycle not in ('suspended','archived')
        and ((
        $3='holiday-manager' and operator.organization_id=$2 and exists (
          select 1
          from crays_core.partner_role_scopes scope
          join crays_core.role_assignments role_assignment
            on role_assignment.assignment_id=scope.role_assignment_id
           and role_assignment.organization_id=$2
           and role_assignment.status='active'
          where scope.account_id=$1
            and scope.property_id=p.property_id
            and scope.partner_tenant_id=assignment.partner_tenant_id
            and scope.operator_legal_entity_id=assignment.operator_legal_entity_id
            and scope.role_key='holiday-manager'
            and scope.vertical_root='clubs'
            and scope.relationship_type='clubs-franchise-partner'
            and scope.status='active'
            and scope.valid_from<=now()
            and (scope.valid_until is null or scope.valid_until>now())
        )
      ) or (
        $3 in ('crays-management','admin')
        and operator.organization_id=$2
        and exists (
          select 1
          from crays_core.organization_memberships membership
          join crays_core.role_assignments role_assignment
            on role_assignment.account_id=membership.account_id
           and role_assignment.organization_id=membership.organization_id
           and role_assignment.role_key=membership.role_key
           and role_assignment.status='active'
          where membership.account_id=$1
            and membership.organization_id=$2
            and membership.role_key=$3
            and membership.status='active'
        )
      ))`;
    const result = await pool.query<{
      property_id: string;
      store_id: string;
      property_name: string;
      partner_tenant_id: string;
      operator_legal_entity_id: string;
      lifecycle: string;
      assignment_version: number;
      binding_version: number | null;
      qlo_shop_id: string | null;
      qlo_hotel_id: string | null;
      nextcloud_tenant_group_id: string | null;
    }>(
      `with authorized_property_scope as (${authorizedPropertyScopeSql})
       select
         property_id,
         store_id,
         property_name,
         partner_tenant_id,
         operator_legal_entity_id,
         lifecycle,
         assignment_version,
         binding_version,
         qlo_shop_id,
         qlo_hotel_id,
         nextcloud_tenant_group_id
       from authorized_property_scope
       order by property_name,property_id`,
      [accountId, organizationId, roleKey],
    );

    const properties = result.rows.map((row) => ({
      propertyId: row.property_id,
      storeId: row.store_id,
      propertyName: row.property_name,
      partnerTenantId: row.partner_tenant_id,
      legalEntityId: row.operator_legal_entity_id,
      lifecycle: row.lifecycle,
      assignmentVersion: row.assignment_version,
      providerBindingVersion: row.binding_version,
      qloReady: Boolean(row.qlo_shop_id && row.qlo_hotel_id && row.binding_version),
      nextcloudReady: Boolean(row.nextcloud_tenant_group_id && row.binding_version),
    }));

    const cursor = decodeClubsPropertyCursor(query.cursor);
    const [collectionResult, savedViewsResult, operationalSnapshotResult] = await Promise.all([
      pool.query<{
        record_type: "property" | "unit";
        record_id: string;
        property_id: string;
        name: string;
        code: string;
        lifecycle: string;
        version: number;
        updated_at: Date;
      }>(
        `with authorized_property_scope as (${authorizedPropertyScopeSql}),
         authorized_properties as (
           select property_id,public_slug,lifecycle,version,updated_at
           from authorized_property_scope
         ), records as (
           select 'property'::text record_type,p.property_id record_id,
             p.property_id,pv.canonical_name name,
             coalesce(p.public_slug,p.property_id) code,p.lifecycle,p.version,p.updated_at
           from authorized_properties p
           join crays_core.clubs_property_versions pv
             on pv.property_id=p.property_id and pv.version=p.version
           union all
           select 'unit'::text,u.unit_id,u.property_id,uv.canonical_name,
             u.canonical_code,u.lifecycle,u.version,u.updated_at
           from crays_core.clubs_units u
           join authorized_properties p on p.property_id=u.property_id
           join crays_core.clubs_unit_versions uv
             on uv.unit_id=u.unit_id and uv.version=u.version
         )
         select * from records
         where ($4='' or name ilike '%' || $4 || '%' or code ilike '%' || $4 || '%')
           and ($5::text is null or lifecycle=$5)
           and ($6='all' or record_type=$6)
           and (
             $7::timestamptz is null
             or (updated_at,record_type,record_id) < ($7::timestamptz,$8,$9)
           )
         order by updated_at desc,record_type desc,record_id desc
         limit $10`,
        [
          accountId,
          organizationId,
          roleKey,
          query.search,
          query.lifecycle,
          query.recordType,
          cursor?.updatedAt ?? null,
          cursor?.recordType ?? "",
          cursor?.recordId ?? "",
          query.pageSize + 1,
        ],
      ),
      pool.query<{
        saved_view_id: string;
        name: string;
        search_text: string;
        lifecycle_filter: string | null;
        record_type_filter: string;
        view_mode: "table" | "board";
        page_size: number;
        version: number;
      }>(
        `select saved_view_id,name,search_text,lifecycle_filter,record_type_filter,
           view_mode,page_size,version
         from crays_core.clubs_property_saved_views
         where owner_account_id=$1 and organization_id=$2 and status='active'
         order by name`,
        [accountId, organizationId],
      ),
      pool.query<{
        open_booking_requests: string;
        arrivals_today: string;
        departures_today: string;
        active_stays: string;
        pending_service_work: string;
        available_capacity_nights_next_30: string;
        occupancy_next_30_basis_points: string | null;
      }>(
        `with authorized_property_scope as (${authorizedPropertyScopeSql}),
         authorized_properties as (
           select property_id,timezone
           from authorized_property_scope
         ), inventory_metrics as (
           select
             coalesce(sum(day.total_capacity-day.held_capacity-day.booked_capacity),0) available_capacity,
             coalesce(sum(day.total_capacity),0) total_capacity,
             coalesce(sum(day.booked_capacity),0) booked_capacity
           from crays_core.clubs_inventory_days day
           join crays_core.clubs_units unit on unit.unit_id=day.unit_id
           join authorized_properties scope on scope.property_id=unit.property_id
           where day.local_date between (now() at time zone day.timezone)::date
             and (now() at time zone day.timezone)::date + 29
             and day.timezone=scope.timezone
             and unit.lifecycle not in ('suspended','archived')
         )
         select
           (select count(*) from crays_core.clubs_booking_requests request
             join authorized_properties scope on scope.property_id=request.property_id
             where request.status in ('submitted','under_review'))::text open_booking_requests,
           (select count(*) from crays_core.clubs_bookings booking
             join authorized_properties scope on scope.property_id=booking.property_id
             join crays_core.clubs_reservations reservation on reservation.reservation_id=booking.reservation_id
             where booking.status in ('confirmed','change_requested','in_stay')
               and reservation.arrival_date=(now() at time zone scope.timezone)::date)::text arrivals_today,
           (select count(*) from crays_core.clubs_bookings booking
             join authorized_properties scope on scope.property_id=booking.property_id
             join crays_core.clubs_reservations reservation on reservation.reservation_id=booking.reservation_id
             where booking.status in ('confirmed','change_requested','in_stay')
               and reservation.departure_date=(now() at time zone scope.timezone)::date)::text departures_today,
           (select count(*) from crays_core.clubs_stays stay
             join crays_core.clubs_bookings booking on booking.booking_id=stay.booking_id
             join authorized_properties scope on scope.property_id=booking.property_id
             where stay.status='checked_in')::text active_stays,
           ((select count(*) from crays_core.clubs_booking_service_selections selection
             join crays_core.clubs_bookings booking on booking.booking_id=selection.booking_id
             join authorized_properties scope on scope.property_id=booking.property_id
             where selection.status='requested')
            +
            (select count(*) from crays_core.clubs_access_entitlements entitlement
            join crays_core.clubs_bookings booking on booking.booking_id=entitlement.booking_id
             join authorized_properties scope on scope.property_id=booking.property_id
             where entitlement.status='pending' and entitlement.valid_until>now()))::text pending_service_work,
           (select available_capacity::text from inventory_metrics) available_capacity_nights_next_30,
           (select case when total_capacity=0 then null
             else round(booked_capacity*10000.0/total_capacity)::integer::text end
             from inventory_metrics) occupancy_next_30_basis_points`,
        [accountId, organizationId, roleKey],
      ),
    ]);
    const hasNext = collectionResult.rows.length > query.pageSize;
    const visibleRows = collectionResult.rows.slice(0, query.pageSize);
    const last = visibleRows.at(-1);
    const items = visibleRows.map((row) => ({
      recordType: row.record_type,
      recordId: row.record_id,
      propertyId: row.property_id,
      name: row.name,
      code: row.code,
      lifecycle: row.lifecycle,
      version: row.version,
      updatedAt: row.updated_at.toISOString(),
    }));

    return {
      status: properties.length ? "ready" : "empty",
      properties,
      source: "crays-core",
      freshness: new Date().toISOString(),
      collection: {
        items,
        query,
        nextCursor:
          hasNext && last
            ? encodeClubsPropertyCursor({
                updatedAt: last.updated_at.toISOString(),
                recordType: last.record_type,
                recordId: last.record_id,
              })
            : null,
        resultStatus:
          items.length > 0
            ? "ready"
            : query.search || query.lifecycle || query.recordType !== "all"
              ? "no_results"
              : "empty",
      },
      savedViews: savedViewsResult.rows.map((row) => ({
        savedViewId: row.saved_view_id,
        name: row.name,
        search: row.search_text,
        lifecycle: row.lifecycle_filter,
        recordType: row.record_type_filter,
        viewMode: row.view_mode,
        pageSize: row.page_size,
        version: row.version,
      })),
      operationalSnapshot: operationalSnapshotResult.rows[0]
        ? {
            openBookingRequests: Number(operationalSnapshotResult.rows[0].open_booking_requests),
            arrivalsToday: Number(operationalSnapshotResult.rows[0].arrivals_today),
            departuresToday: Number(operationalSnapshotResult.rows[0].departures_today),
            activeStays: Number(operationalSnapshotResult.rows[0].active_stays),
            pendingServiceWork: Number(operationalSnapshotResult.rows[0].pending_service_work),
            availableCapacityNightsNext30: Number(operationalSnapshotResult.rows[0].available_capacity_nights_next_30),
            occupancyNext30BasisPoints: operationalSnapshotResult.rows[0].occupancy_next_30_basis_points === null
              ? null
              : Number(operationalSnapshotResult.rows[0].occupancy_next_30_basis_points),
            source: "crays-booking-core",
          }
        : emptyHolidayManagerOperationalSnapshot,
    };
  } catch {
    return {
      status: "unavailable",
      properties: [],
      source: "crays-core",
      freshness: new Date().toISOString(),
      collection: {
        ...emptyCollection,
        resultStatus:
          query.search || query.lifecycle || query.recordType !== "all"
            ? "no_results"
            : "empty",
      },
      savedViews: [],
      operationalSnapshot: emptyHolidayManagerOperationalSnapshot,
    };
  }
}
