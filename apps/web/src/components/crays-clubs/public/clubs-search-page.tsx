"use client";
import {hospitalityCount,hospitalityDate,hospitalityGuestSummary,hospitalityMonthLabel,hospitalityWeekdays,hospitalityWhoSummary,hospitalityDayTolerance} from "./hospitality-locale-format";
import {hospitalityUiMessages} from "./hospitality-ui-messages";
import type {ClubsLocale} from "@/lib/clubs/public-site";
import {TodayLocaleProvider, TodayLocalizedContent} from "./today-localized-content";

import { readCoreHotelView, type CoreHotelView, type CoreHotelId } from "@/lib/member-commerce/core-public-hospitality-view";

import {parsePublicHotelBaseSale, publicHotelBaseSaleDisplay} from "@/lib/member-commerce/public-hotel-base-sale-client";
import { HospitalityImage as Image } from "./hospitality-image";
import Link from "next/link";
import { hotelDirectApplicationHref } from "@/lib/member-commerce/hotel-direct-application-link";
import { ClubsMembershipProcessNotice } from "./clubs-membership-process-notice";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  UsersRound,
  Bath,
  BedDouble,
  Maximize,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Grid2X2,
  Heart,
  House,
  List,
  LayoutGrid,
  Map,
  MapPin,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trees,
  Utensils,
  WashingMachine,
  X,
  Zap,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  editorialArticles,
  exploreCards,
  filterGroups,
  forestCityFacts,
  forestCityHighlights,
  forestCityZoneBenefits,
  searchCollections,
  searchDestinations,
  searchFaq,
  searchPromos,
  searchReviews,
  searchTrust,
} from "./clubs-search-copy";
import { MARINA_EARLIEST_ARRIVAL } from "@/lib/member-commerce/hotel-stay-policy";
import { addStayCalendarMonths } from "@/lib/member-commerce/clubs-calendar-month-stay";
import { buildDetailHref } from "./clubs-property-detail-contract";
import styles from "./clubs-search-page.module.css";

export type ClubsSearchInitialState = {
  destination: string;
  dateFrom: string;
  dateTo: string;
  guests: number;
  children: number;
  pets: number;
  nights: number;
  range: number;
  dateMode: "any" | "months" | "dates" | "flexible";
  calendarMonths?: number;
  guestsExplicit?: boolean;
  flexibleStay: string;
  flexibleMonth: string;
  view: string;
  sort: string;
  collection: string;
  activeAttributes: string[];
  activeTypes: string[];
  priceMinimum: string;
  priceMaximum: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
};

type ClubsSearchPageProps = {
  locale?: ClubsLocale;
  initialState: ClubsSearchInitialState;
  initialAsOf?: string;
  initialPublicContents?: unknown[];
  initialPublicRates?: unknown[];
};

// Resolve plural presentation before inserting the count, so dictionary lookup is stable.
function searchCountText(locale: ClubsLocale, count: number, single: string, plural: string) {
  const key = count === 1 ? single : plural;
  return (hospitalityUiMessages[locale][key] ?? key).replace("{count}", String(count));
}

function searchHotelLabel(locale: ClubsLocale, key: string, hotel: string) {
  return (hospitalityUiMessages[locale][key] ?? key).replace("{hotel}", hotel);
}

type OpenPanel = "dates" | "guests" | "filters" | null;
type ViewMode = "tiles" | "list" | "map";

const propertyRoutes = [
  { id: "property-clubs-forest-city-marina", variant: "marina" },
  { id: "property-clubs-forest-city-golf", variant: "golf" },
] as const;
type SearchProperty = {id:CoreHotelId;variant:"marina"|"golf";title:string;location:string};

type PropertyRateDisplay = {
  access: string;
  displayUsdMinor: number | null;
  rateStatus: string;
  stayPolicy: string;
};

type SearchMediaPlacement =
  | "golfCard"
  | "golfCollection"
  | "golfEditorial"
  | "golfPromo"
  | "golfDestination"
  | "golfDestinationLegacyCourse"
  | "golfEditorialClearStayInformation"
  | "golfPromoForestCityProperties"
  | "golfPublicHotelStays"
  | "marinaCard"
  | "marinaDestination"
  | "marinaDestinationWaterfront"
  | "marinaEditorialCollections"
  | "marinaEditorialSearchMap"
  | "marinaForestCityOverview"
  | "marinaHospitality"
  | "marinaMemberMonthlyStays"
  | "marinaPromoBookAndRelax"
  | "marinaSfzContext";

type SearchMediaItem = {
  maxCssWidth?: number;
  alt: string;
  focalPoint: { x: number; y: number };
  publicPath: string;
};

type PublicInquiryType = "golf_tourism" | "mice_event";
type PublicInquiryState =
  | "idle"
  | "checking"
  | "ready"
  | "submitting"
  | "reconciling"
  | "persisted"
  | "not_found"
  | "validation_error"
  | "conflict"
  | "unavailable"
  | "unknown_outcome";

type PublicInquiryConfig = {
  dataProtectionHref?: unknown;
  destination?: unknown;
  inquiryTypes?: unknown;
  privacyHref?: unknown;
  privacyNoticeVersion?: unknown;
  schemaVersion?: unknown;
  status?: unknown;
};

type PublicInquiryPayload = {
  inquiryType: PublicInquiryType;
  contactName: string;
  contactEmail: string;
  organizationName: string | null;
  countryOrRegion: string;
  preferredStartDate: string | null;
  preferredEndDate: string | null;
  participantCount: number;
  message: string;
  privacyNoticeVersion: string;
  privacyConsent: true;
  contactConsent: true;
};

type PublicInquiryResponse = {
  confirmationStatus?: unknown;
  persisted?: unknown;
  providerDeliveryClaimed?: unknown;
  publicReference?: unknown;
  reconciled?: unknown;
  reconciliationStatus?: unknown;
  status?: unknown;
  teamQueueStatus?: unknown;
};

const searchMediaPlacements: readonly SearchMediaPlacement[] = ["golfCard", "golfCollection", "golfEditorial", "golfPromo", "golfDestination", "golfDestinationLegacyCourse", "golfEditorialClearStayInformation", "golfPromoForestCityProperties", "golfPublicHotelStays", "marinaCard", "marinaDestination", "marinaDestinationWaterfront", "marinaEditorialCollections", "marinaEditorialSearchMap", "marinaForestCityOverview", "marinaHospitality", "marinaMemberMonthlyStays", "marinaPromoBookAndRelax", "marinaSfzContext"];

const promoMediaKeys = [
  "golfPromo",
  "marinaPromoBookAndRelax",
  "golfPromoForestCityProperties",
] as const satisfies readonly SearchMediaPlacement[];

const destinationMediaKeys = [
  "marinaDestination",
  "golfDestination",
  "marinaDestinationWaterfront",
  "golfDestinationLegacyCourse",
] as const satisfies readonly SearchMediaPlacement[];

const collectionMediaKeys = [
  "golfPublicHotelStays",
  "marinaMemberMonthlyStays",
  "golfCollection",
  "marinaHospitality",
] as const satisfies readonly SearchMediaPlacement[];

const editorialMediaKeys = [
  "golfEditorial",
  "marinaEditorialCollections",
  "marinaEditorialSearchMap",
  "golfEditorialClearStayInformation",
] as const satisfies readonly SearchMediaPlacement[];

const initialRateDisplay: Record<SearchProperty["id"], PropertyRateDisplay> = {
  "property-clubs-forest-city-marina": {
    access: "Membership and admission are checked separately.",
    displayUsdMinor: null,
    rateStatus: "Rate currently unavailable",
    stayPolicy: "Members only · Monthly stays",
  },
  "property-clubs-forest-city-golf": {
    access: "Availability is checked separately.",
    displayUsdMinor: null,
    rateStatus: "Rate currently unavailable",
    stayPolicy: "Weekly and monthly rates available",
  },
};

const recommendedFilters = [
  { label: "Kitchen", Icon: Utensils },
  { label: "Washer", Icon: WashingMachine },
  { label: "Instant request", Icon: Zap },
  { label: "1+ bathrooms", Icon: Bath },
] as const;
const placeTypes = [
  "Any property",
  "Hotel",
  "Golf hotel",
  "Marina hotel",
] as const;
const placeTypeIcons = [LayoutGrid, House, Trees, Building2] as const;
const exploreIcons = [MapPin, Sparkles, CircleUserRound, Building2] as const;
const collectionItems = [
  { href: "/en/search", label: "All", value: "all" },
  {
    href: "/en/search?collection=clubs",
    label: "Forest City Crays Club",
    value: "clubs",
  },
  {
    href: "/en/search?collection=hotels",
    label: "Crays Partner Hotels",
    value: "hotels",
  },
  {
    href: "/en/search?collection=villas",
    label: "Crays Partner Villas",
    value: "villas",
  },
  {
    href: "/en/search?collection=co-working",
    label: "Crays Co-Working",
    value: "co-working",
  },
  {
    href: "/en/search?collection=co-living",
    label: "Crays Co-Living",
    value: "co-living",
  },
  {
    href: "/en/search?collection=experiences",
    label: "Experiences",
    value: "experiences",
  },
  {
    href: "/en/search?collection=services",
    label: "Services",
    value: "services",
  },
] as const;

const destinationOpportunities = [
  {
    type: "golf_tourism",
    kicker: "Golf tourism",
    title: "Build a complete Forest City golf journey.",
    lead:
      "Forest City Golf Resort brings 36 holes, two distinct courses, a driving range, an academy and resort hospitality into one coastal base.",
    image: "/__crays-clubs/search-v2695/01-forest-city-golf-tourism.png",
    alt: "Creative visual of an international golf group at a tropical coastal resort",
    facts: [
      "Jack Nicklaus Legacy Course",
      "LGK Classic Course",
      "Driving range and academy",
      "Golf-hotel stays and dining",
    ],
    formats: [
      "Hosted golf groups",
      "Multi-round stays",
      "Coaching and practice time",
      "Corporate golf days",
      "Partner and client trips",
      "Golf plus meetings or leisure",
    ],
    cta: "Request a golf programme",
    boundary:
      "Tee times, coaching, transport, rooms, dining and prices are confirmed for each request.",
  },
  {
    type: "mice_event",
    kicker: "MICE & events",
    title: "Bring your next gathering to the coast.",
    lead:
      "Forest City brings meetings, incentives, conferences and exhibitions together with hotel accommodation and access near the Malaysia–Singapore Second Link.",
    image: "/__crays-clubs/search-v2695/02-forest-city-mice-events.png",
    alt: "Creative visual of an international business event in a contemporary coastal venue",
    facts: [
      "Marina and golf-hotel venues",
      "Conference and function spaces",
      "Accommodation and dining",
      "Regional access near Singapore",
    ],
    formats: [
      "Leadership offsites",
      "Conferences and conventions",
      "Trade shows and exhibitions",
      "Product and brand launches",
      "Corporate, Web3 and crypto-community events",
      "Incentives and celebrations",
    ],
    cta: "Plan an event",
    boundary:
      "Venue capacity, production, suppliers, travel, rooms, catering and pricing are confirmed after your brief.",
  },
] as const satisfies readonly {
  type: PublicInquiryType;
  kicker: string;
  title: string;
  lead: string;
  image: string;
  alt: string;
  facts: readonly string[];
  formats: readonly string[];
  cta: string;
  boundary: string;
}[];

function normalizeView(value: string): ViewMode {
  if (value === "list" || value === "map") return value;
  return "tiles";
}

function pluralizeGuests(value: number) {
  return `${value} ${value === 1 ? "guest" : "guests"}`;
}

function mediaPosition(media: SearchMediaItem) {
  return `${media.focalPoint.x * 100}% ${media.focalPoint.y * 100}%`;
}

function mergeSearchHref(href: string, current: URLSearchParams) {
  const target = new URL(href, "https://www.craysclub.com");
  const params = new URLSearchParams(current);
  target.searchParams.forEach((value, key) => {
    params.delete(key);
    params.append(key, value);
  });
  return `/en/search?${params.toString()}`;
}

function formatGuestSummary(adults: number, children: number, pets: number, locale:ClubsLocale) {
  return hospitalityGuestSummary(adults,children,pets,locale);
}

function getMonth(offset: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = first.getFullYear();
  const month = first.getMonth();
  return {
    label: new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(first),
    prefix: `${year}-${String(month + 1).padStart(2, "0")}`,
    offset: (first.getDay() + 6) % 7,
    days: new Date(year, month + 1, 0).getDate(),
  };
}

function formatDate(date:string,locale:ClubsLocale){return hospitalityDate(date,locale);}

function CalendarMonth({
  locale,
  label,
  prefix,
  offset,
  days,
  dateFrom,
  dateTo,
  minimumDate,
  onSelect,
}: {
  locale:ClubsLocale;
  label: string;
  prefix: string;
  offset: number;
  days: number;
  dateFrom: string;
  dateTo: string;
  minimumDate: string;
  onSelect: (value: string) => void;
}) {
  const cells = Array.from({ length: offset + days }, (_, index) =>
    index < offset ? null : index - offset + 1,
  );

  return (
    <div className={styles.calendarMonth}>
      <h4>{hospitalityMonthLabel(label,locale)}</h4>
      <div className={styles.weekdays} aria-hidden="true">
        {hospitalityWeekdays(locale).map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className={styles.calendarDays}>
        {cells.map((day, index) => {
          if (day === null)
            return <span key={`empty-${index}`} aria-hidden="true" />;
          const value = `${prefix}-${String(day).padStart(2, "0")}`;
          const selected = value === dateFrom || value === dateTo;
          const disabled = value < minimumDate;
          const inRange = Boolean(
            dateFrom && dateTo && value > dateFrom && value < dateTo,
          );
          return (
            <button
              aria-pressed={selected}
              className={`${styles.calendarDay} ${selected ? styles.calendarDaySelected : ""} ${inRange ? styles.calendarDayRange : ""}`}
              key={value}
              disabled={disabled}
              onClick={() => onSelect(value)}
              type="button"
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CoreHotelMapFrame({content}:{content:CoreHotelView}) {
  const [consent,setConsent]=useState(false);
  return content.map.loadPolicy === "on-page-load" || consent ? (
    <iframe allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={content.map.embedUrl} title={`${content.canonicalName} location`} />
  ) : (<div className={styles.mapConsent}><MapPin aria-hidden="true" size={32}/><strong>{content.canonicalName}</strong><p>{content.address}</p><button type="button" onClick={()=>setConsent(true)}>Show hotel map</button><small>Load Google Maps to explore this hotel’s location.</small></div>);
}

export function ClubsSearchPage({ locale="en", initialState,initialAsOf,initialPublicContents,initialPublicRates }: ClubsSearchPageProps) {
  const currentCollection = collectionItems.some(
    (item) => item.value === initialState.collection,
  )
    ? initialState.collection
    : "all";
  const [destination, setDestination] = useState(initialState.destination);
  const [dateFrom, setDateFrom] = useState(initialState.dateMode === "dates" ? initialState.dateFrom : "");
  const [dateTo, setDateTo] = useState(initialState.dateMode === "dates" ? initialState.dateTo : "");
  const [guests, setGuests] = useState(initialState.guestsExplicit?initialState.guests:1);
  const [guestsExplicit,setGuestsExplicit]=useState(initialState.guestsExplicit??false);
  const [children, setChildren] = useState(initialState.children);
  const [pets, setPets] = useState(initialState.pets);
  const [nights, setNights] = useState(Math.min(366,Math.max(1,initialState.nights)));
  const [range, setRange] = useState(initialState.dateMode === "dates" ? initialState.range : 0);
  const [dateMode, setDateMode] = useState<ClubsSearchInitialState["dateMode"]>(
    initialState.dateMode,
  );
  const [marinaMonth, setMarinaMonth] = useState(initialState.dateMode === "months" && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(initialState.dateFrom) && initialState.dateFrom >= MARINA_EARLIEST_ARRIVAL ? initialState.dateFrom.slice(0,7) : (()=>{const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit"}).formatToParts(new Date());const year=Number(parts.find(item=>item.type==="year")?.value);const month=Number(parts.find(item=>item.type==="month")?.value);const next=new Date(Date.UTC(year,month,1)).toISOString().slice(0,7);return next>="2027-02"?next:"2027-02";})());
  const [marinaDuration, setMarinaDuration] = useState(Math.min(12,Math.max(1,initialState.calendarMonths??1)));
  const marinaArrival = `${marinaMonth}-01`;
  const marinaCheckout = addStayCalendarMonths(marinaArrival,marinaDuration);
  const marinaLastDay = new Date(`${marinaCheckout}T12:00:00Z`); marinaLastDay.setUTCDate(marinaLastDay.getUTCDate()-1);
  const marinaStayThrough = marinaLastDay.toISOString().slice(0,10);
  const [flexibleMonth, setFlexibleMonth] = useState(
    initialState.flexibleMonth,
  );
  const [clientReady,setClientReady]=useState(false);
  useEffect(()=>{setClientReady(true);},[]);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [view, setView] = useState<ViewMode>(normalizeView(initialState.view));
  const [sort, setSort] = useState(initialState.sort || "recommended");
  const [activeAttributes, setActiveAttributes] = useState<string[]>(
    initialState.activeAttributes ?? [],
  );
  const [activeTypes, setActiveTypes] = useState<string[]>(
    initialState.activeTypes ?? [],
  );
  const [priceMinimum, setPriceMinimum] = useState(initialState.priceMinimum);
  const [priceMaximum, setPriceMaximum] = useState(initialState.priceMaximum);
  const [roomCounts, setRoomCounts] = useState({
    bedrooms: initialState.bedrooms,
    beds: initialState.beds,
    bathrooms: initialState.bathrooms,
  });
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [flexibleOffset, setFlexibleOffset] = useState(0);
  const bootstrapViews=useMemo(()=>Object.fromEntries(propertyRoutes.flatMap((route,index)=>{try{return [[route.id,readCoreHotelView(initialPublicContents?.[index],route.id)]];}catch{return [];}})) as Partial<Record<CoreHotelId,CoreHotelView>>,[initialPublicContents]);
  const bootstrapRates=useMemo(()=>({ ...initialRateDisplay,...Object.fromEntries(propertyRoutes.flatMap((route,index)=>{const expected={propertyId:route.id,asOf:initialAsOf || ""};const raw=initialPublicRates?.[index];const sale=parsePublicHotelBaseSale(raw,expected),display=publicHotelBaseSaleDisplay(raw,expected);return sale&&display&&sale.status==="ready"&&sale.fromUnitMinor!==null ? [[route.id,{...initialRateDisplay[route.id],displayUsdMinor:Number(sale.fromUnitMinor),rateStatus:display.label,access:display.context}]] : [];}))}),[initialPublicRates,initialAsOf]);
  const [rateSnapshot,setRateSnapshot]=useState(() => ({asOf:initialAsOf || initialState.dateFrom || new Date().toISOString().slice(0,10),display:bootstrapRates}));
  const rateAsOf=dateMode === "months" ? marinaArrival : dateFrom || new Date().toISOString().slice(0,10);
  const rateDisplay=initialAsOf===rateAsOf ? bootstrapRates : rateSnapshot.asOf===rateAsOf ? rateSnapshot.display : initialRateDisplay;
  const [hotelViews,setHotelViews]=useState<Partial<Record<CoreHotelId,CoreHotelView>>>(()=>bootstrapViews);
  const [contentLoaded,setContentLoaded]=useState(()=>Object.keys(bootstrapViews).length===propertyRoutes.length);
  const [selectedMapHotel,setSelectedMapHotel]=useState<CoreHotelId>("property-clubs-forest-city-marina");
  const propertyCatalog=useMemo<SearchProperty[]>(()=>propertyRoutes.flatMap(route=>{
    const content=hotelViews[route.id];return content?[{...route,title:content.canonicalName,location:content.address.startsWith(content.officialName+", ") ? content.address.slice(content.officialName.length+2) : content.address}]:[];
  }),[hotelViews]);
  const searchMedia=useMemo<Partial<Record<SearchMediaPlacement,SearchMediaItem>>>(()=>{
    const result:Partial<Record<SearchMediaPlacement,SearchMediaItem>>={};
    for(const content of Object.values(hotelViews)) for(const media of content.media) {
      for(const placement of media.searchPlacements??[]) if(searchMediaPlacements.includes(placement as SearchMediaPlacement)) {
        result[placement as SearchMediaPlacement]={alt:media.alt,publicPath:media.url,focalPoint:{x:0.5,y:0.5},maxCssWidth:media.maxCssWidth};
      }
    }
    return result;
  },[hotelViews]);
  const [selectedInquiry, setSelectedInquiry] =
    useState<PublicInquiryType | null>(null);
  const [inquiryConfig, setInquiryConfig] =
    useState<PublicInquiryConfig | null>(null);
  const [inquiryState, setInquiryState] =
    useState<PublicInquiryState>("idle");
  const [inquiryStatus, setInquiryStatus] = useState("");
  const [inquiryReference, setInquiryReference] = useState("");
  const [pendingInquiry, setPendingInquiry] =
    useState<PublicInquiryPayload | null>(null);
  const dateDraftRef=useRef<{destination:string;dateMode:ClubsSearchInitialState["dateMode"];dateFrom:string;dateTo:string;marinaMonth:string;marinaDuration:number;nights:number;range:number;flexibleMonth:string}|null>(null);
  const restoreDateDraft=useCallback(()=>{
    const previous=dateDraftRef.current;if(!previous)return;
    setDestination(previous.destination);setDateMode(previous.dateMode);setDateFrom(previous.dateFrom);setDateTo(previous.dateTo);setMarinaMonth(previous.marinaMonth);setMarinaDuration(previous.marinaDuration);setNights(previous.nights);setRange(previous.range);setFlexibleMonth(previous.flexibleMonth);dateDraftRef.current=null;
  },[]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const inquiryHeadingRef = useRef<HTMLHeadingElement>(null);
  const inquiryFormRef = useRef<HTMLFormElement>(null);
  const inquiryIdempotencyKeyRef = useRef<string | null>(null);

  const hasUnmatchedFilterIntent =
    activeAttributes.length > 0 ||
    activeTypes.length > 0 ||
    Object.values(roomCounts).some((count) => count > 0);

  const visibleProperties = useMemo<SearchProperty[]>(() => {
    const next = propertyCatalog.filter((property) => {
      if (dateMode === "months") return property.variant === "marina";
      if (dateMode === "dates" || dateMode === "flexible") return property.variant === "golf";
      if (currentCollection === "clubs") return property.variant === "marina";
      if (currentCollection === "hotels") return property.variant === "golf";
      return true;
    });
    if (sort === "price_asc" || sort === "price_desc") {
      next.sort((left, right) => {
        const leftRate = rateDisplay[left.id].displayUsdMinor;
        const rightRate = rateDisplay[right.id].displayUsdMinor;
        if (leftRate === null && rightRate === null) return 0;
        if (leftRate === null) return 1;
        if (rightRate === null) return -1;
        return sort === "price_asc"
          ? leftRate - rightRate
          : rightRate - leftRate;
      });
    }
    return next;
  }, [currentCollection, dateMode, propertyCatalog, rateDisplay, sort]);

  const visibleMapHotel=visibleProperties.find(item=>item.id===selectedMapHotel)??visibleProperties[0];
  const selectedMapContent=visibleMapHotel?hotelViews[visibleMapHotel.id]:undefined;

  const minimumDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);
  const calendarMonths = useMemo(
    () => [getMonth(calendarOffset), getMonth(calendarOffset + 1)],
    [calendarOffset],
  );
  const months = useMemo(
    () =>
      Array.from(
        { length: 6 },
        (_, index) => getMonth(index + flexibleOffset).label,
      ),
    [flexibleOffset],
  );
  const activeFilters = useMemo(
    () => [...activeAttributes, ...activeTypes],
    [activeAttributes, activeTypes],
  );

  const whenSummary = useMemo(() => {
    if (dateMode === "any") return "Choose your stay dates";
    if (dateMode === "months") return `${formatDate(marinaArrival,locale)} – ${formatDate(marinaStayThrough,locale)} · ${hospitalityCount(marinaDuration,"month",locale)}`;
    if (dateMode === "flexible") {
      return `${flexibleMonth ? hospitalityMonthLabel(flexibleMonth,locale) : (hospitalityUiMessages[locale]["Any month"]||"Any month")} · ${hospitalityCount(nights,"night",locale)}`;
    }
    if (dateFrom && dateTo)
      return `${formatDate(dateFrom,locale)} - ${formatDate(dateTo,locale)}`;
    return "Add dates";
  }, [dateFrom, dateMode, dateTo, flexibleMonth, marinaArrival, marinaStayThrough, marinaDuration, nights, locale]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("destination", destination || "Forest City villas");
    if(dateMode === "months") { params.set("date_from",marinaArrival); params.set("date_to",marinaCheckout); params.set("calendar_months",String(marinaDuration)); }
    if (dateMode === "dates" && dateFrom) params.set("date_from", dateFrom);
    if (dateMode === "dates" && dateTo) params.set("date_to", dateTo);
    params.set("guests", String(guests));
    if(guestsExplicit)params.set("guest_selection","explicit");
    params.set("children", String(children));
    params.set("pets", String(pets));
    if(dateMode!=="months") params.set("nights", String(nights));
    if(dateMode==="dates") params.set("range", String(range));
    params.set("date_mode", dateMode === "dates" ? "exact" : dateMode);
    if (dateMode === "flexible") {
      if(nights===2||nights===7||nights===30) params.set("flexible_stay",nights===2?"weekend":nights===7?"week":"month");
      if (flexibleMonth) params.set("flexible_month", flexibleMonth);
    }
    params.set("view", view);
    params.set("sort", sort);
    if (currentCollection !== "all")
      params.set("collection", currentCollection);
    activeAttributes.forEach((filter) => params.append("attribute", filter));
    activeTypes.forEach((filter) => params.append("type", filter));
    if (priceMinimum) params.set("price_min", priceMinimum);
    if (priceMaximum) params.set("price_max", priceMaximum);
    if (roomCounts.bedrooms > 0)
      params.set("bedrooms", String(roomCounts.bedrooms));
    if (roomCounts.beds > 0) params.set("beds", String(roomCounts.beds));
    if (roomCounts.bathrooms > 0)
      params.set("bathrooms", String(roomCounts.bathrooms));
    return params;
  }, [
    activeAttributes,
    activeTypes,
    children,
    dateFrom,
    dateMode,
    dateTo,
    destination,
    flexibleMonth,
    marinaArrival, marinaCheckout, marinaDuration,
    guests, guestsExplicit,
    currentCollection,
    nights,
    pets,
    priceMaximum,
    priceMinimum,
    range,
    roomCounts,
    sort,
    view,
  ]);

  const propertyDetailHref = (property: SearchProperty) => {
    const params = new URLSearchParams(queryParams);
    if (property.variant === "marina" && dateMode !== "months") {
      params.set("date_mode", "months");
      params.set("date_from",marinaArrival);params.set("date_to",marinaCheckout);
      params.set("calendar_months",String(marinaDuration));
      params.delete("flexible_month");params.delete("flexible_stay");params.delete("range");params.delete("nights");
    }
    if(property.variant === "golf"){params.delete("calendar_months");if(dateMode==="any")params.set("date_mode","exact");}
    return buildDetailHref(property.variant, params, locale);
  };

  useEffect(()=>{
    const controller=new AbortController();
    const asOf=rateAsOf;
    if(initialAsOf===asOf && initialPublicRates?.every(Boolean))return;
    const load=async()=>{
      const rows=await Promise.all(propertyRoutes.map(async route=>{
        try {const response=await fetch(`/api/crays/clubs/forest-city/properties/${route.id}/rates?asOf=${encodeURIComponent(asOf)}`,{cache:"no-store",signal:controller.signal});if(!response.ok)return null;
          const raw:unknown=await response.json();const expected={propertyId:route.id,asOf};const sale=parsePublicHotelBaseSale(raw,expected),display=publicHotelBaseSaleDisplay(raw,expected);if(!sale||!display||sale.status!=="ready"||sale.fromUnitMinor===null)return null;
          return {id:route.id,view:{...initialRateDisplay[route.id],displayUsdMinor:Number(sale.fromUnitMinor),rateStatus:display.label,access:display.context}};
        }catch{return null;}
      }));
      if(controller.signal.aborted)return;
      setRateSnapshot({asOf,display:{...initialRateDisplay,...Object.fromEntries(rows.filter(row=>row!==null).map(row=>[row.id,row.view]))}});
    };void load();return()=>controller.abort();
  },[rateAsOf,initialAsOf,initialPublicRates,bootstrapRates]);

  useEffect(()=>{
    if(Object.keys(bootstrapViews).length===propertyRoutes.length)return;
    const controller=new AbortController();
    const load=async()=>{
      const results=await Promise.all(propertyRoutes.map(async route=>{
        try {const response=await fetch(`/api/crays/clubs/forest-city/properties/${route.id}/content`,{cache:"no-store",signal:controller.signal});
          if(!response.ok)return null;
          return readCoreHotelView(await response.json(),route.id);
        }catch{return null;}
      }));
      if(controller.signal.aborted)return;
      setHotelViews(Object.fromEntries(results.filter((item):item is CoreHotelView=>item!==null).map(item=>[item.propertyId,item])));
      setContentLoaded(true);
    };
    void load();return()=>controller.abort();
  },[bootstrapViews]);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || !openPanel) return;
      if(openPanel==="dates")restoreDateDraft();
      setOpenPanel(null);
      window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [openPanel,restoreDateDraft]);

  useEffect(() => {
    if (!openPanel || !dialogRef.current) return;
    const focusTarget = dialogRef.current.querySelector<HTMLElement>(
      "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])",
    );
    window.requestAnimationFrame(() => focusTarget?.focus());
    const mobileDialog = window.matchMedia(
      "(max-width: 820px), (max-height: 620px)",
    ).matches;
    if (!mobileDialog && openPanel !== "filters") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openPanel]);

  const open = (panel: Exclude<OpenPanel, null>, trigger: HTMLElement) => {
    lastTriggerRef.current = trigger;
    if(openPanel==="dates"){restoreDateDraft();if(panel==="dates"){setOpenPanel(null);return;}}
    if(panel==="dates")dateDraftRef.current={destination,dateMode,dateFrom,dateTo,marinaMonth,marinaDuration,nights,range,flexibleMonth};
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const closePanel = () => {
    if(openPanel==="dates")restoreDateDraft();
    setOpenPanel(null);
    window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
  };

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])",
      ),
    ).filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const updateAddress = (nextView = view, nextSort = sort) => {
    const params = new URLSearchParams(queryParams);
    params.set("view", nextView);
    params.set("sort", nextSort);
    window.history.replaceState(null, "", `/${locale}/search?${params.toString()}`);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(dateMode === "any" || (dateMode === "dates" && (!dateFrom || !dateTo))){open("dates",event.currentTarget);return;}
    dateDraftRef.current=null;
    updateAddress();
    closePanel();
  };

  const chooseDate = (value: string) => {
    if (!dateFrom || dateTo || value <= dateFrom) {
      setDateFrom(value);
      setDateTo("");
      return;
    }
    setDateTo(value);
    const from = new Date(`${dateFrom}T12:00:00`);
    const to = new Date(`${value}T12:00:00`);
    setNights(
      Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000)),
    );
  };

  const toggleAttribute = (filter: string) => {
    setActiveAttributes((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    );
  };
  const toggleType = (filter: string) => {
    setActiveTypes((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    );
  };

  const openInquiry = async (type: PublicInquiryType) => {
    setSelectedInquiry(type);
    setInquiryReference("");
    setInquiryStatus("");
    window.requestAnimationFrame(() => {
      inquiryHeadingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      inquiryHeadingRef.current?.focus({ preventScroll: true });
    });

    if (inquiryConfig) {
      setInquiryState("ready");
      return;
    }

    setInquiryState("checking");
    try {
      const response = await fetch("/api/crays/clubs/public/inquiries", {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const payload = (await response
        .json()
        .catch(() => null)) as PublicInquiryConfig | null;
      const inquiryTypes = Array.isArray(payload?.inquiryTypes)
        ? payload.inquiryTypes
        : [];
      const supportsType = inquiryTypes.some(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          (entry as Record<string, unknown>).key === type,
      );
      if (
        !response.ok ||
        payload?.schemaVersion !== "crays.clubs.public-inquiry.v1" ||
        payload.status !== "source_ready" ||
        payload.destination !== "CRAYS_TEAM" ||
        typeof payload.privacyNoticeVersion !== "string" ||
        payload.privacyHref !== "/en/privacy" ||
        payload.dataProtectionHref !== "/en/data-protection" ||
        !supportsType
      ) {
        setInquiryState("unavailable");
        setInquiryStatus(
          "Team enquiries are temporarily unavailable. Please try again later.",
        );
        return;
      }
      setInquiryConfig(payload);
      setInquiryState("ready");
    } catch {
      setInquiryState("unavailable");
      setInquiryStatus(
        "Team enquiries are temporarily unavailable. Please try again later.",
      );
    }
  };

  const sendInquiry = async (payload: PublicInquiryPayload) => {
    const idempotencyKey =
      inquiryIdempotencyKeyRef.current ??
      `cclub-search:${globalThis.crypto.randomUUID()}`;
    inquiryIdempotencyKeyRef.current = idempotencyKey;
    setPendingInquiry(payload);
    setInquiryState("submitting");
    setInquiryStatus("Saving your enquiry for CRAYS Team review…");

    try {
      const response = await fetch("/api/crays/clubs/public/inquiries", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      const result = (await response
        .json()
        .catch(() => null)) as PublicInquiryResponse | null;

      if (
        response.ok &&
        result?.status === "persisted" &&
        result.persisted === true &&
        result.confirmationStatus === "received" &&
        result.teamQueueStatus === "queued" &&
        result.providerDeliveryClaimed === false &&
        typeof result.publicReference === "string"
      ) {
        setInquiryReference(result.publicReference);
        setInquiryState("persisted");
        setInquiryStatus(
          "Enquiry received and queued for CRAYS Team review. No venue, stay, tee time, quote or price is confirmed yet.",
        );
        inquiryIdempotencyKeyRef.current = null;
        setPendingInquiry(null);
        return;
      }

      if (response.status === 400) {
        setInquiryState("validation_error");
        setInquiryStatus(
          "Please review the form. All required details must be complete and the message must contain at least 20 characters.",
        );
        inquiryIdempotencyKeyRef.current = null;
        setPendingInquiry(null);
        return;
      }
      if (response.status === 409) {
        setInquiryState("conflict");
        setInquiryStatus(
          "This request changed during submission. Please start a new enquiry.",
        );
        inquiryIdempotencyKeyRef.current = null;
        setPendingInquiry(null);
        return;
      }

      if ([401, 403, 404, 429].includes(response.status)) {
        setInquiryState("unavailable");
        setInquiryStatus(
          "Team enquiries are temporarily unavailable. Please try again later.",
        );
        inquiryIdempotencyKeyRef.current = null;
        setPendingInquiry(null);
        return;
      }

      setInquiryState("unknown_outcome");
      setInquiryStatus(
        "The outcome is not confirmed. Check the enquiry status before retrying; the check cannot create a duplicate request.",
      );
    } catch {
      setInquiryState("unknown_outcome");
      setInquiryStatus(
        "The outcome is not confirmed. Check the enquiry status before retrying; the check cannot create a duplicate request.",
      );
    }
  };

  const reconcileInquiry = async () => {
    const payload = pendingInquiry;
    const idempotencyKey = inquiryIdempotencyKeyRef.current;
    if (!payload || !idempotencyKey) {
      setInquiryState("unavailable");
      setInquiryStatus(
        "This enquiry can no longer be checked safely. Please start a new enquiry.",
      );
      return;
    }

    setInquiryState("reconciling");
    setInquiryStatus("Checking whether this exact enquiry was received…");

    try {
      const response = await fetch("/api/crays/clubs/public/inquiries", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
          "x-crays-inquiry-operation": "reconcile",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response
        .json()
        .catch(() => null)) as PublicInquiryResponse | null;

      if (
        response.ok &&
        result?.status === "received" &&
        result.persisted === true &&
        result.reconciled === true &&
        result.confirmationStatus === "received" &&
        result.teamQueueStatus === "queued" &&
        result.reconciliationStatus === "reconciled" &&
        result.providerDeliveryClaimed === false
      ) {
        setInquiryState("persisted");
        setInquiryStatus(
          "Enquiry received and queued for CRAYS Team review. No venue, stay, tee time, quote or price is confirmed yet.",
        );
        inquiryIdempotencyKeyRef.current = null;
        setPendingInquiry(null);
        return;
      }

      if (
        response.status === 404 &&
        result?.status === "not_found" &&
        result.persisted === false &&
        result.reconciliationStatus === "not_found" &&
        result.providerDeliveryClaimed === false
      ) {
        setInquiryState("not_found");
        setInquiryStatus(
          "No saved enquiry was found for this exact request. It has not been confirmed as received; you may safely retry the same enquiry.",
        );
        return;
      }

      if (response.status === 409) {
        setInquiryState("conflict");
        setInquiryStatus(
          "This request no longer matches its original submission. It was not reconciled; please start a new enquiry.",
        );
        inquiryIdempotencyKeyRef.current = null;
        setPendingInquiry(null);
        return;
      }

      if ([400, 401, 403].includes(response.status)) {
        setInquiryState("unavailable");
        setInquiryStatus(
          "This enquiry cannot be checked safely right now. Please try again later.",
        );
        inquiryIdempotencyKeyRef.current = null;
        setPendingInquiry(null);
        return;
      }

      setInquiryState("unknown_outcome");
      setInquiryStatus(
        "The status is still not confirmed. Check again later; no new enquiry is created by this check.",
      );
    } catch {
      setInquiryState("unknown_outcome");
      setInquiryStatus(
        "The status is still not confirmed. Check again later; no new enquiry is created by this check.",
      );
    }
  };

  const submitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedInquiry || !inquiryConfig) return;
    const formData = new FormData(event.currentTarget);
    const privacyNoticeVersion = inquiryConfig.privacyNoticeVersion;
    if (typeof privacyNoticeVersion !== "string") return;
    const participantCount = Number(formData.get("participant_count"));
    const payload: PublicInquiryPayload = {
      inquiryType: selectedInquiry,
      contactName: String(formData.get("contact_name") ?? "").trim(),
      contactEmail: String(formData.get("contact_email") ?? "")
        .trim()
        .toLowerCase(),
      organizationName:
        String(formData.get("organization_name") ?? "").trim() || null,
      countryOrRegion: String(
        formData.get("country_or_region") ?? "",
      ).trim(),
      preferredStartDate:
        String(formData.get("preferred_start_date") ?? "") || null,
      preferredEndDate:
        String(formData.get("preferred_end_date") ?? "") || null,
      participantCount,
      message: String(formData.get("message") ?? "").trim(),
      privacyNoticeVersion,
      privacyConsent: true,
      contactConsent: true,
    };
    void sendInquiry(payload);
  };

  const resetInquiry = () => {
    inquiryIdempotencyKeyRef.current = null;
    setPendingInquiry(null);
    setInquiryReference("");
    setInquiryStatus("");
    setInquiryState(inquiryConfig ? "ready" : "idle");
    inquiryFormRef.current?.reset();
  };

  const accountHref = `/${locale}/account?view=saved&returnTo=${encodeURIComponent(`/${locale}/search?${queryParams.toString()}`)}`;
  const guestRows: Array<{
    label: string;
    helper: string;
    value: number;
    minimum: number;
    setter: (value: number) => void;
  }> = [
    {
      label: "Adults",
      helper: "Ages 13 or above",
      value: guests,
      setter: (value)=>{setGuests(value);setGuestsExplicit(true);},
      minimum: 1,
    },
    {
      label: "Children",
      helper: "Ages 2-12",
      value: children,
      setter: setChildren,
      minimum: 0,
    },
    {
      label: "Pets",
      helper: "On request where available",
      value: pets,
      setter: setPets,
      minimum: 0,
    },
  ];

  return (
    <TodayLocaleProvider locale={locale} messages={hospitalityUiMessages[locale]}><TodayLocalizedContent><main className={styles.page}>
      <section
        className={styles.firstScreen}
        aria-labelledby="search-discovery-title"
      >
        <header className={styles.discoveryHeader}>
          <nav aria-label="Breadcrumb" className={styles.discoveryBreadcrumb}><Link href="/en">Crays Clubs</Link><span>/</span><span>Search</span><span>/</span><span>Forest City</span></nav>
          <div className={styles.discoveryIntro}><h1 id="search-discovery-title">Your Crays adventure starts here</h1><p>Work, live and play in an invitation-led community.<br />Extraordinary places. More of what matters.</p></div>
          <nav aria-label="Booking journey" className={styles.bookingJourney}><ol>{["Discover", "Stay details", "Rooms & services", "Your offer", "Payment"].map((label,index)=>(<li key={label} aria-current={index===0 ? "step" : undefined}><span>{index+1}</span><strong>{label}</strong></li>))}</ol></nav>
        </header>
        <div className={styles.topShell}>
          <form className={styles.searchBar} onSubmit={submitSearch}>
            <label className={styles.searchField}>
              <span>Where</span>
              <select
                disabled={!clientReady}
                value={destination}
                onChange={(event) => {setDestination(event.target.value);setDateMode(event.target.value === "Forest City Golf Hotel" ? "dates" : event.target.value === "Crays Club Forest City Marina" ? "months" : "any");}}
              >
                <option value="Forest City villas">Forest City</option>
                <option value="Forest City Golf Hotel">{hotelViews["property-clubs-forest-city-golf"]?.canonicalName ?? "Golf hotel"}</option>
                <option value="Crays Club Forest City Marina">{hotelViews["property-clubs-forest-city-marina"]?.canonicalName ?? "Marina club"}</option>
              </select>
            </label>
            <button
              aria-expanded={openPanel === "dates"}
              className={styles.searchFieldButton}
              disabled={!clientReady}
              onClick={(event) => open("dates", event.currentTarget)}
              type="button"
            >
              <span>When</span>
              <strong>{whenSummary}</strong>
            </button>
            <button
              aria-expanded={openPanel === "guests"}
              className={styles.searchFieldButton}
              disabled={!clientReady}
              onClick={(event) => open("guests", event.currentTarget)}
              type="button"
            >
              <span>Who</span>
              <strong>{hospitalityWhoSummary(guests,children,pets,locale)}</strong>
            </button>
            <button
              aria-label="Search Forest City properties"
              className={styles.searchSubmit}
              disabled={!clientReady}
              type="submit"
            >
              <Search aria-hidden="true" size={22} />
            </button>
          </form>
          <button
            aria-expanded={openPanel === "filters"}
            className={styles.filterButton}
              disabled={!clientReady}
            onClick={(event) => open("filters", event.currentTarget)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" size={18} />
            Filter
          </button>
        </div>

        <nav
          className={styles.collectionStrip}
          aria-label="Crays search categories"
        >
          {collectionItems.map((item) => (
            <Link
              aria-current={
                currentCollection === item.value ? "page" : undefined
              }
              className={
                currentCollection === item.value
                  ? styles.collectionActive
                  : undefined
              }
              href={(() => {
                const params = new URLSearchParams(queryParams);
                if (item.value === "all") {params.delete("collection");params.set("destination","Forest City villas");params.set("date_mode","any");["date_from","date_to","calendar_months","flexible_month","flexible_stay","range"].forEach(key=>params.delete(key));}
                if (item.value === "clubs") {params.set("date_mode","months");params.set("date_from",marinaArrival);params.set("date_to",marinaCheckout);params.set("calendar_months",String(marinaDuration));params.set("destination","Crays Club Forest City Marina");["nights","range","flexible_month","flexible_stay"].forEach(key=>params.delete(key));}
                if (item.value === "hotels") params.set("destination","Forest City Golf Hotel");
                if (item.value === "hotels" && dateMode === "months") {params.set("date_mode","exact");params.delete("date_from");params.delete("date_to");params.delete("calendar_months");}
                if (item.value === "all") params.delete("collection");
                else params.set("collection", item.value);
                return `/${locale}/search?${params.toString()}`;
              })()}
              key={item.value}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.resultsHeader}>
          <div>
            
            <h2 id="search-results-title">
              {contentLoaded ? searchCountText(locale, visibleProperties.length, "{count} CRAYS property in Forest City", "{count} CRAYS properties in Forest City") : "CRAYS properties in Forest City"}
            </h2>
            <span>
              {!contentLoaded ? "Loading hotel details…" : hasUnmatchedFilterIntent
                ? "Filters are saved as intent · live matching unavailable"
                : searchCountText(locale, visibleProperties.length, "{count} discoverable property · live matching unavailable", "{count} discoverable properties · live matching unavailable")}
            </span>
            <span>
              {whenSummary} -{" "}
              {formatGuestSummary(guests, children, pets,locale)}
            </span>
          </div>
          <div className={styles.resultsControls}>
            <div
              className={styles.viewToggle}
              aria-label="Result view"
              role="group"
            >
              {(
                [
                  ["tiles", "Tiles", Grid2X2],
                  ["list", "List", List],
                  ["map", "Map", Map],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  aria-pressed={view === value}
                  className={view === value ? styles.controlActive : ""}
                  key={value}
                  onClick={() => {
                    setView(value);
                    updateAddress(value, sort);
                  }}
                  type="button"
                >
                  <Icon aria-hidden="true" size={16} />
                  {label}
                </button>
              ))}
            </div>
            <label className={styles.sortControl}>
              <span>Sort</span>
              <select
                value={sort}
                onChange={(event) => {
                  const next = event.target.value;
                  setSort(next);
                  updateAddress(view, next);
                }}
              >
                <option value="recommended">Recommended</option>
                <option value="price_desc">Price descending</option>
                <option value="price_asc">Price ascending</option>
                <option value="guests_desc">Guests descending</option>
                <option value="rating_desc">Rating descending</option>
              </select>
              <ChevronDown aria-hidden="true" size={16} />
            </label>
          </div>
        </div>

        <div
          className={`${styles.resultsGrid} ${styles[`resultsGrid_${view}`]}`}
          data-single-result={visibleProperties.length===1?"true":undefined}
        >
          <div className={styles.propertyList}>
            {propertyCatalog.length === 0 ? (
              <div className={styles.noResults} role="status">
                <p>{contentLoaded ? "Portfolio unavailable" : "Loading hotel portfolio"}</p>
                <h2>{contentLoaded ? "Hotel portfolio is currently unavailable." : "Loading Forest City hotels…"}</h2>
                <span>
                  {contentLoaded ? "Please try again shortly." : "Retrieving hotel information and photography."}
                </span>
              </div>
            ) : null}
            {visibleProperties.map((property) => {
              const displayedRate = rateDisplay[property.id];
              const detailHref = propertyDetailHref(property);
              const propertyMedia =
                searchMedia[
                  property.variant === "marina" ? "marinaCard" : "golfCard"
                ];
              return (
                <article className={styles.propertyCard} key={property.id}>
                  <Link
                    className={styles.propertyImage}
                    aria-label={searchHotelLabel(locale, "View {hotel}", property.title)}
                    href={detailHref}
                  >
                    {propertyMedia ? (
                      <span
                        className={styles.searchMediaFrame}
                        data-search-media={`${property.variant}:search_card_primary`}
                        data-search-media-path={propertyMedia.publicPath}
                      >
                        <Image
                          alt={propertyMedia.alt}
                          fill
                          priority
                          sizes="(max-width: 820px) 100vw, 48vw"
                          src={propertyMedia.publicPath}
                          style={{
                            objectPosition: mediaPosition(propertyMedia),
                            objectFit: "cover",
                            
                          }}
                          unoptimized
                        />
                      </span>
                    ) : (
                      <span className={styles.mediaPlaceholder}>
                        Hotel photography is loading…
                      </span>
                    )}
                    <span className={styles.propertyPhotoCta}>View photos</span>
                  </Link>
                  <div className={styles.propertyBody}>
                    <div className={styles.propertyMeta}>
                      <div className={styles.propertyBadges}>
                        <span className={styles.membershipBadge}>Membership only</span>
                        <Link className={styles.stayTypeBadge} href={detailHref}>
                          {property.variant === "marina"
                            ? "Crays Club Longstay"
                            : "Crays Club Short-Stay"}
                        </Link>
                      </div>
                      <Link
                        aria-label={searchHotelLabel(locale, "Save {hotel} through your account", property.title)}
                        href={accountHref}
                      >
                        <Heart aria-hidden="true" size={17} /> Save
                      </Link>
                    </div>
                    <h3>{property.title}</h3>
                    <p>{property.location}</p><p className={styles.propertyLocation}><MapPin aria-hidden="true" size={15} />Forest City, Johor</p>
                    <div className={styles.roomFacts}>
                      {(() => { const description = hotelViews[property.id]?.copy.baseOfferDescription; const parts = description?.split(" · ") ?? []; return parts.length >= 2 ? <><span><BedDouble size={20} aria-hidden="true" />{parts[0]}</span><span><Maximize size={18} aria-hidden="true" />{parts[1].split(",")[0]}</span></> : null; })()}
                    </div>
                    <p className={styles.propertyAvailability}>
                      {(() => { const description=hotelViews[property.id]?.copy.baseOfferDescription; if(!description) return displayedRate.access; const parts=description.split(" · "); if(parts.length > 2) return parts.slice(2).join(" · ").split(". ")[0]+"."; const comma=parts[1]?.indexOf(",") ?? -1; return comma >= 0 ? parts[1].slice(comma+1).trim().split(". ")[0]+"." : description; })()}
                    </p><details className={styles.offerNote}><summary>Rate details <ChevronDown aria-hidden="true" size={14} /></summary><p>{hotelViews[property.id]?.copy.baseOfferDescription ?? displayedRate.access}</p></details>
                    <div className={styles.propertyFoot}>
                      <div className={styles.propertyRateStatus}>
                        <strong>{displayedRate.rateStatus}</strong>
                        <span>{hotelViews[property.id]?.copy.cardStayPolicy ?? displayedRate.stayPolicy}</span>
                      </div>
                      <Link className={styles.propertyCta} href={detailHref}>
                        Plan your stay
                        <ArrowRight aria-hidden="true" size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside
            className={styles.mapPanel}
            aria-label="Forest City property map"
          >
            {selectedMapContent ? (
              <>
                <div className={styles.mapHotelSelector} aria-label="Choose hotel location">
                  {visibleProperties.map(property=>(<button key={property.id} type="button" aria-pressed={selectedMapContent.propertyId===property.id} onClick={()=>{setSelectedMapHotel(property.id);}}>{property.title}</button>))}
                </div>
                <CoreHotelMapFrame key={selectedMapContent.propertyId} content={selectedMapContent} />
                <a className={styles.openMap} href={selectedMapContent.map.placeUrl} rel="noreferrer noopener" target="_blank">Open Maps</a>
              </>
            ) : (<p>{contentLoaded ? "Hotel locations are currently unavailable." : "Loading hotel locations…"}</p>)}
          </aside>
        </div>

        {visibleProperties.map(property => hotelViews[property.id]?.copy.paymentOptionsSummary).filter(Boolean).length > 0 ? (
          <p className={styles.paymentNotice}>
            {Array.from(new Set(visibleProperties.map(property => hotelViews[property.id]?.copy.paymentOptionsSummary).filter(Boolean))).join(" ")}
          </p>
        ) : null}

        <div className={styles.invitationNotice}>
          <div className={styles.invitationCopy}>
            <strong>An invitation-led community.</strong>
            <p>Booking requires an approved application in the Crays system. An invitation link or account alone does not confirm access.</p>
            <ClubsMembershipProcessNotice/>
          </div>
          <div className={styles.invitationActions}>
            <Link href="/en/ambassadors">Find your Ambassador <ArrowRight aria-hidden="true" size={16} /></Link>
            <Link href={hotelDirectApplicationHref(`/${locale}/search?${queryParams.toString()}`)}>Apply through the Crays team <ArrowRight aria-hidden="true" size={16}/></Link>
          </div>
        </div>

        {openPanel === "dates" ? (
          <><button type="button" tabIndex={-1} aria-label="Cancel date selection" className={styles.dateBackdrop} onClick={closePanel}/><div
            aria-label="Choose travel dates"
            aria-modal="true"
            className={styles.dateDialog}
            onKeyDown={trapFocus}
            ref={dialogRef}
            role="dialog"
          >
            <button
              aria-label="Close date selector"
              className={styles.dialogClose}
              onClick={closePanel}
              type="button"
            >
              <X size={18} />
            </button>
            <div className={styles.dateHeading}><span className={styles.kicker}>PLAN YOUR STAY</span><h2>Where would you like to stay?</h2><p>Choose your hotel to see its stay options.</p></div>
            <div className={styles.hotelStayChoices} role="group" aria-label="Choose hotel for your dates">
              <button type="button" aria-pressed={dateMode === "months"} onClick={()=>{setDateMode("months");setDestination("Crays Club Forest City Marina");}}><strong><CalendarDays aria-hidden="true" size={20}/>Crays Club Marina</strong><span>Longstay · 1–12 full calendar months</span><small>From February 2027</small></button>
              <button type="button" aria-pressed={dateMode === "dates" || dateMode === "flexible"} onClick={()=>{setDateMode("dates");setDestination("Forest City Golf Hotel");}}><strong><BedDouble aria-hidden="true" size={20}/>Crays Golf Hotel</strong><span>Short-Stay · Choose your number of nights</span><small>Exact or flexible dates</small></button>
            </div>
            {dateMode === "dates" || dateMode === "flexible" ? <div className={styles.dateTabs} role="tablist" aria-label="Golf date mode">
              <button aria-selected={dateMode === "dates"} className={dateMode === "dates" ? styles.dateTabActive : ""} onClick={()=>setDateMode("dates")} role="tab" type="button">Exact dates</button>
              <button aria-selected={dateMode === "flexible"} className={dateMode === "flexible" ? styles.dateTabActive : ""} onClick={()=>setDateMode("flexible")} role="tab" type="button">Flexible dates</button>
            </div> : null}
            {dateMode === "any" ? <p className={styles.chooseHotelHint}>Select a hotel above to choose your stay dates.</p> : dateMode === "months" ? (
              <div className={styles.marinaSearchDates}>
                <p>Choose 1–12 full calendar months. Your stay starts on the 1st and runs through the last day of the final month.</p>
                <div className={styles.marinaSearchFields}>
                  <label>Start month<input type="month" min="2027-02" value={marinaMonth} onChange={event=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)&&event.target.value>="2027-02"){setMarinaMonth(event.target.value);setDateMode("months");}}}/></label>
                  <label>Duration<select value={marinaDuration} onChange={event=>{setMarinaDuration(Number(event.target.value));setDateMode("months");}}>{Array.from({length:12},(_,index)=>index+1).map(value=><option key={value} value={value}>{value} calendar {value===1?"month":"months"}</option>)}</select></label>
                </div>
                <p><strong>{formatDate(marinaArrival,locale)} – {formatDate(marinaStayThrough,locale)}</strong></p>
              </div>
            ) : dateMode === "dates" ? (
              <div className={styles.dateDialogBody}>
                <div className={styles.calendarNav}>
                  <button
                    aria-label="Previous month"
                    disabled={calendarOffset === 0}
                    onClick={() =>
                      setCalendarOffset((current) => Math.max(0, current - 1))
                    }
                    type="button"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    aria-label="Next month"
                    onClick={() => setCalendarOffset((current) => current + 1)}
                    type="button"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className={styles.calendars}>
                  {calendarMonths.map((month) => (
                    <CalendarMonth
                      locale={locale}
                      {...month}
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      key={month.label}
                      minimumDate={minimumDate}
                      onSelect={chooseDate}
                    />
                  ))}
                </div>
                <div
                  className={styles.rangePills}
                  aria-label="Date flexibility"
                >
                  {([0, 1, 2, 3, 7, 14] as const).map((value) => (
                    <button
                      aria-pressed={range === value}
                      className={range === value ? styles.pillActive : ""}
                      key={value}
                      onClick={() => setRange(value)}
                      type="button"
                    >
                      {value === 0
                        ? "Exact dates"
                        : hospitalityDayTolerance(value,locale)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.flexibleBody}>
                <h2>How long would you like to stay?</h2>
                <label className={styles.flexibleNightCount}>Number of nights<select aria-label="Number of nights" value={nights} onChange={event=>setNights(Number(event.target.value))}>{Array.from({length:366},(_,index)=>index+1).map(value=><option key={value} value={value}>{hospitalityCount(value,"night",locale)}</option>)}</select></label>
                <p>Flexible searches are for Crays Golf Hotel. Choose your exact arrival date in the stay planner; availability is checked separately.</p>
                <div className={styles.monthsTitle}>
                  <button
                    aria-label="Previous flexible months"
                    disabled={flexibleOffset === 0}
                    onClick={() =>
                      setFlexibleOffset((current) => Math.max(0, current - 1))
                    }
                    type="button"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h2>Go anytime</h2>
                  <button
                    aria-label="Next flexible months"
                    onClick={() => setFlexibleOffset((current) => current + 1)}
                    type="button"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className={styles.monthCards}>
                  {months.map((month) => (
                    <button
                      aria-pressed={flexibleMonth === month}
                      className={
                        flexibleMonth === month ? styles.monthCardActive : ""
                      }
                      key={month}
                      onClick={() =>
                        setFlexibleMonth((current) =>
                          current === month ? "" : month,
                        )
                      }
                      type="button"
                    >
                      <CalendarDays aria-hidden="true" size={20} />
                      <span>{hospitalityMonthLabel(month,locale,false)}</span>
                      <small>{month.split(" ")[1]}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button className={styles.dateApply} type="button" disabled={dateMode === "any" || (dateMode === "dates" && (!dateFrom || !dateTo))} onClick={()=>{dateDraftRef.current=null;if(dateMode==="any"){setDateMode("months");const params=new URLSearchParams(queryParams);params.set("date_mode","months");params.set("date_from",marinaArrival);params.set("date_to",marinaCheckout);params.set("calendar_months",String(marinaDuration));window.history.replaceState(null,"",`/${locale}/search?${params.toString()}`);}else updateAddress();closePanel();}}>{dateMode==="months"?"Search Marina stays":dateMode==="any"?"Select a hotel":"Search Golf stays"}</button>
          </div></>
        ) : null}

        {openPanel === "guests" ? (
          <div
            aria-label="Choose guests"
            aria-modal="true"
            className={styles.guestDialog}
            onKeyDown={trapFocus}
            ref={dialogRef}
            role="dialog"
          >
            <button
              aria-label="Close guest selector"
              className={styles.dialogClose}
              onClick={closePanel}
              type="button"
            >
              <X size={18} />
            </button>
            {guestRows.map((row) => (
              <div className={styles.guestRow} key={row.label}>
                <div>
                  <strong>{row.label}</strong>
                  <span>{row.helper}</span>
                </div>
                <div>
                  <button
                    aria-label={`Decrease ${row.label}`}
                    disabled={row.value <= row.minimum}
                    onClick={() => row.setter(row.value - 1)}
                    type="button"
                  >
                    <Minus size={16} />
                  </button>
                  <output>{row.value}</output>
                  <button
                    aria-label={`Increase ${row.label}`}
                    onClick={() => row.setter(row.value + 1)}
                    type="button"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className={styles.trustStrip}>
        {searchTrust.map((item, index) => (
          <article key={item.title}>
            <span>{(() => { const Icon=[UsersRound,CalendarDays,ClipboardList,Heart][index]; return <Icon aria-hidden="true" size={34} />; })()}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>

      <section
        aria-labelledby="destination-opportunities-title"
        className={styles.opportunitySection}
      >
        <header className={styles.opportunityHeader}>
          <div>
            <h2 id="destination-opportunities-title">Beyond the stay</h2>
          </div>
          <p>
            From golf-led escapes to international business gatherings, start
            with your brief. CRAYS shapes the request with the relevant local
            venues and operators; every element remains subject to confirmation.
          </p>
        </header>

        <div className={styles.opportunityGrid}>
          {destinationOpportunities.map((item) => (
            <article className={styles.opportunityCard} key={item.type}>
              <figure className={styles.opportunityMedia}>
                <Image
                  alt={item.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 820px) 100vw, 50vw"
                  src={item.image}
                />
              </figure>
              <div className={styles.opportunityBody}>
                <p className={styles.kicker}>{item.kicker}</p>
                <h3>{item.title}</h3>
                <p className={styles.opportunityLead}>{item.lead}</p>
                <details className={styles.programmeDetails}><summary>More programme details <ArrowRight aria-hidden="true" size={17} /></summary><div className={styles.opportunityDetails}>
                  <div>
                    <strong>Forest City anchors</strong>
                    <ul>
                      {item.facts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Shape your programme</strong>
                    <ul>
                      {item.formats.map((format) => (
                        <li key={format}>{format}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className={styles.opportunityBoundary}>{item.boundary}</p></details>
                <button
                  className={styles.opportunityCta}
                  onClick={() => void openInquiry(item.type)}
                  type="button"
                >
                  {item.cta}
                  <ArrowRight aria-hidden="true" size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>

        {selectedInquiry ? (
          <section
            aria-labelledby="destination-inquiry-title"
            className={styles.inquiryPanel}
          >
            <div className={styles.inquiryIntro}>
              <p className={styles.kicker}>Request to the CRAYS Team</p>
              <h2
                id="destination-inquiry-title"
                ref={inquiryHeadingRef}
                tabIndex={-1}
              >
                {selectedInquiry === "golf_tourism"
                  ? "Tell us about your golf journey."
                  : "Tell us about your event."}
              </h2>
              <p>
                Share the group, timing and ambition. This creates an enquiry
                only—not a booking, venue hold, tee time, quote or payment.
              </p>
            </div>

            {inquiryState === "checking" ? (
              <p className={styles.inquiryNotice} role="status">
                Checking enquiry availability…
              </p>
            ) : null}

            {inquiryState !== "checking" &&
            inquiryState !== "unavailable" ? (
              <form
                className={styles.inquiryForm}
                onSubmit={submitInquiry}
                ref={inquiryFormRef}
              >
                <fieldset
                  disabled={
                    inquiryState === "submitting" ||
                    inquiryState === "reconciling" ||
                    inquiryState === "persisted" ||
                    inquiryState === "not_found" ||
                    inquiryState === "unknown_outcome"
                  }
                >
                  <div className={styles.inquiryFieldGrid}>
                    <label>
                      <span>Contact name</span>
                      <input
                        autoComplete="name"
                        maxLength={120}
                        minLength={2}
                        name="contact_name"
                        required
                      />
                    </label>
                    <label>
                      <span>Contact email</span>
                      <input
                        autoComplete="email"
                        maxLength={254}
                        name="contact_email"
                        required
                        type="email"
                      />
                    </label>
                    <label>
                      <span>Organisation (optional)</span>
                      <input
                        autoComplete="organization"
                        maxLength={160}
                        minLength={2}
                        name="organization_name"
                      />
                    </label>
                    <label>
                      <span>Country or region</span>
                      <input
                        autoComplete="country-name"
                        maxLength={120}
                        minLength={2}
                        name="country_or_region"
                        required
                      />
                    </label>
                    <label>
                      <span>Preferred start (optional)</span>
                      <input name="preferred_start_date" type="date" />
                    </label>
                    <label>
                      <span>Preferred end (optional)</span>
                      <input name="preferred_end_date" type="date" />
                    </label>
                    <label>
                      <span>Expected participants</span>
                      <input
                        inputMode="numeric"
                        max={5000}
                        min={1}
                        name="participant_count"
                        required
                        type="number"
                      />
                    </label>
                  </div>
                  <label className={styles.inquiryMessage}>
                    <span>What would you like to create?</span>
                    <textarea
                      maxLength={4000}
                      minLength={20}
                      name="message"
                      required
                      rows={6}
                    />
                  </label>
                  <label className={styles.inquiryConsent}>
                    <input name="privacy_consent" required type="checkbox" />
                    <span>
                      I agree that CRAYS may use these details to assess and
                      respond to this enquiry. I have read the{" "}
                      <a href={String(inquiryConfig?.privacyHref)}>
                        Privacy information
                      </a>{" "}
                      and{" "}
                      <a href={String(inquiryConfig?.dataProtectionHref)}>
                        Data Protection information
                      </a>
                      .
                    </span>
                  </label>
                  <label className={styles.inquiryConsent}>
                    <input name="contact_consent" required type="checkbox" />
                    <span>
                      I agree that the CRAYS Team may contact me about this
                      enquiry.
                    </span>
                  </label>
                  <button className={styles.inquirySubmit} type="submit">
                    {inquiryState === "submitting"
                      ? "Saving enquiry…"
                      : "Send enquiry"}
                    <ArrowRight aria-hidden="true" size={17} />
                  </button>
                </fieldset>
              </form>
            ) : null}

            {inquiryStatus ? (
              <div
                className={styles.inquiryStatus}
                role={
                  inquiryState === "persisted" ||
                  inquiryState === "submitting" ||
                  inquiryState === "reconciling"
                    ? "status"
                    : "alert"
                }
              >
                <p>{inquiryStatus}</p>
                {inquiryReference ? (
                  <small>Reference: {inquiryReference}</small>
                ) : null}
                {inquiryState === "unknown_outcome" && pendingInquiry ? (
                  <button
                    onClick={() => void reconcileInquiry()}
                    type="button"
                  >
                    Check enquiry status
                  </button>
                ) : null}
                {inquiryState === "not_found" && pendingInquiry ? (
                  <button
                    onClick={() => void sendInquiry(pendingInquiry)}
                    type="button"
                  >
                    Retry the same enquiry
                  </button>
                ) : null}
                {inquiryState === "persisted" ||
                inquiryState === "not_found" ||
                inquiryState === "conflict" ||
                inquiryState === "validation_error" ? (
                  <button onClick={resetInquiry} type="button">
                    Start a new enquiry
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </section>

      <section className={styles.contentShell}>
        <div className={styles.promoGrid}>
          {searchPromos.map((item, index) => {
            const mediaKey = promoMediaKeys[index];
            const media = searchMedia[mediaKey];
            return (
              <Link
                className={styles.promoCard}
                href={mergeSearchHref(item.href, queryParams)}
                key={item.title}
              >
                <div
                  className={styles.promoImage}
                  data-search-media={mediaKey}
                  data-search-media-path={media?.publicPath}
                >
                  {media ? (
                    <Image
                      alt={media.alt}
                      fill
                      loading="lazy"
                      sizes="(max-width: 820px) 100vw, 33vw"
                      src={media.publicPath}
                      style={{ objectPosition: mediaPosition(media), objectFit: "cover", marginInline: "auto" }}
                      unoptimized
                    />
                  ) : null}
                </div>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <section className={styles.discoverySection}>
          <div className={styles.discoveryColumn}>
            <p className={styles.kicker}>Popular destinations</p>
            <h2>Stay in Forest City</h2>
            <div className={styles.discoveryGrid}>
              {searchDestinations.map((item, index) => {
                const destinationLabel = index < 2 ? hotelViews[propertyRoutes[index].id]?.canonicalName ?? "Hotel details loading" : item.title;
                const mediaKey = destinationMediaKeys[index];
                const media = searchMedia[mediaKey];
                return (
                  <Link
                    aria-label={destinationLabel}
                    className={styles.discoveryCard}
                    href={mergeSearchHref(
                      `/${locale}/search?destination=${encodeURIComponent(item.queryValue)}`,
                      queryParams,
                    )}
                    key={item.title}
                  >
                    <span
                      className={styles.discoveryMedia}
                      data-search-media={
                        mediaKey
                      }
                      data-search-media-path={media?.publicPath}
                    >
                      {media ? (
                        <Image
                          alt={media.alt}
                          fill
                          loading="lazy"
                          sizes="(max-width: 820px) 100vw, 22vw"
                          src={media.publicPath}
                          style={{ objectPosition: mediaPosition(media), objectFit: "cover", marginInline: "auto" }}
                          unoptimized
                        />
                      ) : null}
                    </span>
                    <span className={styles.discoveryCardCopy}>
                      <strong>{destinationLabel}</strong>
                      <small>{item.text}</small>
                      <ArrowRight aria-hidden="true" size={16} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className={styles.discoveryColumn}>
            <p className={styles.kicker}>Collections</p>
            <h2>Start with the stay type</h2>
            <div className={styles.discoveryGrid}>
              {searchCollections.map((item, index) => {
                const mediaKey = collectionMediaKeys[index];
                const media = searchMedia[mediaKey];
                return (
                  <Link
                    aria-label={item.title}
                    className={styles.discoveryCard}
                    href={mergeSearchHref(
                      `/${locale}/search?attribute=${encodeURIComponent(item.queryValue)}`,
                      queryParams,
                    )}
                    key={item.title}
                  >
                    <span
                      className={styles.discoveryMedia}
                      data-search-media={
                        mediaKey
                      }
                      data-search-media-path={media?.publicPath}
                    >
                      {media ? (
                        <Image
                          alt={media.alt}
                          fill
                          loading={
                            mediaKey === "golfCollection" ? "eager" : "lazy"
                          }
                          sizes="(max-width: 820px) 100vw, 22vw"
                          src={media.publicPath}
                          style={{ objectPosition: mediaPosition(media), objectFit: "cover", marginInline: "auto" }}
                          unoptimized
                        />
                      ) : null}
                    </span>
                    <span className={styles.discoveryCardCopy}>
                      <strong>{item.title}</strong>
                      <small>{item.text}</small>
                      <ArrowRight aria-hidden="true" size={16} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.ownerSection}>
          <div className={styles.ownerCopy}>
            <p className={styles.kicker}>Forest City, Johor</p>
            <h2>A coastal base for stays, golf and regional access.</h2>
            <p>
              Forest City is a coastal development in Iskandar Puteri, Johor,
              close to the Malaysia-Singapore Second Link. Its established
              visitor anchors include Forest City Marina Hotel on Pulau Satu and
              Forest City Golf Resort, home to Forest City Golf Hotel and two
              18-hole courses.
            </p>
            <div className={styles.ownerBenefits}>
              {forestCityHighlights.map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
            <ul>
              {forestCityFacts.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className={styles.note}>
              Transport services, venue access and opening hours should be
              confirmed with the respective operator before travel.
            </p>
            <a
              className={styles.pinkCta}
              href="https://forestcitysfz.com/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Explore Forest City
              <ArrowRight size={16} />
            </a>
          </div>
          <div className={styles.ownerImage}>
            {searchMedia.marinaForestCityOverview ? (
              <span
                className={styles.searchMediaFrame}
                data-search-media="marina:forest_city_overview"
                data-search-media-path={
                  searchMedia.marinaForestCityOverview.publicPath
                }
              >
                <Image
                  alt={searchMedia.marinaForestCityOverview.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 820px) 100vw, 44vw"
                  src={searchMedia.marinaForestCityOverview.publicPath}
                  style={{
                    objectPosition: mediaPosition(
                      searchMedia.marinaForestCityOverview,
                    ),
                    objectFit: "cover",
                  }}
                  unoptimized
                />
              </span>
            ) : (
              <span className={styles.mediaPlaceholder}>
                Forest City photography is loading…
              </span>
            )}
          </div>
        </section>

        <section className={styles.guideSection}>
          <p className={styles.kicker}>Guide</p>
          <h2>Discover Crays properties in Forest City</h2>
          <p>
            Search brings together hotel details, photography, map discovery and
            a request-first booking flow.
          </p>
          <div className={styles.guideGrid}>
            {editorialArticles
              .slice(0, guideExpanded ? 4 : 2)
              .map((article, index) => {
                const mediaKey = editorialMediaKeys[index];
                const media = searchMedia[mediaKey];
                return (
                  <article key={article.title}>
                    <div
                      className={styles.guideMedia}
                      data-search-media={
                        mediaKey
                      }
                      data-search-media-path={media?.publicPath}
                    >
                      {media ? (
                        <Image
                          alt={media.alt}
                          fill
                          loading="lazy"
                          sizes="(max-width: 820px) 100vw, 44vw"
                          src={media.publicPath}
                          style={{ objectPosition: mediaPosition(media), objectFit: "cover", marginInline: "auto" }}
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <h3>{article.title}</h3>
                    <p>{article.text}</p>
                  </article>
                );
              })}
          </div>
          <button
            className={styles.pinkOutline}
            onClick={() => setGuideExpanded((current) => !current)}
            type="button"
          >
            {guideExpanded ? "Show less" : "Show more"}
          </button>
        </section>

        <section className={styles.reviewsFaq}>
          <div>
            <p className={styles.kicker}>Guest reviews</p>
            <h2>What guests remember</h2>
            <div className={styles.reviewGrid}>
              {searchReviews.length > 0 ? (
                searchReviews.map((review) => (
                  <article key={review.byline}>
                    <strong>{review.score}</strong>
                    <p>{review.text}</p>
                    <span>{review.byline}</span>
                  </article>
                ))
              ) : (
                <article className={styles.reviewUnavailable} role="status">
                  <strong>Reviews are not available yet.</strong>
                  <p>
                    Ratings, review totals, quotes and guest profiles will
                    appear here when they are available.
                  </p>
                </article>
              )}
            </div>
          </div>
          <div>
            <p className={styles.kicker}>FAQ</p>
            <h2>Questions before booking</h2>
            <div className={styles.faqList}>
              {searchFaq.map((item) => (
                <details key={item.question}>
                  <summary>
                    {item.question}
                    <ChevronDown size={16} />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </section>

      <section className={styles.fundSection}>
        <div>
          <p className={styles.kicker}>Forest City Special Financial Zone</p>
          <h2>A regulated zone with targeted, conditional incentives.</h2>
          <p>
            Forest City is Malaysia&apos;s Special Financial Zone within the
            Johor-Singapore Special Economic Zone. Pulau Satu also has official
            duty-free status. The policy framework targets financial services,
            approved business activity and regional investment rather than a
            blanket tax exemption for residents, stays or transactions.
          </p>
          <div className={styles.zoneBenefits}>
            {forestCityZoneBenefits.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <a
                  href={item.sourceHref}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {item.sourceLabel}
                  <ArrowRight aria-hidden="true" size={15} />
                </a>
              </article>
            ))}
          </div>
          <div className={styles.zoneFooter}>
            <p className={styles.zoneNote}>
              No incentive is automatic. Eligibility, zone boundaries,
              certification, tax treatment, immigration and foreign-exchange
              permissions must be confirmed with the responsible Malaysian
              authorities and qualified advisers.
            </p>
            <a
              className={styles.zonePrimaryCta}
              href="https://www.mida.gov.my/forms-and-guidelines/fcsfz-tax-incentive-package/"
              rel="noreferrer noopener"
              target="_blank"
            >
              Review the official FCSFZ package
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <div className={styles.fundImage}>
          {searchMedia.marinaSfzContext ? (
            <span
              className={styles.searchMediaFrame}
              data-search-media="marina:sfz_context"
              data-search-media-path={searchMedia.marinaSfzContext.publicPath}
            >
              <Image
                alt={searchMedia.marinaSfzContext.alt}
                fill
                loading="lazy"
                sizes="(max-width: 820px) 100vw, 42vw"
                src={searchMedia.marinaSfzContext.publicPath}
                style={{
                  objectPosition: mediaPosition(searchMedia.marinaSfzContext),
                  objectFit: "cover",
                }}
                unoptimized
              />
            </span>
          ) : (
            <span className={styles.mediaPlaceholder}>
              Forest City photography is loading…
            </span>
          )}
        </div>
      </section>

      <section className={styles.exploreSection}>
        <p className={styles.kicker}>Explore</p>
        <h2>Continue through Crays</h2>
        <div>
          {exploreCards.map((card, index) => {
            const Icon = exploreIcons[index];
            return (
              <Link href={card.href} key={card.title}>
                <span>
                  <Icon aria-hidden="true" size={20} />
                </span>
                <div>
                  <strong>{card.title}</strong>
                  <small>{card.text}</small>
                </div>
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            );
          })}
        </div>
      </section>

      {openPanel === "filters" ? (
        <div
          className={styles.filterBackdrop}
          onMouseDown={(event) =>
            event.target === event.currentTarget && closePanel()
          }
        >
          <div
            aria-label="Property filters"
            aria-modal="true"
            className={styles.filterDialog}
            onKeyDown={trapFocus}
            ref={dialogRef}
            role="dialog"
          >
            <header>
              <span />
              <strong>Filters</strong>
              <button
                aria-label="Close filters"
                onClick={closePanel}
                type="button"
              >
                <X size={20} />
              </button>
            </header>
            <div className={styles.filterBody}>
              <section>
                <h2>Recommended for you</h2>
                <div
                  className={`${styles.filterOptions} ${styles.recommendedOptions}`}
                >
                  {recommendedFilters.map(({ label, Icon }) => (
                    <button
                      aria-pressed={activeFilters.includes(label)}
                      className={
                        activeFilters.includes(label)
                          ? styles.filterSelected
                          : ""
                      }
                      key={label}
                      onClick={() => toggleAttribute(label)}
                      type="button"
                    >
                      {activeFilters.includes(label) ? (
                        <Check size={16} />
                      ) : (
                        <Icon size={18} />
                      )}
                      {label}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h2>Type of place</h2>
                <div
                  className={`${styles.filterOptions} ${styles.placeTypeOptions}`}
                >
                  {placeTypes.map((filter, index) => {
                    const Icon = placeTypeIcons[index];
                    return (
                      <button
                        aria-pressed={
                          filter === "Any property"
                            ? activeTypes.length === 0
                            : activeTypes.includes(filter)
                        }
                        className={
                          (filter === "Any property" &&
                            activeTypes.length === 0) ||
                          activeTypes.includes(filter)
                            ? styles.filterSelected
                            : ""
                        }
                        key={filter}
                        onClick={() =>
                          filter === "Any property"
                            ? setActiveTypes([])
                            : toggleType(filter)
                        }
                        type="button"
                      >
                        <Icon size={18} />
                        {filter}
                      </button>
                    );
                  })}
                </div>
              </section>
              <section>
                <h2>Price range</h2>
                <p>Trip price, based on the selected stay length.</p>
                <div className={styles.priceRangeControl}>
                  <p>
                    Live Forest City price distribution appears when more hotel
                    rates are available.
                  </p>
                  <div className={styles.priceBars} aria-hidden="true" />
                  <div className={styles.priceSliders}>
                    <input
                      aria-label="Minimum trip price"
                      disabled
                      type="range"
                    />
                    <input
                      aria-label="Maximum trip price"
                      disabled
                      type="range"
                    />
                  </div>
                </div>
                <div className={styles.priceInputs}>
                  <label>
                    Minimum
                    <input
                      disabled
                      inputMode="numeric"
                      name="minimum"
                      onChange={(event) => setPriceMinimum(event.target.value)}
                      placeholder="Unavailable"
                      value={priceMinimum}
                    />
                  </label>
                  <label>
                    Maximum
                    <input
                      disabled
                      inputMode="numeric"
                      name="maximum"
                      onChange={(event) => setPriceMaximum(event.target.value)}
                      placeholder="Unavailable"
                      value={priceMaximum}
                    />
                  </label>
                </div>
              </section>
              <section>
                <h2>Rooms and beds</h2>
                {(["bedrooms", "beds", "bathrooms"] as const).map((room) => (
                  <div className={styles.roomCounter} key={room}>
                    <div>
                      <strong>{room[0].toUpperCase() + room.slice(1)}</strong>
                      <span>{`Minimum number of ${room}`}</span>
                    </div>
                    <div>
                      <button
                        aria-label={`Decrease ${room}`}
                        disabled={roomCounts[room] === 0}
                        onClick={() =>
                          setRoomCounts((current) => ({
                            ...current,
                            [room]: Math.max(0, current[room] - 1),
                          }))
                        }
                        type="button"
                      >
                        <Minus size={16} />
                      </button>
                      <output>{roomCounts[room]}</output>
                      <button
                        aria-label={`Increase ${room}`}
                        onClick={() =>
                          setRoomCounts((current) => ({
                            ...current,
                            [room]: current[room] + 1,
                          }))
                        }
                        type="button"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </section>
              {filterGroups.map((group) => (
                <section key={group.title}>
                  <h2>{group.title}</h2>
                  <div className={styles.checkGrid}>
                    {group.items.map((filter) => (
                      <label key={filter}>
                        <input
                          checked={
                            group.title === "Property type"
                              ? activeTypes.includes(filter)
                              : activeAttributes.includes(filter)
                          }
                          onChange={() =>
                            group.title === "Property type"
                              ? toggleType(filter)
                              : toggleAttribute(filter)
                          }
                          type="checkbox"
                        />
                        <span>{filter}</span>
                      </label>
                    ))}
                  </div>
                  {group.title === "Standout stays" ? (
                    <div className={styles.filterHelpers}>
                      <span>Popular Forest City properties</span>
                      <span>Forest City hospitality discovery</span>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
            <footer>
              <button
                onClick={() => {
                  setActiveAttributes([]);
                  setActiveTypes([]);
                  setPriceMinimum("");
                  setPriceMaximum("");
                  setRoomCounts({ bedrooms: 0, beds: 0, bathrooms: 0 });
                }}
                type="button"
              >
                Clear all
              </button>
              <button
                onClick={() => {
                  updateAddress();
                  closePanel();
                }}
                type="button"
              >
                Show {visibleProperties.length} properties
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </main></TodayLocalizedContent></TodayLocaleProvider>
  );
}
