import {CLUBS_LOCALES, type ClubsLocale} from "@/lib/clubs/public-site";
import type { Metadata } from "next";
import { readPublicHospitalitySearchBootstrap } from "@/graphql/clubs/public-hospitality-page-bootstrap";
export const dynamic = "force-dynamic";

import {
  ClubsSearchPage,
  type ClubsSearchInitialState,
} from "@/components/crays-clubs/public/clubs-search-page";
import { ClubsPublicShell } from "@/components/crays-clubs/public/clubs-public-shell";

export const metadata: Metadata = {
  title: "Crays Forest City | Search",
  description:
    "Search Crays Forest City stays with dates, guests, filters, map and request-first booking.",
};

type SearchRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
}

function all(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function safeCount(value: string | string[] | undefined, fallback: number) {
  const raw = first(value);
  if (!raw.trim()) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function normalizeSort(value: string) {
  const aliases: Record<string, string> = {
    "price-desc": "price_desc",
    "price-asc": "price_asc",
    "capacity-desc": "guests_desc",
    "rating-desc": "rating_desc",
  };
  return aliases[value] ?? value;
}

export async function LocalizedSearchRoute({ searchParams }: SearchRouteProps, locale: ClubsLocale) {
  const query = await searchParams;
  const rawDateMode = first(query.date_mode, "any");
  const attributes = all(query.attribute);
  const typedPlaces = [...all(query.type), ...all(query.property_type)];
  const initialState: ClubsSearchInitialState = {
    destination: first(query.destination, "Forest City villas"),
    dateFrom: first(query.date_from),
    dateTo: first(query.date_to),
    guests: Math.max(1, safeCount(query.guests, 1)),
    guestsExplicit: first(query.guest_selection)==="explicit",
    children: safeCount(query.children, 0),
    pets: safeCount(query.pets, 0),
    nights: Math.max(1, safeCount(query.nights, 7)),
    range: safeCount(query.range, 0),
    dateMode:
      rawDateMode === "months" || (rawDateMode === "any" && (first(query.collection) === "clubs" || /Marina/i.test(first(query.destination)))) ? "months" : rawDateMode === "dates" || rawDateMode === "exact" || (rawDateMode === "any" && /Golf/i.test(first(query.destination))) ? "dates" : rawDateMode === "flexible" ? "flexible" : "any",
    calendarMonths: Math.min(12,Math.max(1,safeCount(query.calendar_months,1))),
    flexibleStay: first(query.flexible_stay, "week"),
    flexibleMonth: first(query.flexible_month),
    view: first(query.view, "tiles"),
    sort: normalizeSort(first(query.sort, "recommended")),
    collection: first(query.collection),
    activeAttributes: [...new Set(attributes)],
    activeTypes: [...new Set(typedPlaces)],
    priceMinimum: first(query.price_min) || first(query.minimum),
    priceMaximum: first(query.price_max) || first(query.maximum),
    bedrooms: safeCount(query.bedrooms, 0),
    beds: safeCount(query.beds, 0),
    bathrooms: safeCount(query.bathrooms, 0),
  };

  const initialAsOf=initialState.dateFrom || new Date().toISOString().slice(0,10);
  const [marina,golf]=await Promise.all([readPublicHospitalitySearchBootstrap("property-clubs-forest-city-marina",initialAsOf),readPublicHospitalitySearchBootstrap("property-clubs-forest-city-golf",initialAsOf)]);
  return (
    <ClubsPublicShell availableLocales={CLUBS_LOCALES} headerTone="navy" locale={locale}>
      <ClubsSearchPage locale={locale} key={JSON.stringify(initialState)} initialState={initialState} initialAsOf={initialAsOf} initialPublicContents={[marina.content,golf.content]} initialPublicRates={[marina.rate,golf.rate]} />
    </ClubsPublicShell>
  );
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";

