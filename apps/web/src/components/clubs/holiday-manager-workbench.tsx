import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Columns3,
  ListFilter,
  RotateCcw,
  Search,
  ShieldCheck,
  Table2,
} from "lucide-react";
import type { HolidayManagerReadModel } from "@/db/clubs-holiday-manager-repository";
import { PropertySavedViewControl } from "@/components/clubs/property-saved-view-control";
import { PropertyCollectionTable } from "@/components/clubs/property-collection-table";
import { BookingRequestQueue } from "@/components/clubs/booking-request-queue";
import { BookingLifecycleQueue } from "@/components/clubs/booking-lifecycle-queue";
import { QloBookingOperationsOverview } from "@/components/clubs/qlo-booking-operations-overview";
import { OwnerApplicationInvitationInbox } from "@/components/clubs/owner-application-invitation-inbox";
import { ServiceEntitlementQueue } from "@/components/clubs/service-entitlement-queue";
import { TeamHostLaunchControl } from "@/components/clubs/team-host-launch-control";
import { HolidayManagerTodayQueue } from "@/components/clubs/holiday-manager-today-queue";
import { ShiftFocusReturnLink } from "@/components/clubs/shift-focus-return-link";
import { LegacyCapacityRecoveryQueue } from "@/components/clubs/legacy-capacity-recovery-queue";
import { parseShiftWorkItemFocus } from "@/lib/clubs/shift-work-item-focus";

const lifecycles = ["draft", "review", "published", "suspended", "archived"] as const;
const lifecycleLabels: Record<string, string> = {
  draft: "Draft",
  review: "In review",
  published: "Published",
  suspended: "Suspended",
  archived: "Archived",
};

function queryHref(
  query: HolidayManagerReadModel["collection"]["query"],
  overrides: Record<string, string | null>,
) {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.lifecycle) params.set("lifecycle", query.lifecycle);
  if (query.recordType !== "all") params.set("recordType", query.recordType);
  params.set("mode", query.viewMode);
  params.set("pageSize", String(query.pageSize));
  Object.entries(overrides).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  return `/en/clubs/operations?${params.toString()}`;
}

function RecordCard({
  item,
}: {
  item: HolidayManagerReadModel["collection"]["items"][number];
}) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-[0_8px_24px_rgba(16,37,45,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,37,45,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          {item.recordType}
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">v{item.version}</span>
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-5">{item.name}</h3>
      <p className="mt-1 truncate font-mono text-xs text-[var(--muted-foreground)]">{item.code}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <span className="text-xs text-[var(--muted-foreground)]">
          {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(item.updatedAt))}
        </span>
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">v{item.version}</span>
      </div>
    </article>
  );
}

export function HolidayManagerWorkbench({
  readModel,
  focusWorkItemId,
  actorRole = "holiday-manager",
}: {
  readModel: HolidayManagerReadModel;
  focusWorkItemId?: string;
  actorRole?: "holiday-manager" | "crays-management" | "admin";
}) {
  const hasPortfolio = readModel.status === "ready";
  const managementFullAccess = actorRole === "crays-management" || actorRole === "admin";
  const { collection } = readModel;
  const filtersActive = Boolean(
    collection.query.search
    || collection.query.lifecycle
    || collection.query.recordType !== "all",
  );
  const invalidFocusRequested = Boolean(focusWorkItemId && !parseShiftWorkItemFocus(focusWorkItemId));

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <section id="clubs-property-workbench" className="scroll-mt-24 overflow-hidden rounded-2xl border border-black/10 bg-[linear-gradient(125deg,#ffffff_0%,#f3f8f7_65%,#e8f2f0_100%)] p-6 text-[var(--foreground)] shadow-[0_12px_34px_rgba(16,37,45,0.05)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-petrol)]">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {managementFullAccess
                ? "Clubs Management · Holiday operations"
                : "Holiday Manager · Property operations"}
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {managementFullAccess ? "Property operations workbench" : "Property workbench"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              Search and operate only the Properties and Units authorized by the active CRAYS Core tenant assignment.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/80 bg-white/80 px-4 py-3 backdrop-blur">
            <ShieldCheck className="h-5 w-5 text-[var(--color-petrol)]" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Authority</p>
              <p className="mt-0.5 text-sm font-semibold">{hasPortfolio ? "Tenant scope active" : "Scope closed"}</p>
            </div>
          </div>
        </div>
      </section>

      {readModel.status === "unavailable" ? (
        <section className="rounded-2xl border border-[#C8103E] bg-[#C8103E]/5 p-6" role="alert">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Operating data is temporarily unavailable</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            CRAYS Core could not resolve the authoritative portfolio. No cached or provider-side fallback data is shown.
          </p>
          <Link href="/en/clubs/operations" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8103E] bg-white px-4 text-sm font-semibold text-[#C8103E]">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry
          </Link>
        </section>
      ) : !hasPortfolio ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-8 text-center">
          <Building2 className="mx-auto h-7 w-7 text-[var(--muted-foreground)]" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Property assignment required</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
            No Clubs Property is authorized for this account and tenant. Operational records remain closed until an active assignment exists.
          </p>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <main className="min-w-0 space-y-4">
            {managementFullAccess ? <OwnerApplicationInvitationInbox /> : null}
            <QloBookingOperationsOverview />
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7" aria-label="Current authorized Booking Core operations">
              {[
                ["Open requests", readModel.operationalSnapshot.openBookingRequests],
                ["Arrivals today", readModel.operationalSnapshot.arrivalsToday],
                ["Departures today", readModel.operationalSnapshot.departuresToday],
                ["Active stays", readModel.operationalSnapshot.activeStays],
                ["Service work", readModel.operationalSnapshot.pendingServiceWork],
                ["30-day availability", readModel.operationalSnapshot.availableCapacityNightsNext30],
                ["30-day occupancy", readModel.operationalSnapshot.occupancyNext30BasisPoints === null
                  ? "—"
                  : `${(readModel.operationalSnapshot.occupancyNext30BasisPoints / 100).toFixed(1)}%`],
              ].map(([label, value]) => (
                <article key={label} className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-[0_8px_24px_rgba(16,37,45,0.04)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    {label.toString().startsWith("30-day") ? "next 30 local inventory dates" : "CRAYS Booking Core · live read"}
                  </p>
                </article>
              ))}
            </section>
            {!managementFullAccess ? (
              <>
                <HolidayManagerTodayQueue />
                <LegacyCapacityRecoveryQueue />
                {invalidFocusRequested ? (
                  <section className="rounded-xl border border-[#C8103E] bg-[#C8103E]/5 p-4 text-sm" role="alert">
                    The requested Today record reference is invalid. No record was selected. <ShiftFocusReturnLink className="font-semibold text-[var(--color-petrol)] underline" />
                  </section>
                ) : null}
              </>
            ) : null}
            <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[0_10px_30px_rgba(16,37,45,0.04)] sm:p-5">
              <form action="/en/clubs/operations" method="get" className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_170px_150px_auto]">
                <label className="relative block">
                  <span className="sr-only">Search Properties and Units</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" aria-hidden="true" />
                  <input
                    name="q"
                    defaultValue={collection.query.search}
                    placeholder="Search name or code"
                    className="h-11 w-full rounded-lg border border-[var(--border)] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[var(--color-petrol)] focus:ring-2 focus:ring-[var(--color-petrol)]/15"
                  />
                </label>
                <label>
                  <span className="sr-only">Lifecycle</span>
                  <select name="lifecycle" defaultValue={collection.query.lifecycle ?? ""} className="h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-petrol)] focus:ring-2 focus:ring-[var(--color-petrol)]/15">
                    <option value="">All lifecycle states</option>
                    {lifecycles.map((lifecycle) => <option key={lifecycle} value={lifecycle}>{lifecycleLabels[lifecycle]}</option>)}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Record type</span>
                  <select name="recordType" defaultValue={collection.query.recordType} className="h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-petrol)] focus:ring-2 focus:ring-[var(--color-petrol)]/15">
                    <option value="all">Properties & Units</option>
                    <option value="property">Properties only</option>
                    <option value="unit">Units only</option>
                  </select>
                </label>
                <input type="hidden" name="mode" value={collection.query.viewMode} />
                <input type="hidden" name="pageSize" value={collection.query.pageSize} />
                <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--color-petrol)] px-4 text-sm font-semibold text-white transition hover:brightness-95">
                  <ListFilter className="h-4 w-4" aria-hidden="true" /> Apply
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <div className="flex items-center gap-2" aria-label="View mode">
                  <Link
                    href={queryHref(collection.query, { mode: "table", cursor: null })}
                    aria-current={collection.query.viewMode === "table" ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${collection.query.viewMode === "table" ? "bg-[var(--foreground)] text-white" : "bg-[var(--surface-subtle)] text-[var(--foreground)] hover:bg-black/10"}`}
                  >
                    <Table2 className="h-4 w-4" aria-hidden="true" /> Table
                  </Link>
                  <Link
                    href={queryHref(collection.query, { mode: "board", cursor: null })}
                    aria-current={collection.query.viewMode === "board" ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${collection.query.viewMode === "board" ? "bg-[var(--foreground)] text-white" : "bg-[var(--surface-subtle)] text-[var(--foreground)] hover:bg-black/10"}`}
                  >
                    <Columns3 className="h-4 w-4" aria-hidden="true" /> Board
                  </Link>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                  <label className="flex items-center gap-2">
                    <span>Rows</span>
                    <select
                      form="clubs-page-size-form"
                      name="pageSize"
                      defaultValue={collection.query.pageSize}
                      className="h-11 rounded-lg border border-[var(--border)] bg-white px-2 text-sm text-[var(--foreground)]"
                    >
                      {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                  <form id="clubs-page-size-form" action="/en/clubs/operations" method="get">
                    {collection.query.search ? <input type="hidden" name="q" value={collection.query.search} /> : null}
                    {collection.query.lifecycle ? <input type="hidden" name="lifecycle" value={collection.query.lifecycle} /> : null}
                    {collection.query.recordType !== "all" ? <input type="hidden" name="recordType" value={collection.query.recordType} /> : null}
                    <input type="hidden" name="mode" value={collection.query.viewMode} />
                    <button type="submit" className="min-h-11 rounded-lg border border-[var(--border)] bg-white px-2.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-subtle)]">Set</button>
                  </form>
                  {filtersActive ? <Link href="/en/clubs/operations" className="inline-flex min-h-11 items-center px-2 font-semibold text-[var(--color-petrol)] hover:underline">Clear filters</Link> : null}
                </div>
              </div>
            </section>

            {collection.resultStatus === "no_results" ? (
              <section className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-10 text-center">
                <Search className="mx-auto h-6 w-6 text-[var(--muted-foreground)]" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-semibold">No matching records</h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Adjust the search or filters. Your authorized portfolio remains unchanged.</p>
                <Link href="/en/clubs/operations" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 text-sm font-semibold">Reset collection</Link>
              </section>
            ) : collection.resultStatus === "empty" ? (
              <section className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-10 text-center">
                <Building2 className="mx-auto h-6 w-6 text-[var(--muted-foreground)]" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-semibold">No Property records yet</h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">The authorized scope is active, but it does not contain a Property or Unit record.</p>
              </section>
            ) : collection.query.viewMode === "table" ? (
              <PropertyCollectionTable items={collection.items} />
            ) : (
              <section className="overflow-x-auto pb-2" aria-label="Property lifecycle board">
                <div className="grid min-w-[1120px] grid-cols-5 gap-3">
                  {lifecycles.map((lifecycle) => {
                    const items = collection.items.filter((item) => item.lifecycle === lifecycle);
                    return (
                      <section key={lifecycle} className="rounded-2xl bg-[var(--surface-subtle)] p-3" aria-labelledby={`clubs-board-${lifecycle}`}>
                        <div className="flex items-center justify-between gap-2 px-1 py-1">
                          <h2 id={`clubs-board-${lifecycle}`} className="text-sm font-semibold">{lifecycleLabels[lifecycle]}</h2>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">{items.length}</span>
                        </div>
                        <div className="mt-3 space-y-3">
                          {items.map((item) => <RecordCard key={`${item.recordType}:${item.recordId}`} item={item} />)}
                          {!items.length ? <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted-foreground)]">No records</p> : null}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            )}

            {collection.nextCursor || collection.query.cursor ? (
              <nav className="flex items-center justify-end gap-2" aria-label="Collection pagination">
                {collection.query.cursor ? (
                  <Link
                    href={queryHref(collection.query, { cursor: null })}
                    className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-[var(--surface-subtle)]"
                  >
                    First page
                  </Link>
                ) : null}
                {collection.nextCursor ? (
                  <Link
                    href={queryHref(collection.query, { cursor: collection.nextCursor })}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-[var(--surface-subtle)]"
                  >
                    Next {collection.query.pageSize} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </nav>
            ) : null}
            <BookingRequestQueue focusWorkItemId={focusWorkItemId} />
            <BookingLifecycleQueue focusWorkItemId={focusWorkItemId} />
            <ServiceEntitlementQueue
              focusWorkItemId={focusWorkItemId}
              properties={readModel.properties.map((property) => ({
                propertyId: property.propertyId,
                name: property.propertyName,
              }))}
            />
          </main>

          <div className="space-y-4">
            <TeamHostLaunchControl
              properties={readModel.properties.map((property) => ({
                propertyId: property.propertyId,
                name: property.propertyName,
                qloReady: property.qloReady,
              }))}
            />
            <PropertySavedViewControl query={collection.query} savedViews={readModel.savedViews} />
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Portfolio scope</p>
              <p className="mt-2 text-2xl font-semibold">{readModel.properties.length}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">authorized {readModel.properties.length === 1 ? "Property" : "Properties"}</p>
              <p className="mt-4 text-xs leading-5 text-[var(--muted-foreground)]">
                Source: CRAYS Core · refreshed {new Intl.DateTimeFormat("en-GB", { timeStyle: "short" }).format(new Date(readModel.freshness))}
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
