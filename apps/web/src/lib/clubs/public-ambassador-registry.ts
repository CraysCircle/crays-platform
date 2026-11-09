import type { ClubsLocale } from "./public-site";
import {
  CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT,
  type PublicAmbassadorDirectoryProfile,
  type PublicAmbassadorMedia,
  type PublicAmbassadorProjection,
} from "./public-ambassador-directory-referral-contract";

const deniedAuthorities =
  CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT.deniedAuthorities;

function admittedProfile(
  slug: string,
  name: string,
  publicRoleLabel: "Founder" | "Co-Founder" | "Ambassador",
  linkedInHref: string,
  media: PublicAmbassadorMedia,
): PublicAmbassadorDirectoryProfile {
  return {
    slug,
    name,
    publicProfileAdmission: "ADMITTED_OWNER_SOURCE",
    publicRoleLabel,
    ownerAuthoredPublicDisplayFact: {
      publicRoleLabel,
      sourceAuthority: "owner_authored",
      displayOnly: true,
      authorityDerived: false,
    },
    linkedIn: {
      href: linkedInHref,
      label: "LinkedIn",
      presentation: "icon_label_only",
      rawUrlTextVisible: false,
    },
    media,
    apply: {
      path: `/en/ambassadors/${slug}?apply=1`,
      ambassadorSlug: slug,
      referralContextRequired: true,
      serverPassRequired: true,
    },
    authority: deniedAuthorities,
    role: publicRoleLabel,
    projectRole: null,
    confirmationRoute: name,
  };
}

export const CLUBS_APPROVED_AMBASSADORS = {
  "isabel-maria-jeworski": admittedProfile(
    "isabel-maria-jeworski",
    "Isabel Maria Jeworski",
    "Co-Founder",
    "https://www.linkedin.com/in/isabel-maria-jeworski-monkeymindretreats/",
    {
      url: "/__crays-clubs/people/isabel-maria-jeworski.jpg",
      state: "admitted",
      rightsReceiptId:
        "CCLUB-OWNER-AMBASSADOR-PORTRAIT-MEDIA-AUTHORITY-2026-08-29-V1",
      originalSha256:
        "ece42497c8093ff9965b680d9edaacfb115e22f9d2c5c73a17f32fc4c72f4df5",
      sourceAuthority: "owner_authorized_existing_crays_asset",
      alt: "Isabel Maria Jeworski, Co-Founder of CRAYS Clubs",
      width: 601,
      height: 1306,
      focalPoint: { x: 0.5, y: 0.3 },
      crop: "3:4",
      renderable: true,
      hotlinkAllowed: false,
      downloadAllowed: false,
    },
  ),
  "thorben-biesenbach": admittedProfile(
    "thorben-biesenbach",
    "Thorben Biesenbach",
    "Founder",
    "https://www.linkedin.com/in/thorbenbiesenbach/",
    {
      url: "/__crays-clubs/people/ambassadors-v1/thorben-biesenbach.jpg",
      state: "admitted",
      rightsReceiptId:
        "CCLUB-OWNER-CHAT-AMBASSADOR-PORTRAIT-MEDIA-AUTHORITY-2026-08-29-V2",
      originalSha256:
        "89d331d1e30fc26426abffb9692bc7738d598de398e8901e506c1c5798d6aafa",
      sourceAuthority: "owner_authorized_chat_attachment",
      alt: "Thorben Biesenbach, Founder of CRAYS Clubs",
      width: 400,
      height: 400,
      focalPoint: { x: 0.5, y: 0.46 },
      crop: "3:4",
      renderable: true,
      hotlinkAllowed: false,
      downloadAllowed: false,
    },
  ),
  "robin-karlsen": admittedProfile(
    "robin-karlsen",
    "Robin H. Karlsen",
    "Co-Founder",
    "https://www.linkedin.com/in/robinkarlsen/",
    {
      url: "/__crays-clubs/people/ambassadors-v1/robin-karlsen.png",
      state: "admitted",
      rightsReceiptId:
        "CCLUB-OWNER-CHAT-AMBASSADOR-PORTRAIT-MEDIA-AUTHORITY-2026-08-29-V2",
      originalSha256:
        "01c1dddd5e87cea207686568e444dbbd821863c2e1978bd6b1502d9be34a60d2",
      sourceAuthority: "owner_authorized_chat_attachment",
      alt: "Robin H. Karlsen, Co-Founder of CRAYS Clubs",
      width: 960,
      height: 548,
      focalPoint: { x: 0.45, y: 0.35 },
      crop: "3:4",
      renderable: true,
      hotlinkAllowed: false,
      downloadAllowed: false,
    },
  ),
  "stephanie-weyer": admittedProfile(
    "stephanie-weyer",
    "Stephanie Weyer",
    "Co-Founder",
    "https://www.linkedin.com/in/stephanie-weyer/",
    {
      url: "/__crays-clubs/people/ambassadors-v1/stephanie-weyer.png",
      state: "admitted",
      rightsReceiptId:
        "CCLUB-OWNER-CHAT-AMBASSADOR-PORTRAIT-MEDIA-AUTHORITY-2026-08-29-V2",
      originalSha256:
        "7868e9e43b1977ae5d4081eadd28d843f71a489a504cdfdbb120be27d4116381",
      sourceAuthority: "owner_authorized_chat_attachment",
      alt: "Stephanie Weyer, Co-Founder of CRAYS Clubs",
      width: 1206,
      height: 1807,
      focalPoint: { x: 0.58, y: 0.35 },
      crop: "3:4",
      renderable: true,
      hotlinkAllowed: false,
      downloadAllowed: false,
    },
  ),
  "aiana-lopes-bezerra": admittedProfile(
    "aiana-lopes-bezerra",
    "Aiana Lopes Bezerra",
    "Ambassador",
    "https://www.linkedin.com/in/aiana-lopes-bezerra-38b412b1/",
    {
      url: "/__crays-clubs/people/ambassadors-v1/aiana-lopes-bezerra.png",
      state: "admitted",
      rightsReceiptId:
        "CCLUB-OWNER-CHAT-AMBASSADOR-PORTRAIT-MEDIA-AUTHORITY-2026-08-29-V2",
      originalSha256:
        "df773c58f38bd425d3a1a44e9ecdb14847c07667b9542a36959477025c548f1b",
      sourceAuthority: "owner_authorized_chat_attachment",
      alt: "Aiana Lopes Bezerra, Ambassador of CRAYS Clubs",
      width: 400,
      height: 400,
      focalPoint: { x: 0.5, y: 0.4 },
      crop: "3:4",
      renderable: true,
      hotlinkAllowed: false,
      downloadAllowed: false,
    },
  ),
  "anouk-knuffmann": admittedProfile(
    "anouk-knuffmann",
    "Anouk Knuffmann",
    "Co-Founder",
    "https://www.linkedin.com/in/anouk-knuffmann/",
    {
      url: "/__crays-clubs/people/ambassadors-v1/anouk-knuffmann.png",
      state: "admitted",
      rightsReceiptId:
        "CCLUB-OWNER-CHAT-AMBASSADOR-PORTRAIT-MEDIA-AUTHORITY-2026-08-30-V3",
      originalSha256:
        "f10a83b5d952c25826f8b1195860366aa5d3a6df551910f749c98e4929426f4a",
      sourceAuthority: "owner_authorized_chat_attachment",
      alt: "Anouk Knuffmann, Co-Founder of Crays Club Forst City",
      width: 1000,
      height: 667,
      focalPoint: { x: 0.5, y: 0.43 },
      crop: "3:4",
      renderable: true,
      hotlinkAllowed: false,
      downloadAllowed: false,
    },
  ),
} as const;

export type ApprovedAmbassadorSlug = keyof typeof CLUBS_APPROVED_AMBASSADORS;

const PUBLIC_AMBASSADOR_DIRECTORY_ORDER: ApprovedAmbassadorSlug[] = [
  "isabel-maria-jeworski",
  "thorben-biesenbach",
  "stephanie-weyer",
  "robin-karlsen",
  "anouk-knuffmann",
];

export function getPublicAmbassadorDirectory(): PublicAmbassadorProjection[] {
  return PUBLIC_AMBASSADOR_DIRECTORY_ORDER.map(
    (slug) => CLUBS_APPROVED_AMBASSADORS[slug],
  ).map((profile) => ({
    slug: profile.slug,
    name: profile.name,
    publicProfileAdmission: profile.publicProfileAdmission,
    ownerAuthoredPublicDisplayFact: profile.ownerAuthoredPublicDisplayFact,
    linkedIn: profile.linkedIn,
    media: profile.media,
    apply: profile.apply,
    authority: profile.authority,
  }));
}

export type ClubsMembershipApplicationInput = {
  applicantType: "individual" | "family" | "team";
  fullName: string;
  email: string;
  basedIn: string;
  interest: string;
  preferredArrivalWindow: string;
  preferredParticipationLength: string;
  linkedinUrl: string;
  socialUrl: string;
  profileUrl: string;
  motivation: string;
  contribution: string;
  consent: boolean;
};

export type ClubsApplicationStateLedger = {
  application: "PREVIEW_COMPLETE_NOT_PERSISTED";
  referral: "NOT_APPLICABLE" | "CLIENT_HANDOFF_SERVER_PASS_REQUIRED";
  prequalification: "NOT_STARTED";
  teamReview: "NOT_STARTED";
  decision: "NOT_STARTED";
  invitationAdmission: "NOT_STARTED";
  booking: "NOT_STARTED";
  payment: "NOT_STARTED";
};

export type ClubsApplicationPreview = {
  status: "PREVIEW_ONLY_NO_SEND";
  locale: ClubsLocale;
  journeyMode: "direct" | "ambassador_referral";
  applicant: ClubsMembershipApplicationInput;
  referral: null | {
    ambassadorSlug: ApprovedAmbassadorSlug;
    ambassadorName: string;
    confirmationRecipient: string;
    auditStatus: "SERVER_PASS_REQUIRED_NOT_PERSISTED";
    attributionReceiptId: null;
    serverPass: false;
    authority: typeof deniedAuthorities;
  };
  states: ClubsApplicationStateLedger;
};

export function isApprovedAmbassadorSlug(
  value: string,
): value is ApprovedAmbassadorSlug {
  return Object.prototype.hasOwnProperty.call(CLUBS_APPROVED_AMBASSADORS, value);
}

export function getApprovedAmbassador(slug: ApprovedAmbassadorSlug) {
  return CLUBS_APPROVED_AMBASSADORS[slug];
}

export function createMembershipApplicationPreview(args: {
  locale: ClubsLocale;
  applicant: ClubsMembershipApplicationInput;
  ambassadorSlug?: ApprovedAmbassadorSlug;
}): ClubsApplicationPreview {
  const ambassador = args.ambassadorSlug
    ? getApprovedAmbassador(args.ambassadorSlug)
    : null;

  return {
    status: "PREVIEW_ONLY_NO_SEND",
    locale: args.locale,
    journeyMode: ambassador ? "ambassador_referral" : "direct",
    applicant: args.applicant,
    referral: ambassador
      ? {
          ambassadorSlug: ambassador.slug as ApprovedAmbassadorSlug,
          ambassadorName: ambassador.name,
          confirmationRecipient: ambassador.confirmationRoute,
          auditStatus: "SERVER_PASS_REQUIRED_NOT_PERSISTED",
          attributionReceiptId: null,
          serverPass: false,
          authority: deniedAuthorities,
        }
      : null,
    states: {
      application: "PREVIEW_COMPLETE_NOT_PERSISTED",
      referral: ambassador
        ? "CLIENT_HANDOFF_SERVER_PASS_REQUIRED"
        : "NOT_APPLICABLE",
      prequalification: "NOT_STARTED",
      teamReview: "NOT_STARTED",
      decision: "NOT_STARTED",
      invitationAdmission: "NOT_STARTED",
      booking: "NOT_STARTED",
      payment: "NOT_STARTED",
    },
  };
}
