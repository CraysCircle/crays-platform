import {applyCommercialPayment} from './communityCommercialPayments';
import {applyCommercialApplication} from './communityCommercialApplications';
import {applyCommunityCommercial} from './communityCommercial';
import {applyCommunityMembership} from './communityMemberships';
import {applyCommunityCalendar} from './communityProfile';
import {ownPrivateAccount} from './ownPrivateAccount';
import {applyEventTicketJourney} from './eventTicketJourney';
import {applyWebSupport} from './webSupport';
import {applyWebMemory} from './webMemory';
import {saveNotificationPreference} from './webNotifications';
import {applyGroupCallAction,groupCallReview} from './webVifGroupCall';
import {callLinkContext,callLinkDurations,callLinkState} from './webVifCallLink';
import {validVifCallPreview} from './vifCallPreview.ts';
import {vifNewMessageExpiry} from './vifDisappearing';
import {localPresenceCurrent,beginSamplePresence,expireLocalPresence} from './localPresence.ts';
import {applyIntroductionMail} from './introductionMail.ts';
import {applyRestaurantBooking} from './restaurantBooking.ts';
import {applyPersonalMesh,meshCapability,meshFor,meshAccess,meshSource} from './personalMeshPreview.ts';
import {applyPersonalDocumentImport,personalDocumentImportCompleteBridge} from './personalDocumentImport.ts';
import {applyPersonalChess} from './personalChess.ts';
import {applyPersonalCommunityQuery} from './personalCommunityQuery.ts';
import {applyPersonalRecommendations,recommendationHandoffCurrent,type RecommendationHandoff} from './personalRecommendations.ts';
import {applyPersonalContactBoundary} from './personalContactBoundary.ts';
import {personalImageBridge} from './personalImageBridge.ts';
import {applyPersonalImageJourney,imageLinkedMediaCurrent,imageLinkedPublicationCurrent} from './personalImageJourney.ts';
import {applyPersonalWebtool} from './personalWebtool.ts';
import {applyMatchingPreference} from './matchingPreference.ts';
import {withGroceryCommerceFixture,qualifyGroceryOrderCreate,groceryCanonicalCreateFields,isGroceryOrder,assertCurrentGroceryOrder,groceryCanonicalPreflight} from './groceryCommerce.ts';
import {applyGroceryDelivery,groceryCapability} from './groceryDelivery.ts';
import {applyFlightCheckin} from './flightCheckin.ts';
import {applyPersonalCreative} from './personalCreative.ts';
import {applyAddressBook} from './addressBookJourney.ts';
import {applyMediaSummary} from './mediaSummary.ts';
import {applyMailboxJourney} from './mailboxJourney.ts';
import {applyPersonalBudget} from './personalBudget.ts';
import {applyPersonalDecision} from './personalDecision.ts';
import {applyMusic} from './musicJourney.ts';
import {applySmartHome} from './smartHome.ts';
import {applyLinkReputation} from './linkReputation.ts';
import {applyHousingWatch} from './housingWatch.ts';
import {applyMailAliases} from './mailAliasJourney.ts';
import {applyEmergencyAccess} from './emergencyAccess.ts';
import {applyQrCapability} from './qrCapability.ts';
import {applyCareLog} from './careLog.ts';
import {applyWeekMeals} from './weekMeals.ts';
import {applyLeisure} from './leisureDiscovery.ts';
import {applyPersonalInventory} from './personalInventory.ts';
import {applyPersonalPantry} from './personalPantry.ts';
import {applyPersonalPhotoArchive} from './personalPhotoArchive.ts';
import {applyPrivateVoice} from './privateVoice.ts';
import {applyBookDiscovery} from './bookDiscovery.ts';
import {applyTripSpecialists} from './tripSpecialists.ts';
import {applyParcelTracking} from './parcelTracking.ts';
import {applyRepairClaims} from './repairClaims.ts';
import {applyPersonalDiagram} from './personalDiagram.ts';
import {applyLearningJourney} from './learningJourney.ts';
import {applyHouseholdLists} from './householdLists.ts';
import {applyPdfFormJourney} from './pdfFormJourney.ts';
import {applyPrivateEpub} from './privateEpub.ts';
import {applySharedExpenses} from './sharedExpenses.ts';
import {applyOrderPreparationRecovery} from './orderPreparationRecovery.ts';
import {isMerchantExampleVenue,isShippingExampleVenue,gymRetailVenueId} from './merchantExampleScope.ts';
import {applyPersonalContentCollections} from './personalContentCollections.ts';
import {applyPublicInteraction,preparePublicInteraction} from './nostrInteraction.ts';
import {applyFitnessAnalysis} from './fitnessAnalysisResult.ts';
import {applyStoreShippingPreview,storeShippingRequestReview,storeShippingPreflightReview,type StoreShippingRequest} from './storeShipping.ts';
import {applyCircleAccess,circleCanAdmin,circleCanParticipate,circleHistoryAllows,circleMessageFields,initialiseCreatedCircle} from './circleAccess.ts';
import {artistNftOfferSpec,artistNftForOffer,requireArtistNftAvailable,bindArtistNftPayment,requireArtistNftPaymentSubmission} from './artistNft.ts';
import {chuckCommerceTask,chuckCommerceTaskCanPrepare} from './chuckCommerce.ts';
import {isCraysBrandSetup,craysFranchiseMessage} from './craysFranchisePolicy.ts';
import {applyMerchantInvoicePreview} from './merchantInvoicePreview.ts';
import {applyPickupPreflight,needsPickupPreflight,pickupPreflightReview} from './pickupPreflight.ts';
import {applyOrderPickupPreview} from './orderPickupPreview.ts';
import {applyMerchantCheckout} from './merchantCheckout.ts';
import {applyMerchantReturnPreview} from './merchantReturnPreview.ts';
import {creatorPromotionPrice,requireCreatorPromotionPrice,type CreatorPromotionPrice} from './creatorPromotion.ts';
import {applyCommerceOrderPreview} from './commerceOrderPreview.ts';
import {applyVenueHours} from './venueHours';
import {applyVenuePerks} from './venuePerks';
import {applySpotCommunityEvidence} from './spotCommunityEvidence';
import {applyCraysFeeSettlement,requireCraysFeePayment} from './craysFeeSettlement';
import {applyMerchantAcceptance,requireVenuePaymentAcceptance} from './merchantAcceptance';
import {requireCraysUSD,craysBeneficiary} from './craysPaymentPolicy';
import {applyConversationNotes} from './conversationNotes';
import {applyContactContext} from './contactContext';
import {chatPhotoExampleName} from './chatPhoto.ts';
import {applyPartnerFinanceJourney} from './partnerFinanceJourney.ts';
import {applyReferralGuestJourney} from './referralGuestJourney.ts';
import {applyWearableJourney} from "./wearableJourney.ts";
import {applyAmbassadorJourney} from "./ambassadorJourney.ts";
import {applyTrainingJourney} from "./trainingJourney.ts";
import {applyMealPhotoJourney} from "./mealPhotoJourney.ts";
import {applyNutritionJourney} from "./nutritionJourney.ts";
import {applyRecipeWorkspace} from "./recipeWorkspaceJourney.ts";
import {applyRecipeIntake} from "./recipeIntakeJourney.ts";
import {applyAccountProtection} from './accountProtection.ts';
import {applyDeviceRecovery} from './deviceRecovery.ts';
import {applyAccountClosure} from './accountClosure.ts';
import {applyFitnessProgress} from './fitnessProgress.ts';
import {applyFitnessMedia} from './fitnessMedia.ts';
import {applyFitnessChallenges} from './fitnessChallenges.ts';
import {applyFitnessCoaching} from './fitnessCoaching.ts';
import {applyCoachingEvidence} from './coachingEvidence.ts';
import {privacyReviewSnapshot} from './privacyOverview.ts';
import {applyDemoSignIn,type DemoCodeChallenge} from "./demoSignIn.ts";
import {applyEcosystemMembership} from "./ecosystemMemberships.ts";
import {applyChuckModelAccount} from "./chuckModelAccounts";
import {newUSDAccount,newUSDBAccount,historicalFiatAccount} from "./usdAccounts";
import {requireUSDCheckoutQuote,type USDCheckoutQuote} from './usdCheckout';
import {withDemoPersonNames} from './demoPersonNames';
import {creatorLinksFromDraft,profilePublicLinks} from './creatorSocialLinks.ts';
import {applyPdfQuestions} from './pdfQuestions.ts';
import {applyArticleExplanation} from './articleExplanation.ts';
import {applyPersonalNewsDigest} from './personalNewsDigest.ts';
import {applySourceComparison} from './sourceComparison.ts';
import {applyResearchExecution} from './researchExecution.ts';
import {applyPublicResearch} from './publicResearch.ts';
import {applyPersonalDeadlines} from './personalDeadlines.ts';
import {applyPrivateDocuments} from './privateDocuments.ts';
import {applyDocumentSourcePreview} from './documentSources.ts';
import {applyPersonalNotes} from './personalNotes.ts';
import {applyNoteMemory} from './noteMemory.ts';
import {applyPersonalHabits} from './personalHabits.ts';
import {applyPersonalOccasions} from './personalOccasions.ts';
import {applyOccasionMessages} from './occasionMessages.ts';
import {applyOccasionContactPreview} from './occasionContacts.ts';
import {applyPersonalChecklists} from './personalChecklists.ts';
import {applyAppointmentPlanner} from './appointmentPlanner.ts';
import {applyWeekPlanner} from './weekPlanner.ts';
import {applyCalendarSourcePreview} from './calendarSources.ts';
import {applyTravelSourcePreview} from './travelSourcePreview.ts';
import {applyTravelComparisons} from "./travelComparisons.ts";
import {applyTripPlanner} from "./tripPlanner.ts";
import {applyDayAgenda} from "./dayAgenda.ts";
import {applyCatalogueServiceBooking} from "./catalogueServiceBooking.ts";
import {catalogueOrderLines,catalogueEstimate,type OrderBasketLine} from "./catalogueOrdering.ts";
import {applyVenueCatalogue,guestVenueCatalogue} from "./venueCatalogue.ts";
import { requireCraysPayment, planContractActive } from "./craysPlans.ts";
import {scheduledOriginal, publicationDue} from "./publicationSchedules.ts";
import {
  creatorAccessForOffer,
  requireCreatorTerm,
  creatorServiceValidity,
  creatorPaymentMatches,
  requireCreatorRenewal,
  requirePreparedRenewal,
} from "./creatorPaymentTerms.ts";
import {
  publicationAudienceAllowed,
  canManagePublishingOriginal,
  contentAccessSnapshot,
  checkTargets,
  applyPublishing,
  type PublishingState,
} from "./publishing.ts";
import { hasFoodService } from "./spaceExperience.ts";
import { applyCompletionAction } from "./completionDomain.ts";
import { instruments, matchingPurposes } from "./personalityPolicy.ts";
import { forestCityDemo } from "./venueDefaults.ts";
import { relaySources, publicationSources,relayUrl,relaySourceSnapshot,relayListReviewSnapshot,nostrPublicIdReadable } from "./nostrSources.ts";
import {
  canDirectMessage,
  canGroupCommunicate,
  communicationContext,
  channelAllowed,
} from "./communicationPolicy.ts";
// CRAYS design-only simulation. No network, signer, wallet, camera or provider calls.
export type Audience = "Public" | "Community" | "On-site" | "Private group";
export type Delivery =
  | "draft"
  | "signed"
  | "submitted"
  | "accepted"
  | "partial"
  | "unknown"
  | "failed"
  | "scheduled";
export type Entity = { id: string; owner: string; [key: string]: unknown };
/** Read-only provider evidence: no customer action may create this response. */
export function orderNoteResponseMatches(order:Entity) {
  const response=order.noteResponse as Record<string,unknown>|undefined;
  const quote=order.quote as Record<string,unknown>|undefined;
  return !!(typeof order.requestSnapshot==="string"&&order.requestSnapshot&&response&&quote&&typeof quote.version==="string"&&quote.version&&response.status==="answered"&&response.verified===true&&response.source==="venue-provider"&&response.orderId===order.id&&response.venueId===order.venueId&&response.requestSnapshot===order.requestSnapshot&&response.quoteVersion===quote.version&&response.noteText===order.notes&&typeof response.text==="string"&&response.text.trim()&&typeof response.providerReference==="string"&&response.providerReference.trim()&&Number.isFinite(Date.parse(String(response.receivedAt))));
}
export function orderNoteAllowsBinding(order:Entity) {
  return order.noteConfirmationRequired!==true||(orderNoteResponseMatches(order)&&(order.noteResponse as Record<string,unknown>).outcome==="can-accommodate");
}

export type Person = {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  following: boolean;
  contact: boolean;
  blocked: boolean;
  blockedByOther?: boolean;
  requestPurposes?: string[];
  requestsEnabled?: boolean;
  purpose: string;
  request:
    | "none"
    | "sent"
    | "received"
    | "accepted"
    | "declined"
    | "withdrawn"
    | "expired";
  consentSelf: boolean;
  consentOther: boolean;
  publicIntroductionId?: string;
  requestId?: string;
  requestDirection?: "incoming" | "outgoing";
  venueId?: string;
  communityVenueIds?: string[];
  publicAffiliationIds?: string[];
  localPresence?: boolean;
  localVisibility?: Record<string, boolean>;
};
export type Venue = {
  openingHours?: import("./venueHours.ts").HoursSource;
  id: string;
  name: string;
  type: string;
  city: string;
  description: string;
  image: string;
  services: string[];
  visited: boolean;
  membership: "none" | "provisional" | "active" | "suspended";
  grant: string;
  otherGrant: boolean;
  presence: "none" | "active" | "expiring" | "expired";
  presenceStartedAt?: number;
  presenceExpiresAt?: number;
  presenceSource?: "fictional-local-qr";
  visibility: Record<string, boolean>;
  area: string;
  operatorActive: boolean;
  role: "Guest" | "Member" | "Staff" | "Operator";
  relay: string;
  relayJoined?: boolean;
};
export type Post = {
  publishing?: PublishingState;
  demoMedia?: import("./publishing.ts").PublishingMedia[];
  id: string;
  author: string;
  title: string;
  text: string;
  type:
    | "note"
    | "article"
    | "image"
    | "video"
    | "audio"
    | "live"
    | "poll"
    | "document";
  fullText?: string;
  archived?: boolean;
  revisionOf?: string;
  mediaId?: string;
  purchaseEligibility?: string;
  rightsTerms?: string;
  rightsDuration?: string;
  accessModel?: string;
  audience: Audience;
  venueId?: string;
  groupId?: string;
  parentId?: string;
  rootId?: string;
  status: Delivery;
  liked: boolean;
  saved: boolean;
  reposted: boolean;
  protected: boolean;
  license: boolean;
  mediaAvailable: boolean;
  createdAt: number;
  image?: string;
  alt?: string;
  replies: string[];
  readPosition: number;
  choices?: string[];
  vote?: number;
  highlight?: string;
  collection?: string;
  relay?: string;
  approvedRelayIds?: string[];
  approvedOriginal?: string;
  deliveryRelayIds?: string[];
  images?: { file: string; alt: string }[];
  actions?: { label: string; featureId: string; objectId?: string }[];
};
export type Wallet = {
  id: string;
  name: string;
  asset: string;
  network: string;
  custody: string;
  available: string;
  pending: string;
  reserved: string;
  connected: boolean;
  read: boolean;
  transfer: boolean;
  budget: boolean;
  proof: "valid" | "missing" | "invalid";
  contract?: string;
};
export type Payment = {
  id: string;
  owner: string;
  sourceId: string;
  recipient: string;
  walletId: string;
  asset: string;
  network: string;
  amount: string;
  fee: string;
  status:
    | "prepared"
    | "approved"
    | "submitted"
    | "pending"
    | "confirmed"
    | "unknown"
    | "failed"
    | "refunded";
  reference: string;
  purpose: string;
  zapPostId?: string;
  usdQuote?: USDCheckoutQuote;
  offerId?: string;
  offerVersion?: string;
  creatorPricing?: CreatorPromotionPrice;
  creatorOfferType?: string;
  artistNft?: import('./artistNft.ts').ArtistNftSpec;
  artistNftOfferSnapshot?: string;
  artistNftPaymentSnapshot?: string;
  closedBeforeSubmission?: boolean;
  officialUSDMethod?: "Stripe" | "Apple Pay";
  merchantCheckout?: import("./merchantCheckout.ts").MerchantCheckout;
  planReviewId?: string;
  planPricingVersion?: string;
  renewalOf?: string;
  renewalBasePaymentId?: string;
  renewalBaseEndsAt?: number;
};
export type ProductWorld = {
  version: 2;
  owner: string;
  profiles: Record<string, Record<string, string>>;
  people: Person[];
  venues: Venue[];
  activeVenueId: string;
  posts: Post[];
  wallets: Wallet[];
  payments: Payment[];
  objects: Entity[];
  drafts: Record<string, Record<string, string>>;
  settings: Record<string, string | boolean>;
  identity: {
    signedIn: boolean;
    method: string;
    destination: string;
    codeTarget: string;
    demoCodeChallenge?: DemoCodeChallenge;
    resendAt: number;
    publicId: string;
    signer: "locked" | "demo-connected" | "revoked";
    relayState: "online" | "partial" | "offline";
    relaySelection: string[];
    recovery: "not-backed-up" | "backup-reviewed" | "partial" | "restored";
  };
  notifications: {
    id: string;
    type: string;
    text: string;
    ref: string;
    read: boolean;
  }[];
  history: {
    id: string;
    featureId: string;
    op: string;
    objectId: string;
    owner: string;
    context: Record<string, string>;
    outcome: string;
    at: number;
  }[];
};
const stamp = () => Date.now();
const id = () =>
  globalThis.crypto?.randomUUID?.() ||
  `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const asset = (f: string) => `/assets/crays/${f}`;
function baseWorld(): ProductWorld {
  return {
    version: 2,
    owner: "thorben",
    profiles: {
      thorben: {
        name: "Thorben",
        username: "thorben",
        bio: "Good people. New ideas. Places that feel like home.",
        purpose: "Socializing",
        photo: "contact-thorben.png",
        country: "Germany",
        interests: "Design, travel, community",
        visibility: "Private",
        prompt: "A good day starts with…",
        answer: "A good conversation.",
      },
      antje: {
        name: "Antje",
        username: "antje",
        bio: "Building things with good people.",
        purpose: "Business",
        photo: "person-antje-vif.webp",
        visibility: "Private",
      },
    },
    people: [
      {
        id: "alex",
        publicAffiliationIds: ["space:harbor-house"],
        name: "Alex",
        bio: "Design, good conversations and new places.",
        avatar: "alex.png",
        following: true,
        contact: true,
        blocked: false,
        purpose: "Socializing",
        request: "accepted",
        consentSelf: true,
        consentOther: true,
      },
      {
        id: "maya",
        venueId: "harbor-house",
        localPresence: true,
        localVisibility: { Business: true, Socializing: false, Dating: false },
        name: "Maya",
        bio: "Creative founder. Looking for thoughtful collaborators.",
        avatar: "person-maya.webp",
        following: false,
        contact: false,
        blocked: false,
        purpose: "Business",
        request: "none",
        consentSelf: false,
        consentOther: false,
      },
      {
        id: "sam",
        venueId: "harbor-house",
        localPresence: true,
        localVisibility: { Business: false, Socializing: true, Dating: false },
        name: "Sam",
        bio: "A local host who loves bringing people together.",
        avatar: "person-sam.webp",
        following: false,
        contact: false,
        blocked: false,
        purpose: "Socializing",
        request: "received",
        consentSelf: false,
        consentOther: true,
      },
    ],
    venues: [
      {
        id: "harbor-house",
        name: "Harbor House",
        type: "Members club & café",
        city: "Lisbon",
        description:
          "A shared table, a quiet corner and room for new ideas. Harbor House brings a neighbourhood café and members’ workspace together. The café serves members and visitors; workspace bookings and member gatherings have their own access conditions.",
        image: "venue-table.png",
        services: [
          "Coffee",
          "Table booking",
          "Community events",
          "Lost & found",
        ],
        visited: true,
        membership: "active",
        grant: "Past visit",
        otherGrant: false,
        presence: "none",
        visibility: { Socializing: false, Business: false, Dating: false },
        area: "Main space",
        operatorActive: true,
        role: "Member",
        relay: "Harbor House community relay",
      },
      {
        id: "coast",
        name: "Coast Club",
        type: "Beachclub",
        city: "Barcelona",
        description:
          "A day by the sea, with independent ticketed events and a coastal café. A ticket grants its stated event access, not access to private groups.",
        image: "lifestyle-club-05.jpg",
        services: ["Coffee", "Day ticket", "Community events"],
        visited: false,
        membership: "provisional",
        grant: "Upcoming day ticket",
        otherGrant: false,
        presence: "none",
        visibility: { Socializing: false, Business: false, Dating: false },
        area: "Beach terrace",
        operatorActive: true,
        role: "Guest",
        relay: "Coast Club relay",
      },
      {
        id: "studio",
        name: "The Workroom",
        type: "Coworking space",
        city: "Berlin",
        description:
          "A neighbourhood workspace for focused days and shared ideas. Desks, meeting rooms and small community sessions can be requested independently.",
        image: "venue-table.png",
        services: ["Desk booking", "Meeting room", "Community events"],
        visited: false,
        membership: "none",
        grant: "None",
        otherGrant: false,
        presence: "none",
        visibility: { Socializing: false, Business: false, Dating: false },
        area: "Workspace",
        operatorActive: true,
        role: "Guest",
        relay: "The Workroom relay",
      },
      {
        id: "move",
        name: "Move Together",
        type: "Gym & wellbeing",
        city: "Berlin",
        description:
          "Movement, coaching and community. Explore training sessions, coaching and food ideas; a social visibility choice never replaces the right to attend a session.",
        image: "venue-gym.jpg",
        services: ["Training", "Coaching", "Recipes", "Community events"],
        visited: true,
        membership: "active",
        grant: "Active gym membership",
        otherGrant: true,
        presence: "none",
        visibility: { Socializing: false, Business: false, Dating: false },
        area: "Studio",
        operatorActive: true,
        role: "Member",
        relay: "Move Together relay",
      },
      structuredClone(forestCityDemo),
    ],
    activeVenueId: "harbor-house",
    posts: [
      {
        id: "note-1",
        author: "alex",
        title: "A table for good ideas",
        text: "Some of the best conversations start without an agenda. Anyone up for a coffee at Harbor House this weekend?",
        type: "note",
        audience: "Public",
        status: "accepted",
        liked: false,
        saved: false,
        reposted: false,
        protected: false,
        license: false,
        mediaAvailable: true,
        createdAt: stamp() - 3600000,
        replies: ["reply-1"],
        readPosition: 0,
      },
      {
        id: "reply-1",
        author: "maya",
        title: "A reply to Alex",
        text: "I’d love to join. A small table and a new idea sounds perfect.",
        type: "note",
        audience: "Public",
        parentId: "note-1",
        rootId: "note-1",
        status: "accepted",
        liked: false,
        saved: false,
        reposted: false,
        protected: false,
        license: false,
        mediaAvailable: true,
        createdAt: stamp() - 1800000,
        replies: [],
        readPosition: 0,
      },
      {
        id: "article-1",
        author: "alex",
        title: "Places become meaningful through people",
        text: "A place is more than its address. It is the people we meet, the things we make together, and the conversations we choose to continue.\n\nA familiar place can hold a new possibility. A shared table might become a project; a quiet workspace might become a circle of friends. Those possibilities work best when people choose how they participate.\n\nBelonging can continue after a visit ends. We can keep a conversation going without pretending to be in the same place. A community and the people present right now are different contexts, and both deserve clear boundaries.\n\nStart small. Choose a place, find a shared interest, and make room for a conversation. You decide what to share and which connections to continue.",
        type: "article",
        audience: "Public",
        status: "accepted",
        liked: false,
        saved: false,
        reposted: false,
        protected: false,
        license: false,
        mediaAvailable: true,
        createdAt: stamp() - 7200000,
        replies: [],
        readPosition: 0,
        image: "venue-table.png",
        alt: "A warmly lit shared dinner table.",
      },
      {
        id: "gallery-1",
        author: "alex",
        title: "Around the table",
        text: "Little moments from a shared evening.",
        type: "image",
        audience: "Public",
        status: "accepted",
        liked: false,
        saved: false,
        reposted: false,
        protected: false,
        license: false,
        mediaAvailable: true,
        createdAt: stamp() - 10800000,
        replies: [],
        readPosition: 0,
        image: "venue-table.png",
        alt: "Wine glasses and plates at an inviting shared table.",
      },
      {
        id: "venue-note",
        author: "Harbor House team",
        title: "This week at Harbor House",
        text: "Our community gathering is open to members. Please review the event before requesting a place. The café remains available independently of social visibility.",
        type: "note",
        audience: "Community",
        venueId: "harbor-house",
        status: "accepted",
        liked: false,
        saved: false,
        reposted: false,
        protected: false,
        license: false,
        mediaAvailable: true,
        createdAt: stamp() - 14400000,
        replies: [],
        readPosition: 0,
      },
      {
        id: "paid-1",
        author: "alex",
        title: "A creator’s field notes",
        text: "A thoughtful guide to making space for community. This is the public preview. The full sample document is available only after payment and license checks are complete.",
        type: "article",
        audience: "Public",
        status: "accepted",
        liked: false,
        saved: false,
        reposted: false,
        protected: true,
        license: false,
        mediaAvailable: true,
        createdAt: stamp() - 18000000,
        replies: [],
        readPosition: 0,
      },
    ],
    wallets: [
      {
        id: "btc",
        name: "Bitcoin wallet",
        asset: "BTC",
        network: "Bitcoin",
        custody: "Self-custody",
        available: "0.002",
        pending: "0",
        reserved: "0",
        connected: false,
        read: false,
        transfer: false,
        budget: false,
        proof: "valid",
      },
      {
        id: "ln",
        name: "Lightning wallet",
        asset: "sats",
        network: "Lightning",
        custody: "External wallet",
        available: "20000",
        pending: "0",
        reserved: "0",
        connected: false,
        read: false,
        transfer: false,
        budget: false,
        proof: "valid",
      },
      newUSDAccount("100"),
      {
        id: "utexo",
        name: "USDT via Utexo",
        asset: "USDT",
        network: "Bitcoin / RGB · Utexo path",
        custody: "Provider path unverified",
        available: "25",
        pending: "0",
        reserved: "0",
        connected: false,
        read: false,
        transfer: false,
        budget: false,
        proof: "missing",
        contract: "USDT contract · demo",
      },
      {
        id: "rgb",
        name: "RGB wallet",
        asset: "RGB asset",
        network: "Bitcoin / RGB",
        custody: "Self-custody",
        available: "1",
        pending: "0",
        reserved: "0",
        connected: false,
        read: false,
        transfer: false,
        budget: false,
        proof: "missing",
        contract: "RGB schema · demo",
      },
      {
        id: "usdc",
        name: "Stablecoin wallet",
        asset: "USDC",
        network: "Selected network required",
        custody: "External wallet",
        available: "10",
        pending: "0",
        reserved: "0",
        connected: false,
        read: false,
        transfer: false,
        budget: false,
        proof: "valid",
      },
      newUSDBAccount(),
    ],
    payments: [],
    objects: [
      {
        id: "circle-design",
        owner: "thorben",
        kind: "group",
        name: "Design Circle",
        access: "Request to join",
        membership: "active",
        audience: "Private group",
        role: "Member",
        history: "From joining only",
      },
      {
        id: "circle-build",
        owner: "thorben",
        kind: "group",
        name: "Build Circle",
        access: "Open",
        membership: "none",
        audience: "Community",
        role: "Guest",
        history: "From joining only",
      },
      {
        id: "event-1",
        owner: "thorben",
        kind: "event",
        name: "An evening around the table",
        venueId: "harbor-house",
        date: "2026-10-24",
        time: "18:30",
        timezone: "Europe/Lisbon",
        status: "available",
        recurring: false,
        attendance: "none",
        capacity: "Availability on request",
      },
      {
        id: "memory-1",
        owner: "thorben",
        kind: "memory",
        name: "I prefer a relaxed travel pace.",
        source: "Confirmed by you",
        purpose: "Travel planning",
        status: "confirmed",
      },
    ],
    drafts: {},
    settings: {
      online: true,
      personalization: false,
      notifications: true,
      quietHours: "22:00–08:00",
      language: "English",
      typing: false,
      model: "Automatic",
      modelBudget: "Not configured",
      creator: false,
      provider: "Not selected",
      activePurpose: "Socializing",
      searchScope: "Your communities",
      onboardingRole: "Member",
    },
    identity: {
      signedIn: true,
      method: "Phone",
      destination: "Demo account",
      codeTarget: "",
      resendAt: 0,
      publicId: "Demo Nostr public identity — not a real key",
      signer: "locked",
      relayState: "online",
      relaySelection: ["Public sample relay", "Harbor House community relay"],
      recovery: "not-backed-up",
    },
    notifications: [],
    history: [],
  };
}
export type ActionContext = {
  featureId: string;
  personId?: string;
  venueId?: string;
  postId?: string;
  objectId?: string;
  walletId?: string;
  sourceId?: string;
  purpose?: string;
  [key: string]: string | undefined;
};
export type ActionResult = {
  world: ProductWorld;
  ok: boolean;
  message: string;
  objectId: string;
};
function clone<T>(v: T): T {
  return structuredClone(v);
}
export function sharedPlaceIds(world: ProductWorld, person: Person) {
  const communities =
    person.communityVenueIds ||
    (person.venueId
      ? [person.venueId]
      : person.id === "alex"
        ? ["harbor-house"]
        : []);
  return world.venues
    .filter(
      (v) =>
        !person.blocked &&
        communities.includes(v.id) &&
        (v.relayJoined ?? v.visited) &&
        v.operatorActive &&
        ["active", "provisional"].includes(v.membership),
    )
    .map((v) => v.id);
}
export function canDiscoverPerson(world: ProductWorld, person: Person) {
  return sharedPlaceIds(world, person).length > 0;
}

// A public Boardy/Chuck introduction is the explicit alternative to a shared
// Spot. Both people must first join free Chuck; neither path implies consent.
export function canStartVif(world: ProductWorld, person: Person) {
  if (person.blocked) return false;
  const shared = sharedPlaceIds(world, person).some((id) => {
    const place = world.venues.find((v) => v.id === id)!;
    return (
      place.membership === "active" && (place.relayJoined ?? place.visited)
    );
  });
  const introduction = world.objects.find(
    (o) =>
      o.id === person.publicIntroductionId &&
      o.kind === "targeted-introduction" &&
      o.owner === world.owner &&
      o.personId === person.id &&
      o.status === "approved",
  );
  const member = (id: string) =>
    world.objects.some(
      (o) =>
        o.kind === "chuck-membership" &&
        o.personId === id &&
        o.status === "active",
    );
  return (
    shared || Boolean(introduction && member(world.owner) && member(person.id))
  );
}

export function hasCreatorMembership(
  world: ProductWorld,
  personId = world.owner,
) {
  return world.objects.some(
    (o) =>
      o.kind === "creator-entitlement" &&
      o.personId === personId &&
      o.status === "active" &&
      world.objects.some(
        (b) =>
          b.id === o.badgeAwardId &&
          b.kind === "badge-award" &&
          (b.personId === personId || (o.additionalPlan === true && b.purchaserId === personId &&
            world.objects.some(c => c.id === o.contractId && c.serviceScopeId === b.personId))) &&
          b.status === "issued-demo" &&
          (["BADGE-R01", "BADGE-R02", "BADGE-R03"].includes(String(b.badgeId)) ||
            (["BADGE-PLAN-R-NEW-1", "BADGE-PLAN-R-NEW-2", "BADGE-PLAN-R-NEW-3"].includes(String(b.badgeId)) &&
              o.additionalPlan === true && b.contractId === o.contractId &&
              world.objects.some(c => c.id === o.contractId && c.owner === personId && c.segment === "creator" && planContractActive(c)))) ,
      ),
  );
}

/** Current access only: use before showing mesh payloads or their task/source quotes.
 * Identity metadata may remain visible while payload access is held. No cached grant. */
export function personalMeshPayloadCurrent(world: ProductWorld, item: Entity): boolean {
  if (item.kind !== 'personal-mesh-source' && item.kind !== 'personal-mesh-preview' &&
      !(item.kind === 'agent-task' && item.capabilityId === meshCapability)) return true;
  if (!world.identity.signedIn || item.owner !== world.owner ||
      world.objects.filter(o => o.id === item.id).length !== 1 ||
      world.objects.find(o => o.id === item.id) !== item) return false;
  try {
    if (item.kind === 'personal-mesh-source') { meshSource(world, item.id); return true; }
    if (item.kind === 'personal-mesh-preview') {
      const result = meshFor(world, item.id);
      return !!result && meshAccess(world, result);
    }
    // A task without a result has no derived mesh payload yet. Once attached, only
    // its exact original result and current task/source binding permit quotes.
    if (!item.resultId) return !['stopped', 'cancelled', 'canceled', 'deleted'].includes(String(item.status).toLowerCase());
    const result = meshFor(world, String(item.resultId));
    return !!result && result.sourceTaskId === item.id && meshAccess(world, result);
  } catch { return false; }
}

export function mayRead(world: ProductWorld, post: Post) {
  if(post.status==='draft'&&!canManagePublishingOriginal(world,post))return false;
  if(post.status==='draft'&&!imageLinkedPublicationCurrent(world,post.id))return false;
  if (
    post.publishing?.format === "Story" &&
    post.status !== "draft" &&
    (!post.publishing.storyExpiresAt ||
      post.publishing.storyExpiresAt <= Date.now())
  )
    return false;
  if(post.audience==='Private group'&&post.status!=='draft'&&!circleHistoryAllows(world,post.groupId||'',post))return false;
  const publishingAccess = publicationAudienceAllowed(world, post);
  if (publishingAccess !== undefined) return publishingAccess;
  if (post.audience === "Public") return true;
  if (!world.identity.signedIn) return false;
  if (post.audience === "Private group")
    return canGroupCommunicate(world, post.groupId || "");
  const venues = world.venues.filter((v) => v.id === post.venueId);
  const v = venues.length === 1 ? venues[0] : undefined;
  return (
    !!v &&
    v.operatorActive &&
    ["active", "provisional"].includes(v.membership) &&
    (post.audience !== "On-site" || localPresenceCurrent(world,v.id))
  );
}
export function mayPurchaseCreatorOffer(w: ProductWorld, offer: Entity) {
  if (
    offer.kind !== "public-creator-offer" ||
    offer.status !== "published-demo"
  )
    return false;
  if (offer.expires && Date.parse(String(offer.expires)) <= Date.now())
    return false;
  const item = w.posts.find((p) => p.id === offer.postId);
  if (!item || !mayRead(w, item)) return false;
  if (offer.purchaseEligibility === "Community members")
    return (
      !!offer.venueId &&
      w.venues.some(
        (v) =>
          v.id === offer.venueId &&
          v.operatorActive &&
          ["active", "provisional"].includes(v.membership),
      )
    );
  if (offer.purchaseEligibility === "Named recipients")
    return (
      Array.isArray(offer.recipientIds) && offer.recipientIds.includes(w.owner)
    );
  return offer.purchaseEligibility === "Anyone eligible";
}

export function act(
  input: ProductWorld,
  op: string,
  data: Record<string, string>,
  ctx: ActionContext,
): ActionResult {
  const w = expireLocalPresence(clone(input));
  let objectId =
    ctx.objectId ||
    ctx.postId ||
    ctx.personId ||
    ctx.venueId ||
    ctx.walletId ||
    "";
  let message = "";
  let ok = true;
  const person = w.people.find((p) => p.id === (ctx.personId || "maya"));
  const venue = w.venues.find(
    (v) => v.id === (ctx.venueId || w.activeVenueId),
  )!;
  const post = w.posts.find((p) => p.id === (ctx.postId || "note-1"));
  const wallet = w.wallets.find((x) => x.id === (ctx.walletId || "ln"))!;
  const obj = w.objects.find(
    (o) => o.id === ctx.objectId && o.owner === w.owner,
  );
  const fail: (text: string) => never = (text) => {
    throw new Error(text);
  };
  const create = (kind: string, fields: Record<string, unknown>) => {
    if(kind==='private-message'||kind==='group-message'){const createdAt=Date.now(),chatId=kind==='private-message'?'person:'+String(fields.personId||ctx.personId||''):'group:'+String(fields.groupId||'');const timer=vifNewMessageExpiry(w,chatId,createdAt);fields={...fields,createdAt,localViewTimer:timer.localViewTimer};}
    const o = {
      id: id(),
      owner: w.owner,
      kind,
      ...(ctx.venueId
        ? { venueId: venue.id, relayId: `place-relay:${venue.id}` }
        : {}),
      ...fields,
    };
    w.objects.unshift(o);
    objectId = o.id;
    return o;
  };
  const signer = () => {
    if (!w.identity.signedIn) fail("Sign in before approving this action.");
    if (w.identity.signer !== "demo-connected")
      fail("Connect your demo signer before approving this action.");
    if (w.identity.relayState === "offline")
      fail(
        "You’re offline. Keep this as a draft and reconnect before sending.",
      );
  };
  try {
    if(['nostr.sign','nostr.publish','nostr.reconcile','nostr.schedule','nostr.previewSchedule','nostr.executeSchedule','nostr.cancelSchedule'].includes(op)){
      if(!ownPrivateAccount(w)||typeof ctx.postId!=='string'||!ctx.postId.trim()||ctx.postId!==ctx.postId.trim()||w.posts.filter(p=>p.id===ctx.postId).length!==1||!post||!canManagePublishingOriginal(w,post)||(ctx.personId&&ctx.personId!==w.owner))fail('Review your own unique current original and publishing permission.');
      if(data.expectedOriginal!==undefined&&data.expectedOriginal!==scheduledOriginal(w,post))fail('The original changed. Review its current contents before approving this action.');
    }
    if(['nostr.source.save','nostr.source.remove','nostr.sources.publish','nostr.relay','identity.choose','identity.signer','identity.recovery'].includes(op)){
      if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)fail('Sign in to manage your own identity and source preferences.');
      if(op==='identity.signer'&&!['Connect','Revoke'].includes(data.state))fail('Choose an explicit signer connection or revocation.');
      if(op==='nostr.relay'&&!['Online','Partial','Offline'].includes(data.state))fail('Choose a valid sample connectivity state.');
      if(op==='nostr.sources.publish'&&!nostrPublicIdReadable(w.identity.publicId))fail('Review your public identity before approving this list.');
    }
    if(['object.create','object.update','object.delete'].includes(op)&&[data.kind,obj?.kind,...w.objects.filter(o=>o.id===ctx.objectId).map(o=>o.kind)].some(k=>['nostr-relay','nostr-relay-list'].includes(String(k))))fail('Use the original relay preferences and separately reviewed public list.');
    if(['object.create','object.update','object.delete'].includes(op)&&[data.kind,obj?.kind,...w.objects.filter(o=>o.id===ctx.objectId).map(o=>o.kind)].some(k=>['community-commercial-terms','community-commercial-tier','community-commercial-application','community-commercial-payment'].includes(String(k))))fail('Use the original Circle commercial purpose and reviewed plan actions.');
    if(['object.create','object.update','object.delete'].includes(op)&&[data.kind,obj?.kind,...w.objects.filter(o=>o.id===ctx.objectId).map(o=>o.kind)].some(k=>k==='community-membership-preview'))fail('Use the original community membership and its separate application, payment, period and invoice reviews.');
    if(["object.create","object.update","object.delete"].includes(op)&&[data.kind,obj?.kind,...w.objects.filter(o=>o.id===ctx.objectId).map(o=>o.kind)].some(k=>k==='event-ticket-order-preview'))fail('Use the original ticket order and its reviewed payment, invoice and refund actions.');
    if(op.startsWith('wallet.')){
      if(!w.identity.signedIn)fail('Sign in before changing your own wallet or payment.');
      if(!wallet||w.wallets.filter(source=>source.id===wallet.id).length!==1)fail('Select one unique original wallet source.');
      const originals=ctx.objectId?w.payments.filter(payment=>payment.id===ctx.objectId):[];
      if(originals.length>1||originals.length===1&&originals[0].owner!==w.owner)fail('Open your own unique original payment.');
      if(originals.length===1&&w.wallets.filter(source=>source.id===originals[0].walletId).length!==1)fail('The original payment source is unavailable or ambiguous.');
    }
    if(["object.create","object.update","object.delete"].includes(op)&&[obj?.kind,data.kind,...w.objects.filter(o=>o.id===ctx.objectId).map(o=>o.kind)].some(k=>["personal-mesh-source","personal-mesh-preview","personal-document-import","personal-chess-game","personal-community-query","personal-recommendation-result","private-contact-report","personal-image-result","personal-webtool","private-matching-preference","grocery-delivery-preview","flight-reservation-preview","flight-checkin-result","flight-seat-payment-preview","personal-creative-preview","address-book-source","address-book-query","media-summary-preview","mailbox-source-preview","mailbox-search-result","mailbox-reply-result","personal-decision-preview","personal-budget","personal-receipt","private-music-source","private-music-workspace","smart-home-preview","smart-home-source-preview","link-reputation","housing-watch-result","mail-alias-account-preview","mail-alias-workspace","emergency-access-preview","emergency-manager-source-preview","private-qr-result","care-recipient-preview","pet-care-profile-preview","care-event-preview","pet-care-event-preview","pet-device-grant-preview","pet-device-read-preview","week-meals-preview","personal-inventory-item","personal-pantry-product","personal-photo-archive","leisure-discovery-preview","private-voice-workspace","private-audio-original","learning-preview","household-list-preview","personal-diagram-preview","book-discovery","trip-specialist-preview","parcel-tracking-preview","repair-claim-preview"].includes(String(k))))fail("Use your original learning or shared-list workflow and its current personal review.");
    if(["object.create","object.update","object.delete"].includes(op)&&([obj?.kind,data.kind].includes("recipe-planning-preview")||w.objects.some(o=>o.id===ctx.objectId&&o.kind==="recipe-planning-preview")))fail("Use your original recipe, pantry and shopping review. Generic edits cannot replace its sources or task.");
    if(["object.create","object.update","object.delete"].includes(op)&&[obj?.kind,data.kind,...w.objects.filter(o=>o.id===ctx.objectId).map(o=>o.kind)].some(k=>["pdf-form-preview","private-epub-job-preview","epub-copy-permission-preview"].includes(String(k))))fail("Use your exact private file and permission workflow. Generic edits cannot forge file results or export rights.");
    if(["object.create","object.update","object.delete"].includes(op)&&[obj?.kind,data.kind,...w.objects.filter(o=>o.id===ctx.objectId).map(o=>o.kind)].some(k=>["shared-expenses-preview","shared-expense-preview","shared-expense-repayment-note-preview"].includes(String(k))))fail("Use your original expense group and reviewed allocation workflow.");
    if(["object.create","object.update","object.delete"].includes(op)&&(obj?.kind==='personal-content-collection-preview'||data.kind==='personal-content-collection-preview'))fail("Use your original personal collection and its exact action review.");
    if(["object.create","object.update","object.delete"].includes(op)&&(obj?.kind==='nostr-interaction'||data.kind==='nostr-interaction'))fail("Use the original public interaction and its delivery review.");
    if(["object.create","object.update","object.delete"].includes(op)&&(obj?.kind==='agent-task'||data.kind==='agent-task'||'fitnessAnalysis' in data||w.objects.some(o=>o.id===ctx.objectId&&o.kind==='agent-task')))fail('Use the original Chuck task and its reviewed result workflow. Generic edits cannot forge task sources, approval or analysis results.');
    if(["object.create","object.update","object.delete"].includes(op)&&(obj?.kind==='event'&&(obj.seriesId||obj.seriesOccurrence)||data.kind==='event'&&(data.seriesId||data.recurring==='Yes')||obj?.kind==='event'&&(data.seriesId||data.seriesOccurrence)))fail('Use the exact series and occurrence review. Generic edits cannot replace its dates, responses or host authority.');
    if(["object.create","object.update","object.delete"].includes(op)&&(["venue-setup","operator-application"].includes(String(obj?.kind))||["venue-setup","operator-application"].includes(data.kind)))fail("Use the independent Spot setup workflow. CRAYS franchises are managed through crays.pro and their authorised SaaS.");
    if(["object.create","object.update","object.delete"].includes(op)&&([obj?.kind,data.kind].some(k=>['paid-conversation','paid-service-message','entitlement-payment','trial-link','creator-access'].includes(String(k)))||w.objects.some(o=>o.id===ctx.objectId&&['paid-conversation','paid-service-message','entitlement-payment','trial-link','creator-access'].includes(String(o.kind)))))fail("Use the original purchased-service workflow. Generic edits cannot create or erase payment applications, scoped acceptance or messages.");
    if(["object.create","object.update","object.delete"].includes(op)&&(obj?.kind==="order"||data.kind==="order"))fail("Use the original order workflow; a generic edit cannot create a merchant reply, quote or fulfilment.");
    if(["wallet.submit","wallet.reconcile","wallet.refund"].includes(op)&&w.payments.some(p=>p.id===ctx.objectId&&p.owner===w.owner&&p.merchantCheckout))fail("Use this original merchant-provider checkout. It must not debit or refund a CRAYS wallet balance.");
    if(op.startsWith("order.")||op.startsWith("creator.offer.")){
      if(w.identity.signedIn!==true||typeof w.owner!=="string"||!w.owner.trim()||w.owner!==w.owner.trim()||!Object.hasOwn(w.profiles,w.owner)||(ctx.personId&&ctx.personId!==w.owner))fail("Sign in to review your own original orders and offers.");
      if(ctx.objectId&&(w.objects.filter(o=>o.id===ctx.objectId).length!==1||!obj||obj.owner!==w.owner))fail("Review the exact unique original in your own account.");
    }
    if(op.startsWith("complete.trip.")&&ctx.objectId&&w.objects.some(o=>o.id===ctx.objectId&&o.owner===w.owner&&o.kind==="trip-plan"&&o.sourceTaskOrigin==="travel"))fail("Open this trip through its original travel task. Its original store controls changes.");
    if (ctx.relayId && ctx.venueId && ctx.relayId !== `place-relay:${venue.id}`)
      fail(
        "This relay belongs to another Place. Return to the original context.",
      );
    if(obj?.kind==="booking"&&obj.bookingType==="travel"&&!op.startsWith("complete.travel."))fail("Use this travel booking’s original review to retain its selected option, terms and status.");
    if(["object.create","object.update","object.delete"].includes(op)&&([obj?.kind,data.kind].some(kind=>typeof kind==="string"&&/^(web-call-link$|web-group-call$|venue-hours-preview$|venue-perk$|perk-receipt$|spot-community-evidence-preview$|venue-review$|conversation-note-preview$|crays-fee-statement$|merchant-payment-acceptance$|partner-|referral-guest-|wearable-|recipe-|training-|fitness-|award-preview-|award-report-result-preview$|rgb-content-transfer-preview$|nft-|instagram-import-|assessment-permission$|assessment$|circle-participant$|circle-request$|circle-invitation$|circle-history-grant$|circle-role-grant$|visit-journey-preview$|event-series$|group-message$|group$|artist-nft-|public-creator-offer$|creator-offer$|license$|meal-diary-preview$)/.test(kind))||w.objects.some(o=>o.owner===w.owner&&o.id===ctx.objectId&&typeof o.kind==="string"&&/^(web-call-link$|web-group-call$|venue-hours-preview$|venue-perk$|perk-receipt$|spot-community-evidence-preview$|venue-review$|conversation-note-preview$|crays-fee-statement$|merchant-payment-acceptance$|partner-|referral-guest-|wearable-|recipe-|training-|fitness-|award-preview-|award-report-result-preview$|rgb-content-transfer-preview$|nft-|instagram-import-|assessment-permission$|assessment$|circle-participant$|circle-request$|circle-invitation$|circle-history-grant$|circle-role-grant$|visit-journey-preview$|event-series$|group-message$|group$|artist-nft-|public-creator-offer$|creator-offer$|license$|meal-diary-preview$)/.test(o.kind))))fail("Use this original private workflow; generic edits cannot create, change or erase its consent, assignment, financial history or authority.");
    if(["object.create","object.update","object.delete"].includes(op)&&([obj?.kind,data.kind].some(kind=>typeof kind==="string"&&/^(account-closure|account-closure-review|security-pause-preview|security-report|relay-migration|device|recovery-review|permission)$/.test(kind))||w.objects.some(o=>o.owner===w.owner&&o.id===ctx.objectId&&/^(account-closure|account-closure-review|security-pause-preview|security-report|relay-migration|device|recovery-review|permission)$/.test(String(o.kind)))))fail("Use the original account protection review; its records cannot be forged or rewritten through generic controls.");
    if(op==="object.update"&&obj?.kind==="delegation"&&obj.status==="paused-by-security"&&data.status&&data.status!==obj.status)fail("Review the original paused delegation before changing its access; no automatic security restoration.");
    if(["object.create","object.update","object.delete"].includes(op)&&(obj?.linkReputationId||data.linkReputationId||w.objects.some(o=>o.id===ctx.objectId&&o.linkReputationId)))fail("Use the exact original link-check permission and its personal review.");
    if(["object.create","object.update","object.delete"].includes(op)&&(obj?.personalImageSource||data.personalImageSource||w.objects.some(o=>o.id===ctx.objectId&&o.personalImageSource)))fail('Use the exact private image original. Generic edits cannot replace its source binding.');
    let reviewedRecommendation:RecommendationHandoff|undefined;
    if(['contacts.request','complete.appointment.save'].includes(op)&&ctx.recommendationHandoff){let h:RecommendationHandoff|undefined;try{h=JSON.parse(ctx.recommendationHandoff);}catch{fail('Review this exact recommendation again.');}if(!h||!recommendationHandoffCurrent(w,h)||op==='contacts.request'&&(h.personId!==ctx.personId||h.purpose!==data.purpose||h.venueId!==ctx.venueId))fail('The recommendation, person, purpose or source permission changed. Review again.');if(op==='complete.appointment.save'){let draft;try{draft=JSON.parse(data.draft);}catch{fail('Review the exact meeting draft.');}if(!canDirectMessage(w,h!.personId)||!Array.isArray(draft.participants)||!draft.participants.some((p:{id:string})=>p.id===h!.personId))fail('Keep the separately accepted exact person in this meeting proposal.');}reviewedRecommendation=h;}
    const recommendationSource=reviewedRecommendation?{owner:w.owner,recommendationId:reviewedRecommendation.recommendationId,version:reviewedRecommendation.recommendationVersion,review:reviewedRecommendation.review,personId:reviewedRecommendation.personId,purpose:reviewedRecommendation.purpose,venueId:reviewedRecommendation.venueId,sourceTaskId:reviewedRecommendation.sourceTaskId}:undefined;
    if(['object.create','object.update','object.delete'].includes(op)&&(Object.hasOwn(data,'recommendationSource')||w.objects.some(o=>o.id===ctx.objectId&&o.recommendationSource)))fail('Use this original introduction or appointment. Generic edits cannot replace its recommendation source.');
    if(['object.create','object.update','object.delete'].includes(op)&&(Object.hasOwn(data,'archiveImportSource')||w.objects.some(o=>o.id===ctx.objectId&&o.archiveImportSource)))fail('Use this exact imported document and its source permission. Generic edits cannot detach its import marker.');
    if(op==='personal.document-import.complete')return personalDocumentImportCompleteBridge(w,op,data,ctx,act);
    if(op==='personal.image.media.save'||op==='personal.image.publication.save')return personalImageBridge(w,op,data,ctx,act);
    if(['object.create','object.update','object.delete'].includes(op)&&(data.bookingType==='restaurant'||Object.hasOwn(data,'restaurantPreview')||Object.hasOwn(data,'restaurantPrepayment')||w.objects.some(o=>o.id===ctx.objectId&&(o.bookingType==='restaurant'||Object.hasOwn(o,'restaurantPreview')||Object.hasOwn(o,'restaurantPrepayment')))))fail('Use the exact restaurant booking or prepayment original; generic edits cannot forge or detach it.');
    if(['object.create','object.update','object.delete'].includes(op)&&(['contact-introduction','contact-import'].includes(data.kind)||Object.hasOwn(data,'mailDelivery')||w.objects.some(o=>o.id===ctx.objectId&&(['contact-introduction','contact-import'].includes(String(o.kind))||Object.hasOwn(o,'mailDelivery')))))fail('Use the exact introduction and its personally reviewed delivery; generic edits cannot forge consent or mail receipts.');
    const stayReferences=[ctx.objectId,ctx.sourceId,data.sourceId,data.catalogueServiceReviewId].filter(Boolean);
    const stayTargets=w.objects.filter(o=>stayReferences.includes(o.id));
    const stayOriginal=stayTargets.some(o=>o.clubStay||(o.catalogueServiceSnapshot as {stay?:unknown}|undefined)?.stay||(o.kind==='catalogue-service-review'&&(o.sourceSnapshot as {stay?:unknown}|undefined)?.stay));
    const stayPayload=['clubStay','catalogueServiceSnapshot','catalogueServiceRequestSnapshot','catalogueServiceReviewId'].some(key=>Object.hasOwn(data,key))||data.bookingType==='club-stay';
    if((op.startsWith('booking.')&&(stayOriginal||stayPayload))||(['object.create','object.update','object.delete'].includes(op)&&(stayOriginal||stayPayload||data.kind==='catalogue-service-review')))fail('Use this exact room-stay review and its labelled response. Generic edits cannot change its dates, source or status.');
    if(['object.create','object.update','object.delete'].includes(op)&&(data.kind==='app-action'||w.objects.some(o=>o.id===ctx.objectId&&o.kind==='app-action')))fail('Review this original app request through its exact account and permission controls. Generic edits cannot change it.');
    const completion = applyCommercialPayment(w,op,data,ctx) || applyCommercialApplication(w,op,data,ctx) || applyCommunityCommercial(w,op,data,ctx) || applyCommunityMembership(w,op,data,ctx) || applyCommunityCalendar(w,op,data,ctx) || applyEventTicketJourney(w,op,data,ctx) || applyIntroductionMail(w,op,data,ctx) || applyRestaurantBooking(w,op,data,ctx) || applyPersonalMesh(w,op,data,ctx) || applyPersonalDocumentImport(w,op,data,ctx) || applyPersonalChess(w,op,data,ctx) || applyPersonalCommunityQuery(w,op,data,ctx) || applyPersonalRecommendations(w,op,data,ctx) || applyPersonalContactBoundary(w,op,data,ctx) || applyPersonalImageJourney(w,op,data,ctx) || applyPersonalWebtool(w,op,data,ctx) || applyMatchingPreference(w,op,data,ctx) || applyGroceryDelivery(w,op,data,ctx) || applyFlightCheckin(w,op,data,ctx) || applyPersonalCreative(w,op,data,ctx) || applyAddressBook(w,op,data,ctx) || applyMediaSummary(w,op,data,ctx) || applyMailboxJourney(w,op,data,ctx) || applyPersonalBudget(w,op,data,ctx) || applyPersonalDecision(w,op,data,ctx) || applyMusic(w,op,data,ctx) || applySmartHome(w,op,data,ctx) || applyLinkReputation(w,op,data,ctx) || applyHousingWatch(w,op,data,ctx) || applyMailAliases(w,op,data,ctx) || applyEmergencyAccess(w,op,data,ctx) || applyQrCapability(w,op,data,ctx) || applyCareLog(w,op,data,ctx) || applyWeekMeals(w,op,data,ctx) || applyLeisure(w,op,data,ctx) || applyPersonalInventory(w,op,data,ctx) || applyPersonalPantry(w,op,data,ctx) || applyPersonalPhotoArchive(w,op,data,ctx) || applyPrivateVoice(w,op,data,ctx) || applyBookDiscovery(w,op,data,ctx) || applyTripSpecialists(w,op,data,ctx) || applyParcelTracking(w,op,data,ctx) || applyRepairClaims(w,op,data,ctx) || applyPersonalDiagram(w,op,data,ctx) || applyLearningJourney(w,op,data,ctx) || applyHouseholdLists(w,op,data,ctx) || applyPdfFormJourney(w,op,data,ctx) || applyPrivateEpub(w,op,data,ctx) || applySharedExpenses(w,op,data,ctx) || applyOrderPreparationRecovery(w,op,data,ctx) || applyPersonalContentCollections(w,op,data,ctx) || applyPublicInteraction(w,op,data,ctx) || applyFitnessAnalysis(w,op,data,ctx) || applyStoreShippingPreview(w,op,data,ctx) || applyMerchantReturnPreview(w,op,data,ctx) || applyMerchantInvoicePreview(w,op,data,ctx) || applyPickupPreflight(w,op,data,ctx) || applyOrderPickupPreview(w,op,data,ctx) || applyMerchantCheckout(w,op,data,ctx) || applyCommerceOrderPreview(w,op,data,ctx) || applyVenueHours(w,op,data,ctx) || applyVenuePerks(w,op,data,ctx) || applySpotCommunityEvidence(w,op,data,ctx) || applyCraysFeeSettlement(w,op,data,ctx) || applyMerchantAcceptance(w,op,data,ctx) || applyConversationNotes(w,op,data,ctx) || applyContactContext(w,op,data,ctx) || applyCoachingEvidence(w,op,data,ctx) || applyFitnessCoaching(w,op,data,ctx) || applyFitnessChallenges(w,op,data,ctx) || applyFitnessMedia(w,op,data,ctx) || applyFitnessProgress(w,op,data,ctx) || applyAccountClosure(w,op,data,ctx) || applyDeviceRecovery(w,op,data,ctx) || applyAccountProtection(w,op,data,ctx) || applyDemoSignIn(w,op,data,ctx) || applyPartnerFinanceJourney(w,op,data,ctx) || applyReferralGuestJourney(w,op,data,ctx) || applyAmbassadorJourney(w,op,data,ctx) || applyWearableJourney(w,op,data,ctx) || applyTrainingJourney(w,op,data,ctx) || applyRecipeIntake(w,op,data,ctx) || applyMealPhotoJourney(w,op,data,ctx) || applyRecipeWorkspace(w,op,data,ctx) || applyNutritionJourney(w,op,data,ctx) || applyEcosystemMembership(w,op,data,ctx) || applyChuckModelAccount(w,op,data,ctx) || applyPdfQuestions(w,op,data,ctx) || applyArticleExplanation(w,op,data,ctx) || applyPersonalNewsDigest(w,op,data,ctx) || applySourceComparison(w,op,data,ctx) || applyResearchExecution(w,op,data,ctx) || applyPublicResearch(w,op,data,ctx) || applyPersonalDeadlines(w,op,data,ctx) || applyPrivateDocuments(w,op,data,ctx) || applyDocumentSourcePreview(w,op,data,ctx) || applyPersonalNotes(w,op,data,ctx) || applyNoteMemory(w,op,data,ctx) || applyPersonalHabits(w,op,data,ctx) || applyPersonalOccasions(w,op,data,ctx) || applyOccasionMessages(w,op,data,ctx) || applyOccasionContactPreview(w,op,data,ctx) || applyPersonalChecklists(w,op,data,ctx) || applyAppointmentPlanner(w,op,data,ctx) || applyCalendarSourcePreview(w,op,data,ctx) || applyWeekPlanner(w,op,data,ctx) || applyTravelSourcePreview(w,op,data,ctx) || applyTravelComparisons(w, op, data, ctx) || applyTripPlanner(w, op, data, ctx) || applyDayAgenda(w, op, data, ctx) || applyVenueCatalogue(w, op, data, ctx) || applyCatalogueServiceBooking(w, op, data, ctx, (world,payload,context)=>act(world,"booking.create",payload,context)) || applyCompletionAction(w, op, data, ctx, {
      mayRead,
      hasCreatorMembership,
      mayPurchaseCreatorOffer,
    });
    if (completion) {
      objectId = completion.objectId;
      message = completion.message;
      if(op==='complete.appointment.save'&&recommendationSource){const plan=w.objects.find(o=>o.id===objectId&&o.owner===w.owner&&o.kind==='appointment-plan');if(!plan||plan.recommendationSource&&JSON.stringify(plan.recommendationSource)!==JSON.stringify(recommendationSource))fail('Keep this appointment’s original recommendation source.');plan!.recommendationSource=recommendationSource;}
    } else if (op === "profile.social-links.save") {
      if(!w.identity.signedIn)fail("Sign in to edit your own public profile links.");
      if(ctx.personId && ctx.personId!==w.owner)fail("You can only edit your own profile links.");
      const existing=w.objects.find(o=>o.kind==="profile-social-links"&&o.personId===w.owner);
      let links;
      try{links=creatorLinksFromDraft(data,profilePublicLinks(w.objects,w.owner));}catch(error){fail(error instanceof Error?error.message:"Review your profile links.");}
      const fields={personId:w.owner,links,status:"published-demo",audience:"Public"};
      if(existing){Object.assign(existing,fields);objectId=existing.id;}else create("profile-social-links",fields);
      message="Your chosen public profile links were saved in this demo. No account was connected or Nostr event sent.";
    } else if (op === "profile.save") {
      if(w.identity.signedIn!==true||typeof w.owner!=='string'||!w.owner.trim()||!Object.hasOwn(w.profiles,w.owner)||(ctx.personId&&ctx.personId!==w.owner))fail("Sign in to edit your own original profile.");
      const allowed=['name','username','bio','photo','birthDate','gender','smoking','alcohol','interests','growth','hobbies','prompt','answer','height','phone','whatsapp','socialLinks','businessContact','linkedin'];
      if(!allowed.includes(data.field||'bio')||typeof data.value!=='string')fail("Choose an existing profile field and a text value.");
      const profile = w.profiles[w.owner];
      const field = data.field || "bio";
      if (
        field === "username" &&
        (!/^[a-zA-Z][a-zA-Z0-9_]{2,24}$/.test(data.value) ||
          data.value === "taken")
      )
        fail(
          "Choose an available username with 3–25 letters, numbers or underscores.",
        );
      if (
        field === "birthDate" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(data.value) || !Number.isFinite(Date.parse(data.value)) || new Date(data.value).toISOString().slice(0,10)!==data.value || new Date(data.value).getTime() > Date.now())
      )
        fail("Choose a valid date of birth.");
      profile[field] = data.value;
      message = "Saved to your private profile. Sharing choices are unchanged.";
      objectId = w.owner;
    } else if (op === "profile.publish") {
      if(w.identity.signedIn!==true||typeof w.owner!=='string'||!w.owner.trim()||!Object.hasOwn(w.profiles,w.owner)||(ctx.personId&&ctx.personId!==w.owner))fail("Sign in to share your own original profile.");
      if(!['Public','Community','Private'].includes(data.audience))fail("Choose Public, Community or Private.");
      w.profiles[w.owner].visibility = data.audience || "Public";
      message =
        "Your selected profile fields are shared in this demo. Private fields remain private.";
      objectId = w.owner;
    } else if (op === "identity.choose") {
      if (!["New identity", "Existing identity"].includes(data.mode))
        fail("Choose a new or existing Nostr identity.");
      if (data.mode === "Existing identity" && data.signerConfirmed !== "Yes")
        fail(
          "Approve the external demo signer connection first. Never enter a secret key.",
        );
      w.identity.publicId =
        data.mode === "New identity"
          ? "New demo Nostr identity — not a real key"
          : "Existing demo Nostr identity — not a real key";
      w.identity.signer =
        data.mode === "Existing identity" ? "demo-connected" : "locked";
      message =
        "Demo identity choice saved. Wallets, paid rights and private chat history were not imported.";
    } else if (op === "identity.signer") {
      w.identity.signer =
        data.state === "Revoke" ? "revoked" : "demo-connected";
      message =
        data.state === "Revoke"
          ? "Demo signer access revoked. No new actions can be signed."
          : "Demo signer connected. No real keys are requested or used.";
    } else if (op === "identity.recovery") {
      // Legacy summary is not proof of restoring separate identity/chat/wallet sources.
      w.identity.recovery = data.state === "Restore" ? "partial" : "backup-reviewed";
      message =
        w.identity.recovery === "partial"
          ? "Some history or proofs are missing. Full recovery cannot be claimed."
          : "Demo recovery state updated. Nostr, chat and wallet backups remain separate.";
    } else if (op === "contact.scan") {
      const parts = (data.code || "").split(":");
      if (
        parts.length !== 5 ||
        parts[0] !== "CRAYS-DEMO" ||
        parts[1] !== "CONTACT"
      )
        fail(
          "This is not a recognised contact QR. Place and payment codes are different.",
        );
      const target = w.people.find((p) => p.id === parts[2]);
      const place = w.venues.find((v) => v.id === parts[3]);
      if (!target || !place || parts[4] !== "sample" || target.id === w.owner)
        fail("The contact code is unavailable or refers to your own account.");
      if (
        !sharedPlaceIds(w, target).includes(place.id) ||
        !(place.relayJoined ?? place.visited) ||
        !["active", "provisional"].includes(place.membership)
      )
        fail(
          "A shared, permitted Place community is required for this connection.",
        );
      const scan = create("connection-scan", {
        name: target.name,
        personId: target.id,
        venueId: place.id,
        relayId: place.relay,
        codeRef: data.code,
        status: "review-required",
      });
      objectId = scan.id;
      message =
        "Person and shared Place found. Review before connecting. Scanning has not added a VIF.";
    } else if (op === "contact.confirm") {
      if (!obj || obj.kind !== "connection-scan")
        fail("Review the scanned contact first.");
      const target = w.people.find((p) => p.id === obj.personId);
      if (
        !target ||
        !sharedPlaceIds(w, target).includes(String(obj.venueId)) ||
        !canStartVif(w, target) ||
        target.blocked
      )
        fail(
          "This connection is no longer available in your shared communities.",
        );
      target.consentSelf = true;
      target.request = target.consentOther ? "accepted" : "sent";
      target.contact = target.consentSelf && target.consentOther;
      obj.status = target.contact ? "connected" : "awaiting-other-person";
      objectId = target.id;
      message = target.contact
        ? "Connected. Your private conversation is ready."
        : "Your connection request is ready. Waiting for the other person’s agreement.";
    } else if (op === "contacts.publicIntroduction") {
      if (!person || person.blocked || !data.text?.trim())
        fail(
          "Choose the exact person and review your introduction text first.",
        );
      const introduction = create("targeted-introduction", {
        personId: person.id,
        name: `Introduction to ${person.name}`,
        text: data.text.trim(),
        purpose: data.purpose || "Business",
        status: "approved",
        sourceId: ctx.sourceId || "public-chuck-brief",
        membershipRequired: "Free Chuck for both people",
      });
      person.publicIntroductionId = introduction.id;
      objectId = introduction.id;
      message =
        "Introduction prepared. Both people must join free Chuck and approve before a VIF chat opens. Nothing has been sent externally.";
    } else if (op === "contacts.previewChuckMembership") {
      if (!person || !person.publicIntroductionId || data.confirmed !== "Yes")
        fail(
          "Prepare the specific introduction before previewing membership confirmation.",
        );
      for (const id of [w.owner, person.id])
        if (
          !w.objects.some(
            (o) =>
              o.kind === "chuck-membership" &&
              o.personId === id &&
              o.status === "active",
          )
        )
          create("chuck-membership", {
            personId: id,
            name: "Free Chuck membership",
            status: "active",
            evidence:
              "Explicit fictional onboarding preview, not a real member registration",
          });
      objectId = person.publicIntroductionId;
      message =
        "Demo only: both people have joined free Chuck. Their connection consent is still required. No badge, payment or Spot was granted.";
    } else if (op === "contacts.request") {
      if (!person || person.blocked || person.blockedByOther)
        fail("This person is unavailable.");
      if (person.request === "declined")
        fail(
          "This introduction was declined. Do not repeat it through another purpose or channel.",
        );
      if (person.request === "sent")
        fail(
          "This introduction is already waiting. No second request was created.",
        );
      const purpose = data.purpose || "Socializing";
      const prepared = w.objects.find(
        (o) =>
          o.id === person.publicIntroductionId &&
          o.owner === w.owner &&
          o.kind === "targeted-introduction",
      );
      if (
        prepared &&
        ((data.text && data.text.trim() !== prepared.text) ||
          (data.purpose && data.purpose !== prepared.purpose))
      )
        fail(
          "The prepared introduction changed. Review and approve the exact text and purpose again.",
        );
      if (
        person.requestsEnabled === false ||
        !(person.requestPurposes || ["Socializing", "Business"]).includes(
          purpose,
        )
      )
        fail("This person is not accepting requests for that purpose.");
      if (!canStartVif(w, person))
        fail(
          "Use a shared Spot you have both joined, or a specific Chuck introduction after both people join free Chuck. Following or buying alone does not open a VIF chat.",
        );
      if (data.purpose === "Dating" && data.optIn !== "Yes")
        fail("Dating requires your explicit, separate opt-in.");
      const request = create("contact-introduction", {
        name: `Introduction to ${person.name}`,
        ...(recommendationSource?{recommendationSource}:{}),
        personId: person.id,
        senderId: w.owner,
        recipientId: person.id,
        purpose,
        text: data.text?.trim() || String(prepared?.text || ""),
        sourceId: person.publicIntroductionId || ctx.sourceId || "shared-space",
        sourceMethod: person.publicIntroductionId
          ? "targeted-public-introduction"
          : "shared-space",
        sharedSpaceIds: sharedPlaceIds(w, person),
        ...(!person.publicIntroductionId&&ctx.venueId&&sharedPlaceIds(w,person).includes(ctx.venueId)?{originVenueId:ctx.venueId}:{}),
        status: "sent",
        selfConsent: true,
        otherConsent: false,
        createdAt: stamp(),
      });
      person.requestId = request.id;
      person.requestDirection = "outgoing";
      person.purpose = purpose;
      person.request = "sent";
      person.consentSelf = true;
      person.consentOther = false;
      objectId = person.id;
      message =
        "Introduction prepared with your consent. Waiting for the other person.";
    } else if (op === "contacts.respond") {
      if (!w.identity.signedIn) fail("Sign in to review your own contact.");
      if (!person || !ctx.personId || w.people.filter(p=>p.id===ctx.personId).length!==1) fail("Open one exact person in your account.");
      if (!["Block","Decline","Accept"].includes(data.response)) fail("Choose a named contact response.");
      if (data.response === "Block") {
        person.blocked = true;
        person.contact = false;
        person.request = "declined";
        person.consentSelf = false;
        person.consentOther = false;
        for (const grant of w.objects.filter(
          (o) =>
            o.owner === w.owner && o.kind === "permission" && o.channelId === `person:${person.id}`,
        ))
          grant.status = "revoked";
        message =
          "Blocked in your account. Independent identities and other groups are unaffected.";
      } else if (data.response === "Decline") {
        person.request = "declined";
        person.contact = false;
        person.consentSelf = false;
        person.consentOther = false;
        message = "Request declined. No private chat was opened.";
      } else {
        if (person.blocked || (!person.contact && !canStartVif(w, person)))
          fail(
            "Join a shared Spot, or both join free Chuck for this specific introduction, before accepting a new VIF connection.",
          );
        person.consentSelf = true;
        person.request = person.consentOther ? "accepted" : "sent";
        person.contact = person.consentSelf && person.consentOther;
        message = person.contact
          ? "Both people have agreed. Your private conversation is ready."
          : "Your consent is saved. Still waiting for the other person.";
      }
      objectId = person.id;
    } else if (op === "contacts.otherConsent") {
      if (!person) fail("Person not found.");
      if (person.request !== "sent")
        fail(
          "There is no current outgoing request awaiting that person’s response.",
        );
      if (
        data.response === "Accept" &&
        (person.blocked || (!person.contact && !canStartVif(w, person)))
      )
        fail(
          "Consent needs a shared active Spot or this specific introduction with both people enrolled in free Chuck.",
        );
      person.consentOther = data.response === "Accept";
      person.contact = person.consentSelf && person.consentOther;
      person.request = person.contact
        ? "accepted"
        : data.response === "Decline"
          ? "declined"
          : "sent";
      message = person.contact
        ? "Sample other-side consent received. Both approvals are now present."
        : "The sample other person declined. No connection was created.";
      const request = w.objects.find(
        (o) =>
          o.id === person.requestId &&
          o.owner === w.owner &&
          o.kind === "contact-introduction",
      );
      if (request) {
        request.status = person.request;
        request.otherConsent = person.consentOther;
        request.updatedAt = stamp();
      }
      objectId = person.id;
    } else if (op === "contacts.withdraw") {
      if (!person || person.request !== "sent")
        fail("There is no outgoing request to withdraw.");
      person.request = "withdrawn";
      const request = w.objects.find(
        (o) =>
          o.id === person.requestId &&
          o.owner === w.owner &&
          o.kind === "contact-introduction",
      );
      if (request) {
        request.status = "withdrawn";
        request.updatedAt = stamp();
      }
      person.consentSelf = false;
      person.consentOther = false;
      person.contact = false;
      objectId = person.id;
      message =
        "Request withdrawn. No VIF chat opened and Chuck will not repeat it automatically.";
    } else if (op === "contacts.remove") {
      if (!person) fail("Person not found.");
      person.contact = false;
      person.request = "none";
      person.consentSelf = false;
      person.consentOther = false;
      for (const grant of w.objects.filter(
        (o) => o.owner === w.owner && o.kind === "permission" && o.channelId === `person:${person.id}`,
      ))
        grant.status = "revoked";
      message = "Connection removed. Your public identity is unaffected.";
    } else if (op === "contacts.follow") {
      signer();
      if (!person || person.blocked) fail("Profile unavailable.");
      person.following = !person.following;
      message = person.following
        ? "Following in the demo. Existing follows are retained."
        : "Unfollowed in the demo.";
    } else if (op === "venue.enter" || op === "venue.qr.open") {
      if(!w.identity.signedIn||w.identity.relayState!=="online"||!ctx.venueId||w.venues.filter(v=>v.id===ctx.venueId).length!==1)fail("Choose an exact Spot and reconnect before the fictional local visit.");
      if(op === "venue.qr.open"){
        if(!w.identity.signedIn)fail("Sign in to enter this exact Spot; your selected QR stays available.");
        if(w.identity.relayState!=="online")fail("Reconnect before confirming this Spot entry. No visit was started.");
        if(!ctx.venueId||w.venues.filter(v=>v.id===ctx.venueId).length!==1||!venue||data.exampleCode!==`example:spot:${ctx.venueId}`||!Number.isFinite(Number(data.expiresAt))||Number(data.expiresAt)<=Date.now()||Number(data.expiresAt)>Date.now()+120000)fail("This sample QR is unknown or expired. Ask this Spot for a new code.");
      }
      if (!venue.operatorActive || venue.membership === "suspended")
        fail("This Spot is not currently available to you.");
      w.activeVenueId = venue.id;
      venue.relayJoined = true;
      beginSamplePresence(venue);
      venue.visited = true;
      venue.membership = "active";
      venue.grant = "Confirmed demo visit";
      objectId = venue.id;
      message =
        "Demo venue context active. Your social visibility stays off until you choose it.";
    } else if (op === "venue.presence") {
      if(data.state === "Renew") {
        if(!w.identity.signedIn||w.identity.relayState!=="online"||!venue.operatorActive||venue.membership==='suspended'||ctx.venueId!==venue.id||data.exampleCode!==`example:spot:${venue.id}`||!Number.isFinite(Number(data.expiresAt))||Number(data.expiresAt)<=Date.now()||Number(data.expiresAt)>Date.now()+120000)fail("Scan a fresh sample QR for this Spot before renewing the fictional local visit.");
        beginSamplePresence(venue);
      } else venue.presence=data.state === "Expire" ? "expired" : "none";
      if (!localPresenceCurrent(w,venue.id))
        Object.keys(venue.visibility).forEach(
          (k) => (venue.visibility[k] = false),
        );
      message =
        venue.presence === "active"
          ? "Local demo context renewed. No fixed production duration is implied."
          : "Local presence ended. Your community and private contacts remain.";
    } else if (op === "venue.visibility") {
      if (!localPresenceCurrent(w,venue.id))
        fail("A current local context is needed to appear here.");
      venue.visibility[data.purpose || "Socializing"] = data.enabled === "Yes";
      message =
        "Visibility changed for this purpose only. Service access is unchanged.";
    } else if (op === "venue.area") {
      if (!localPresenceCurrent(w,venue.id)) fail("Enter this Venue Spot first.");
      venue.area = data.area || "Main space";
      message =
        "Optional area changed; no continuous location tracking is active.";
    } else if (op === "venue.cancelGrant") {
      if (!venue.visited && !venue.otherGrant) {
        venue.membership = "none";
        venue.grant = "Cancelled before first visit";
      }
      message = venue.visited
        ? "The booking is cancelled. Your visited-community membership remains."
        : venue.otherGrant
          ? "Another valid grant preserves community access."
          : "Provisional access ended. Existing private contacts remain.";
    } else if (op === "venue.grant") {
      venue.membership = "provisional";
      venue.grant = data.method || "Invitation";
      venue.otherGrant = data.otherGrant === "Yes";
      message =
        "Provisional demo access recorded. It is not an actual visit or presence.";
    } else if (op === "venue.operatorEnd") {
      venue.operatorActive = false;
      venue.presence = "none";
      message =
        "Venue service ended in this scenario. Private contacts and independent Circles remain.";
    } else if (op === "venue.role") {
      fail("Venue roles cannot be assigned from a guest dropdown. Use separately verified operator or staff permissions; existing role labels stay unchanged.");
    } else if (op === "group.message") {
      if (!obj || !canGroupCommunicate(w, obj.id))
        fail(
          "Current Circle membership and its permitted context are required.",
        );
      if (!data.text?.trim()) fail("Write a message before sending.");
      if(data.attachment&&data.attachment!==chatPhotoExampleName)fail('Review an available local photo example; personal media upload is not connected.');
      create("group-message", {
        ...(data.attachment?{attachment:data.attachment}:{}),
        name: "Circle message",
        text: data.text.trim(),
        ...circleMessageFields(w,obj.id),
        sourceId: obj.id,
        status: "pending-demo",
        chuckIncluded: false,
      });
      message =
        "Saved for this Circle only. No real relay delivery is claimed.";
    } else if (op === "event.respond") {
      if (!obj || obj.kind !== "event")
        fail("Choose this event’s exact occurrence.");
      if (["draft", "cancelled"].includes(String(obj.status)))
        fail("This occurrence is not accepting responses.");
      const place = obj.venueId
        ? w.venues.find((v) => v.id === obj.venueId)
        : undefined;
      if (
        place &&
        (!place.operatorActive ||
          !["active", "provisional"].includes(place.membership))
      )
        fail("Current community access is required for this event.");
      if (place && ctx.venueId && place.id !== ctx.venueId)
        fail("The event belongs to another Place.");
      if (!["Going", "Interested", "Decline"].includes(data.response))
        fail("Choose your response.");
      obj.attendance =
        data.response === "Going"
          ? "requested"
          : data.response === "Interested"
            ? "interested"
            : "declined";
      objectId = obj.id;
      message =
        data.response === "Going"
          ? "Place requested for this occurrence. Reservation, payment and entry are not confirmed."
          : "Your response is updated on the same event.";
    } else if (op === "group.join") {
      const result=applyCircleAccess(w,'join',data,ctx);objectId=result.objectId;message=result.message;
    } else if (op === "group.manage") {
      if(data.action==='Leave'){const result=applyCircleAccess(w,'leave',data,ctx);objectId=result.objectId;message=result.message;}
      else if(data.action==='Approve'||data.action==='Decline'){const result=applyCircleAccess(w,'decide',{...data,admissionId:data.admissionId||data.requestId,decision:data.action},ctx);objectId=result.objectId;message=result.message;}
      else {if(!obj||!circleCanAdmin(w,obj.id)||data.approved!=='Yes'||data.version!==String(obj.circleVersion))fail("Review the exact Circle and current administration before changing its access.");if(!['Open','Request to join','Private'].includes(data.access)||data.role&&data.role!==obj.role)fail("Circle role changes need a separately reviewed assignment, not a role dropdown.");obj.access=data.access;message="Circle access preference updated. Existing members, invitations and history permissions are unchanged.";}
    } else if (op === "group.create") {
      if(!w.identity.signedIn||!data.name?.trim()||!['Open','Request to join','Private'].includes(data.access||'Request to join'))fail("Review a name and supported access for your Circle.");
      const now=Date.now();const group=create("group",{name:data.name.trim(),access:data.access||'Request to join',audience:data.audience||'Community',membership:'active',role:'Admin',venueId:ctx.venueId,history:'From joining only',circleCreatedBy:w.owner,circleCreatedAt:now});
      initialiseCreatedCircle(w,group.id,now);objectId=group.id;message="Circle created with its own administration and history boundary. No other Spot, identity or private-history rights were granted.";
    } else if (op === "nostr.draft") {
      if(!ownPrivateAccount(w)||(ctx.personId&&ctx.personId!==w.owner))fail('Sign in to save your own original draft.');
      if(ctx.postId&&w.posts.filter(p=>p.id===ctx.postId).length!==1)fail('Open the unique original draft.');
      if(data.audience&&!['Public','Community','On-site','Private group'].includes(data.audience))fail('Choose a supported audience for this draft.');
      const text = data.text?.trim();
      if (!text) fail("Write something before saving.");
      const target = (data.audience as Audience) || "Public";
      if (target === "On-site" && !localPresenceCurrent(w,venue.id))
        fail("On-site publishing requires a current local context.");
      if (
        target === "Community" &&
        !["active", "provisional"].includes(venue.membership)
      )
        fail("Join this community through its permitted access path first.");
      if (
        target === "Private group" &&
        !w.objects.some(
          (o) =>
            o.id === data.groupId &&
            o.kind === "group" &&
            o.owner === w.owner &&
            o.membership === "active",
        )
      )
        fail("Choose a private group you are authorised to publish in.");
      if (
        ctx.postId &&
        !w.posts.some(
          (p) =>
            p.id === ctx.postId && p.author === w.owner && p.status === "draft",
        )
      )
        fail(
          "Create a new draft version before changing approved or published content.",
        );
      const existing = ctx.postId
        ? w.posts.find(
            (p) =>
              p.id === ctx.postId &&
              p.author === w.owner &&
              p.status === "draft",
          )
        : undefined;
      const result: Post = existing || {
        id: id(),
        author: w.owner,
        title: data.title || text.slice(0, 50),
        text,
        type: (data.type as Post["type"]) || "note",
        audience: target,
        status: "draft",
        liked: false,
        saved: false,
        reposted: false,
        protected: !!data.access && data.access !== "Free",
        accessModel: data.access || "Free",
        license: false,
        mediaAvailable: true,
        createdAt: stamp(),
        replies: [],
        readPosition: 0,
      };
      Object.assign(result, {
        type: (data.type as Post["type"]) || result.type,
        protected: !!data.access && data.access !== "Free",
        accessModel: data.access || result.accessModel || "Free",
        text,
        title: data.title || result.title,
        audience: target,
        groupId: target === "Private group" ? data.groupId : undefined,
        image: data.image || undefined,
        alt: data.alt || undefined,
        venueId: target === "Public" ? undefined : venue.id,
        parentId: w.posts.some((p) => p.id === ctx.sourceId)
          ? ctx.sourceId
          : undefined,
        rootId:
          w.posts.find((p) => p.id === ctx.sourceId)?.rootId ||
          (w.posts.some((p) => p.id === ctx.sourceId)
            ? ctx.sourceId
            : undefined),
      });
      if (result.type === "poll") {
        const choices = (data.choices || "")
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean);
        if (
          choices.length < 2 ||
          choices.length > 10 ||
          new Set(choices).size !== choices.length
        )
          fail("Give this poll between two and ten different options.");
        result.choices = choices;
      }
      if (!existing) w.posts.unshift(result);
      objectId = result.id;
      message = "Draft saved. No event has been signed or sent.";
    } else if (op === "content.revision") {
      if(!ownPrivateAccount(w)||typeof ctx.postId!=="string"||!ctx.postId.trim()||ctx.postId!==ctx.postId.trim()||w.posts.filter(p=>p.id===ctx.postId).length!==1||!post||!canManagePublishingOriginal(w,post))fail("Sign in and review one unique original with current publishing permission.");
      if (!post || !canManagePublishingOriginal(w,post))
        fail("Review your original content and current publisher permission.");
      if (post.status === "draft")
        fail("Continue the existing draft instead of creating another.");
      const revision = {
        ...structuredClone(post),
        id: id(),
        status: "draft" as Delivery,
        revisionOf: post.id,
        createdAt: stamp(),
        liked: false,
        saved: false,
        reposted: false,
        replies: [],
        archived: false,
      };
      // A revision is a separate original, never the old event or its delivery proof.
      revision.approvedRelayIds = [];
      delete revision.approvedOriginal;
      revision.deliveryRelayIds = [];
      if(revision.publishing){
        delete revision.publishing.eventId;
        delete revision.publishing.receipts;
        delete revision.publishing.storyExpiresAt;
        revision.publishing.revision = 1;
      }
      w.posts.unshift(revision);
      objectId = revision.id;
      message =
        "A separate draft version is ready. The approved original and any existing rights are retained.";
    } else if (op === "content.restore") {
      if(!ownPrivateAccount(w)||!ctx.postId||w.posts.filter(p=>p.id===ctx.postId).length!==1)fail("Sign in and review one unique own original content record.");
      if (!post || !canManagePublishingOriginal(w,post))
        fail("Content is not yours to restore.");
      post.archived = false;
      message =
        "Restored to your content list. No event was re-sent and no publication schedule was restarted.";
    } else if (op === "content.archive") {
      if(!ownPrivateAccount(w)||!ctx.postId||w.posts.filter(p=>p.id===ctx.postId).length!==1)fail("Sign in and review one unique own original content record.");
      if (!post || !canManagePublishingOriginal(w,post))
        fail("Content is not yours to manage.");
      post.archived = true;
      w.objects
        .filter(
          (o) =>
            o.kind === "schedule" &&
            o.postId === post.id &&
            o.owner === w.owner,
        )
        .forEach((o) => (o.status = "revoked"));
      if (post.status === "scheduled") post.status = "draft";
      message =
        "Removed from your own list. Independent relay copies, files and existing licences are unchanged.";
    } else if (op === "content.access") {
      if(!ownPrivateAccount(w)||typeof ctx.postId!=="string"||!ctx.postId.trim()||ctx.postId!==ctx.postId.trim()||w.posts.filter(p=>p.id===ctx.postId).length!==1||!post||!canManagePublishingOriginal(w,post))fail("Sign in and review one unique original with current publishing permission.");
      if (!post || !canManagePublishingOriginal(w,post) || post.status !== "draft")
        fail(
          "Change access on a private draft version, then review publication again.",
        );
      if(data.expectedOriginal!==undefined&&(!data.expectedOriginal||data.expectedOriginal!==contentAccessSnapshot(w,post.id)))fail("This original changed. Keep your draft and review its current settings before saving.");
      const audience = data.audience as Audience;
      if (
        !["Public", "Community", "On-site", "Private group"].includes(audience)
      )
        fail("Choose a supported audience.");
      if(!["Anyone eligible","Community members","Named recipients"].includes(data.purchase))fail("Choose a supported purchase eligibility.");
      if(!["Free","Paid","Valid subscription","Private grant"].includes(data.access))fail("Choose a supported full content access option.");
      const targetVenue = w.venues.find(
        (v) => v.id === (post.venueId || ctx.venueId || w.activeVenueId),
      )!;
      if (
        audience === "Community" &&
        !["active", "provisional"].includes(targetVenue.membership)
      )
        fail("Community membership is required.");
      if (audience === "On-site" && !localPresenceCurrent(w,targetVenue.id))
        fail("Current local context is required.");
      if (
        audience === "Private group" &&
        (!circleCanParticipate(w,data.groupId)||!canGroupCommunicate(w,data.groupId))
      )
        fail("Choose a private group you belong to.");
      if (data.access !== "Free" && !data.preview.trim())
        fail("Keep a public preview separate from the protected original.");
      Object.assign(post, {
        audience,
        venueId: audience === "Public" ? undefined : targetVenue.id,
        groupId: audience === "Private group" ? data.groupId : undefined,
        protected: data.access !== "Free",
        accessModel: data.access,
        purchaseEligibility: data.purchase,
        rightsTerms: data.conditions,
        rightsDuration: data.duration,
        text: data.preview,
        fullText: data.fullText,
      });
      objectId = post.id;
      message =
        "Four separate access settings saved to the draft. No price, payment, signature or licence was created.";
    } else if (op === "media.add") {
      if(!ownPrivateAccount(w))fail("Sign in to manage your own original media files.");
      if (data.rights !== "Yes")
        fail("Confirm your permission to use this file before adding it.");
      if(ctx.postId&&w.posts.filter(p=>p.id===ctx.postId).length!==1)fail("Choose one unique original content draft for this file.");
      if (ctx.postId && post?.status !== "draft")
        fail(
          "Prepare a new draft version before attaching files to published content.",
        );
      if (ctx.postId && (!post || post.author !== w.owner))
        fail("Choose your own content for this file.");
      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
          "video/mp4",
          "audio/mpeg",
          "audio/mp4",
          "application/pdf",
          "text/plain",
        ].includes(data.mime) ||
        !data.dataUrl.startsWith(`data:${data.mime};base64,`)
      )
        fail("Unsupported or mismatched local file.");
      const encoded=data.dataUrl.slice(data.dataUrl.indexOf(',')+1),declaredSize=Number(data.size);
      let decodedSize=-1;
      if(encoded.length<=14*1024*1024&&encoded.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)){
        try{const decoded=atob(encoded);if(btoa(decoded)===encoded)decodedSize=decoded.length;}catch{}
      }
      if(!Number.isSafeInteger(declaredSize)||declaredSize<0||declaredSize>10*1024*1024||decodedSize!==declaredSize)fail("Choose a valid local original up to 10 MB with matching file evidence.");
      const file = create("media-asset", {
        name: data.name,
        mime: data.mime,
        size: data.size,
        dataUrl: data.dataUrl,
        rights: "Confirmed by owner",
        provider: data.provider || "Not selected",
        postId: ctx.postId,
        status: "local-only",
        mirrors: [],
      });
      if (post && ctx.postId) post.mediaId = file.id;
      message =
        "Original file added locally. Provider upload, mirroring and Nostr publication remain separate.";
    } else if (op === "media.stage") {
      if(!ownPrivateAccount(w))fail("Sign in to manage your own original media files.");
      if (!obj || obj.kind !== "media-asset"||obj.owner!==w.owner||w.objects.filter(o=>o.id===ctx.objectId).length!==1||obj.rights!=="Confirmed by owner")
        fail("This file is unavailable to your account.");
      if(!["uploaded","mirrored","unreachable"].includes(data.state))fail("Choose an existing media provider preview state.");
      if(ctx.postId&&(obj.postId!==ctx.postId||w.posts.filter(p=>p.id===ctx.postId).length!==1||post?.author!==w.owner))fail("This media file belongs to a different original content context.");
      if (data.state === "unreachable") {
        obj.status = "unreachable";
        message =
          "Provider unavailable in this scenario. Existing licences and original references remain.";
      } else {
        if (
          data.approved !== "Yes" ||
          !["Primary sample host", "Alternative sample host"].includes(
            data.provider,
          )
        )
          fail(
            "Approve the selected sample provider before simulating delivery.",
          );
        if (
          data.state === "mirrored" &&
          !["uploaded", "mirrored"].includes(String(obj.status))
        )
          fail("Upload and verify the original before mirroring.");
        obj.status = data.state;
        obj.provider = data.provider;
        if (data.state === "mirrored")
          obj.mirrors = [
            ...new Set([...((obj.mirrors as string[]) || []), data.provider]),
          ];
        message =
          "Sample provider state updated. No real external file transfer was made.";
      }
      objectId = obj.id;
    } else if (op === "nostr.sign") {
      if(!ownPrivateAccount(w)||typeof ctx.postId!=='string'||!ctx.postId.trim()||ctx.postId!==ctx.postId.trim()||w.posts.filter(p=>p.id===ctx.postId).length!==1||post?.author!==w.owner)fail('Sign in and review your own unique original event.');
      if (!post || !mayRead(w, post)) fail("This event is unavailable.");
      if (post.author !== w.owner)
        fail("You can sign only your own prepared event.");
      const destinations = publicationSources(w, post)
        .map((r) => r.id)
        .sort();
      const changedDestinations =
        post.status === "signed" &&
        (JSON.stringify(destinations) !== JSON.stringify(post.approvedRelayIds)||post.approvedOriginal!==scheduledOriginal(w,post));
      if (!["draft", "failed"].includes(post.status) && !changedDestinations)
        fail(
          "This event already has an approved or delivered attempt. Check its current state.",
        );
      signer();
      if (!destinations.length)
        fail("Choose an authorised write relay before signing this draft.");
      post.approvedRelayIds = destinations;
      post.approvedOriginal = scheduledOriginal(w,post);
      post.status = "signed";
      objectId = post.id;
      message =
        "Demo sign approval recorded for this exact event and audience. No real signature was made.";
    } else if (op === "nostr.publish") {
      if(!ownPrivateAccount(w)||typeof ctx.postId!=='string'||!ctx.postId.trim()||ctx.postId!==ctx.postId.trim()||w.posts.filter(p=>p.id===ctx.postId).length!==1||post?.author!==w.owner)fail('Sign in and review your own unique original event.');
      if (!post || post.status !== "signed")
        fail("Review and sign this exact draft before submitting.");
      if (!mayRead(w, post))
        fail(
          "Your permission for this exact audience has changed. Keep the draft and review access.",
        );
      signer();
      const destinations = publicationSources(w, post)
        .map((r) => r.id)
        .sort();
      if (!destinations.length)
        fail(
          "No write relay is selected for this audience. Your signed draft is retained.",
        );
      if (
        !post.approvedRelayIds ||
        JSON.stringify(destinations) !== JSON.stringify(post.approvedRelayIds)
      ) {
        fail(
          "Relay destinations changed. Review and approve this same draft again.",
        );
      }
      if(!post.approvedOriginal||post.approvedOriginal!==scheduledOriginal(w,post))fail('The approved original, identity or relay destination changed. Review and approve this exact draft again.');
      if(!['Accepted','Unknown'].includes(data.outcome))fail('Choose an explicit sample delivery outcome.');
      post.deliveryRelayIds = destinations;
      post.status =
        w.identity.relayState === "partial"
          ? "partial"
          : data.outcome === "Unknown"
            ? "unknown"
            : "accepted";
      objectId = post.id;
      message =
        post.status === "accepted"
          ? "Accepted by the selected sample relay. This is not proof of global network coverage."
          : post.status === "partial"
            ? "Only part of the selected relay set accepted this event."
            : "Delivery is unknown. Check this same event before retrying.";
    } else if (op === "nostr.reconcile") {
      if(!ownPrivateAccount(w)||typeof ctx.postId!=="string"||!ctx.postId.trim()||ctx.postId!==ctx.postId.trim()||w.posts.filter(p=>p.id===ctx.postId).length!==1||!post||post.author!==w.owner)fail("Sign in and review one unique original authored by your own account.");
      if (!post || !["unknown", "partial", "submitted"].includes(post.status))
        fail("This event does not need delivery reconciliation.");
      if(!post.approvedOriginal||post.approvedOriginal!==scheduledOriginal(w,post))fail('The original changed after submission. Its current delivery needs source review.');
      if (w.identity.relayState === "offline")
        fail("Reconnect before checking delivery.");
      post.status = data.outcome === "Failed" ? "failed" : "accepted";
      message =
        "Delivery checked against the same demo event reference. No duplicate was created.";
      objectId = post.id;
    } else if (op === "nostr.schedule") {
      if (!post || (post.publishing ? post.publishing.owner !== w.owner : post.author !== w.owner) || !["draft", "signed"].includes(post.status)) fail("Choose your own unpublished draft.");
      if(w.objects.some(o=>o.kind==='schedule'&&o.owner===w.owner&&o.postId===post.id&&o.status==='scheduled'&&o.approvalState==='active'))fail('This original already has an active schedule. Review it before creating another.');
      const timezone=data.timezone || "Europe/Berlin";
      const due=publicationDue(data.date||"",timezone);
      if(due<=Date.now())fail("Choose a publication time in the future.");
      signer();
      if(post.publishing) checkTargets(w,post);
      else if(!mayRead(w,post)||!publicationSources(w,post).length)fail("Review access and write destinations before scheduling.");
      if(post.publishing && (data.approved!=="Yes" || Number(data.expectedVersion)!==post.publishing.revision || (post.publishing.media.length>0 && (!post.publishing.mediaRights || post.publishing.media.some(m=>m.state!=="uploaded-preview")))))fail("Review and approve the current content and media first.");
      create("schedule",{postId:post.id,date:data.date,timezone,dueAt:new Date(due).toISOString(),audience:post.audience,exactText:post.text,exactOriginal:scheduledOriginal(w,post),approvalState:"active",approvalVersion:1,status:"scheduled"});
      post.status="scheduled";
      message="This exact original is scheduled. Nothing has been published; changing its content, media or destinations requires new approval.";
      objectId=post.id;
    } else if (op === "nostr.executeSchedule" || op === "nostr.previewSchedule") {
      const candidates=w.objects.filter(o=>o.kind==='schedule'&&o.postId===ctx.postId&&o.owner===w.owner&&o.status==='scheduled'&&o.approvalState==='active');
      const schedule=candidates.length===1&&w.objects.filter(o=>o.id===candidates[0].id).length===1?candidates[0]:undefined;
      if(!schedule||schedule.status!=="scheduled"||schedule.approvalState!=="active"||!post||post.status!=="scheduled")fail("There is no active approval for this exact scheduled draft.");
      const due=Date.parse(String(schedule.dueAt||""));
      if(!Number.isFinite(due)||schedule.exactOriginal!==scheduledOriginal(w,post))fail("The original, media, identity or destinations changed. Review and approve a new schedule.");
      signer();
      if(post.publishing) checkTargets(w,post);
      else if(!mayRead(w,post)||!publicationSources(w,post).length)fail("The original audience or write permission is no longer valid.");
      objectId=post.id;
      if(op==="nostr.previewSchedule"){
        message=`Preview only: this exact original is scheduled for ${schedule.date} · ${schedule.timezone}. No publication or delivery status was changed.`;
      }else{
        if(Date.now()<due)fail("This publication is not due yet. A preview does not publish early.");
        if(post.publishing) applyPublishing(w,"complete.publishing.publish",{approved:"Yes",expectedVersion:String(post.publishing.revision)},ctx);
        else post.status=w.identity.relayState==="partial"?"partial":"accepted";
        schedule.status="executed-demo";
        schedule.executedAt=new Date(Date.now()).toISOString();
        message="The due, unchanged approved original was published in the simulation. No duplicate event or real relay transmission was created.";
      }
    } else if (op === "nostr.cancelSchedule") {
      const candidates=w.objects.filter(o=>o.kind==='schedule'&&o.postId===ctx.postId&&o.owner===w.owner&&o.status==='scheduled'&&o.approvalState==='active');
      const schedule=candidates.length===1&&w.objects.filter(o=>o.id===candidates[0].id).length===1?candidates[0]:undefined;
      if (!schedule || !post) fail("Schedule not found.");
      schedule.status = "revoked";
      schedule.approvalState = "revoked";
      if (post.status === "scheduled") post.status = "draft";
      objectId = post.id;
      message = "Schedule revoked. The original draft remains.";
    } else if (op === "nostr.interact") {
      if(!w.identity.signedIn||!post||typeof post.id!=='string'||!post.id.trim()||w.posts.filter(p=>p.id===post.id).length!==1)fail("Sign in and open the exact original before changing your own reaction or library.");
      if (!post || !mayRead(w, post))
        fail("This content is not available to you.");
      if (data.action === "Bookmark") {
        post.saved = !post.saved;
        message = post.saved
          ? "Saved to your library."
          : "Removed from saved items.";
      } else if (data.action === "Highlight") {
        if (post.type !== "article") fail("Highlights belong to an article.");
        const passage = data.text?.trim();
        if (!passage || !post.text.includes(passage))
          fail("Select an exact passage from this original article.");
        post.highlight = passage;
        message =
          "Highlight saved against this article’s original event reference.";
      } else if(data.action==='Like'&&post.audience!=='Public'){
        if(!w.identity.signedIn||w.posts.filter(p=>p.id===post.id).length!==1)fail('Open your exact readable private original.');
        const reactions=w.objects.filter(o=>o.owner===w.owner&&o.kind==='private-content-reaction'&&o.postId===post.id&&o.action==='Like');
        if(reactions.length>1||reactions.some(o=>typeof o.id!=='string'||!o.id.trim()||w.objects.filter(x=>x.id===o.id).length!==1||o.exampleOnly!==true||o.audience!==post.audience))fail('This private reaction needs review. Its original records have been kept.');
        post.liked=!post.liked;
        if(reactions.length){reactions[0].liked=post.liked;reactions[0].updatedAt=stamp();objectId=reactions[0].id;}
        else create('private-content-reaction',{postId:post.id,action:'Like',audience:post.audience,liked:post.liked,exampleOnly:true,status:'local-preview',createdAt:stamp()});
        message='Private reaction preview updated in your account. Nothing was published or transmitted.';
      } else {
        const interaction=preparePublicInteraction(w,data,post.id);
        objectId=interaction.id;
        message="Interaction prepared. Review its exact original, audience and destinations before signing. No public action has been confirmed.";
      }
      if (["Bookmark","Highlight"].includes(data.action)) objectId = post.id;
    } else if (op === "content.position") {
      if (!post) fail("Content unavailable.");
      post.readPosition = Number(data.position || 0);
      message = "Reading or playback position saved for this original content.";
    } else if (op === "content.availability") {
      if (!post) fail("Content unavailable.");
      post.mediaAvailable = data.available === "Yes";
      message = post.mediaAvailable
        ? "Sample media is reachable again."
        : "Media is unavailable. Existing license evidence is retained.";
    } else if (op === "wallet.connect") {
      wallet.connected = true;
      wallet.read = data.read === "Yes";
      wallet.transfer = data.transfer === "Yes";
      wallet.budget = data.budget === "Yes";
      message =
        "Demo wallet connection saved. No real account, key or funds were connected.";
      objectId = wallet.id;
    } else if (op === "wallet.disconnect") {
      wallet.connected = false;
      wallet.read = false;
      wallet.transfer = false;
      wallet.budget = false;
      message =
        "Demo connection revoked. Separate recovery proofs are unaffected.";
    } else if (op === "wallet.proof") {
      wallet.proof =
        data.proof === "Valid"
          ? "valid"
          : data.proof === "Invalid"
            ? "invalid"
            : "missing";
      message =
        wallet.proof === "valid"
          ? wallet.asset==='USDB' ? 'Sample Spark USDB token identity reviewed. No real issuer, reserve or wallet verification occurred.' : "Sample RGB state validated for the displayed asset and contract."
          : "Required asset proof is unavailable or invalid; transfer remains blocked.";
    } else if (op === "operator.application.save") {
      if(isCraysBrandSetup(data)||isCraysBrandSetup(obj))fail(craysFranchiseMessage);
      if (ctx.objectId && (!obj || obj.kind !== "operator-application"))
        fail("Choose your own operator application.");
      if (
        !data.name?.trim() ||
        !data.organisation?.trim() ||
        !data.relationship?.trim() ||
        !data.city?.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "") ||
        data.consent !== "Yes"
      )
        fail(
          "Complete the Spot, organisation, representation, contact and explicit submission permission.",
        );
      const fields = {
        ...data,
        status: "pending-representation-review",
        relayProvisioned: false,
        staffInvitationsSent: false,
        operatorVerified: false,
        subscription: "not-contracted",
        createdAt: stamp(),
      };
      if (obj) {
        Object.assign(obj, fields);
        objectId = obj.id;
      } else create("operator-application", fields);
      message =
        "Synthetic application saved for representation review. No operator role, relay, contract or invitation was created.";
    } else if (op === "creator.profile.save") {
      if (
        ctx.objectId &&
        (!obj || obj.kind !== "creator-profile" || obj.personId !== w.owner)
      )
        fail("Choose your own creator page.");
      if (!data.name?.trim() || !data.headline?.trim())
        fail("Add your public name and introduction.");
      const editDraft=obj?.status==="published-demo"&&obj.editDraft&&typeof obj.editDraft==="object"?obj.editDraft as Record<string,unknown>:undefined;
      let links;
      try { links = creatorLinksFromDraft(data, editDraft?.links||(obj?.status==="draft"?obj.links:profilePublicLinks(w.objects,w.owner))); }
      catch(error) { fail(error instanceof Error ? error.message : "Review your public profile links."); }
      const fields = {
        name: data.name,
        title: data.headline,
        description: data.bio || "",
        layout: data.template,
        links,
        status: "draft",
        personId: w.owner,
        audience: "Public",
        cover: obj?.cover || "venue-table.png",
        createdAt: obj?.createdAt || stamp(),
      };
      if (obj) {
        if(obj.status==="published-demo")obj.editDraft={...fields,basePublishedRevision:editDraft?.basePublishedRevision??Number(obj.publishedRevision||0)};
        else Object.assign(obj, fields);
        objectId = obj.id;
      } else create("creator-profile", fields);
      message = obj?.status==="published-demo"
        ? "Private edits saved. Your published page is still visible and unchanged."
        : "Public-page draft saved. Private profile fields and account connections are unchanged.";
    } else if (op === "creator.profile.publish") {
      if (!hasCreatorMembership(w))
        fail(
          "A Caster membership with active creator benefits is required before publishing your creator page. A free Chuck account or a badge image alone does not enable sales.",
        );
      signer();
      if (
        !obj ||
        obj.kind !== "creator-profile" ||
        obj.personId !== w.owner ||
        (obj.status !== "draft" && !(obj.status==="published-demo"&&obj.editDraft&&typeof obj.editDraft==="object")) ||
        data.approved !== "Yes"
      )
        fail("Review and approve your own exact public-page draft.");
      if(obj.status==="published-demo"){
        const edit=obj.editDraft as Record<string,unknown>;
        if(Number(edit.basePublishedRevision)!==Number(obj.publishedRevision||0))fail("Your published page changed. Review its current version before publishing these edits.");
        for(const key of ["name","title","description","layout","links","cover"])obj[key]=edit[key];
        delete obj.editDraft;
      }
      obj.publishedRevision=Number(obj.publishedRevision||0)+1;
      obj.status = "published-demo";
      const publicLinks=w.objects.find(o=>o.kind==="profile-social-links"&&o.personId===w.owner);
      const fields={personId:w.owner,links:obj.links,status:"published-demo",audience:"Public"};
      if(publicLinks)Object.assign(publicLinks,fields);
      else {const publishedId=obj.id;create("profile-social-links",fields);objectId=publishedId;}
      message =
        "Synthetic public creator page published. No production Nostr event or external account was changed.";
    } else if (op === "creator.purchase.review") {
      const candidates=w.objects.filter(o=>o.id===ctx.objectId&&o.kind==='public-creator-offer');
      const publicOffer=candidates.length===1?candidates[0]:undefined;
      if (
        !publicOffer ||
        publicOffer.kind !== "public-creator-offer" ||
        publicOffer.status !== "published-demo" ||
        publicOffer.postId !== ctx.postId
      )
        fail("This exact creator offer is unavailable.");
      if (data.version !== publicOffer.version)
        fail("Offer terms changed. Review the current version.");
      if(publicOffer.currency!=="USD")fail("This historical offer needs current USD terms for a new purchase. Existing receipts and payments remain unchanged.");
      if (!mayPurchaseCreatorOffer(w, publicOffer)) fail("This exact offer is no longer available to purchase.");
      requireCreatorTerm(publicOffer);
      if(publicOffer.artistNft)requireArtistNftAvailable(w,publicOffer);
      const pricing=Number(publicOffer.price)>0?creatorPromotionPrice(publicOffer):undefined;
      const item = w.posts.find((p) => p.id === publicOffer.postId);
      if (!item || !mayRead(w, item)) fail("This offer is not visible to you.");
      if (
        publicOffer.purchaseEligibility === "Community members" &&
        (!item.venueId ||
          !w.venues.some(
            (v) =>
              v.id === item.venueId &&
              ["active", "provisional"].includes(v.membership),
          ))
      )
        fail("This purchase requires the stated community membership.");
      create("purchase-review", {
        name: publicOffer.name,
        offerId: publicOffer.id,
        offerVersion: publicOffer.version,
        postId: item.id,
        sellerId: publicOffer.sellerId,
        price: pricing?.price||publicOffer.price,
        creatorPricing: pricing,
        currency: publicOffer.currency,
        term: publicOffer.term,
        serviceValidUntil: publicOffer.serviceValidUntil,
        conditions: publicOffer.conditions,
        status: "reviewed",
        createdAt: stamp(),
      });
      message = "Exact synthetic offer reviewed. No payment or rights issued.";
    } else if (op === "wallet.prepare") {
      if(ctx.featureId === "AL-110"){
        const sources=w.posts.filter(p=>p.id===(ctx.postId||ctx.sourceId));
        if(sources.length!==1||!mayRead(w,sources[0])||data.recipient!==sources[0].author||data.purpose!=="Zap")fail("Open the exact original author to prepare this voluntary Props. It cannot become a purchase, vote or payment to another recipient.");
      }
      if (!w.identity.signedIn) fail("Sign in before preparing this payment.");
      if (historicalFiatAccount(wallet)) fail("This historical foreign-currency account is read-only for new payments. Use a separately funded USD account or an explicitly quoted crypto route.");
      if (wallet.connected!==true || wallet.transfer!==true)
        fail("Connect this demo wallet and grant transfer permission first.");
      if (!data.recipient?.trim())
        fail("Enter the intended recipient or invoice.");
      if (
        !data.amount ||
        !Number.isFinite(Number(data.amount)) ||
        Number(data.amount) <= 0
      )
        fail("Enter a positive amount in the displayed asset unit.");
      if(typeof wallet.available!=="string"||!/^\d+(?:\.\d+)?$/.test(wallet.available)||!Number.isFinite(Number(wallet.available)))fail("The available source balance needs validation before preparing a payment.");
      if (Number(data.amount) > Number(wallet.available))
        fail("The sample available balance is insufficient.");
      if (
        (wallet.id === "rgb" || wallet.id === "utexo" || wallet.asset === 'USDB') &&
        wallet.proof !== "valid"
      )
        fail("Validate the required RGB state and contract before a transfer.");
      if (data.network && data.network !== wallet.network)
        fail("Recipient network does not match this wallet.");
      requireCraysUSD(w,data.recipient,ctx.sourceId||'',wallet,data.officialUSDMethod);
      requireVenuePaymentAcceptance(w,data.recipient,wallet);
      requireCraysFeePayment(w,ctx.sourceId||'',{recipient:data.recipient,purpose:data.purpose||'Transfer',amount:data.amount},wallet);
      const craysReview = requireCraysPayment(w, ctx.sourceId || "", { purpose:data.purpose || "Transfer", recipient:data.recipient, amount:data.amount }, wallet);
      const originalOrder = w.objects.find(
        (o) =>
          o.kind === "order" && o.id === ctx.sourceId && o.owner === w.owner,
      );
      if (originalOrder) {
        if(w.payments.some(p=>p.owner===w.owner&&p.sourceId===originalOrder.id&&!["failed"].includes(p.status)))fail("This order already has an original payment attempt. Reconcile it before any new payment.");
        const quote = originalOrder.quote as Record<string, string> | undefined;
        const seller = w.venues.find((v) => v.id === originalOrder.venueId);
        if (originalOrder.status !== "placed-demo" || !quote)
          fail("Place the reviewed order before preparing its payment.");
        if (
          wallet.asset !== quote.currency ||
          Number(data.amount) !== Number(quote.total) ||
          !seller ||
          data.recipient !== seller.name
        )
          fail(
            "The payment must match this order’s seller, exact currency and total.",
          );
      }
      const creatorCandidates = w.objects.filter(
        (o) => o.kind === "public-creator-offer" && o.postId === ctx.sourceId,
      );
      const creatorOffer = ctx.offerId
        ? creatorCandidates.find((o) => o.id === ctx.offerId)
        : data.purpose === 'Content purchase' && creatorCandidates.length === 1
          ? creatorCandidates[0]
          : undefined;
      if ((ctx.offerId || data.purpose === "Content purchase") && !creatorOffer)
        fail(
          "Choose and review the exact available creator offer before payment.",
        );
      let usdQuote:USDCheckoutQuote|undefined;
      const creatorPricing=creatorOffer&&Number(creatorOffer.price)>0?creatorPromotionPrice(creatorOffer):undefined;
      if(data.usdQuote||data.usdAmount){
        const originals=w.posts.filter(p=>p.id===(ctx.sourceId||ctx.postId));
        if(originals.length!==1||!mayRead(w,originals[0])||originals[0].author!==data.recipient||w.wallets.filter(a=>a.id===wallet.id).length!==1)fail('Review the unique original author and payment account before loading this USD quote.');
        if((wallet.asset==='USDT'&&wallet.id!=='utexo')||(wallet.asset==='sats'&&wallet.id!=='ln')||(wallet.asset==='BTC'&&wallet.id!=='btc')||(wallet.asset==='USDB'&&(wallet.id!=='usdb-spark'||wallet.network!=='Spark · Brale USDB'))||(wallet.asset==='USD'&&wallet.network!=='Stripe · USD'))fail('Review the original Stripe, Utexo, Spark, Bitcoin or Lightning payment route.');
        usdQuote=requireUSDCheckoutQuote(JSON.parse(data.usdQuote||'null'),{owner:w.owner,sourceId:originals[0].id,recipient:data.recipient,purpose:data.purpose as 'Zap'|'Content purchase',offerId:creatorOffer?.id,offerVersion:creatorOffer?String(creatorOffer.version):undefined,walletId:wallet.id,asset:wallet.asset,network:wallet.network,usdAmount:creatorOffer?(creatorPricing?.price||String(creatorOffer.price)):data.usdAmount||''},Date.now());
        if(Number(data.amount)!==Number(usdQuote.principal)||data.fee!==usdQuote.fee)fail('The payment amount and fees must match this exact USD quote.');
        if(data.purpose==='Zap'&&w.payments.some(p=>p.owner===w.owner&&p.zapPostId===originals[0].id&&['prepared','approved','submitted','pending','unknown'].includes(p.status)))fail('This original already has a Props being reviewed. Open that attempt before paying again.');
      }
      if (data.purpose === 'Content purchase' && creatorCandidates.length > 1 && !ctx.offerId)
        fail("Choose the exact offer; this original has multiple offers.");
      if (ctx.renewalOf && !creatorOffer)
        fail("Renewal requires an exact creator subscription offer.");
      let renewal: ReturnType<typeof requireCreatorRenewal> | undefined;
      if (creatorOffer) {
        requireCreatorTerm(creatorOffer);
        if(creatorOffer.artistNft)requireArtistNftAvailable(w,creatorOffer);
        renewal = ctx.renewalOf
          ? requireCreatorRenewal(w, creatorOffer, ctx.renewalOf)
          : undefined;
        if (!renewal && creatorAccessForOffer(w, creatorOffer))
          fail(
            "Open your existing access and explicitly review its renewal before paying again.",
          );
        if(creatorOffer.currency!=="USD")fail("New content purchases require current USD invoice terms. Keep existing historical attempts for reconciliation.");
        if (!mayPurchaseCreatorOffer(w, creatorOffer))
          fail(
            "Your current purchase eligibility changed. Review the offer again.",
          );
        if (
          data.purpose !== "Content purchase" ||
          data.recipient !== creatorOffer.sellerId ||
          (!usdQuote&&(wallet.asset !== creatorOffer.currency || Number(data.amount) !== Number(creatorPricing?.price||creatorOffer.price)))
        )
          fail(
            "Payment must match the original creator, offer price and currency.",
          );
        if (
          !w.objects.some(
            (o) =>
              o.owner === w.owner &&
              o.kind === "purchase-review" &&
              o.offerId === creatorOffer.id &&
              o.offerVersion === creatorOffer.version &&
              (!creatorPricing || typeof o.creatorPricing==='object'&&o.creatorPricing!==null&&(o.creatorPricing as CreatorPromotionPrice).snapshot===creatorPricing.snapshot),
          )
        )
          fail("Review the current offer terms first.");
        if (
          w.payments.some(
            (p) =>
              p.owner === w.owner &&
              p.sourceId === ctx.sourceId &&
              (!p.offerId || p.offerId === creatorOffer.id) &&
              p.purpose === "Content purchase" &&
              [
                "prepared",
                "approved",
                "submitted",
                "pending",
                "unknown",
                ...(!renewal ||
                !w.objects.some(
                  (o) =>
                    o.owner === w.owner &&
                    o.kind === "entitlement-payment" &&
                    o.paymentId === p.id &&
                    o.offerId === creatorOffer.id &&
                    o.offerVersion === p.offerVersion &&
                    o.entitlementId === renewal?.access.id,
                )
                  ? ["confirmed"]
                  : []),
              ].includes(p.status),
          )
        )
          fail(
            "This purchase already has an attempt. Open its original status instead of paying again.",
          );
      }
      const payment: Payment = {
        id: id(),
        owner: w.owner,
        sourceId:
          ctx.sourceId || ctx.postId || ctx.objectId || "manual-transfer",
        recipient: data.recipient,
        walletId: wallet.id,
        asset: wallet.asset,
        network: wallet.network,
        amount: data.amount,
        fee: data.fee?.trim() || "Provider quote required",
        status: "prepared",
        reference: `demo-${id()}`,
        purpose: data.purpose || "Transfer",
        zapPostId: ctx.featureId === "AL-110" ? (ctx.postId || ctx.sourceId) : undefined,
        usdQuote,
        ...(craysBeneficiary(w,data.recipient,ctx.sourceId||'')?{officialUSDMethod:(data.officialUSDMethod||'Stripe') as "Stripe"|"Apple Pay"}:{}),
        planReviewId: craysReview?.id,
        planPricingVersion: craysReview ? String(craysReview.pricingVersion) : undefined,
        offerId: creatorOffer?.id,
        offerVersion: creatorOffer ? String(creatorOffer.version) : undefined,
        creatorPricing,
        creatorOfferType: creatorOffer?String(creatorOffer.type||''):undefined,
        renewalOf: ctx.renewalOf,
        renewalBasePaymentId: renewal?.previous.id,
        renewalBaseEndsAt: renewal?.end,
      };
      w.payments.unshift(payment);
      if(creatorOffer?.artistNft){const bound=bindArtistNftPayment(w,payment.id,creatorOffer.id);Object.assign(payment,bound.payments.find(p=>p.id===payment.id));}
      objectId = payment.id;
      message = "Transfer prepared for review. Nothing has been sent.";
    } else if (op === "wallet.close.review") {
      const matches=w.payments.filter(p=>p.id===ctx.objectId);
      const payment=matches.length===1?matches[0]:undefined;
      if(!w.identity.signedIn||!payment||payment.owner!==w.owner||payment.status!=="prepared"||payment.purpose!=="Content purchase"||!payment.offerId||payment.merchantCheckout||payment.planReviewId||data.approved!=="Yes")fail("Only your exact unsubmitted content payment review can be closed. Keep submitted or unknown originals for reconciliation.");
      payment.status="failed";payment.closedBeforeSubmission=true;objectId=payment.id;
      message="Unsubmitted content payment review closed. No funds moved; its original quote remains in history. Review the current offer separately before a new attempt.";
    } else if (op === "wallet.submit") {
      const historicalPayment=w.payments.find(p=>p.id===ctx.objectId&&p.owner===w.owner);
      const historicalSource=historicalPayment&&w.wallets.find(a=>a.id===historicalPayment.walletId);
      if(historicalSource&&historicalFiatAccount(historicalSource))fail("This historical payment cannot be submitted anew. Existing unknown outcomes and confirmed receipts remain available for reconciliation.");
      if (!w.identity.signedIn) fail("Sign in before approving this payment.");
      const payment = w.payments.find(
        (p) => p.id === ctx.objectId && p.owner === w.owner,
      );
      if (!payment) fail("Payment not found.");
      if(payment.zapPostId){
        const sources=w.posts.filter(p=>p.id===payment.zapPostId);
        if(payment.purpose!=="Zap"||payment.sourceId!==payment.zapPostId||sources.length!==1||!mayRead(w,sources[0])||sources[0].author!==payment.recipient)fail("The original author or access changed. Review the same original before approving this Props.");
      }
      if (payment!.status !== "prepared")
        fail("This attempt already exists. Check its status before any retry.");
      const sourceWallet = w.wallets.find((x) => x.id === payment!.walletId);
      if (sourceWallet?.connected!==true || sourceWallet.transfer!==true)
        fail(
          "Wallet transfer permission was revoked. Review the connection again.",
        );
      requireCraysUSD(w,payment.recipient,payment.sourceId,sourceWallet,payment.officialUSDMethod);
      requireVenuePaymentAcceptance(w,payment.recipient,sourceWallet);
      requireCraysFeePayment(w,payment.sourceId,payment,sourceWallet,payment);
      if(payment.usdQuote){
        const q=payment.usdQuote,originals=w.posts.filter(p=>p.id===payment.sourceId);
        if(originals.length!==1||!mayRead(w,originals[0])||originals[0].author!==payment.recipient||w.wallets.filter(a=>a.id===sourceWallet.id).length!==1)fail('The original or payment account changed. This USD payment was not sent.');
        requireUSDCheckoutQuote(q,{owner:w.owner,sourceId:payment.sourceId,recipient:payment.recipient,purpose:payment.purpose as 'Zap'|'Content purchase',offerId:payment.offerId,offerVersion:payment.offerVersion,walletId:sourceWallet.id,asset:sourceWallet.asset,network:sourceWallet.network,usdAmount:(q.baseMinor/100).toFixed(2)},Date.now());
        if(payment.asset!==q.asset||payment.network!==q.network||payment.amount!==q.principal||payment.fee!==q.fee)fail('The original payment no longer matches its USD quote.');
      }
      if (data.approved !== "Yes")
        fail(
          "Approve the exact asset, recipient, amount and fee status first.",
        );
      if (
        data.feeConfirmed !== "Yes" ||
        payment!.fee === "Provider quote required"
      )
        fail("A confirmed fee quote is still required.");
      requireCraysPayment(w, payment.sourceId, {purpose:payment.purpose, recipient:payment.recipient, amount:payment.amount}, sourceWallet, payment);
      if(payment.artistNft||payment.creatorOfferType==='artist-nft')requireArtistNftPaymentSubmission(w,payment.id);
      const paidOffer = w.objects.find(
        (o) => o.kind === "public-creator-offer" && o.id === payment.offerId,
      );
      if (payment.offerId || payment.purpose === "Content purchase") {
        if(paidOffer&&payment.creatorPricing)requireCreatorPromotionPrice(payment.creatorPricing,paidOffer,Date.now());
        if(paidOffer&&paidOffer.currency!=="USD")fail("This unsubmitted historical purchase needs a new USD review. The original has not been charged again.");
        if (
          !paidOffer ||
          !creatorPaymentMatches(payment, paidOffer) ||
          !mayPurchaseCreatorOffer(w, paidOffer) ||
          !w.objects.some(
            (o) =>
              o.owner === w.owner &&
              o.kind === "purchase-review" &&
              o.offerId === paidOffer.id &&
              o.offerVersion === String(paidOffer.version),
          )
        )
          fail(
            "Creator offer terms or access changed. Review the exact current offer and prepare a new payment approval.",
          );
        requireCreatorTerm(paidOffer);
        requirePreparedRenewal(w, paidOffer, payment);
      }
      const paidOrder = w.objects.find(
        (o) =>
          o.owner === w.owner &&
          o.kind === "order" &&
          o.id === payment.sourceId,
      );
      if (paidOrder && paidOrder.status !== "placed-demo")
        fail(
          "This order changed or was cancelled. Do not submit its old payment.",
        );
      const fee = Number(payment!.fee);
      if (!Number.isFinite(fee) || fee < 0)
        fail("A valid fee quote in the displayed asset is required.");
      const debit = Number(payment!.amount) + fee;
      if (debit > Number(sourceWallet.available))
        fail("Available balance cannot cover this amount and fee.");
      sourceWallet.available = String(
        Number((Number(sourceWallet.available) - debit).toFixed(8)),
      );
      sourceWallet.reserved = String(
        Number((Number(sourceWallet.reserved) + debit).toFixed(8)),
      );
      payment!.status = data.outcome === "Unknown" ? "unknown" : "pending";
      objectId = payment!.id;
      message =
        payment!.status === "unknown"
          ? "Outcome unknown. Keep the same reference and check status; do not resend."
          : "Sample transfer pending. It is not yet confirmed.";
    } else if (op === "wallet.reconcile") {
      const payment = w.payments.find(
        (p) => p.id === ctx.objectId && p.owner === w.owner,
      );
      if (
        !payment ||
        !["unknown", "pending", "submitted"].includes(payment.status)
      )
        fail("No pending attempt to reconcile.");
      const sourceWallet = w.wallets.find((x) => x.id === payment.walletId)!;
      const reserved = Number(payment.amount) + Number(payment.fee);
      sourceWallet.reserved = String(
        Math.max(
          0,
          Number((Number(sourceWallet.reserved) - reserved).toFixed(8)),
        ),
      );
      if (data.outcome === "Failed")
        sourceWallet.available = String(
          Number((Number(sourceWallet.available) + reserved).toFixed(8)),
        );
      payment.status = data.outcome === "Failed" ? "failed" : "confirmed";
      message =
        payment.status === "confirmed"
          ? "Original sample attempt confirmed. No second transfer was created."
          : "Original sample attempt failed. No confirmed transfer is claimed.";
      objectId = payment.id;
    } else if (op === "wallet.refund") {
      const payment = w.payments.find(
        (p) => p.id === ctx.objectId && p.owner === w.owner,
      );
      if (!payment || payment.status !== "confirmed")
        fail("Only a confirmed payment can enter the sample refund path.");
      const sourceWallet = w.wallets.find((x) => x.id === payment.walletId)!;
      sourceWallet.available = String(
        Number(
          (Number(sourceWallet.available) + Number(payment.amount)).toFixed(8),
        ),
      );
      payment.status = "refunded";
      if (payment.planReviewId) {
        w.objects.filter(o => o.owner === w.owner && o.kind === "crays-plan-contract" && o.paymentId === payment.id).forEach(o => { o.status = "revoked-after-refund"; });
        w.objects.filter(o => o.owner === w.owner && o.kind === "crays-credit-grant" && o.paymentId === payment.id).forEach(o => { o.status = "revoked-after-refund"; });
      }
      objectId = payment.id;
      w.objects
        .filter(
          (o) =>
            o.kind === "license" &&
            o.sourcePayment === payment.id &&
            o.owner === w.owner,
        )
        .forEach((o) => {
          o.status = "revoked-after-refund";
          const item = w.posts.find((p) => p.id === o.postId);
          if (item) item.license = false;
        });
      message =
        "Sample principal returned to the original wallet. The original fee is retained in this scenario; linked license access is revoked. Other purchases are unchanged.";
    } else if (op === "rights.validate") {
      if (!post || !post.protected) fail("Choose a protected item.");
      const candidates = w.payments.filter(
        (p) => p.sourceId === post.id && p.status === "confirmed" &&
          p.owner === w.owner && p.purpose === "Content purchase" && p.recipient === post.author,
      );
      const paid = data.paymentId ? candidates.find(p => p.id === data.paymentId) : candidates.length === 1 ? candidates[0] : undefined;
      if(paid?.artistNft||paid?.creatorOfferType==='artist-nft')fail("Use this artwork’s exact wallet delivery and issuer proof. A generic content proof cannot issue its unique asset.");
      if (!paid || w.payments.filter(p => p.id === paid.id).length !== 1)
        fail("Choose the exact confirmed original content payment. A receipt alone is not a license.");
      if (
        data.recipient !== w.owner ||
        data.proof !== "Valid" ||
        data.issuer !== post.author ||
        data.contract !== "Expected demo RGB contract"
      )
        fail(
          "License recipient, issuer, contract or proof does not match this content.",
        );
      const priorLicenses = w.objects.filter(o => o.kind === "license" && o.owner === w.owner && o.postId === post.id && o.sourcePayment === paid.id);
      if (priorLicenses.length > 1 || priorLicenses.some(o => o.status !== "valid" || o.recipient !== w.owner || o.issuer !== post.author))
        fail("Original license evidence needs review; do not create a duplicate.");
      post.license = true;
      if (priorLicenses.length === 1) objectId = priorLicenses[0].id;
      else create("license", {
        postId: post.id, issuer: post.author, recipient: w.owner, status: "valid",
        network: "RGB sample", term: "Purchased item terms", sourcePayment: paid.id,
        contract: "Expected demo RGB contract",
      });
      message =
        "Sample content license validated. File reachability is still checked separately.";
    } else if (op === "order.create") {
      if (!venue.operatorActive || (!hasFoodService(venue.services)&&!guestVenueCatalogue(w,venue.id)?.some(i=>i.kind==="product")))
        fail("This Spot does not currently provide this menu or shop.");
      let items = JSON.parse(data.items || "[]");
      if (
        !Array.isArray(items) ||
        !items.length ||
        items.some(
          (i) => !i.id || !Number.isInteger(i.quantity) || i.quantity <= 0,
        )
      )
        fail("Choose valid items and quantities before requesting a quote.");
      const grocery=qualifyGroceryOrderCreate(w,data,ctx);if(grocery)items=grocery.items;
      let shippingRequest:StoreShippingRequest|undefined;
      if(data.delivery==='Shipping'){
        if(!isShippingExampleVenue(venue.id))fail('Shipping needs this exact Store and its reviewed seller terms.');
        const candidate=JSON.parse(data.shippingRequest||'null') as StoreShippingRequest|null;
        if(!candidate||JSON.stringify(candidate)!==storeShippingRequestReview(w,venue.id,catalogueOrderLines(w,venue.id,items),candidate.address))fail('Personally review the exact shipping address, seller and current items.');
        shippingRequest=candidate;
      }
      if(items.some((line:{id:string})=>guestVenueCatalogue(w,venue.id)?.some(item=>item.id===line.id&&item.kind==='product'))&&!grocery&&!['Pick up','Shipping'].includes(data.delivery||'Pick up'))fail('Choose pickup or the exact reviewed shipping service.');
      const notes=data.notes||"";
      const noteConfirmationRequired=data.noteConfirmationRequired==="Yes";
      if(notes.length>2000)fail("Keep your request note within 2,000 characters.");
      if(noteConfirmationRequired&&!notes.trim())fail("Write the requirement you need the venue to confirm.");
      const requestKey = (data.requestKey || "").trim();
      if (requestKey.length > 200) fail("This basket request reference is invalid.");
      let requestSnapshot = grocery?.requestSnapshot || JSON.stringify({venueId:venue.id,sourceId:ctx.sourceId||"",items,...(shippingRequest?{shippingRequest}:{}),delivery:data.delivery||"Pick up",tip:data.tip||"No tip",method:data.method||"Not selected",...(notes||noteConfirmationRequired?{notes,noteConfirmationRequired}:{})});
      const previousRequest = grocery?.previousOrder || (requestKey ? w.objects.find(o=>o.kind==="order"&&o.owner===w.owner&&o.requestKey===requestKey) : undefined);
      if(ctx.sourceTaskId){
        const task=chuckCommerceTask(w,ctx.sourceTaskId);
        if((!grocery&&!task)||ctx.venueId!==venue.id)fail('Choose the exact Spot and your own original Chuck purchase task.');
        if(previousRequest&&previousRequest.sourceTaskId!==ctx.sourceTaskId)fail('This original order belongs to another purchase task.');
        if(!previousRequest){
          if(!grocery&&!chuckCommerceTaskCanPrepare(w,ctx.sourceTaskId))fail('Resume your own active purchase task before requesting a new order.');
          if(w.objects.some(o=>o.kind==='order'&&o.owner===w.owner&&o.sourceTaskId===ctx.sourceTaskId))fail('This Chuck task already has an order. Open that original instead of creating a second one.');
        }
      }
      if (previousRequest) {
        if ((previousRequest.sourceTaskId||"")!==(ctx.sourceTaskId||""))fail("Keep this order’s original Chuck task.");
        if (previousRequest.requestSnapshot !== requestSnapshot) fail("Your basket changed. Review a new request instead of changing the original order.");
        objectId = previousRequest.id;
        message = "Your original quote request is open. No second order or payment was created.";
      } else {
      items = grocery?.items || catalogueOrderLines(w,venue.id,items);
      requestSnapshot = grocery?.requestSnapshot || JSON.stringify({venueId:venue.id,sourceId:ctx.sourceId||"",items,...(shippingRequest?{shippingRequest}:{}),delivery:data.delivery||"Pick up",tip:data.tip||"No tip",method:data.method||"Not selected",...(notes||noteConfirmationRequired?{notes,noteConfirmationRequired}:{})});
      const cataloguePricing=catalogueEstimate(w,venue.id,items);
      create("order", {
        requestKey: requestKey || undefined,
        requestSnapshot: requestKey || notes || noteConfirmationRequired || shippingRequest ? requestSnapshot : undefined,
        ...(shippingRequest?{shippingRequest}:{}),
        name: "Your venue order",
        sellerSnapshot: {venueId:venue.id,name:venue.name,sellerIds:[...new Set(items.map((line:OrderBasketLine)=>line.sellerId).filter(Boolean))],channelIds:[...new Set(items.map((line:OrderBasketLine)=>line.channelId).filter(Boolean))],source:"catalogue-order-request-preview"},
        sourceTaskId: ctx.sourceTaskId || "",
        venueId: venue.id,
        items,
        ...(cataloguePricing?{catalogueEstimate:cataloguePricing}:{}),
        delivery: data.delivery || "Pick up",
        tip: data.tip || "No tip",
        priceStatus: "Price to be agreed",
        paymentMethod: data.method || "Not selected",
        notes,
        noteConfirmationRequired,
        status: "quote-requested",
        sourceId: ctx.sourceId || "",
        fulfilment: "Not started",
        ...(grocery?groceryCanonicalCreateFields(grocery):{}),
      });
      message =
        "Quote requested in the demo. No binding order or payment is claimed while pricing is open.";
      }
    } else if (op === "order.quote") {
      if(isGroceryOrder(obj))fail('Use only the exact personally reviewed grocery merchant quote.');
      if(obj?.delivery==='Shipping')fail('Review this Store’s original shipping coverage and quote.');
      if (
        !obj ||
        obj.kind !== "order" ||
        obj.venueId !== venue.id ||
        obj.status !== "quote-requested"
      )
        fail("Choose this venue’s open quote request.");
      const values = [data.subtotal, data.fees, data.discount, data.tip];
      if (
        values.some(
          (v) => !v?.trim() || !Number.isFinite(Number(v)) || Number(v) < 0,
        )
      )
        fail(
          "Every quote component must be supplied, including explicit zero values. Unknown is not zero.",
        );
      if (
        !data.currency?.trim() ||
        !data.expires ||
        !Number.isFinite(Date.parse(data.expires))
      )
        fail("A quote needs its asset and a valid expiry.");
      if(data.currency!=="USD")fail("New merchant quotes require explicit USD amounts. Historical quotes keep their original currency.");
      if(values.some(v=>!/^\d+(?:\.\d{1,2})?$/.test(v)))fail("Use exact USD amounts with at most two decimal places.");
      const minor=(v:string)=>{const [whole,fraction=""]=v.split(".");return BigInt(whole)*100n+BigInt(fraction.padEnd(2,"0"));};
      const totalMinor=minor(data.subtotal)+minor(data.fees)+minor(data.tip)-minor(data.discount);
      if(totalMinor<0n||totalMinor>BigInt(Number.MAX_SAFE_INTEGER))fail("Review a nonnegative supported USD quote total.");
      const total=`${totalMinor/100n}.${String(totalMinor%100n).padStart(2,"0")}`;
      Object.assign(obj, {
        quote: {
          subtotal: data.subtotal,
          fees: data.fees,
          discount: data.discount,
          tip: data.tip,
          total,
          currency: data.currency,
          expires: data.expires,
          version: id(),
          source: "User-entered sample provider quote",
        },
        priceStatus: "Quoted — review required",
        status: "quoted",
      });
      message =
        "Sample quote recorded for this exact basket and seller. Nothing is ordered or paid.";
    } else if (op === "order.requote") {
      if(isGroceryOrder(obj))fail('Keep the original grocery quote. Cancel the unsent order and prepare a newly reviewed grocery original for changed terms.');
      if (
        !obj ||
        obj.kind !== "order" ||
        obj.venueId !== venue.id ||
        obj.status !== "quoted"
      )
        fail("Only an unplaced quote can be refreshed.");
      if (!venue.operatorActive) fail("This venue is not taking new quotes.");
      obj.quoteHistory = [
        ...(Array.isArray(obj.quoteHistory) ? obj.quoteHistory : []),
        obj.quote,
      ];
      delete obj.quote;
      if(obj.commerceExampleReply){obj.commerceExampleHistory=[...(Array.isArray(obj.commerceExampleHistory)?obj.commerceExampleHistory:[]),obj.commerceExampleReply];delete obj.commerceExampleReply;}
      obj.status = "quote-requested";
      obj.priceStatus = "Fresh quote requested";
      message =
        "Fresh quote requested for the same basket and seller. The old version cannot be approved.";
    } else if (op === "order.bind") {
      if (
        !obj ||
        obj.kind !== "order" ||
        obj.venueId !== venue.id ||
        obj.status !== "quoted"
      )
        fail("Review the current order quote first.");
      if(!venue.operatorActive)fail("This Spot is unavailable for a new order. Keep your original quote and history.");
      if(venue.id===gymRetailVenueId&&JSON.stringify(catalogueOrderLines(w,venue.id,obj.items as OrderBasketLine[]))!==JSON.stringify(obj.items))fail("This Gym catalogue or physical classification changed. Review the exact original items again.");
      if(obj.sellerSnapshot&&((obj.sellerSnapshot as Record<string,unknown>).venueId!==venue.id||(obj.sellerSnapshot as Record<string,unknown>).name!==venue.name))fail("This order’s original seller changed. Review a new request instead of replacing the original seller.");
      const quote = obj.quote as Record<string, string> | undefined;
      if (!quote || Date.parse(quote.expires) <= Date.now())
        fail(
          "This quote expired. Request a fresh quote before placing the order.",
        );
      if (data.approved !== "Yes" || data.quoteVersion !== quote.version)
        fail(
          "Approve the exact current basket, seller, asset, fees and total.",
        );
      if(isGroceryOrder(obj)){assertCurrentGroceryOrder(w,obj.id);if(data.groceryReview!==groceryCanonicalPreflight(w,obj.id))fail('Personally review this exact grocery delivery window, address label, substitutions and USD quote.');}
      if(obj.delivery==='Shipping'&&(!storeShippingPreflightReview(obj)||data.shippingReview!==storeShippingPreflightReview(obj)))fail('Review this exact shipping destination, coverage and original charge before binding.');
      if(needsPickupPreflight(obj)&&(!pickupPreflightReview(obj)||data.pickupReview!==pickupPreflightReview(obj)))fail("Review the exact available pickup window before placing this order.");
      if(!orderNoteAllowsBinding(obj))fail("The venue must respond to this exact requirement and quote before you order. A price quote or payment is not that response.");
      Object.assign(obj, {
        status: "placed-demo",
        priceStatus: "Agreed sample quote",
        fulfilment: "Awaiting seller acceptance",
      });
      message =
        "Binding sample order placed against the reviewed quote. Payment remains a separate attempt.";
    } else if (op === "order.status") {
      if (!obj || obj.kind !== "order" || obj.venueId !== venue.id)
        fail("Order unavailable in this venue.");
      if (data.status === "Cancel") {
        if(obj.status==="declined")fail("The seller declined this request. No accepted order needs cancellation; retain this original response.");
        if (obj.status === "cancelled")
          fail("This request is already cancelled.");
        obj.status =
          obj.status === "quote-requested" || obj.status === "quoted"
            ? "cancelled"
            : "cancellation-requested";
        message =
          "Sample cancellation recorded on the original order; seller acceptance and refunds remain separate.";
      } else {
        if(isGroceryOrder(obj))fail('Use this exact paid grocery order’s original acceptance and delivery workflow.');
        if(isMerchantExampleVenue(obj.venueId))fail("Use this paid order’s original merchant preparation and pickup workflow.");
        if (obj.status !== "placed-demo")
          fail("An open quote or cancelled order cannot enter fulfilment.");
        const steps = [
          "Awaiting seller acceptance",
          "Accepted",
          "Preparing",
          "Ready for pickup",
          "Delivered",
        ];
        if (
          steps.indexOf(data.status) !==
          steps.indexOf(String(obj.fulfilment)) + 1
        )
          fail("Follow the seller’s next fulfilment state on this same order.");
        obj.fulfilment = data.status;
        message = "Sample fulfilment status updated for the same order.";
      }
    } else if (op === "booking.create") {
      if (!venue.operatorActive) fail("This Spot is not taking bookings.");
      if (
        !data.date ||
        !data.time ||
        !Number.isFinite(Date.parse(data.date)) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)
      )
        fail("Choose a valid date and time.");
      try {
        new Intl.DateTimeFormat("en", {
          timeZone: data.timezone || "Europe/Berlin",
        });
      } catch {
        fail("Choose a valid time zone.");
      }
      if (
        data.partySize &&
        (!Number.isInteger(Number(data.partySize)) ||
          Number(data.partySize) < 1)
      )
        fail("Choose a valid number of guests.");
      if (data.conflict === "Yes")
        fail(
          "This time conflicts with another commitment. Choose another slot.",
        );
      create("booking", {
        name: data.name || "A meeting together",
        venueId: venue.id,
        date: data.date,
        time: data.time,
        timezone: data.timezone || "Europe/Berlin",
        owner: w.owner,
        participants: data.participants || "You and your guests",
        partySize: data.partySize || "",
        notes: data.notes || "",
        status: "requested",
        capacity: "Awaiting venue confirmation",
        priceStatus: "Price to be agreed",
        sourceId: ctx.sourceId || "",
      });
      message =
        "Reservation requested. Availability, access and payment are not yet confirmed.";
    } else if (op === "booking.update") {
      if (obj?.offerId)
        fail("Use the original offer request to preserve its agreed terms.");
      if (!obj || obj.kind !== "booking" || obj.venueId !== venue.id)
        fail("Booking unavailable in this Spot.");
      if (obj.status === "cancelled" && data.action !== "Cancel")
        fail("This booking was cancelled. Start a new request.");
      if (data.action !== "Cancel" && !venue.operatorActive)
        fail("This Spot is not taking booking changes.");
      if (data.action === "Change") {
        const date = data.date || String(obj.date || "");
        const time = data.time || String(obj.time || "");
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
        )
          fail("Choose a valid date and time.");
        try {
          new Intl.DateTimeFormat("en", {
            timeZone: data.timezone || String(obj.timezone),
          });
        } catch {
          fail("Choose a valid time zone.");
        }
        if (
          data.partySize &&
          (!Number.isInteger(Number(data.partySize)) ||
            Number(data.partySize) < 1)
        )
          fail("Choose a valid number of guests.");
      }
      if (data.action === "Cancel") {
        obj.status = "cancelled";
        if (
          !venue.visited &&
          !venue.otherGrant &&
          !w.objects.some(
            (o) =>
              o.id !== obj.id &&
              o.owner === w.owner &&
              o.kind === "booking" &&
              o.venueId === venue.id &&
              o.status === "confirmed",
          )
        )
          venue.membership = "none";
        message =
          "Sample reservation cancelled. Related grants were checked; private contacts remain.";
      } else if (data.action === "Provider confirms") {
        obj.status = "confirmed";
        message =
          "Sample venue confirmation received. Physical access rights remain separate.";
      } else {
        Object.assign(obj, {
          date: data.date || obj.date,
          time: data.time || obj.time,
          timezone: data.timezone || obj.timezone,
          partySize: data.partySize || obj.partySize,
          notes: data.notes ?? obj.notes,
          name: data.name || obj.name,
          status: "change-requested",
        });
        message = "Change requested on the same booking.";
      }
    } else if (op === "object.create") {
      if(data.id||data.owner)fail("A generic draft cannot choose or replace an original identity or owner.");
      const kind = data.kind || "request";
      if(kind==="support-ticket")fail("Use the exact source and request review in Help.");
      if(kind==="memory")fail("Use the explicit own-memory fact and purpose review.");
      if(["sourceNoteId","sourceNoteVersion","noteMemoryFingerprint"].some(key=>key in data))fail("Confirm this exact note source through its separate memory review.");
      if(data.bookingType==="travel")fail("Prepare travel bookings from their exact selected comparison option.");
      if(["award-report-result-preview","operator-authority","publisher-grant","crays-credit-grant","venue-catalogue","catalogue-service-review","reminder","pdf-questions","article-explanation","personal-news-digest","source-comparison","public-research","personal-deadline","private-document-bundle","document-source-preview","personal-note","personal-note-search","personal-habit","personal-occasion","occasion-message-draft","occasion-contact-preview","personal-checklist","appointment-plan","week-plan","calendar-source-preview","day-agenda","trip-plan","travel-comparison","travel-source-preview","app-connection","chuck-model-account","spot-membership-purchase-preview","space-membership-preview","membership-pass-preview","ecosystem-invoice-preview","nutrition-day-preview","meal-diary-preview","training-plan-preview","training-session-preview","training-template-preview","training-calendar-preview","profile-social-links","creator-profile"].includes(kind))fail("This authority can only come from its separately verified assignment, not a generic guest request.");
      if (
        kind === "private-message" &&
        (!person || !canDirectMessage(w, person.id))
      )
        fail(
          "This private recipient has not accepted the connection or current messaging permission has ended.",
        );
      if (["group-message", "call"].includes(kind))
        fail(
          "Use the permission-checked conversation action for this channel.",
        );
      const { kind: _kind, ...fields } = data;
      create(kind, {
        name: data.name || data.text || "New request",
        ...fields,
        status: data.status || "draft",
        sourceId: ctx.sourceId || ctx.postId || "",
        sourceTaskId: ctx.sourceTaskId || "",
        venueId: ctx.venueId,
        personId: ctx.personId,
      });
      message =
        "Draft saved in its original context. No external action was taken.";
    } else if (op === "object.update") {
      if(data.kind==="support-ticket"||w.objects.some(o=>o.id===ctx.objectId&&["support-ticket","visit-review"].includes(String(o.kind))))fail("Keep the original request. Use its own reviewed support action.");
      if(obj?.kind==='private-message'&&['localViewTimer','createdAt','personId'].some(k=>k in data))fail('Keep the original recipient, recorded time and message timer. Edit only the message through its own workflow.');
      if(w.objects.some(o=>o.id===ctx.objectId&&o.kind==="memory"))fail("Use the exact own-memory review. Original records remain unchanged.");
      if(["sourceNoteId","sourceNoteVersion","noteMemoryFingerprint"].some(key=>key in data))fail("Keep this memory source provenance. Use the original note’s reviewed memory flow.");
      if(obj&&data.kind&&data.kind!==obj.kind)fail("Keep this original object type. Use its own reviewed workflow for a different action.");
      if(data.bookingType==="travel"||["award-report-result-preview","operator-authority","publisher-grant","crays-credit-grant","venue-catalogue","catalogue-service-review","reminder","pdf-questions","article-explanation","personal-news-digest","source-comparison","public-research","personal-deadline","private-document-bundle","document-source-preview","personal-note","personal-note-search","personal-habit","personal-occasion","occasion-message-draft","occasion-contact-preview","personal-checklist","appointment-plan","week-plan","calendar-source-preview","day-agenda","trip-plan","travel-comparison","travel-source-preview","app-connection","chuck-model-account","spot-membership-purchase-preview","space-membership-preview","membership-pass-preview","ecosystem-invoice-preview","nutrition-day-preview","meal-diary-preview","training-plan-preview","training-session-preview","training-template-preview","training-calendar-preview","profile-social-links","creator-profile"].includes(data.kind))fail("Use the original reviewed workflow; an ordinary edit cannot create this authority.");
      if(obj&&((data.id&&data.id!==obj.id)||(data.owner&&data.owner!==w.owner)))fail("Keep this original identity and owner. Reopen its own workflow.");
      if (obj && ["venue-catalogue","catalogue-service-review","reminder","pdf-questions","article-explanation","personal-news-digest","source-comparison","public-research","personal-deadline","private-document-bundle","document-source-preview","personal-note","personal-note-search","personal-habit","personal-occasion","occasion-message-draft","occasion-contact-preview","personal-checklist","appointment-plan","week-plan","calendar-source-preview","day-agenda","trip-plan","travel-comparison","travel-source-preview","app-connection","chuck-model-account","spot-membership-purchase-preview","space-membership-preview","membership-pass-preview","ecosystem-invoice-preview","nutrition-day-preview","meal-diary-preview","training-plan-preview","training-session-preview","training-template-preview","training-calendar-preview","profile-social-links","creator-profile"].includes(String(obj.kind))) fail("Use this catalogue’s reviewed workflow to retain its source, price and permission checks.");
      if (!obj) fail("This item is unavailable to this account.");
      Object.assign(obj, data);
      message = "Updated this item only. Source context is retained.";
    } else if (op === "object.delete") {
      if(data.kind==="support-ticket"||w.objects.some(o=>o.id===ctx.objectId&&["support-ticket","visit-review"].includes(String(o.kind))))fail("Keep the original request. Use its own reviewed support action.");
      if(w.objects.some(o=>o.id===ctx.objectId&&o.kind==="memory"))fail("Use the exact own-memory review. Original records remain unchanged.");
      if (obj && ["venue-catalogue","catalogue-service-review","reminder","pdf-questions","article-explanation","personal-news-digest","source-comparison","public-research","personal-deadline","private-document-bundle","document-source-preview","personal-note","personal-note-search","personal-habit","personal-occasion","occasion-message-draft","occasion-contact-preview","personal-checklist","appointment-plan","week-plan","calendar-source-preview","day-agenda","trip-plan","travel-comparison","travel-source-preview","app-connection","chuck-model-account","spot-membership-purchase-preview","space-membership-preview","membership-pass-preview","ecosystem-invoice-preview","nutrition-day-preview","meal-diary-preview","training-plan-preview","training-session-preview","training-template-preview","training-calendar-preview","profile-social-links","creator-profile"].includes(String(obj.kind))) fail("Use this catalogue’s withdrawal or review workflow. Existing originals must remain traceable.");
      if (!obj) fail("Item unavailable.");
      w.objects = w.objects.filter((o) => o.id !== obj.id);
      message =
        "Removed from your demo account. Copies on independent services are not claimed deleted.";
    } else if (op === "creator.offer.save") {
      if (ctx.objectId && (!obj || obj.kind !== "creator-offer"))
        fail("Choose your own offer draft.");
      if (!data.name?.trim()) fail("Give your offer a title.");
      if(data.currency!=="USD")fail("New offers require an explicitly entered USD price; historical asset prices are not converted automatically.");
      if (
        data.price &&
        (!/^\d+(\.\d{1,2})?$/.test(data.price) || Number(data.price) <= 0)
      )
        fail("Enter a positive price, or leave it open in a draft.");
      if (data.price && !data.currency?.trim())
        fail("Choose the currency for this exact price.");
      if (
        data.postId &&
        !w.posts.some((p) => p.id === data.postId && p.author === w.owner)
      )
        fail("Choose your own original content.");
      if (data.expires && !Number.isFinite(Date.parse(data.expires)))
        fail("Choose a valid offer end date.");
      for (const key of [
        "discount3",
        "discount6",
        "discount12",
        "promotionPercent",
      ]) {
        if (
          data[key] &&
          (!Number.isFinite(Number(data[key])) ||
            Number(data[key]) < 0 ||
            Number(data[key]) >= 100)
        )
          fail("Use a discount from zero to below 100 percent.");
      }
      if (
        data.monthlyPrice &&
        (!/^\d+(\.\d{1,2})?$/.test(data.monthlyPrice) || !Number.isFinite(Number(data.monthlyPrice)) ||
          Number(data.monthlyPrice) <= 0)
      )
        fail("Use a positive monthly bundle price.");
      if (
        ["discount3", "discount6", "discount12"].some((k) => data[k]) &&
        !data.monthlyPrice
      )
        fail("Set the monthly basis before reviewing bundle discounts.");
      if (
        data.trialDays &&
        (!Number.isInteger(Number(data.trialDays)) ||
          Number(data.trialDays) <= 0)
      )
        fail("Use a positive whole number of trial days.");
      if (
        data.promotionStarts &&
        data.promotionEnds &&
        Date.parse(data.promotionStarts) >= Date.parse(data.promotionEnds)
      )
        fail("The promotion must end after it starts.");
      if (data.serviceValidUntil && !creatorServiceValidity({ id: "draft", owner: w.owner, serviceValidUntil: data.serviceValidUntil }))
        fail("Choose a valid future service expiry; it is separate from the offer’s sale deadline.");
      const artistSpec=data.format==='Artist NFT'?artistNftOfferSpec(w,data.artistNftId||''):undefined;
      if(artistSpec&&(data.postId!==artistSpec.postId||data.term!=='Unique artwork · one edition'||data.conditions!==artistSpec.terms))fail("Keep this exact artist artwork, one-edition term and original issuer rights.");
      const fields = {
        ...data,
        artistNft:artistSpec,
        artistNftId:artistSpec?.assetId||'',
        name: data.name.trim(),
        status: "draft",
        priceStatus: data.price ? "Creator-entered draft price" : "Not set",
        craysSalesCommission: "0%",
        publication: "not-published",
        payment: "not-requested",
        licence: "not-issued",
      };
      if (obj) {
        Object.assign(obj, fields);
        objectId = obj.id;
      } else create("creator-offer", fields);
      message =
        "Offer draft saved. Nothing has been published, charged or licensed.";
    } else if (op.startsWith("web.support.")) {
      const result=applyWebSupport(w,op,data,ctx);if(!result)fail("Review this support action.");objectId=result!.objectId;message=result!.message;
    } else if (op.startsWith("web.memory.")) {
      const result=applyWebMemory(w,op,data,ctx);if(!result)fail("Review this memory action.");
      objectId=result!.objectId;message=result!.message;
    } else if (op === "web.notifications.save") {
      if(ctx.personId&&ctx.personId!==w.owner)fail("Review your own notification preferences.");
      w.settings=saveNotificationPreference(w,w.owner,data.category,data.part,data.expectedSnapshot,data.value,data.reviewed).settings;
      message="Your category preference was saved locally. No notification was sent or scheduled.";
    } else if (op === "settings.save") {
      if(data.key==="notifications"||data.key?.startsWith("notifications:")||data.key?.startsWith("web-notification:"))fail("Use your own reviewed notification category controls.");
      if (!data.key) fail("Choose a setting.");
      if(data.key.startsWith('web-typing-preference:'))fail('Use the reviewed typing preference for your own account.');
      if(data.key==='typing'&&(!w.identity.signedIn||w.owner!=='thorben'))fail('This legacy preference belongs to its original account. Review your own messaging preferences.');
      w.settings[data.key] =
        data.value === "Yes" ? true : data.value === "No" ? false : data.value;
      message =
        "Preference updated. It does not grant new access to private content.";
    } else if (op === "web.vif.group-call.start") {
      let ids:string[];try{ids=JSON.parse(data.personIds);}catch{fail('Choose your exact VIFs.');}
      const expected=groupCallReview(w,ids!);
      if(data.approved!=='Yes'||data.expected!==expected||!['Voice','Video'].includes(data.type))fail('Review these current people and call type before preparing a group preview.');
      if(w.identity.relayState==='offline')fail('You are offline. No group preview was started.');
      if(w.objects.some(o=>o.owner===w.owner&&o.kind==='web-group-call'&&['ringing','ongoing','interrupted'].includes(String(o.status))))fail('An earlier group preview is still active. Review or end that same preview first.');
      create('web-group-call',{name:data.type+' group call preview',type:data.type,status:'ringing',version:1,peers:ids!.map(personId=>({personId,status:'ringing'})),sourceSnapshot:expected,createdAt:Date.now(),realExecution:false,microphone:false,camera:false,recording:false,transcription:false,chuckIncluded:false});
      message='Group call preview prepared locally. Nobody was called or invited.';
    } else if (op === "web.vif.group-call.transition") {
      if(!obj)fail('Choose your exact own group call preview.');
      applyGroupCallAction(w,obj!,data.action,data.personId||'',data.version);
      objectId=obj!.id;message='This local group preview was updated. No live media is transmitted.';
    } else if (op === "web.vif.call-link.prepare") {
      const review=callLinkContext(w,data.chatId);
      if(data.approved!=='Yes'||data.expected!==review.expected)fail("Review this current conversation and exact call preview again.");
      if(!['Voice','Video'].includes(data.type)||!Object.hasOwn(callLinkDurations,data.duration)||typeof data.note!=='string'||data.note.length>400)fail("Choose a supported call type, expiry and note of up to 400 characters.");
      const createdAt=Date.now();
      create('web-call-link',{name:data.type+' call link preview',chatId:data.chatId,channelId:review.conversation.channel,type:data.type,note:data.note.trim(),status:'active',sourceSnapshot:review.expected,createdAt,expiresAt:createdAt+callLinkDurations[data.duration as keyof typeof callLinkDurations],realExecution:false,chuckIncluded:false});
      message="Local call link preview prepared. No real join link was created and nothing was sent.";
    } else if (op === "web.vif.call-link.revoke") {
      if(!ownPrivateAccount(w)||!obj||obj.kind!=='web-call-link'||obj.owner!==w.owner||w.objects.filter(o=>o.id===obj.id).length!==1||obj.chatId!==data.chatId||data.approved!=='Yes')fail("Choose your exact own call link and confirm revocation.");
      if(callLinkState(w,obj)==='Needs review'&&obj.realExecution!==false)fail("This original call link privacy state needs review.");
      if(obj.status!=='revoked'){obj.status='revoked';obj.revokedAt=Date.now();}
      message="This local call link preview is revoked. Existing draft text and other people's records are unchanged.";
    } else if (op === "call.start") {
      if(!ownPrivateAccount(w))fail("Sign in before starting your own call.");
      if(!["Voice","Video"].includes(data.type))fail("Choose voice or video explicitly before calling.");
      if(data.direction!==undefined&&!["incoming-preview","outgoing-preview"].includes(data.direction))fail("Choose an explicit local incoming or outgoing preview.");
      const channelId = communicationContext(w, ctx);
      if (!channelAllowed(w, channelId))
        fail(
          "A current accepted VIF connection or permitted Circle membership is required to call.",
        );
      if (w.identity.relayState === "offline")
        fail("You are offline. No call was started.");
      if (
        w.objects.some(
          (o) =>
            o.kind === "call" && o.owner===w.owner &&
            o.channelId === channelId &&
            ["ringing", "connected-demo", "interrupted"].includes(
              String(o.status),
            ),
        )
      )
        fail("This conversation already has an active call attempt.");
      create("call", {
        name: data.type === "Video" ? "Video call" : "Voice call",
        channelId,
        personId: channelId.startsWith("person:") ? channelId.slice(7) : "",
        groupId: channelId.startsWith("group:") ? channelId.slice(6) : "",
        type: data.type === "Video" ? "Video" : "Voice",
        status: "ringing",
        direction: data.direction||"outgoing-preview",
        microphone: false,
        camera: false,
        realExecution: false,
        recording: false,
        transcription: false,
        chuckIncluded: false,
        createdAt: stamp(),
      });
      message =
        "Demo call is ringing. No microphone, camera, recording, transcription or Chuck participation is active.";
    } else if (op === "call.transition") {
      if (!ownPrivateAccount(w)||!obj || typeof obj.id!=='string'||!obj.id.trim()||obj.owner!==w.owner||obj.kind !== "call"||w.objects.filter(o=>o.id===obj.id).length!==1) fail("Choose your unique original call attempt.");
      if(!validVifCallPreview(obj))fail("This original call type or privacy state needs review.");
      if(!["Answer","Interrupted","Resume","End","Decline","NoAnswer","Busy","MicrophoneDenied","CameraDenied"].includes(data.state))fail("Choose an explicit available call action.");
      if(ctx.personId&&obj.channelId!==`person:${ctx.personId}`)fail("This call does not belong to the selected conversation.");
      if(ctx.chatId){const expected=ctx.chatId==='alex'?'person:alex':ctx.chatId==='circle'?'group:circle-design':ctx.chatId.startsWith('person:')||ctx.chatId.startsWith('group:')?ctx.chatId:'';if(!expected||obj.channelId!==expected)fail("This call does not belong to the selected conversation.");}
      if(!["ringing","connected-demo","interrupted","ended","declined","missed","busy","failed"].includes(String(obj.status)))fail("This original call state needs review.");
      if(data.state==='Decline'&&obj.status!=='ringing'&&obj.status!=='declined')fail("Only a ringing call can be declined.");
      if(data.state==='Answer'&&obj.status!=='ringing')fail("Only this ringing attempt can be answered.");
      if(data.state==='Interrupted'&&obj.status!=='connected-demo')fail("Only an ongoing call can become interrupted.");
      if(data.state==='Resume'&&obj.status!=='interrupted')fail("Only an interrupted call can reconnect.");
      if(["NoAnswer","Busy"].includes(data.state)&&obj.status!=="ringing")fail("Only a ringing preview can finish with no answer or busy.");
      if(["MicrophoneDenied","CameraDenied"].includes(data.state)&&!["ringing","connected-demo","interrupted"].includes(String(obj.status)))fail("Choose a current call attempt for a device-permission example.");
      if(data.state==="CameraDenied"&&obj.type!=="Video")fail("Camera permission examples apply to video calls.");
      const terminalAction=["End","Decline","NoAnswer","Busy","MicrophoneDenied","CameraDenied"].includes(data.state);
      if(!terminalAction&&w.identity.relayState==='offline')fail("You are offline. This call cannot connect or resume.");
      if (terminalAction) {
        if(!["ended","declined","missed","busy","failed"].includes(String(obj.status))){
          obj.status = data.state === "End" ? "ended" : data.state === "Decline"?"declined":data.state==="NoAnswer"?"missed":data.state==="Busy"?"busy":"failed";
          if(["MicrophoneDenied","CameraDenied"].includes(data.state))obj.permissionErrorExample=data.state==="CameraDenied"?"Camera permission denied":"Microphone permission denied";
          obj.endedAt = stamp();
        }
      } else {
        if (!channelAllowed(w, String(obj.channelId)))
          fail(
            "Permission for this conversation has ended. The call cannot connect or resume.",
          );
        if (["ended", "declined"].includes(String(obj.status)))
          fail(
            "This call has ended. Start a new explicit attempt to call again.",
          );
        obj.status =
          data.state === "Interrupted" ? "interrupted" : "connected-demo";
      }
      const label=({ringing:"This call preview is ringing","connected-demo":"Connected in this local preview",interrupted:"This call preview is interrupted",ended:"This call preview has ended",declined:"This call preview was declined",missed:"No answer in this call preview",busy:"Busy in this call preview",failed:String(obj.permissionErrorExample||"Device permission denied")+" · local example"} as Record<string,string>)[String(obj.status)];
      message = `${label}. No live audio or video is transmitted.`;
    } else if (op === "privacy.grant") {
      if(!ownPrivateAccount(w))fail("Sign in before reviewing your own limited permission.");
      const requiresParticipants = data.requiresParticipants === "Yes";
      const channelId = requiresParticipants
        ? communicationContext(w, ctx)
        : "";
      if (requiresParticipants && !channelAllowed(w, channelId))
        fail("Open an accepted VIF or permitted Circle before inviting Chuck.");
      if (
        requiresParticipants &&
        data.history === "Selected messages only" &&
        !data.selectedMessages?.trim()
      )
        fail("Choose the exact messages before approving historical access.");
      if(data.expires?.trim()&&data.expires.trim().toLowerCase()!=="until revoked"&&!Number.isFinite(Date.parse(data.expires)))fail("Use an explicit future expiry date or Until revoked. An unclear expiry cannot become unlimited access.");
      const expiresAt = data.expires&&data.expires.trim().toLowerCase()!=="until revoked"?Date.parse(data.expires):undefined;
      if (expiresAt !== undefined && expiresAt <= Date.now())
        fail("Choose a future permission expiry.");
      if (
        requiresParticipants &&
        data.participantConsent === "Yes" &&
        ["Chuck", "Chuck Crays"].includes((data.recipient || "Chuck").trim())
      ) {
        for (const prior of w.objects.filter(
          (o) =>
            o.owner === w.owner &&
            o.kind === "permission" &&
            o.channelId === channelId &&
            o.recipient === "Chuck" &&
            o.status === "active",
        )) {
          prior.status = "superseded";
          prior.endedAt = stamp();
        }
      }
      create("permission", {
        channelId,
        startsAt: stamp(),
        expiresAt,
        allParticipantsApproved:
          requiresParticipants && data.participantConsent === "Yes",
        participantResponseExample:requiresParticipants&&['Waiting','Accept','Decline'].includes(data.response)?data.response:undefined,
        selectedMessageIds:
          data.selectedMessages
            ?.split(",")
            .map((x) => x.trim())
            .filter(Boolean) || [],
        automaticMemory: false,
        recording: false,
        transcription: false,
        name: data.name || "Limited permission",
        recipient: ["Chuck", "Chuck Crays"].includes(data.recipient?.trim())
          ? "Chuck"
          : data.recipient || "Chuck",
        purpose: data.purpose || "This task only",
        dataType: data.dataType || "Selected information",
        history: data.history || "From now only",
        expires: data.expires || "Until revoked",
        status:
          data.requiresParticipants === "Yes" &&
          data.participantConsent !== "Yes"
            ? "awaiting-participant-consent"
            : "active",
      });
      message =
        "Limited demo permission saved for the named data, recipient and purpose.";
    } else if (op === "privacy.revoke") {
      if(!ownPrivateAccount(w))fail("Sign in before withdrawing your own permission.");
      if(!obj||typeof obj.id!=="string"||!obj.id.trim()||!["permission","delegation"].includes(String(obj.kind))||w.objects.filter(o=>o.id===ctx.objectId).length!==1)fail("Open your own original permission or delegation. Other source records cannot be revoked through this control.");
      if(!data.reviewedSnapshot||data.reviewedSnapshot!==privacyReviewSnapshot(obj)||data.confirmed!=="Yes")fail("This permission changed or has not been confirmed. Review its current recipient, purpose and scope again.");
      if(obj.status!=="revoked"){
        obj.previousStatus=obj.status;obj.status="revoked";obj.revokedAt=Date.now();obj.revokedBy=w.owner;obj.revokeVersion=Number(obj.revokeVersion||0)+1;
      }
      message="This local permission is withdrawn for future use. Other provider scopes and previous messages, bookings, payments and received copies retain their own status.";
    } else if (op === "assessment.save") {
      if (!instruments.includes(data.instrument))
        fail("Choose one of the four independent instruments.");
      if (!data.result?.trim())
        fail("Add your own result or reflection first.");
      create("assessment", {
        name: `${data.instrument} · your perspective`,
        instrument: data.instrument,
        result: data.result.trim(),
        source: data.source?.trim() || "Self-reported; provider unknown",
        instrumentVersion: data.instrumentVersion?.trim() || "Not supplied",
        scoringVersion: data.scoringVersion?.trim() || "Not supplied",
        language: data.language || "Not supplied",
        testedAt: data.testedAt || "Not supplied",
        importedAt: Date.now(),
        version: 1,
        status: "self-reported-not-validated",
        matching: "No",
        public: "No",
      });
      message = "Saved privately. No matching use or disclosure is enabled.";
    } else if (op === "assessment.grant") {
      if (!obj || obj.kind !== "assessment" || obj.status === "revoked")
        fail("Choose an available result.");
      let purposes: string[] = [];
      try {
        purposes = JSON.parse(data.purposes || "[]");
      } catch {
        fail("Choose matching purposes.");
      }
      if (
        !Array.isArray(purposes) ||
        purposes.some((p) => !matchingPurposes.includes(p))
      )
        fail("Choose valid purposes.");
      for (const g of w.objects.filter(
        (g) =>
          g.owner === w.owner &&
          g.kind === "assessment-permission" &&
          g.resultId === obj!.id &&
          g.use === "matching" &&
          g.status === "active",
      ))
        g.status = "superseded";
      if (purposes.length)
        create("assessment-permission", {
          name: `${obj!.instrument} matching permission`,
          resultId: obj!.id,
          version: obj!.version,
          use: "matching",
          purposes,
          recipient: "CRAYS matching",
          status: "active",
          createdAt: Date.now(),
          disclosure: false,
        });
      obj!.matching = purposes.length ? "Yes" : "No";
      message =
        "Matching permission updated for this result and these purposes only. The result remains private.";
    } else if (op === "assessment.revoke") {
      if (!obj || obj.kind !== "assessment") fail("Result unavailable.");
      for (const g of w.objects.filter(
        (g) =>
          g.owner === w.owner &&
          g.kind === "assessment-permission" &&
          g.resultId === obj!.id &&
          g.status === "active",
      ))
        g.status = "revoked";
      obj!.matching = "No";
      obj!.public = "No";
      message =
        "Future matching use and sharing permissions revoked for this result. Your other results and contacts remain unchanged.";
    } else if (op === "nostr.source.save") {
      const sourceId = data.sourceId || `custom:${data.url?.trim()}`;
      const previous = relaySources(w).find((r) => r.id === sourceId);
      const rawOriginals=w.objects.filter(o=>o.owner===w.owner&&o.kind==='nostr-relay'&&o.sourceId===sourceId);
      if(rawOriginals.length&&!previous)fail('Conflicting or malformed original source preferences need review.');
      if(data.sourceId&&!previous)fail('This source is unavailable or ambiguous. Open its original instead of creating a replacement.');
      if(['read','write','feed','publishPublic'].some(k=>!['Yes','No'].includes(data[k])))fail('Choose Yes or No for each source preference.');
      if(data.reviewedSnapshot!==undefined&&data.reviewedSnapshot!==(previous?relaySourceSnapshot(w,sourceId):''))fail('This original source changed. Review it again.');
      let url: URL;
      try {
        url = new URL((data.url || previous?.url || "").trim());
      } catch {
        fail("Enter a valid wss:// relay address.");
      }
      if (
        url!.protocol !== "wss:" ||
        url!.username ||
        url!.password ||
        url!.hash
      )
        fail(
          "Use a secure wss:// relay address without credentials or a fragment.",
        );
      if (
        relaySources(w).some(
          (r) =>
            r.id !== sourceId &&
            !r.removed &&
            relayUrl(r.url) === url!.href,
        )
      )
        fail("This relay is already in your sources.");
      if(!data.sourceId&&previous&&relayUrl(previous.url)!==url!.href)fail('This saved source has its own stable original. Open that source before changing its address.');
      const category = previous?.category || "Public";
      if (
        previous &&
        category !== "Public" &&
        new URL(previous.url).href !== url!.href
      )
        fail(
          "Spot and Creator source addresses belong to that Spot or Creator. Add an independent public relay separately.",
        );
      const values = {
        sourceId,
        name: data.name?.trim() || previous?.name || url!.hostname,
        url: url!.href,
        category,
        venueId: previous?.venueId,
        personId: previous?.personId,
        read: data.read === "Yes",
        write: data.write === "Yes",
        feed: data.feed === "Yes",
        removed: false,
        publishPublic: category === "Public" && data.publishPublic === "Yes",
        status: "cached-preview",
        updatedAt: Date.now(),
      };
      const existing = w.objects.find(
        (o) =>
          o.owner === w.owner &&
          o.kind === "nostr-relay" &&
          o.sourceId === sourceId,
      );
      if (existing) {
        Object.assign(existing, values);
        objectId = existing.id;
      } else create("nostr-relay", values);
      message =
        "Relay preferences saved locally. No live connection, membership or public relay-list publication was made.";
    } else if (op === "nostr.source.remove") {
      const source = relaySources(w).find((r) => r.id === data.sourceId);
      if (!source) fail("Relay unavailable or ambiguous. Review the original source.");
      if(data.reviewedSnapshot!==undefined&&data.reviewedSnapshot!==relaySourceSnapshot(w,data.sourceId))fail('This original source changed. Review it before removal.');
      const existing = w.objects.find(
        (o) =>
          o.owner === w.owner &&
          o.kind === "nostr-relay" &&
          o.sourceId === source!.id,
      );
      if (existing)
        Object.assign(existing, {
          removed: true,
          feed: false,
          read: false,
          write: false,
        });
      else {
        const { id: sourceKey, ...fields } = source!;
        create("nostr-relay", {
          ...fields,
          sourceId: sourceKey,
          removed: true,
          feed: false,
          read: false,
          write: false,
        });
      }
      message =
        "Relay removed from this client. Contacts, Spot membership and events on other relays are unchanged.";
    } else if (op === "nostr.sources.publish") {
      if(data.reviewedSnapshot!==relayListReviewSnapshot(w))fail('The public relay list, account or signer changed. Review again.');
      signer();
      if (data.confirm !== "Yes")
        fail("Review and approve the exact public relay list first.");
      const sources = relaySources(w).filter(
        (r) =>
          !r.removed &&
          r.publishPublic &&
          r.category === "Public" &&
          (r.read || r.write),
      );
      if (!sources.length)
        fail("Choose at least one public relay for this list.");
      create("nostr-relay-list", {
        name: "Public relay list",
        kindNumber: 10002,
        sources: sources.map((r) => ({
          url: r.url,
          read: r.read,
          write: r.write,
        })),
        status: "signed-demo-only",
        actualPublication: false,
      });
      message =
        "Relay-list signature simulated. No Nostr event was broadcast; Spot and private Creator sources were excluded.";
    } else if (op === "nostr.relay") {
      w.identity.relayState =
        data.state === "Offline"
          ? "offline"
          : data.state === "Partial"
            ? "partial"
            : "online";
      message =
        "Sample relay state changed. Relay connectivity is not venue presence.";
    } else if (op === "scenario.future") {
      create("future-evaluation", {
        name: data.name || "Local communication",
        device: data.device || "iOS",
        state: data.state || "Not yet available",
        evidence: "Not validated",
        status: "later-phase",
      });
      message =
        "Later-phase capability recorded for review. The online MVP does not claim this hardware or transport is active.";
    } else if (op === "review.feedback") {
      create("review", {
        name: data.name || "Design feedback",
        text: data.text || "",
        featureId: ctx.featureId,
        status: "open",
      });
      message = "Feedback saved against this exact feature and context.";
    } else fail(`Unsupported operation: ${op}`);
  } catch (error) {
    ok = false;
    message =
      error instanceof Error
        ? error.message
        : "This action could not be completed.";
    return { world: input, ok, message, objectId };
  }
  if (ctx.sourceTaskId && !w.objects.some(t=>t.id===ctx.sourceTaskId&&t.owner===w.owner&&t.kind==='agent-task'&&t.capabilityId===groceryCapability&&w.objects.some(r=>r.id===t.resultId&&r.owner===w.owner&&r.kind==='grocery-delivery-preview'&&r.sourceTaskId===t.id)) && !["restaurant.","personal.mesh.","personal.introduction-mail.","personal.document-import.","personal.chess.","personal.community-query.","personal.recommendation.","personal.contact.","personal.image.","personal.webtool.","personal.preference.","grocery.delivery.","flight.","personal.creative.","personal.addressbook.","media.summary.","mailbox.","personal.budget.","personal.receipt.","personal.decision.","private.music.","smart.home.","complete.linkReputation.","housing.","mail.alias.","emergency.access.","private.voice.","complete.pdf-question.","complete.article.","complete.digest.","complete.comparison.","complete.research-run.","complete.research.","complete.deadline.","complete.document.","complete.document-source.","complete.note.","complete.note-memory.","complete.reminder.","complete.habit.","complete.occasion.","complete.occasion-message.","complete.occasion-contact.","complete.checklist.","complete.appointment.","complete.week.","complete.calendar-source.","complete.travel-source.","complete.travel.","complete.trip.","complete.agenda."].some(prefix=>op.startsWith(prefix))) {
    const task = w.objects.find(
      (o) =>
        o.id === ctx.sourceTaskId &&
        o.owner === w.owner &&
        o.kind === "agent-task",
    );
    if (task) {
      if(!["paused","cancelled","stopped"].includes(String(task.status)))task.status =
        op.endsWith(".create") ||
        op === "nostr.draft" ||
        op === "wallet.prepare"
          ? "ready-for-review"
          : "updated";
      task.lastObjectId = objectId;
      task.lastOperation = op;
    }
  }
  w.history.unshift({
    id: id(),
    featureId: ctx.featureId,
    op,
    objectId,
    owner: w.owner,
    context: Object.fromEntries(
      Object.entries(ctx).filter(([, v]) => v !== undefined),
    ) as Record<string, string>,
    outcome: message,
    at: stamp(),
  });
  return { world: w, ok, message, objectId };
}

export function initialWorld(): ProductWorld {
  const w = withDemoPersonNames(baseWorld());
  const source = w.posts.find((p) => p.id === "venue-note");
  if (source)
    source.actions = [
      {
        label: "View the community gathering",
        featureId: "AL-305",
        objectId: "event-1",
      },
    ];
  const seed = w.posts[0];
  for (const [id, type, title] of [
    ["video-1", "video", "A moment around the table"],
    ["audio-1", "audio", "A short community listening break"],
    ["live-1", "live", "Community conversation replay"],
    ["poll-1", "poll", "What should we make time for?"],
  ] as const) {
    w.posts.push({
      ...seed,
      id,
      type,
      title,
      text:
        type === "poll"
          ? "Choose a moment to share. One sample vote per person."
          : "Original sample media. Playback and its saved position stay attached to this event.",
      createdAt: Date.now() - 24000000,
      replies: [],
      image: "venue-table.png",
      alt: "An inviting CRAYS shared table.",
      choices: type === "poll" ? ["Dinner", "Workshop", "Walk"] : undefined,
    });
  }
  return withGroceryCommerceFixture(w);
}
