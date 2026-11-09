"use client";
import {readMemberDemoDocumentsGraphQLFeed} from "../member/member-demo-documents-graphql-reader";
import type {MemberDemoDocumentsRead} from "../../../lib/clubs/member-demo-document-contract";
import {readMemberFinanceGraphQLFeed} from "../member/member-finance-graphql-reader";
import type {MemberFinanceRead} from "../../../lib/clubs/member-finance-contract";
import {readMemberServiceOffersGraphQLFeed} from "../member/member-services-graphql-reader";
import type {MemberServiceOffersRead} from "../../../lib/clubs/member-service-offers-contract";
import {readMemberExperiencesGraphQLFeed} from "../member/member-experiences-graphql-reader";
import type {MemberExperienceRead} from "../../../lib/clubs/member-experience-contract";

import Image from "../../../integration/browser-image";
import Link from "../../../integration/browser-link";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ConciergeBell,
  FileText,
  HelpCircle,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Send,
  ShoppingBag,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  CLUBS_LOCALES,
  clubsPath,
  type ClubsLocale,
} from "../../../lib/clubs/public-site";
import type { ClubsPublicCopy } from "../../../lib/clubs/public-site-copy";
import { ClubsPublicShell } from "./clubs-public-shell";
import { TodayLocaleProvider, TodayLocalizedContent } from "./today-localized-content";
import {accountAccessMessages} from "./account-access-messages";
import styles from "./clubs-member-account.module.css";
// Existing B2B entry: AUTH_INTEGRATION_DECISION_2026_09_24 and main-auth-candidate-runtime-20260927.
const TEAM_LOGIN_HREF = "https://crays.pro/auth/login";
import { ClubsMemberHome } from "../member/clubs-member-home";
import type { MemberMessageComposerContext } from "../member/member-messages-workspace";
import { readProgressiveMemberFeeds } from "../member/member-progressive-feeds";
import {memberOwnStateSchema, type MemberOwnState} from "../../../lib/clubs/member-own-state-contract";
import {createMemberGraphQLTransport, type MemberOperationRegistry} from "../../../lib/clubs/member-graphql-transport";
import memberOperationRegistry from "../../../graphql/member-self/MEMBER_SELF_OPERATION_REGISTRY.json";
import {readMemberConversationsGraphQLFeed} from "../member/member-conversations-graphql-reader";
import type {OwnMemberConversations} from "../../../lib/clubs/member-conversation-contract";
import {parseOwnMemberSupportCommandStatus, memberSupportStatusMatchesPending, memberSupportAppliedStatusPayload} from "../../../lib/clubs/member-support-command-status-contract";
import {memberSupportAcknowledgedCaseId, memberSupportCommandReadbackConfirmed} from "../../../lib/clubs/member-support-command-readback";
import {restorePendingMemberSupport, createPendingMemberSupport, persistPendingMemberSupport, acknowledgePendingMemberSupport, clearPendingMemberSupport, matchesPendingMemberSupport, memberSupportDigest, type MemberSupportPendingMarker} from "../../../lib/clubs/member-support-pending-storage";
import {readMemberTestStaysGraphQLFeed} from "../member/member-test-stays-graphql-reader";
import type {OwnTestStays} from "../../../lib/clubs/member-test-stays-contract";


export type AccountProfile = {
  id?: string;
  displayName?: string;
  name?: string;
  email?: string | null;
  emailVerified?: boolean;
};

type SessionPayload = {
  ownState?: unknown;
  status?: string;
  account?: AccountProfile;
  loginHref?: string;
  signupHref?: string;
  provisioningHref?: string | null;
  logoutHref?: string;
};

export type SessionState =
  | { kind: "loading" }
  | { kind: "signed_out"; loginHref: string; signupHref: string }
  | { kind: "identity_binding_required"; provisioningHref: string }
  | { kind: "ready"; account: AccountProfile; logoutHref: string }
  | { kind: "unavailable"; status: string; retryable: boolean };

type FeedState<T> =
  { kind: "loading" } | { kind: "ready"; data: T } | { kind: "unavailable" };

type SavedCartState = {
  status: "ready";
  savedPropertyIds: string[];
  cartItems: Array<{
    bookingAuthority: false;
    cartItemId: string;
    cartState: "planning" | "commercially_bound";
    commercialBinding: boolean;
    propertyId: string;
    version: number;
  }>;
};

type PropertyActionState = {
  key: string | null;
  message: string | null;
  status: "idle" | "working" | "error" | "success";
};

type Booking = {
  bookingId: string;
  publicReference: string;
  status: string;
  propertyId: string;
  arrivalDate: string | null;
  departureDate: string | null;
  currency: string | null;
  totalMinor: number | null;
  guestCount: number | null;
};

type BookingRequest = {
  bookingRequestId: string;
  publicReference: string;
  propertyId: string;
  status: string;
  submittedAt: string | null;
  updatedAt: string | null;
  holdStatus: string | null;
  currency: string | null;
  totalMinor: number | null;
};

type ServiceSelection = {
  selectionId: string;
  publicReference: string;
  bookingId: string;
  bookingReference: string;
  displayName: string;
  serviceType: string;
  chargeMode: string;
  quantity: number;
  status: string;
  version: number;
  requestedFor: string | null;
  paymentStatus: null;
};

type AvailableOffering = {
  bookingId: string;
  bookingReference: string;
  propertyId: string;
  offeringId: string;
  serviceCode: string;
  serviceType: string;
  displayName: string;
  fulfillmentMode: string;
  chargeMode: string;
  version: number;
  price: null;
  paymentAuthority: false;
};

type Entitlement = {
  entitlementId: string;
  publicReference: string;
  scopeKey: string;
  status: string;
  validFrom: string | null;
  validUntil: string | null;
};

type StayDocument = {
  documentId: string;
  kind: string;
  title: string;
  createdAt: string;
};

type SupportCase = {
  caseId: string;
  publicReference: string;
  subject: string;
  status: string;
  messageCount: number;
  bookingId: string | null;
  category: string;
  version: number;
};

type BookingsPayload = { status: "ready"; bookings: Booking[] };
type RequestsPayload = { status: "ready"; requests: BookingRequest[] };
type ServicesPayload = {
  status: "ready";
  availableOfferings: AvailableOffering[];
  services: ServiceSelection[];
  entitlements: Entitlement[];
};

type ServiceCommand =
  | {
      type: "request_service";
      bookingId: string;
      offeringId: string;
      quantity: number;
      requestedFor?: string;
      requestNote?: string;
    }
  | {
      type: "cancel_service";
      selectionId: string;
      expectedVersion: number;
      reason: string;
    };

type ServiceActionState = {
  status: "idle" | "working" | "success" | "error" | "unknown";
  message: string | null;
  target: string | null;
};

function isDeterministicMemberRejection(status: number, payload: Record<string, unknown> | null): boolean {
  return (status === 400 && payload?.status === "validation_error") ||
    (status === 403 && payload?.status === "denied") ||
    (status === 409 && (payload?.status === "conflict" || payload?.status === "state_conflict"));
}

type CommandAcknowledgement = {
  status: 200;
  payload: Record<string, unknown> | null;
};

type PendingServiceRetry = {
  body: ServiceCommand;
  idempotencyKey: string;
  acknowledgement?: CommandAcknowledgement;
};
type SupportPayload = {
  status: "ready";
  documents: StayDocument[];
  supportCases: SupportCase[];
};

type SupportCategory =
  | "booking"
  | "change"
  | "cancellation"
  | "arrival"
  | "service"
  | "access"
  | "document"
  | "other";

type SupportCommand =
  | {
      type: "open_case";
      bookingId?: string;
      category: SupportCategory;
      subject: string;
      message: string;
    }
  | { type: "add_message"; caseId: string; message: string };

type SupportActionState = {
  status: "idle" | "working" | "success" | "error" | "unknown";
  message: string | null;
  target: string | null;
};

type PendingSupportRetry = {
  body: SupportCommand;
  idempotencyKey: string;
  previousMessageCount: number;
  acknowledgement?: CommandAcknowledgement;
};

type MembershipApplicationStatus =
  "none" | "submitted" | "under_review" | "approved" | "declined" | "withdrawn";

type MembershipStatus =
  "not_confirmed" | "confirmed" | "suspended" | "revoked" | "expired";

type MembershipPayload = {
  schema: "crays.clubs.member-membership-ui.v1";
  version: "1.0.0";
  status: "ready";
  application: {
    applicationId: string | null;
    status: MembershipApplicationStatus;
    interestPropertyId: "property-clubs-forest-city-marina" | null;
    version: number | null;
    submittedAt: string | null;
    updatedAt: string | null;
  };
  membership: {
    membershipId: string | null;
    status: MembershipStatus;
    membershipTypeId: string | null;
    membershipTypeMappingReady: boolean;
    version: number | null;
    validFrom: string | null;
    validUntil: string | null;
    decisionAuthority: string;
  };
  authorities: {
    authenticationReady: true;
    membershipConfirmed: boolean;
    membershipDecisionAuthority: "CRAYS_TEAM";
    membershipTypeMappingReady: boolean;
    marinaPropertyAdmission: false;
    availabilityAuthority: false;
    bookingAuthority: false;
  };
};

type MembershipCommand =
  | {
      type: "submit_application";
      interestPropertyId: "property-clubs-forest-city-marina" | null;
    }
  | { type: "withdraw_application" };

type MembershipActionState = {
  status: "idle" | "working" | "success" | "error" | "unknown";
  message: string | null;
};

type PendingMembershipRetry = {
  body: MembershipCommand;
  idempotencyKey: string;
  previousApplicationStatus: MembershipApplicationStatus;
  acknowledgement?: CommandAcknowledgement;
};

type WorkspaceState = {
  demoDocuments: FeedState<MemberDemoDocumentsRead>;
  finance: FeedState<MemberFinanceRead>;
  serviceOffers: FeedState<MemberServiceOffersRead>;
  experiences: FeedState<MemberExperienceRead>;
  conversations: FeedState<OwnMemberConversations>;
  testStays: FeedState<OwnTestStays>;
  savedProperties: FeedState<{savedPropertyIds: string[]}>;
  membership: FeedState<MembershipPayload>;
  savedCart: FeedState<SavedCartState>;
  bookings: FeedState<BookingsPayload>;
  requests: FeedState<RequestsPayload>;
  services: FeedState<ServicesPayload>;
  support: FeedState<SupportPayload>;
};

type PropertySummary = {
  title: string;
  eyebrow: string;
  href: string;
  image: string;
};

const propertyRegistry: Record<string, PropertySummary> = {
  "property-clubs-forest-city-golf": {
    title: "Forest City Golf Hotel",
    eyebrow: "FOREST CITY · GOLF",
    href: "/en/hospitality/golf-hotel",
    image: "/__crays-clubs/forest-city-v2552/golf/004-f9f3773022d48f71.jpg",
  },
  "property-clubs-forest-city-marina": {
    title: "Forest City Marina Hotel",
    eyebrow: "FOREST CITY · MARINA",
    href: "/en/hospitality/marina-hotel",
    image: "/__crays-clubs/forest-city-v2552/marina/002-1deca31c18f7f331.jpg",
  },
};

const loadingWorkspace: WorkspaceState = {
  demoDocuments: {kind:"loading"},
  finance: {kind:"loading"},
  serviceOffers: {kind: "loading"},
  experiences: {kind: "loading"},
  conversations: {kind: "loading"},
  testStays: {kind: "loading"},
  savedProperties: {kind: "loading"},
  membership: { kind: "loading" },
  savedCart: { kind: "loading" },
  bookings: { kind: "loading" },
  requests: { kind: "loading" },
  services: { kind: "loading" },
  support: { kind: "loading" },
};

function safeHref(value: unknown, fallback: string): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    return fallback;
  return value;
}

function currentAccountReturnTo(accountPath: string): string {
  if (typeof window === "undefined") return accountPath;
  if (window.location.pathname !== accountPath) return accountPath;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function readable(value: string | null | undefined): string {
  if (!value) return "Not reported";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not reported";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function optionalIso(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatMoney(
  currency: string | null,
  totalMinor: number | null,
): string | null {
  if (!currency || typeof totalMinor !== "number") return null;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(totalMinor / 100);
}

function propertyFor(propertyId: string): PropertySummary {
  return (
    propertyRegistry[propertyId] ?? {
      title: "CRAYS stay",
      eyebrow: "CRAYS CLUBS",
      href: "/en/search",
      image: "/__crays-clubs/forest-city-v2552/golf/004-f9f3773022d48f71.jpg",
    }
  );
}

async function readFeed<T>(
  url: string,
  signal: AbortSignal,
): Promise<FeedState<T>> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    });
    if (response.status !== 200) return { kind: "unavailable" };
    return { kind: "ready", data: (await response.json()) as T };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    return { kind: "unavailable" };
  }
}

const membershipApplicationStates: MembershipApplicationStatus[] = [
  "none",
  "submitted",
  "under_review",
  "approved",
  "declined",
  "withdrawn",
];

const membershipStates: MembershipStatus[] = [
  "not_confirmed",
  "confirmed",
  "suspended",
  "revoked",
  "expired",
];

function isMembershipPayload(value: unknown): value is MembershipPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  if (
    payload.schema !== "crays.clubs.member-membership-ui.v1" ||
    payload.version !== "1.0.0" ||
    payload.status !== "ready" ||
    !payload.application ||
    typeof payload.application !== "object" ||
    Array.isArray(payload.application) ||
    !payload.membership ||
    typeof payload.membership !== "object" ||
    Array.isArray(payload.membership) ||
    !payload.authorities ||
    typeof payload.authorities !== "object" ||
    Array.isArray(payload.authorities)
  )
    return false;

  const application = payload.application as Record<string, unknown>;
  const membership = payload.membership as Record<string, unknown>;
  const authorities = payload.authorities as Record<string, unknown>;
  return (
    membershipApplicationStates.includes(
      application.status as MembershipApplicationStatus,
    ) &&
    (application.interestPropertyId === null ||
      application.interestPropertyId === "property-clubs-forest-city-marina") &&
    membershipStates.includes(membership.status as MembershipStatus) &&
    authorities.authenticationReady === true &&
    typeof authorities.membershipConfirmed === "boolean" &&
    authorities.membershipDecisionAuthority === "CRAYS_TEAM" &&
    typeof authorities.membershipTypeMappingReady === "boolean" &&
    authorities.marinaPropertyAdmission === false &&
    authorities.availabilityAuthority === false &&
    authorities.bookingAuthority === false
  );
}

// The same refresh shares one authenticated persisted query, without personal-data caching.
async function readOwnState(signal: AbortSignal): Promise<MemberOwnState | null> {
  try {
    const port = createMemberGraphQLTransport(memberOperationRegistry as MemberOperationRegistry);
    return await port.read("ownState", {contractVersion: "1.0.0"}, memberOwnStateSchema, signal);
  } catch (error: unknown) {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    return null;
  }
}

function membershipFromOwnState(state: MemberOwnState | null): FeedState<MembershipPayload> {
  if (!state) return {kind: "unavailable"};
  // Null is an actual absence in the original DTO, not a membership decision.
  // Cart, bookings and history remain independent feeds; never infer their contents here.
  const application = state.application ?? {
    applicationId: null, status: "none" as const, interestPropertyId: null,
    version: null, submittedAt: null, updatedAt: null,
  };
  const membership = state.membership ?? {
    membershipId: null, status: "not_confirmed" as const, membershipTypeId: null,
    membershipTypeMappingReady: false, version: null, validFrom: null,
    validUntil: null, decisionAuthority: "CRAYS_TEAM" as const,
  };
  const payload = {
    schema: "crays.clubs.member-membership-ui.v1", version: "1.0.0", status: "ready",
    application, membership,
    authorities: {...state.authorities, membershipDecisionAuthority: "CRAYS_TEAM",
      membershipTypeMappingReady: membership.membershipTypeMappingReady},
  };
  return isMembershipPayload(payload) ? {kind: "ready", data: payload} : {kind: "unavailable"};
}

async function readMembership(signal: AbortSignal): Promise<FeedState<MembershipPayload>> {
  return membershipFromOwnState(await readOwnState(signal));
}

function FeedBoundary({
  state,
  empty,
  children,
}: {
  state: FeedState<unknown>;
  empty: boolean;
  children: ReactNode;
}) {
  if (state.kind === "loading")
    return (
      <div className={styles.feedState} role="status">
        <LoaderCircle className={styles.spin} size={22} aria-hidden />
        <span>Loading your information…</span>
      </div>
    );
  if (state.kind === "unavailable")
    return (
      <div className={styles.feedState} role="status">
        <CircleAlert size={22} aria-hidden />
        <span>This area is temporarily unavailable. Please try again.</span>
      </div>
    );
  if (empty) return <div className={styles.emptyState}>{children}</div>;
  return <>{children}</>;
}

function PropertyCard({
  actionBusy,
  actionLabel,
  actionMessage,
  onAction,
  propertyId,
  meta,
}: {
  actionBusy?: boolean;
  actionLabel?: string;
  actionMessage?: string | null;
  onAction?: () => void;
  propertyId: string;
  meta?: string;
}) {
  const property = propertyFor(propertyId);
  return (
    <article className={styles.propertyCard}>
      <div className={styles.propertyImage}>
        <Image
          alt=""
          fill
          sizes="(max-width: 680px) 100vw, 280px"
          src={property.image}
        />
      </div>
      <div className={styles.propertyCopy}>
        <span>{property.eyebrow}</span>
        <h3>{property.title}</h3>
        <p>{meta ?? "Your saved Forest City stay."}</p>
      </div>
      <div className={styles.propertyActions}>
        <Link className={styles.secondaryAction} href={property.href}>
          View stay <ArrowRight size={16} aria-hidden />
        </Link>
        {onAction && actionLabel ? (
          <button
            className={styles.removeAction}
            disabled={actionBusy}
            onClick={onAction}
            type="button"
          >
            {actionBusy ? "Updating…" : actionLabel}
          </button>
        ) : null}
        {actionMessage ? (
          <span className={styles.actionMessage} role="status">
            {actionMessage}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function MemberAccountFrame({ ready, embedded, locale, children }: { ready: boolean; embedded: boolean; locale: ClubsLocale; children: ReactNode }) {
  if (ready || embedded) return children;
  return <ClubsPublicShell availableLocales={CLUBS_LOCALES} headerTone="navy" locale={locale}>{children}</ClubsPublicShell>;
}

export function ClubsMemberAccount({
  locale,
  copy,
  embedded = false,
  expectedAccountId,
  toolbarTarget,
  onSessionChange,
}: {
  locale: ClubsLocale;
  copy: ClubsPublicCopy;
  embedded?: boolean;
  expectedAccountId?: string;
  toolbarTarget?: HTMLElement | null;
  onSessionChange?: (session: SessionState) => void;
}) {
  const accountPath = clubsPath(locale, "account");
  const accountReturnTo = currentAccountReturnTo(accountPath);
  const loginFallback = `/auth/login?returnTo=${encodeURIComponent(accountReturnTo)}`;
  const signupFallback = `/auth/login?screen_hint=signup&returnTo=${encodeURIComponent(accountReturnTo)}`;
  const [refreshKey, setRefreshKey] = useState(0);
  const [session, setSession] = useState<SessionState>({ kind: "loading" });
  useEffect(() => { onSessionChange?.(session); }, [session, onSessionChange]);
  const AccountContainer = embedded ? "div" : "main";
  const [workspace, setWorkspace] = useState<WorkspaceState>(loadingWorkspace);
  const [provisioning, setProvisioning] = useState<
    "idle" | "working" | "error"
  >("idle");
  const [propertyAction, setPropertyAction] = useState<PropertyActionState>({
    key: null,
    message: null,
    status: "idle",
  });
  const [supportDraft, setSupportDraft] = useState<{
    bookingId: string;
    category: SupportCategory;
    message: string;
    subject: string;
  }>({ bookingId: "", category: "other", message: "", subject: "" });
  const [supportReplies, setSupportReplies] = useState<Record<string, string>>(
    {},
  );
  const [supportAction, setSupportAction] = useState<SupportActionState>({
    message: null,
    status: "idle",
    target: null,
  });
  const [pendingSupportRetry, setPendingSupportRetry] =
    useState<PendingSupportRetry | null>(null);
  const [supportPendingMarker, setSupportPendingMarker] = useState<MemberSupportPendingMarker | null>(null);
  const supportAccountId = session.kind === "ready" ? session.account.id ?? null : null;
  useEffect(() => {
    setPendingSupportRetry(null);
    setSupportPendingMarker(null);
    if (!supportAccountId) return;
    try {
      const marker = restorePendingMemberSupport(supportAccountId, window.localStorage);
      setSupportPendingMarker(marker);
      if (marker) setSupportAction({status: "unknown", target: marker.caseId ?? "new",
        message: "Your previous message still needs a saved-status check before another message can be sent."});
    } catch {
      setSupportAction({status: "unknown", target: null,
        message: "We can’t read the saved reference for your previous message. Sending is paused until it can be checked."});
    }
  }, [supportAccountId]);
  const [serviceDrafts, setServiceDrafts] = useState<
    Record<
      string,
      { quantity: string; requestedFor: string; requestNote: string }
    >
  >({});
  const [serviceCancelReasons, setServiceCancelReasons] = useState<
    Record<string, string>
  >({});
  const [serviceAction, setServiceAction] = useState<ServiceActionState>({
    message: null,
    status: "idle",
    target: null,
  });
  const [pendingServiceRetry, setPendingServiceRetry] =
    useState<PendingServiceRetry | null>(null);
  const [marinaInterest, setMarinaInterest] = useState(false);
  const [membershipAction, setMembershipAction] =
    useState<MembershipActionState>({ status: "idle", message: null });
  const [pendingMembershipRetry, setPendingMembershipRetry] =
    useState<PendingMembershipRetry | null>(null);

  const workspaceGeneration = useRef(0);
  const backgroundRefresh = useRef<AbortController | null>(null);
  const activeAccountId = useRef(supportAccountId);
  activeAccountId.current = supportAccountId;
  useEffect(() => () => {
    if (backgroundRefresh.current) {
      backgroundRefresh.current.abort();
      backgroundRefresh.current = null;
      workspaceGeneration.current++;
    }
  }, [supportAccountId]);
  const loadWorkspace = useCallback(async (signal: AbortSignal, initialOwnState?: MemberOwnState,
    background?: {accountId: string; verify: () => Promise<boolean>}) => {
    const generation = ++workspaceGeneration.current;
    if (!background) setWorkspace(loadingWorkspace);
    const staged: WorkspaceState = {...loadingWorkspace};
    const ownState = (initialOwnState ? Promise.resolve(initialOwnState) : readOwnState(signal)).then(state => {
      if (background && state && state.accountId !== background.accountId) throw new Error("ACCOUNT_CHANGED_DURING_REFRESH");
      return state;
    });
    await readProgressiveMemberFeeds<WorkspaceState>({
      demoDocuments: () => readMemberDemoDocumentsGraphQLFeed(memberOperationRegistry as MemberOperationRegistry,fetch,signal),
      finance: () => readMemberFinanceGraphQLFeed(memberOperationRegistry as MemberOperationRegistry,fetch,signal),
      serviceOffers: () => readMemberServiceOffersGraphQLFeed(memberOperationRegistry as MemberOperationRegistry,fetch,signal),
      experiences: () => readMemberExperiencesGraphQLFeed(memberOperationRegistry as MemberOperationRegistry,fetch,signal),
      conversations: () => readMemberConversationsGraphQLFeed(memberOperationRegistry as MemberOperationRegistry,fetch,signal),
      testStays: () => readMemberTestStaysGraphQLFeed(memberOperationRegistry as MemberOperationRegistry,fetch,signal),
      savedProperties: async () => {
        const state = await ownState;
        return state ? {kind: "ready", data: {savedPropertyIds: state.savedPropertyIds}} : {kind: "unavailable"};
      },
      membership: async () => {
        const membership = membershipFromOwnState(await ownState);
        if (!background && !signal.aborted && generation === workspaceGeneration.current && membership.kind === "ready") {
          setMarinaInterest(membership.data.application.interestPropertyId === "property-clubs-forest-city-marina");
        }
        return membership;
      },
      savedCart: () => readFeed<SavedCartState>("/api/crays/clubs/member/state", signal),
      bookings: () => readFeed<BookingsPayload>("/api/crays/clubs/member/bookings", signal),
      requests: () => readFeed<RequestsPayload>("/api/crays/clubs/member/booking-requests", signal),
      services: () => readFeed<ServicesPayload>("/api/crays/clubs/member/services", signal),
      support: () => readFeed<SupportPayload>("/api/crays/clubs/member/stay-support", signal),
    }, signal, (key, value) => {
      if (signal.aborted || generation !== workspaceGeneration.current) return;
      if (background) {
        if (value.kind === "ready" && "accountId" in value.data && value.data.accountId !== background.accountId)
          throw new Error("ACCOUNT_CHANGED_DURING_REFRESH");
        Object.assign(staged, {[key]: value});
      } else setWorkspace(current => ({ ...current, [key]: value }));
    });
    if (background && !signal.aborted && generation === workspaceGeneration.current && await background.verify()) {
      if (signal.aborted || generation !== workspaceGeneration.current || activeAccountId.current !== background.accountId) return;
      setWorkspace(staged);
      if (staged.membership.kind === "ready")
        setMarinaInterest(staged.membership.data.application.interestPropertyId === "property-clubs-forest-city-marina");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(
      `/api/crays/clubs/member/session?returnTo=${encodeURIComponent(accountReturnTo)}`,
      {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const data = (await response
          .json()
          .catch(() => ({}))) as SessionPayload;
        const status = data.status ?? "temporarily_unavailable";
        if (response.status === 401 && status === "signed_out") {
          setSession({
            kind: "signed_out",
            loginHref: safeHref(data.loginHref, loginFallback),
            signupHref: safeHref(data.signupHref, signupFallback),
          });
        } else if (
          response.status === 409 &&
          status === "identity_binding_required" &&
          data.provisioningHref
        ) {
          setSession({
            kind: "identity_binding_required",
            provisioningHref: safeHref(
              data.provisioningHref,
              "/api/crays/auth/provider/account",
            ),
          });
        } else if (
          response.status === 200 &&
          status === "ready" &&
          data.account
        ) {
          if (expectedAccountId !== undefined && data.account.id !== expectedAccountId) {
            setSession({kind: "unavailable", status: "invalid_session_provenance", retryable: false});
            return;
          }
          setSession({
            kind: "ready",
            account: data.account,
            logoutHref: safeHref(
              data.logoutHref,
              "/auth/logout?returnTo=%2Fen",
            ),
          });
          const initial = memberOwnStateSchema.safeParse(data.ownState);
          const matchedOwnState = initial.success && typeof data.account.id === "string" && initial.data.accountId === data.account.id
            ? initial.data : undefined;
          // Consume only this response's strict account-matched DTO. Reload,
          // refresh and command readback never reuse a global/private cache.
          await loadWorkspace(controller.signal, matchedOwnState);
        } else {
          setSession({
            kind: "unavailable",
            status,
            retryable: response.status === 503,
          });
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setSession({
          kind: "unavailable",
          status: "temporarily_unavailable",
          retryable: true,
        });
      });
    return () => controller.abort();
  }, [accountReturnTo, loadWorkspace, loginFallback, refreshKey, signupFallback, expectedAccountId]);

  const refreshWorkspace = () => {
    if (session.kind !== "ready" || typeof session.account.id !== "string") return;
    const accountId = session.account.id;
    backgroundRefresh.current?.abort();
    const controller = new AbortController();
    backgroundRefresh.current = controller;
    const invalidate = () => {
      if (controller.signal.aborted || backgroundRefresh.current !== controller || activeAccountId.current !== accountId) return;
      workspaceGeneration.current++;
      setWorkspace(loadingWorkspace);
      setSession({kind: "unavailable", status: "temporarily_unavailable", retryable: true});
    };
    const readSession = async () => {
      const response = await fetch(`/api/crays/clubs/member/session?returnTo=${encodeURIComponent(accountReturnTo)}`,
        {cache: "no-store", credentials: "same-origin", headers: {Accept: "application/json"}, signal: controller.signal});
      const data = await response.json() as SessionPayload;
      if (controller.signal.aborted || backgroundRefresh.current !== controller || activeAccountId.current !== accountId) return null;
      if (response.status !== 200 || data.status !== "ready" || data.account?.id !== accountId) {
        invalidate(); return null;
      }
      return data;
    };
    void (async () => {
      try {
        const data = await readSession();
        if (!data) return;
        const initial = memberOwnStateSchema.safeParse(data.ownState);
        const ownState = initial.success && initial.data.accountId === accountId ? initial.data : undefined;
        await loadWorkspace(controller.signal, ownState, {accountId, verify: async () => (await readSession()) !== null});
      } catch {
        if (!controller.signal.aborted) invalidate();
      }
    })();
  };

  const retry = () => {
    setSession({ kind: "loading" });
    setWorkspace(loadingWorkspace);
    setRefreshKey((value) => value + 1);
  };
  const completeGuestAccount = async () => {
    if (
      session.kind !== "identity_binding_required" ||
      provisioning === "working"
    )
      return;
    setProvisioning("working");
    try {
      const response = await fetch(session.provisioningHref, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (!response.ok) return setProvisioning("error");
      setProvisioning("idle");
      retry();
    } catch {
      setProvisioning("error");
    }
  };

  const runPropertyCommand = async (
    type: "remove_saved_property" | "remove_cart",
    propertyId: string,
  ) => {
    if (session.kind !== "ready" || propertyAction.status === "working") return;
    const key = `${type}:${propertyId}`;
    const idempotencyKey = `clubs_${crypto.randomUUID()}`;
    setPropertyAction({ key, message: null, status: "working" });

    const post = async () => {
      const response = await fetch("/api/crays/clubs/member/state", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ propertyId, type }),
      });
      const payload = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return { payload, response };
    };

    try {
      const result = await post();

      const controller = new AbortController();
      let stateVerified = false;
      if (type === "remove_saved_property") {
        const ownState = await readOwnState(controller.signal);
        const savedProperties: WorkspaceState["savedProperties"] = ownState
          ? {kind: "ready", data: {savedPropertyIds: ownState.savedPropertyIds}}
          : {kind: "unavailable"};
        setWorkspace(current => ({...current, savedProperties}));
        stateVerified = ownState !== null && !ownState.savedPropertyIds.includes(propertyId);
      } else {
        const latest = await readFeed<SavedCartState>("/api/crays/clubs/member/state", controller.signal);
        setWorkspace(current => ({...current, savedCart: latest}));
        stateVerified = latest.kind === "ready" && !latest.data.cartItems.some(item => item.propertyId === propertyId);
      }
      const acknowledged =
        result.response.status === 200 &&
        result.payload?.status === "persisted" &&
        result.payload.propertyId === propertyId &&
        result.payload.bookingAuthority === false &&
        typeof result.payload.receiptId === "string";
      const confirmed = acknowledged && stateVerified;
      setPropertyAction({
        key,
        message: confirmed
          ? type === "remove_saved_property"
            ? "Removed from your saved stays."
            : "Removed from your planning cart."
          : result.response.status === 503
            ? "This area is temporarily unavailable. Please try again."
            : "The latest account state is shown. This change was not confirmed.",
        status: confirmed ? "success" : "error",
      });
    } catch {
      setPropertyAction({
        key,
        message: "This change could not be completed. Please try again.",
        status: "error",
      });
    }
  };

  const readPendingSupportStatus = async (marker: MemberSupportPendingMarker) => {
    const response = await fetch(`/api/crays/clubs/member/stay-support?commandKey=${encodeURIComponent(marker.idempotencyKey)}`, {
      method: "GET", cache: "no-store", credentials: "same-origin", headers: {Accept: "application/json"},
    });
    if (response.status !== 200) throw Error("SUPPORT_COMMAND_STATUS_UNAVAILABLE");
    const result = parseOwnMemberSupportCommandStatus(await response.json(), marker.accountId, marker.idempotencyKey);
    if (!memberSupportStatusMatchesPending(result, marker)) throw Error("SUPPORT_COMMAND_STATUS_UNCONFIRMED");
    return result;
  };

  const checkRecoveredSupportOperationWithLock = async () => {
    if (session.kind !== "ready" || !session.account.id || supportAction.status === "working") return;
    const accountId = session.account.id;
    try {
      const marker = restorePendingMemberSupport(accountId, window.localStorage);
      if (!marker) return;
      setSupportPendingMarker(marker);
      setSupportAction({status: "working", target: marker.caseId ?? "new", message: "Checking your previous message…"});
      const originalStatus = await readPendingSupportStatus(marker);
      if (originalStatus.terminal && (originalStatus.status === "denied" || originalStatus.status === "invalid")) {
        clearPendingMemberSupport(accountId, window.localStorage, marker.idempotencyKey);
        setSupportPendingMarker(null); setPendingSupportRetry(null);
        setSupportAction({status: "error", target: marker.caseId ?? "new", message:
          originalStatus.status === "denied" ? "Your previous message was not accepted for this account. Your draft is kept."
            : "Your previous message was not accepted. Please review your draft."});
        return;
      }
      const payload = memberSupportAppliedStatusPayload(originalStatus);
      const receiptCaseId = originalStatus.receipt?.caseId;
      const selectedCaseId = receiptCaseId ?? marker.caseId;
      const latest = await readFeed<SupportPayload>("/api/crays/clubs/member/stay-support", new AbortController().signal);
      const conversations = await readMemberConversationsGraphQLFeed(memberOperationRegistry as MemberOperationRegistry,
        fetch, new AbortController().signal, selectedCaseId);
      setWorkspace(current => ({...current, support: latest, conversations}));
      if (payload && latest.kind === "ready" && conversations.kind === "ready" && conversations.data.accountId === accountId) {
        const thread = conversations.data.cases.find(item => item.caseId === receiptCaseId);
        if (thread) for (const message of thread.messages) {
          if (message.authorType !== "member" || await memberSupportDigest(message.body) !== marker.messageSha256) continue;
          const command: SupportCommand = marker.action === "add_message"
            ? {type: "add_message", caseId: marker.caseId!, message: message.body}
            : {type: "open_case", ...(marker.bookingId ? {bookingId: marker.bookingId} : {}), category: marker.category!,
                subject: thread.subject, message: message.body};
          if (!await matchesPendingMemberSupport(marker, command)) continue;
          if (memberSupportCommandReadbackConfirmed({httpStatus: 200, payload, command, expectedAccountId: accountId,
              supportCases: latest.data.supportCases, conversations: conversations.data})) {
            clearPendingMemberSupport(accountId, window.localStorage, marker.idempotencyKey);
            setSupportPendingMarker(null); setPendingSupportRetry(null);
            setSupportAction({status: "success", target: receiptCaseId!, message: "Your previous message is saved in your conversation."});
            return;
          }
        }
      }
      setSupportAction({status: "unknown", target: marker.caseId ?? "new",
        message: "We still can’t confirm the original outcome. Your previous message reference is kept; another message won’t be sent."});
    } catch {
      setSupportAction({status: "unknown", target: null,
        message: "We can’t check the original outcome right now. Your previous message reference is kept."});
    }
  };

  const runSupportCommandWithLock = async (
    body: SupportCommand,
    retry?: PendingSupportRetry,
  ) => {
    if (session.kind !== "ready" || supportAction.status === "working") return;
    if (retry) {
      // An uncertain original command is reconciled by original account/key
      // readback. This check never resends an unproven earlier mutation.
      await checkRecoveredSupportOperationWithLock();
      return;
    }

    const accountId = session.account.id;
    if (!accountId) return;
    let storedMarker: MemberSupportPendingMarker | null;
    try { storedMarker = restorePendingMemberSupport(accountId, window.localStorage); }
    catch {
      setSupportAction({status: "unknown", target: null, message: "We can’t read your previous message reference. Sending is paused until it can be checked."});
      return;
    }
    if (storedMarker) {
      setSupportPendingMarker(storedMarker);
      setSupportAction({status: "unknown", target: storedMarker.caseId ?? "new",
        message: "Your previous message still needs a saved-status check. Your new draft is kept here."});
      return;
    }

    if (pendingSupportRetry) {
      setSupportAction({
        target: pendingSupportRetry.body.type === "open_case" ? "new" : pendingSupportRetry.body.caseId,
        status: "unknown",
        message: "Your previous message still needs a saved-status check. Your new draft is kept here.",
      });
      return;
    }

    const target = body.type === "open_case" ? "new" : body.caseId;
    const subject = body.type === "open_case" ? body.subject.trim() : "";
    const message = body.message.trim();
    if (
      message.length < 3 ||
      message.length > 4000 ||
      (body.type === "open_case" &&
        (subject.length < 3 || subject.length > 160))
    ) {
      setSupportAction({
        message:
          "Please add a short subject and a message of at least three characters.",
        status: "error",
        target,
      });
      return;
    }

    const command: SupportCommand =
      body.type === "open_case"
        ? { ...body, message, subject }
        : { ...body, message };
    const idempotencyKey =
      `support:${crypto.randomUUID()}`;
    const previousMessageCount = (
      body.type === "add_message" && workspace.support.kind === "ready"
        ? (workspace.support.data.supportCases.find(
            (item) => item.caseId === body.caseId,
          )?.messageCount ?? 0)
        : 0);
    setSupportAction({ message: null, status: "working", target });

    const post = async () => {
      const response = await fetch("/api/crays/clubs/member/stay-support", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(command),
      });
      const payload = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return { payload, response };
    };

    let acknowledgement: PendingSupportRetry["acknowledgement"] = undefined;

    try {
      const marker = await createPendingMemberSupport(accountId, idempotencyKey, command);
      storedMarker = persistPendingMemberSupport(marker, window.localStorage);
      setSupportPendingMarker(storedMarker);
      // This is the first dispatch. Retry/recovery returned through reads above.
      const result = await post();
      if (result.response.status === 200) {
        acknowledgement = { status: 200, payload: result.payload };
        // Preserve the original operation before the independent GET can fail.
        setPendingSupportRetry({ body: command, idempotencyKey, previousMessageCount, acknowledgement });
        storedMarker = acknowledgePendingMemberSupport(accountId, window.localStorage, idempotencyKey, result.payload);
        setSupportPendingMarker(storedMarker);
      }

      if (!acknowledgement && isDeterministicMemberRejection(result.response.status, result.payload)) {
      clearPendingMemberSupport(accountId, window.localStorage, idempotencyKey);
      setSupportPendingMarker(null);
      setPendingSupportRetry(null);
      setSupportAction({
        message:
          result.response.status === 400
            ? "Please review the subject and message."
            : result.response.status === 403
              ? "This support action is not available for your account."
              : result.response.status === 409
                ? "This conversation changed. The latest status is shown."
                : result.response.status === 503
                  ? "Stay support is temporarily unavailable. Please try again."
                  : "Your message was not confirmed. Please try again.",
        status: "error",
        target,
      });
        return;
      }

      const latest = await readFeed<SupportPayload>(
        "/api/crays/clubs/member/stay-support",
        new AbortController().signal,
      );
      const originalStatus = await readPendingSupportStatus(storedMarker);
      const originalPayload = memberSupportAppliedStatusPayload(originalStatus);
      const acknowledgedCaseId = memberSupportAcknowledgedCaseId(200, originalPayload);
      const conversations = await readMemberConversationsGraphQLFeed(
        memberOperationRegistry as MemberOperationRegistry, fetch, new AbortController().signal,
        acknowledgedCaseId ?? (command.type === "add_message" ? command.caseId : null),
      );
      setWorkspace((current) => ({ ...current, support: latest, conversations }));

      const confirmed = latest.kind === "ready" && conversations.kind === "ready" &&
        memberSupportCommandReadbackConfirmed({
          httpStatus: 200,
          payload: originalPayload,
          command,
          expectedAccountId: session.account.id ?? null,
          supportCases: latest.data.supportCases,
          conversations: conversations.data,
        });

      if (confirmed) {
        clearPendingMemberSupport(accountId, window.localStorage, idempotencyKey);
        setSupportPendingMarker(null);
        setPendingSupportRetry(null);
        setSupportAction({
          message:
            body.type === "open_case"
              ? "Your support request was saved."
              : "Your message was saved.",
          status: "success",
          target,
        });
        if (body.type === "open_case") {
          setSupportDraft({ bookingId: "", category: "other", message: "", subject: "" });
        } else {
          setSupportReplies((current) => ({ ...current, [body.caseId]: "" }));
        }
        return;
      }

      if (
        acknowledgement ||
        !isDeterministicMemberRejection(result.response.status, result.payload)
      ) {
        setPendingSupportRetry({ body: command, idempotencyKey, previousMessageCount, acknowledgement });
        setSupportAction({
          message: acknowledgement
            ? "Your operation was acknowledged. Check its saved status before continuing."
            : "We could not confirm the outcome. Please retry safely.",
          status: "unknown",
          target,
        });
        return;
      }

    } catch {
      setPendingSupportRetry({ body: command, idempotencyKey, previousMessageCount, acknowledgement });
      setSupportAction({
        message: acknowledgement
            ? "Your operation was acknowledged. Check its saved status before continuing."
            : "We could not confirm the outcome. Please retry safely.",
        status: "unknown",
        target,
      });
    }
  };

  const withSupportPendingLock = async (operation: () => Promise<void>) => {
    if (session.kind !== "ready" || !session.account.id) return;
    if (!navigator.locks?.request) {
      setSupportAction({status: "unknown", target: null,
        message: "This browser can’t safely coordinate your message yet. Sending is paused."});
      return;
    }
    try {
    await navigator.locks.request(`crays.member.support.pending:${session.account.id}`,
      {mode: "exclusive", ifAvailable: true}, async lock => {
        if (!lock) {
          setSupportAction({status: "unknown", target: null,
            message: "Your previous message is being sent or checked in another view. Please try again shortly."});
          return;
        }
        await operation();
      });
    } catch {
      setSupportAction({status: "unknown", target: null,
        message: "We can’t safely coordinate the original message right now. Sending is paused until it can be checked."});
    }
  };
  const runSupportCommand = async (body: SupportCommand, retry?: PendingSupportRetry) =>
    withSupportPendingLock(() => runSupportCommandWithLock(body, retry));
  const checkRecoveredSupportOperation = async () =>
    withSupportPendingLock(checkRecoveredSupportOperationWithLock);

  const runServiceCommand = async (
    body: ServiceCommand,
    retry?: PendingServiceRetry,
  ) => {
    if (session.kind !== "ready" || serviceAction.status === "working") return;

    if (pendingServiceRetry && !retry) return;

    const target =
      body.type === "request_service" ? body.offeringId : body.selectionId;
    if (
      body.type === "request_service" &&
      (!Number.isSafeInteger(body.quantity) ||
        body.quantity < 1 ||
        body.quantity > 1000 ||
        (body.requestNote?.length ?? 0) > 500 ||
        (body.requestedFor != null &&
          !Number.isFinite(Date.parse(body.requestedFor))))
    ) {
      setServiceAction({
        message: "Please review the quantity, date and note.",
        status: "error",
        target,
      });
      return;
    }
    if (
      body.type === "cancel_service" &&
      (body.reason.trim().length < 3 || body.reason.trim().length > 500)
    ) {
      setServiceAction({
        message: "Please add a short reason of at least three characters.",
        status: "error",
        target,
      });
      return;
    }

    const command: ServiceCommand =
      body.type === "request_service"
        ? {
            ...body,
            requestNote: body.requestNote?.trim() || undefined,
          }
        : { ...body, reason: body.reason.trim() };
    const idempotencyKey =
      retry?.idempotencyKey ?? `service:${crypto.randomUUID()}`;
    setServiceAction({ message: null, status: "working", target });

    const post = async () => {
      const response = await fetch("/api/crays/clubs/member/services", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(command),
      });
      const payload = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return { payload, response };
    };

    let acknowledgement = retry?.acknowledgement;

    try {
      if (retry) {
        const beforeRetry = await readFeed<ServicesPayload>("/api/crays/clubs/member/services", new AbortController().signal);
        setWorkspace((current) => ({ ...current, services: beforeRetry }));
        if (beforeRetry.kind !== "ready") throw new Error("Reconciliation is required before retry.");
      }
      // A known HTTP 200 may only be reconciled by reads; never POST it again.
      const result = acknowledgement
        ? { response: { status: acknowledgement.status }, payload: acknowledgement.payload }
        : await post();
      if (result.response.status === 200) {
        acknowledgement = { status: 200, payload: result.payload };
        // Preserve the original operation before the independent GET can fail.
        setPendingServiceRetry({ body: command, idempotencyKey, acknowledgement });
      }

      const latest = await readFeed<ServicesPayload>(
        "/api/crays/clubs/member/services",
        new AbortController().signal,
      );
      setWorkspace((current) => ({ ...current, services: latest }));

      const receipt =
        result.payload?.receipt &&
        typeof result.payload.receipt === "object" &&
        !Array.isArray(result.payload.receipt)
          ? (result.payload.receipt as Record<string, unknown>)
          : null;
      const selectionId =
        receipt?.aggregateType === "selection" &&
        typeof receipt.aggregateId === "string"
          ? receipt.aggregateId
          : "";
      const acknowledged =
        result.response.status === 200 &&
        result.payload?.status === "applied" &&
        typeof receipt?.receiptId === "string" &&
        selectionId.length > 0;
      const reconciledSelection =
        latest.kind === "ready"
          ? latest.data.services.find(
              (service) => service.selectionId === selectionId,
            )
          : undefined;
      const stateVerified =
        body.type === "request_service"
          ? Boolean(reconciledSelection)
          : selectionId === body.selectionId &&
            Boolean(reconciledSelection) &&
            reconciledSelection?.status === receipt?.resultingStatus;
      const confirmed = acknowledged && stateVerified;

      if (confirmed) {
        setPendingServiceRetry(null);
        setServiceAction({
          message:
            body.type === "request_service"
              ? "Your service request was sent."
              : reconciledSelection?.status === "cancelled"
                ? "Your service request was cancelled."
                : "The latest service status is shown.",
          status: "success",
          target,
        });
        if (body.type === "request_service") {
          setServiceDrafts((current) => ({
            ...current,
            [body.offeringId]: {
              quantity: "1",
              requestedFor: "",
              requestNote: "",
            },
          }));
        } else {
          setServiceCancelReasons((current) => ({
            ...current,
            [body.selectionId]: "",
          }));
        }
        return;
      }

      if (
        acknowledgement ||
        !isDeterministicMemberRejection(result.response.status, result.payload)
      ) {
        setPendingServiceRetry({ body: command, idempotencyKey, acknowledgement });
        setServiceAction({
          message: acknowledgement
            ? "Your operation was acknowledged. Check its saved status before continuing."
            : "We could not confirm the outcome. Please retry safely.",
          status: "unknown",
          target,
        });
        return;
      }

      setPendingServiceRetry(null);
      setServiceAction({
        message:
          result.response.status === 400
            ? "Please review this service request."
            : result.response.status === 403
              ? "This service action is not available for your stay."
              : result.response.status === 409
                ? "This service changed. The latest status is shown."
                : result.response.status === 503
                  ? "Additional services are temporarily unavailable. Please try again."
                  : "This service change was not confirmed. Please try again.",
        status: "error",
        target,
      });
    } catch {
      setPendingServiceRetry({ body: command, idempotencyKey, acknowledgement });
      setServiceAction({
        message: acknowledgement
            ? "Your operation was acknowledged. Check its saved status before continuing."
            : "We could not confirm the outcome. Please retry safely.",
        status: "unknown",
        target,
      });
    }
  };

  const runMembershipCommand = async (
    body: MembershipCommand,
    retryCommand?: PendingMembershipRetry,
  ) => {
    if (
      session.kind !== "ready" ||
      (!retryCommand && workspace.membership.kind !== "ready") ||
      membershipAction.status === "working"
    )
      return;

    if (pendingMembershipRetry && !retryCommand) return;

    const previousApplicationStatus =
      retryCommand?.previousApplicationStatus ?? (workspace.membership.kind === "ready" ? workspace.membership.data.application.status : "none");
    const idempotencyKey =
      retryCommand?.idempotencyKey ?? `membership:${crypto.randomUUID()}`;
    setMembershipAction({ status: "working", message: null });

    const post = async () => {
      const response = await fetch("/api/crays/clubs/member/membership", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return { payload, response };
    };

    let acknowledgement = retryCommand?.acknowledgement;

    try {
      if (retryCommand) {
        const beforeRetry = await readMembership(new AbortController().signal);
        setWorkspace((current) => ({ ...current, membership: beforeRetry }));
        if (beforeRetry.kind !== "ready") throw new Error("Reconciliation is required before retry.");
      }
      // A known HTTP 200 may only be reconciled by reads; never POST it again.
      const result = acknowledgement
        ? { response: { status: acknowledgement.status }, payload: acknowledgement.payload }
        : await post();
      if (result.response.status === 200) {
        acknowledgement = { status: 200, payload: result.payload };
        // Preserve the original operation before the independent GET can fail.
        setPendingMembershipRetry({ body, idempotencyKey, previousApplicationStatus, acknowledgement });
      }

      const latest = await readMembership(new AbortController().signal);
      setWorkspace((current) => ({ ...current, membership: latest }));
      const latestApplicationStatus =
        latest.kind === "ready" ? latest.data.application.status : null;
      const stateVerified =
        latest.kind === "ready" &&
        (body.type === "withdraw_application"
          ? latestApplicationStatus === "withdrawn"
          : previousApplicationStatus !== latestApplicationStatus &&
            (latestApplicationStatus === "submitted" ||
              latestApplicationStatus === "under_review" ||
              latestApplicationStatus === "approved"));
      const acknowledged =
        result.response.status === 200 &&
        result.payload?.status === "persisted";
      const reconciledUnknown =
        result.response.status === 503 &&
        result.payload?.status === "unknown_outcome" &&
        stateVerified;

      if ((acknowledged && stateVerified) || reconciledUnknown) {
        setPendingMembershipRetry(null);
        setMembershipAction({
          status: "success",
          message:
            body.type === "withdraw_application"
              ? "Your membership application was withdrawn."
              : "Application received. The CRAYS team will review it.",
        });
        return;
      }

      if (
        acknowledgement ||
        !isDeterministicMemberRejection(result.response.status, result.payload)
      ) {
        setPendingMembershipRetry({ body, idempotencyKey, previousApplicationStatus, acknowledgement });
        setMembershipAction({
          status: "unknown",
          message: acknowledgement
            ? "Your operation was acknowledged. Check its saved status before continuing."
            : "We could not confirm the outcome. Please retry safely.",
        });
        return;
      }

      setPendingMembershipRetry(null);
      setMembershipAction({
        status: "error",
        message:
          result.response.status === 400
            ? "Please review your membership application."
            : result.response.status === 401
              ? "Please sign in again before continuing."
              : result.response.status === 403
                ? "This membership action could not be completed safely."
                : result.response.status === 409
                  ? "Your membership application changed. The latest status is shown."
                  : result.response.status === 503
                    ? "Membership applications are temporarily unavailable. Please try again."
                    : "This membership change was not confirmed. Please try again.",
      });
    } catch {
      setPendingMembershipRetry({ body, idempotencyKey, previousApplicationStatus, acknowledgement });
      setMembershipAction({
        status: "unknown",
        message: acknowledgement
            ? "Your operation was acknowledged. Check its saved status before continuing."
            : "We could not confirm the outcome. Please retry safely.",
      });
    }
  };

  // Presentation context never grants case access or server write authority.
  const renderMessageComposer = (context: MemberMessageComposerContext) => {
    if (context.feedStatus !== "ready" || workspace.support.kind !== "ready") return null;
    if (context.action === "open_case") {
      if (context.caseId !== null) return null;
      return (
                    <form
                      className={styles.supportComposer}
                      onSubmit={(event) => {
                        event.preventDefault();
                        void runSupportCommand({
                          type: "open_case",
                          ...(supportDraft.bookingId ? { bookingId: supportDraft.bookingId } : {}),
                          category: supportDraft.category,
                          subject: supportDraft.subject,
                          message: supportDraft.message,
                        });
                      }}
                    >
                      <div>
                        <p className={styles.kicker}>CONTACT STAY SUPPORT</p>
                        <h3>How can we help?</h3>
                        <p>
                          Send a secure message to the CRAYS stay-support team.
                          A booking is optional.
                        </p>
                      </div>
                      <div className={styles.supportFields}>
                        <label>
                          Stay (optional)
                          <select value={supportDraft.bookingId} onChange={(event) => setSupportDraft((current) => ({ ...current, bookingId: event.target.value }))}>
                            <option value="">General question</option>
                            {workspace.bookings.kind === "ready" ? workspace.bookings.data.bookings.map((item) => <option key={item.bookingId} value={item.bookingId}>{item.publicReference}</option>) : null}
                          </select>
                        </label>
                        <label>
                          Topic
                          <select
                            onChange={(event) =>
                              setSupportDraft((current) => ({
                                ...current,
                                category: event.target.value as SupportCategory,
                              }))
                            }
                            value={supportDraft.category}
                          >
                            <option value="booking">Booking</option>
                            <option value="change">Change</option>
                            <option value="cancellation">Cancellation</option>
                            <option value="arrival">Arrival</option>
                            <option value="service">Service</option>
                            <option value="access">Access</option>
                            <option value="document">Document</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                        <label>
                          Subject
                          <input
                            maxLength={160}
                            minLength={3}
                            onChange={(event) =>
                              setSupportDraft((current) => ({
                                ...current,
                                subject: event.target.value,
                              }))
                            }
                            required
                            value={supportDraft.subject}
                          />
                        </label>
                        <label className={styles.supportMessageField}>
                          Message
                          <textarea
                            maxLength={4000}
                            minLength={3}
                            onChange={(event) =>
                              setSupportDraft((current) => ({
                                ...current,
                                message: event.target.value,
                              }))
                            }
                            required
                            rows={4}
                            value={supportDraft.message}
                          />
                        </label>
                      </div>
                      <div className={styles.supportComposerActions}>
                        <button
                          className={styles.primaryAction}
                          disabled={supportAction.status === "working"}
                          type="submit"
                        >
                          {supportAction.status === "working" &&
                          supportAction.target === "new"
                            ? "Sending…"
                            : "Contact stay support"}
                        </button>
                        {pendingSupportRetry &&
                        supportAction.status === "unknown" &&
                        supportAction.target === "new" ? (
                          <button
                            className={styles.secondaryAction}
                            onClick={() =>
                              void runSupportCommand(
                                pendingSupportRetry.body,
                                pendingSupportRetry,
                              )
                            }
                            type="button"
                          >
                            {pendingSupportRetry.acknowledgement ? "Check saved status" : "Retry safely"}
                          </button>
                        ) : null}
                        {supportAction.target === "new" &&
                        supportAction.message ? (
                          <span role="status">{supportAction.message}</span>
                        ) : null}
                      </div>
                    </form>
      );
    }
    const item = workspace.support.data.supportCases.find((candidate) => candidate.caseId === context.caseId);
    if (!item || item.bookingId !== context.bookingId ||
        (context.caseVersion !== null && item.version !== context.caseVersion)) {
      return <div role="status"><p>This conversation has changed. Let’s bring you up to date.</p><button className={styles.secondaryAction} type="button" onClick={retry}>Refresh conversation</button></div>;
    }
    if (!["open", "awaiting_team", "awaiting_member"].includes(item.status.toLowerCase())) {
      return <p role="status">This conversation is closed. Start with a hello if you need a hand.</p>;
    }
    return (
                                  <form
                                    className={styles.replyComposer}
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      void runSupportCommand({
                                        type: "add_message",
                                        caseId: item.caseId,
                                        message:
                                          supportReplies[item.caseId] ?? "",
                                      });
                                    }}
                                  >
                                    <label>
                                      <span className={styles.srOnly}>Add a message</span>
                                      <textarea
                                        placeholder="Write a message…"
                                        onKeyDown={(event)=>{if(event.key==="Enter"&&(event.ctrlKey||event.metaKey)&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}
                                        maxLength={4000}
                                        minLength={3}
                                        onChange={(event) =>
                                          setSupportReplies((current) => ({
                                            ...current,
                                            [item.caseId]: event.target.value,
                                          }))
                                        }
                                        required
                                        rows={2}
                                        value={
                                          supportReplies[item.caseId] ?? ""
                                        }
                                      />
                                    </label>
                                    <div>
                                      <button
                                        className={styles.secondaryAction}
                                        disabled={
                                          supportAction.status === "working" || (supportReplies[item.caseId]??"").trim().length<3
                                        }
                                        type="submit"
                                      >
                                        {supportAction.status === "working" &&
                                        supportAction.target === item.caseId
                                          ? "Sending…"
                                          : <><Send size={17} aria-hidden/>Send</>}
                                      </button>
                                      {pendingSupportRetry &&
                                      supportAction.status === "unknown" &&
                                      supportAction.target === item.caseId ? (
                                        <button
                                          className={styles.secondaryAction}
                                          onClick={() =>
                                            void runSupportCommand(
                                              pendingSupportRetry.body,
                                              pendingSupportRetry,
                                            )
                                          }
                                          type="button"
                                        >
                                          {pendingSupportRetry.acknowledgement ? "Check saved status" : "Retry safely"}
                                        </button>
                                      ) : null}
                                    </div>
                                    {supportAction.target === item.caseId &&
                                    supportAction.message ? (
                                      <span role="status">
                                        {supportAction.message}
                                      </span>
                                    ) : null}
                                  </form>
    );
  };

  const displayName =
    session.kind === "ready"
      ? (session.account.displayName ??
        session.account.name ??
        copy.nav.account)
      : copy.nav.account;
  const servicesData =
    workspace.services.kind === "ready" ? workspace.services.data : null;
  const availableOfferings = servicesData?.availableOfferings ?? [];
  const serviceEmpty = Boolean(
    servicesData &&
    availableOfferings.length === 0 &&
    servicesData.services.length === 0 &&
    servicesData.entitlements.length === 0,
  );
  const membershipData =
    workspace.membership.kind === "ready" ? workspace.membership.data : null;
  const applicationStatus = membershipData?.application.status ?? null;
  const membershipStatus = membershipData?.membership.status ?? null;
  const membershipIsConfirmed = Boolean(
    membershipData?.authorities.membershipConfirmed === true &&
    membershipStatus === "confirmed",
  );
  const canSubmitMembershipApplication = Boolean(
    !membershipIsConfirmed &&
    membershipStatus === "not_confirmed" &&
    (applicationStatus === "none" ||
      applicationStatus === "declined" ||
      applicationStatus === "withdrawn"),
  );
  const canWithdrawMembershipApplication = Boolean(
    !membershipIsConfirmed &&
    membershipStatus === "not_confirmed" &&
    (applicationStatus === "submitted" || applicationStatus === "under_review"),
  );
  const membershipHeading = membershipIsConfirmed
    ? "Membership active"
    : membershipStatus === "suspended"
      ? "Membership suspended"
      : membershipStatus === "revoked"
        ? "Membership ended"
        : membershipStatus === "expired"
          ? "Membership expired"
          : applicationStatus === "submitted"
            ? "Application received"
            : applicationStatus === "under_review"
              ? "Application under review"
              : applicationStatus === "approved"
                ? "Application approved"
                : applicationStatus === "declined"
                  ? "Application update available"
                  : applicationStatus === "withdrawn"
                    ? "Application withdrawn"
                    : "Apply for CRAYS membership";
  const membershipDescription = membershipIsConfirmed
    ? "Your CRAYS membership is confirmed. Marina access and every stay remain separate checks."
    : membershipStatus === "suspended" ||
        membershipStatus === "revoked" ||
        membershipStatus === "expired"
      ? "Contact CRAYS if you would like help with your membership status."
      : applicationStatus === "submitted"
        ? "The CRAYS team has received your application and will review it."
        : applicationStatus === "under_review"
          ? "Your application is being reviewed by the CRAYS team."
          : applicationStatus === "approved"
            ? "Your application was approved. Membership access will appear here once it is active."
            : applicationStatus === "declined"
              ? "You can review your plans and submit a new application when ready."
              : applicationStatus === "withdrawn"
                ? "Your previous application is closed. You can apply again at any time."
                : "Start a membership application and keep its progress with your CRAYS account.";

  return (
    <MemberAccountFrame ready={session.kind === "ready"} embedded={embedded} locale={locale}>
      <TodayLocaleProvider locale={locale} messages={accountAccessMessages[locale]}><TodayLocalizedContent><AccountContainer className={styles.account} lang={locale}>
        {session.kind === "loading" ? (
          <section className={styles.accountOpening} role="status" aria-live="polite" aria-busy="true">
            <LoaderCircle size={28} aria-hidden="true" />
            <p>{({en:"Opening your account…",de:"Dein Account wird geöffnet…",es:"Abriendo tu cuenta…",ca:"Obrint el teu compte…",fr:"Ouverture de votre compte…",pt:"A abrir a sua conta…",it:"Apertura del tuo account…"} satisfies Record<ClubsLocale,string>)[locale]}</p>
          </section>
        ) : embedded && session.kind !== "ready" ? (
          <section className={styles.embeddedStatus} data-club-runtime-status role="status" aria-live="polite">
            <CircleAlert size={28} aria-hidden="true" />
            <h2>{({en:"Your Club data is temporarily unavailable",de:"Deine Club-Daten sind vorübergehend nicht verfügbar",es:"Tus datos del Club no están disponibles temporalmente",ca:"Les teves dades del Club no estan disponibles temporalment",fr:"Vos données Club sont temporairement indisponibles",pt:"Os seus dados do Club estão temporariamente indisponíveis",it:"I tuoi dati del Club non sono temporaneamente disponibili"} satisfies Record<ClubsLocale,string>)[locale]}</h2>
            <p>{({en:"We couldn’t load your Club data. Please check again in a moment.",de:"Wir konnten deine Club-Daten nicht laden. Bitte versuche es gleich noch einmal.",es:"No hemos podido cargar tus datos del Club. Vuelve a intentarlo en un momento.",ca:"No hem pogut carregar les teves dades del Club. Torna-ho a provar d’aquí a un moment.",fr:"Nous n’avons pas pu charger vos données Club. Veuillez réessayer dans un instant.",pt:"Não foi possível carregar os seus dados do Club. Tente novamente dentro de instantes.",it:"Non è stato possibile caricare i tuoi dati del Club. Riprova tra poco."} satisfies Record<ClubsLocale,string>)[locale]}</p>
            <button className={styles.secondaryAction} onClick={retry} type="button">
              <RefreshCw size={17} aria-hidden="true" />
              {({en:"Check again",de:"Erneut prüfen",es:"Volver a comprobar",ca:"Torna a comprovar",fr:"Vérifier à nouveau",pt:"Verificar novamente",it:"Controlla di nuovo"} satisfies Record<ClubsLocale,string>)[locale]}
            </button>
          </section>
        ) : session.kind !== "ready" ? (
          <section className={styles.signedOutHero}>
            <div className={styles.accountStory}>
              <Image
                alt="Forest City Marina Hotel and waterfront"
                fill
                priority
                sizes="(max-width: 820px) 100vw, 62vw"
                src="/__crays-clubs/forest-city-v2552/marina/001-d1eb2e058f0c76ba.jpg"
              />
              <div className={styles.storyShade} />
              <div className={styles.storyContent}>
                <p className={styles.kicker}>ACCOUNT & BOOKING</p>
                <h1>
                  Create your CRAYS account for stays, membership and access.
                </h1>
                <p className={styles.lead}>
                  Keep saved stays, booking requests, member services and
                  support together in one secure place.
                </p>
                <ol className={styles.storySteps}>
                  <li>
                    <span>01</span>
                    <strong>Create account</strong>
                    <p>
                      Use secure CRAYS sign-in for your guest or member profile.
                    </p>
                  </li>
                  <li>
                    <span>02</span>
                    <strong>Save stays</strong>
                    <p>
                      Return to the Forest City properties you are considering.
                    </p>
                  </li>
                  <li>
                    <span>03</span>
                    <strong>Manage requests</strong>
                    <p>
                      Keep bookings, services and stay details easy to find.
                    </p>
                  </li>
                  <li>
                    <span>04</span>
                    <strong>Get support</strong>
                    <p>Continue stay conversations from one account.</p>
                  </li>
                </ol>
              </div>
            </div>
            <div className={styles.accessPanelWrap}>
              <div className={styles.accessPanel} aria-live="polite">
                {session.kind === "signed_out" && (
                  <>
                    <UserRound size={32} aria-hidden />
                    <p className={styles.kicker}>CRAYS ACCOUNT</p>
                    <h2>Sign in to continue</h2>
                    <p>
                      Access your saved stays, requests, services and member
                      support.
                    </p>
                    <div className={styles.accessActions}>
                      <a
                        className={styles.primaryAction}
                        href={session.loginHref}
                      >
                        Log in <ArrowRight size={17} aria-hidden />
                      </a>
                      <a className={styles.teamLogin} href={TEAM_LOGIN_HREF}>Team Login</a>
                      <a
                        className={styles.secondaryAction}
                        href={session.signupHref}
                      >
                        Create account
                      </a>
                    </div>
                    <div className={styles.accessTrust}>
                      <CheckCircle2 size={18} aria-hidden />
                      <span>
                        Secure CRAYS sign-in. No booking is confirmed by signing
                        in.
                      </span>
                    </div>
                  </>
                )}
                {session.kind === "identity_binding_required" && (
                  <>
                    <UserRound size={32} aria-hidden />
                    <p className={styles.kicker}>ONE MORE STEP</p>
                    <h2>Complete your CRAYS guest account</h2>
                    <p>
                      Finish the account connection before opening your member
                      workspace.
                    </p>
                    <button
                      className={styles.primaryAction}
                      disabled={provisioning === "working"}
                      onClick={() => void completeGuestAccount()}
                      type="button"
                    >
                      {provisioning === "working"
                        ? "Completing account…"
                        : "Complete guest account"}
                      <ArrowRight size={17} aria-hidden />
                    </button>
                    {provisioning === "error" && (
                      <p className={styles.inlineError}>
                        The account connection could not be completed. Please
                        try again.
                      </p>
                    )}
                  </>
                )}
                {session.kind === "unavailable" && (
                  <>
                    <CircleAlert size={32} aria-hidden />
                    <p className={styles.kicker}>ACCOUNT STATUS</p>
                    <h2>
                      {session.status === "invalid_session_provenance"
                        ? "This sign-in session cannot be used here"
                        : "Your account is temporarily unavailable"}
                    </h2>
                    <p>
                      {session.status === "configuration_not_ready"
                        ? "Secure account access is not available yet. Please return shortly."
                        : "We could not open your CRAYS account safely. No account action was completed."}
                    </p>
                    <div className={styles.accessActions}>
                      {session.retryable && (
                        <button
                          className={styles.secondaryAction}
                          onClick={retry}
                          type="button"
                        >
                          <RefreshCw size={17} aria-hidden /> Try again
                        </button>
                      )}
                      <a className={styles.primaryAction} href={loginFallback}>
                        Log in <ArrowRight size={17} aria-hidden />
                      </a>
                      <a className={styles.teamLogin} href={TEAM_LOGIN_HREF}>Team Login</a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        ) : (
          <ClubsMemberHome embedded={embedded} toolbarTarget={toolbarTarget} accountId={session.account.id??null} email={session.account.email??null} emailVerified={session.account.emailVerified} messageFeedback={supportAction.message ? (
            <div role={supportAction.status === "error" ? "alert" : "status"} aria-live="polite" aria-atomic="true">
              <p>{supportAction.message}</p>
              {!pendingSupportRetry && supportPendingMarker && supportAction.status === "unknown" ? (
                <button type="button" className={styles.secondaryAction} onClick={() => void checkRecoveredSupportOperation()}>
                  Check previous message
                </button>
              ) : null}
              {pendingSupportRetry && supportAction.status === "unknown" ? (
                <button type="button" className={styles.secondaryAction}
                  onClick={() => void runSupportCommand(pendingSupportRetry.body, pendingSupportRetry)}>
                  {pendingSupportRetry.acknowledgement ? "Check saved status" : "Check previous message safely"}
                </button>
              ) : null}
            </div>
          ) : null} renderMessageComposer={renderMessageComposer} displayName={displayName} locale={locale} workspace={workspace} onRefresh={refreshWorkspace} onSupportContext={(bookingId, category) => {
            if (workspace.bookings.kind !== "ready" || !workspace.bookings.data.bookings.some((item) => item.bookingId === bookingId)) return;
            setSupportDraft((current) => ({ ...current, bookingId, category }));
          }}>
            <section
              className={`${styles.workspaceSection} ${styles.membershipSection}`}
              id="membership"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.kicker}>MEMBERSHIP</p>
                  <h2>Your CRAYS membership</h2>
                </div>
              </div>
              {workspace.membership.kind === "loading" ? (
                <div className={styles.feedState} role="status">
                  <LoaderCircle className={styles.spin} size={22} aria-hidden />
                  <span>Loading your membership status…</span>
                </div>
              ) : workspace.membership.kind === "unavailable" ? (
                <div className={styles.membershipUnavailable} role="status">
                  <CircleAlert size={24} aria-hidden />
                  <div>
                    <h3>Membership status is temporarily unavailable</h3>
                    <p>
                      We cannot verify your membership right now. Your CRAYS
                      account has not been changed.
                    </p>
                  </div>
                  <button
                    className={styles.secondaryAction}
                    onClick={retry}
                    type="button"
                  >
                    <RefreshCw size={16} aria-hidden /> Try again
                  </button>
                </div>
              ) : (
                <div className={styles.membershipWorkspace}>
                  <article className={styles.membershipStatusCard}>
                    <div
                      className={styles.membershipStatusIcon}
                      data-active={membershipIsConfirmed ? "true" : "false"}
                    >
                      {membershipIsConfirmed ? (
                        <CheckCircle2 size={25} aria-hidden />
                      ) : (
                        <UserRound size={25} aria-hidden />
                      )}
                    </div>
                    <div className={styles.membershipStatusCopy}>
                      <p className={styles.kicker}>CURRENT STATUS</p>
                      <h3>{membershipHeading}</h3>
                      <p>{membershipDescription}</p>
                    </div>
                    <dl className={styles.membershipFacts}>
                      <div>
                        <dt>Application</dt>
                        <dd>{readable(applicationStatus)}</dd>
                      </div>
                      <div>
                        <dt>Membership</dt>
                        <dd>{readable(membershipStatus)}</dd>
                      </div>
                      {membershipData?.application.submittedAt ? (
                        <div>
                          <dt>Submitted</dt>
                          <dd>
                            {formatDate(membershipData.application.submittedAt)}
                          </dd>
                        </div>
                      ) : null}
                      {membershipData?.membership.validFrom ? (
                        <div>
                          <dt>Valid from</dt>
                          <dd>
                            {formatDate(membershipData.membership.validFrom)}
                          </dd>
                        </div>
                      ) : null}
                      {membershipData?.membership.validUntil ? (
                        <div>
                          <dt>Valid until</dt>
                          <dd>
                            {formatDate(membershipData.membership.validUntil)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    <p className={styles.membershipNotice}>
                      Membership, Forest City Marina access and booking
                      confirmation are reviewed separately.
                    </p>
                  </article>
                  <article className={styles.membershipApplicationCard}>
                    <div>
                      <p className={styles.kicker}>
                        {membershipIsConfirmed
                          ? "MEMBER SUPPORT"
                          : canSubmitMembershipApplication
                            ? "APPLY"
                            : "APPLICATION"}
                      </p>
                      <h3>
                        {membershipIsConfirmed
                          ? "Your membership is connected"
                          : canSubmitMembershipApplication
                            ? "Apply for membership"
                            : "Keep track of your application"}
                      </h3>
                      <p>
                        {membershipIsConfirmed
                          ? "Your confirmed membership stays visible here alongside your bookings and support."
                          : canSubmitMembershipApplication
                            ? "Send your interest to the CRAYS team. Applying does not grant membership or property access."
                            : "Updates from the CRAYS team will appear here. Membership is never activated automatically."}
                      </p>
                    </div>
                    {canSubmitMembershipApplication ? (
                      <label className={styles.membershipChoice}>
                        <input
                          checked={marinaInterest}
                          onChange={(event) =>
                            setMarinaInterest(event.target.checked)
                          }
                          type="checkbox"
                        />
                        <span>
                          <strong>I am interested in Marina stays</strong>
                          <small>
                            This records your interest only. Marina access is
                            reviewed separately.
                          </small>
                        </span>
                      </label>
                    ) : null}
                    <div className={styles.membershipActions}>
                      {canSubmitMembershipApplication ? (
                        <button
                          className={styles.primaryAction}
                          disabled={membershipAction.status === "working"}
                          onClick={() =>
                            void runMembershipCommand({
                              type: "submit_application",
                              interestPropertyId: marinaInterest
                                ? "property-clubs-forest-city-marina"
                                : null,
                            })
                          }
                          type="button"
                        >
                          {membershipAction.status === "working"
                            ? "Sending application…"
                            : "Apply for membership"}
                          <ArrowRight size={17} aria-hidden />
                        </button>
                      ) : null}
                      {canWithdrawMembershipApplication ? (
                        <button
                          className={styles.secondaryAction}
                          disabled={membershipAction.status === "working"}
                          onClick={() =>
                            void runMembershipCommand({
                              type: "withdraw_application",
                            })
                          }
                          type="button"
                        >
                          {membershipAction.status === "working"
                            ? "Withdrawing…"
                            : "Withdraw application"}
                        </button>
                      ) : null}
                      {!canSubmitMembershipApplication &&
                      !canWithdrawMembershipApplication ? (
                        <a className={styles.secondaryAction} href="#support">
                          Contact member support
                        </a>
                      ) : null}
                      {membershipAction.status === "unknown" &&
                      pendingMembershipRetry ? (
                        <button
                          className={styles.secondaryAction}
                          onClick={() =>
                            void runMembershipCommand(
                              pendingMembershipRetry.body,
                              pendingMembershipRetry,
                            )
                          }
                          type="button"
                        >
                          {pendingMembershipRetry.acknowledgement ? "Check saved status" : "Retry safely"}
                        </button>
                      ) : null}
                    </div>
                    {membershipAction.message ? (
                      <p className={styles.membershipFeedback} role="status">
                        {membershipAction.message}
                      </p>
                    ) : null}
                  </article>
                </div>
              )}
            </section>
            <section className={styles.workspaceSection} id="bookings">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.kicker}>MY BOOKINGS</p>
                  <h2>Upcoming and previous stays</h2>
                </div>
              </div>
              <FeedBoundary
                state={workspace.bookings}
                empty={
                  workspace.bookings.kind === "ready" &&
                  workspace.bookings.data.bookings.length === 0
                }
              >
                {workspace.bookings.kind === "ready" &&
                workspace.bookings.data.bookings.length === 0 ? (
                  <>
                    <CalendarDays size={24} aria-hidden />
                    <h3>No bookings yet</h3>
                    <p>Your confirmed CRAYS stays will appear here.</p>
                    <Link className={styles.primaryAction} href="/en/search">
                      Explore Forest City stays{" "}
                      <ArrowRight size={17} aria-hidden />
                    </Link>
                  </>
                ) : (
                  <div className={styles.recordGrid}>
                    {workspace.bookings.kind === "ready" &&
                      workspace.bookings.data.bookings.map((booking) => {
                        const property = propertyFor(booking.propertyId);
                        const total = formatMoney(
                          booking.currency,
                          booking.totalMinor,
                        );
                        return (
                          <article
                            className={styles.recordCard}
                            key={booking.bookingId}
                          >
                            <div className={styles.recordHead}>
                              <span>{booking.publicReference}</span>
                              <strong>{readable(booking.status)}</strong>
                            </div>
                            <h3>{property.title}</h3>
                            <dl>
                              <div>
                                <dt>Arrival</dt>
                                <dd>{formatDate(booking.arrivalDate)}</dd>
                              </div>
                              <div>
                                <dt>Departure</dt>
                                <dd>{formatDate(booking.departureDate)}</dd>
                              </div>
                              <div>
                                <dt>Guests</dt>
                                <dd>{booking.guestCount ?? "Not reported"}</dd>
                              </div>
                              {total && (
                                <div>
                                  <dt>Stay amount</dt>
                                  <dd>{total}</dd>
                                </div>
                              )}
                            </dl>
                            <Link
                              className={styles.secondaryAction}
                              href={property.href}
                            >
                              View stay <ArrowRight size={16} aria-hidden />
                            </Link>
                          </article>
                        );
                      })}
                  </div>
                )}
              </FeedBoundary>
            </section>
            {workspace.requests.kind === "ready" ? <section className={styles.workspaceSection} id="requests">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.kicker}>BOOKING REQUESTS</p>
                  <h2>Requests awaiting the next step</h2>
                </div>
              </div>
              <FeedBoundary
                state={workspace.requests}
                empty={
                  workspace.requests.kind === "ready" &&
                  workspace.requests.data.requests.length === 0
                }
              >
                {workspace.requests.kind === "ready" &&
                workspace.requests.data.requests.length === 0 ? (
                  <>
                    <WalletCards size={24} aria-hidden />
                    <h3>No booking requests yet</h3>
                    <p>
                      Requests you send from a Forest City stay will appear
                      here.
                    </p>
                    <Link className={styles.primaryAction} href="/en/search">
                      Start a search <ArrowRight size={17} aria-hidden />
                    </Link>
                  </>
                ) : (
                  <div className={styles.recordGrid}>
                    {workspace.requests.kind === "ready" &&
                      workspace.requests.data.requests.map((request) => {
                        const property = propertyFor(request.propertyId);
                        const total = formatMoney(
                          request.currency,
                          request.totalMinor,
                        );
                        return (
                          <article
                            className={styles.recordCard}
                            key={request.bookingRequestId}
                          >
                            <div className={styles.recordHead}>
                              <span>{request.publicReference}</span>
                              <strong>{readable(request.status)}</strong>
                            </div>
                            <h3>{property.title}</h3>
                            <dl>
                              <div>
                                <dt>Submitted</dt>
                                <dd>{formatDate(request.submittedAt)}</dd>
                              </div>
                              <div>
                                <dt>Last update</dt>
                                <dd>{formatDate(request.updatedAt)}</dd>
                              </div>
                              {request.holdStatus && (
                                <div>
                                  <dt>Hold</dt>
                                  <dd>{readable(request.holdStatus)}</dd>
                                </div>
                              )}
                              {total && (
                                <div>
                                  <dt>Request amount</dt>
                                  <dd>{total}</dd>
                                </div>
                              )}
                            </dl>
                            <Link
                              className={styles.secondaryAction}
                              href={property.href}
                            >
                              View stay <ArrowRight size={16} aria-hidden />
                            </Link>
                          </article>
                        );
                      })}
                  </div>
                )}
              </FeedBoundary>
            </section> : null}
            <section className={styles.workspaceSection} id="services">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.kicker}>ADDITIONAL SERVICES</p>
                  <h2>Services and member access</h2>
                </div>
              </div>
              <FeedBoundary state={workspace.services} empty={serviceEmpty}>
                {serviceEmpty ? (
                  <>
                    <ConciergeBell size={24} aria-hidden />
                    <h3>
                      No additional services are available for your stays yet.
                    </h3>
                    <p>
                      Your requested services and stay access will appear here.
                    </p>
                  </>
                ) : workspace.services.kind === "ready" ? (
                  <div className={styles.serviceWorkspace}>
                    {availableOfferings.length > 0 && (
                      <div className={styles.serviceGroup}>
                        <div className={styles.serviceGroupHeading}>
                          <div>
                            <span>AVAILABLE FOR YOUR STAYS</span>
                            <h3>Request an additional service</h3>
                          </div>
                          <p>
                            Each request is reviewed for your stay. A request is
                            not a service confirmation.
                          </p>
                        </div>
                        <div className={styles.offeringGrid}>
                          {availableOfferings.map((offering) => {
                            const draft = serviceDrafts[
                              offering.offeringId
                            ] ?? {
                              quantity: "1",
                              requestedFor: "",
                              requestNote: "",
                            };
                            const actionActive =
                              serviceAction.target === offering.offeringId;
                            return (
                              <article
                                className={styles.serviceComposer}
                                key={`${offering.bookingId}:${offering.offeringId}`}
                              >
                                <div className={styles.recordHead}>
                                  <span>{offering.bookingReference}</span>
                                  <strong>Available to request</strong>
                                </div>
                                <h3>{offering.displayName}</h3>
                                <p className={styles.serviceQualifier}>
                                  Price not available. Timing and fulfilment are
                                  confirmed separately.
                                </p>
                                <div className={styles.serviceFields}>
                                  <label>
                                    Quantity
                                    <input
                                      inputMode="numeric"
                                      min="1"
                                      max="1000"
                                      type="number"
                                      value={draft.quantity}
                                      onChange={(event) =>
                                        setServiceDrafts((current) => ({
                                          ...current,
                                          [offering.offeringId]: {
                                            ...draft,
                                            quantity: event.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    Preferred date and time
                                    <input
                                      type="datetime-local"
                                      value={draft.requestedFor}
                                      onChange={(event) =>
                                        setServiceDrafts((current) => ({
                                          ...current,
                                          [offering.offeringId]: {
                                            ...draft,
                                            requestedFor: event.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </label>
                                  <label className={styles.serviceNoteField}>
                                    Note (optional)
                                    <textarea
                                      maxLength={500}
                                      value={draft.requestNote}
                                      onChange={(event) =>
                                        setServiceDrafts((current) => ({
                                          ...current,
                                          [offering.offeringId]: {
                                            ...draft,
                                            requestNote: event.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Tell us what would make this service work for your stay."
                                    />
                                  </label>
                                </div>
                                <div className={styles.serviceActions}>
                                  <button
                                    className={styles.primaryAction}
                                    disabled={
                                      serviceAction.status === "working"
                                    }
                                    type="button"
                                    onClick={() =>
                                      void runServiceCommand({
                                        type: "request_service",
                                        bookingId: offering.bookingId,
                                        offeringId: offering.offeringId,
                                        quantity: Number(draft.quantity),
                                        requestedFor: optionalIso(
                                          draft.requestedFor,
                                        ),
                                        requestNote: draft.requestNote,
                                      })
                                    }
                                  >
                                    {serviceAction.status === "working" &&
                                    actionActive
                                      ? "Sending…"
                                      : "Send service request"}
                                  </button>
                                  {serviceAction.status === "unknown" &&
                                    actionActive &&
                                    pendingServiceRetry && (
                                      <button
                                        className={styles.secondaryAction}
                                        type="button"
                                        onClick={() =>
                                          void runServiceCommand(
                                            pendingServiceRetry.body,
                                            pendingServiceRetry,
                                          )
                                        }
                                      >
                                        {pendingServiceRetry.acknowledgement ? "Check saved status" : "Retry safely"}
                                      </button>
                                    )}
                                  {actionActive && serviceAction.message && (
                                    <span role="status">
                                      {serviceAction.message}
                                    </span>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className={styles.serviceGroup}>
                      <div className={styles.serviceGroupHeading}>
                        <div>
                          <span>YOUR REQUESTS & ACCESS</span>
                          <h3>Services connected to your stays</h3>
                        </div>
                      </div>
                      {availableOfferings.length === 0 && (
                        <p className={styles.serviceNotice}>
                          No additional services are available for your stays
                          yet.
                        </p>
                      )}
                      {workspace.services.data.services.length +
                        workspace.services.data.entitlements.length ===
                      0 ? (
                        <p className={styles.serviceNotice}>
                          You have no service requests or active stay access
                          yet.
                        </p>
                      ) : (
                        <div className={styles.recordGrid}>
                          {workspace.services.data.services.map((service) => {
                            const canCancel = [
                              "requested",
                              "confirmed",
                            ].includes(service.status);
                            const reason =
                              serviceCancelReasons[service.selectionId] ?? "";
                            const actionActive =
                              serviceAction.target === service.selectionId;
                            return (
                              <article
                                className={styles.recordCard}
                                key={service.selectionId}
                              >
                                <div className={styles.recordHead}>
                                  <span>{service.publicReference}</span>
                                  <strong>{readable(service.status)}</strong>
                                </div>
                                <h3>{service.displayName}</h3>
                                <dl>
                                  <div>
                                    <dt>Booking</dt>
                                    <dd>{service.bookingReference}</dd>
                                  </div>
                                  <div>
                                    <dt>Quantity</dt>
                                    <dd>{service.quantity}</dd>
                                  </div>
                                  <div>
                                    <dt>Preferred date</dt>
                                    <dd>{formatDate(service.requestedFor)}</dd>
                                  </div>
                                  <div>
                                    <dt>Price</dt>
                                    <dd>Not available</dd>
                                  </div>
                                </dl>
                                {canCancel && (
                                  <div className={styles.cancelService}>
                                    <label>
                                      Reason for cancelling this service request
                                      <textarea
                                        maxLength={500}
                                        value={reason}
                                        onChange={(event) =>
                                          setServiceCancelReasons(
                                            (current) => ({
                                              ...current,
                                              [service.selectionId]:
                                                event.target.value,
                                            }),
                                          )
                                        }
                                      />
                                    </label>
                                    <div className={styles.serviceActions}>
                                      <button
                                        className={styles.secondaryAction}
                                        disabled={
                                          serviceAction.status === "working"
                                        }
                                        type="button"
                                        onClick={() =>
                                          void runServiceCommand({
                                            type: "cancel_service",
                                            selectionId: service.selectionId,
                                            expectedVersion: service.version,
                                            reason,
                                          })
                                        }
                                      >
                                        {serviceAction.status === "working" &&
                                        actionActive
                                          ? "Cancelling…"
                                          : "Cancel service request"}
                                      </button>
                                      {serviceAction.status === "unknown" &&
                                        actionActive &&
                                        pendingServiceRetry && (
                                          <button
                                            className={styles.secondaryAction}
                                            type="button"
                                            onClick={() =>
                                              void runServiceCommand(
                                                pendingServiceRetry.body,
                                                pendingServiceRetry,
                                              )
                                            }
                                          >
                                            {pendingServiceRetry.acknowledgement ? "Check saved status" : "Retry safely"}
                                          </button>
                                        )}
                                      {actionActive &&
                                        serviceAction.message && (
                                          <span role="status">
                                            {serviceAction.message}
                                          </span>
                                        )}
                                    </div>
                                  </div>
                                )}
                              </article>
                            );
                          })}
                          {workspace.services.data.entitlements.map((item) => (
                            <article
                              className={styles.recordCard}
                              key={item.entitlementId}
                            >
                              <div className={styles.recordHead}>
                                <span>{item.publicReference}</span>
                                <strong>{readable(item.status)}</strong>
                              </div>
                              <h3>Stay access</h3>
                              <dl>
                                <div>
                                  <dt>Access</dt>
                                  <dd>{readable(item.scopeKey)}</dd>
                                </div>
                                <div>
                                  <dt>Valid from</dt>
                                  <dd>{formatDate(item.validFrom)}</dd>
                                </div>
                                <div>
                                  <dt>Valid until</dt>
                                  <dd>{formatDate(item.validUntil)}</dd>
                                </div>
                              </dl>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </FeedBoundary>
            </section>
            <section className={styles.workspaceSection} id="saved">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.kicker}>SAVED</p>
                  <h2>Stays you want to revisit</h2>
                </div>
                <Link className={styles.secondaryAction} href="/en/search">
                  Search stays <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
              <FeedBoundary
                state={workspace.savedProperties}
                empty={
                  workspace.savedProperties.kind === "ready" &&
                  workspace.savedProperties.data.savedPropertyIds.length === 0
                }
              >
                {workspace.savedProperties.kind === "ready" &&
                workspace.savedProperties.data.savedPropertyIds.length === 0 ? (
                  <>
                    <Bookmark size={24} aria-hidden />
                    <h3>No saved stays yet</h3>
                    <p>Use Save on a Forest City hotel page to keep it here.</p>
                  </>
                ) : (
                  <div className={styles.propertyGrid}>
                    {workspace.savedProperties.kind === "ready" &&
                      workspace.savedProperties.data.savedPropertyIds.map(
                        (propertyId) => (
                          <PropertyCard
                            actionBusy={
                              propertyAction.key ===
                                `remove_saved_property:${propertyId}` &&
                              propertyAction.status === "working"
                            }
                            actionLabel="Remove"
                            actionMessage={
                              propertyAction.key ===
                              `remove_saved_property:${propertyId}`
                                ? propertyAction.message
                                : null
                            }
                            key={propertyId}
                            onAction={() =>
                              void runPropertyCommand(
                                "remove_saved_property",
                                propertyId,
                              )
                            }
                            propertyId={propertyId}
                          />
                        ),
                      )}
                  </div>
                )}
              </FeedBoundary>
            </section>
            <section className={styles.workspaceSection} id="cart">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.kicker}>CART</p>
                  <h2>Stays selected for review</h2>
                </div>
              </div>
              <FeedBoundary
                state={workspace.savedCart}
                empty={
                  workspace.savedCart.kind === "ready" &&
                  workspace.savedCart.data.cartItems.length === 0
                }
              >
                {workspace.savedCart.kind === "ready" &&
                workspace.savedCart.data.cartItems.length === 0 ? (
                  <>
                    <ShoppingBag size={24} aria-hidden />
                    <h3>Your cart is empty</h3>
                    <p>
                      Add a Forest City stay from its property page when you are
                      ready to review it.
                    </p>
                  </>
                ) : (
                  <div className={styles.propertyGrid}>
                    {workspace.savedCart.kind === "ready" &&
                      workspace.savedCart.data.cartItems.map((item) => (
                        <PropertyCard
                          actionBusy={
                            propertyAction.key ===
                              `remove_cart:${item.propertyId}` &&
                            propertyAction.status === "working"
                          }
                          actionLabel="Remove"
                          actionMessage={
                            propertyAction.key ===
                            `remove_cart:${item.propertyId}`
                              ? propertyAction.message
                              : null
                          }
                          key={item.cartItemId}
                          meta={
                            item.cartState === "planning"
                              ? "Saved to your planning cart. Booking options will become available after the stay is confirmed for sale."
                              : "Saved to your cart. Availability and booking are confirmed separately."
                          }
                          onAction={() =>
                            void runPropertyCommand(
                              "remove_cart",
                              item.propertyId,
                            )
                          }
                          propertyId={item.propertyId}
                        />
                      ))}
                  </div>
                )}
              </FeedBoundary>
            </section>
            <section
              className={`${styles.workspaceSection} ${styles.profileSection}`}
              id="profile"
            >
              <div>
                <p className={styles.kicker}>PROFILE</p>
                <h2>Your CRAYS profile</h2>
                <p>Manage your sign-in profile or safely end this session.</p>
              </div>
              <div className={styles.profileCard}>
                <UserRound size={24} aria-hidden />
                <div>
                  <strong>{displayName}</strong>
                  {session.account.email && (
                    <span>{session.account.email}</span>
                  )}
                  {session.account.emailVerified === true && (
                    <small>
                      <CheckCircle2 size={14} aria-hidden /> Email verified
                    </small>
                  )}
                </div>
                <div className={styles.profileActions}>
                  <Link className={styles.secondaryAction} href="/auth/profile">
                    Open profile
                  </Link>
                  <a className={styles.primaryAction} href={session.logoutHref}>
                    <LogOut size={16} aria-hidden /> Log out
                  </a>
                </div>
              </div>
            </section>
          </ClubsMemberHome>
        )}
      </AccountContainer></TodayLocalizedContent></TodayLocaleProvider>
    </MemberAccountFrame>
  );
}
