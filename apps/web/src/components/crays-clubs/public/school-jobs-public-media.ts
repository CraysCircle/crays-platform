export type SchoolJobsMediaKey =
  | "heroWorkshop"
  | "learningRoom"
  | "skillsPractice"
  | "programmeWorkshop"
  | "assessmentStudio"
  | "employerExchange";

export type SchoolJobsMediaRecord = {
  key: SchoolJobsMediaKey;
  order: 1 | 2 | 3 | 4 | 5 | 6;
  sourceAssetId: string;
  sourceTitle: string;
  sourceUrl: "/en/legal/imprint";
  assetUrl: string;
  publicPath: string;
  creator: "CRAYS";
  license: "Original visual";
  licenseUrl: "/en/legal/imprint";
  licenseReceiptId: "CCLUB-SCHOOL-JOBS-V2-IMAGEGEN-OWNER-AUTH-2026-08-29";
  retrievedAt: "2026-08-29";
  section: string;
  crop: string;
  focalPoint: { x: 0.5; y: 0.5 };
  altRole: string;
  representationBoundary: string;
  sha256: string;
  renderable: true;
  admissionState: "owner_generated_renderable";
  hotlinkAllowed: false;
  integrityNote: string;
};

const licenseReceiptId =
  "CCLUB-SCHOOL-JOBS-V2-IMAGEGEN-OWNER-AUTH-2026-08-29" as const;
const representationBoundary =
  "Creative visual; not actual CRAYS programme participants, availability or outcome.";

export const schoolJobsMedia: Record<
  SchoolJobsMediaKey,
  SchoolJobsMediaRecord
> = {
  heroWorkshop: {
    key: "heroWorkshop",
    order: 1,
    sourceAssetId: "imagegen-exec-ab0d2b0a-9044-4bc1-baa9-ec00182c9cf0",
    sourceTitle: "01-hero-lifestyle-learning.jpg",
    sourceUrl: "/en/legal/imprint",
    assetUrl: "/__crays-clubs/school-jobs-v2/01-hero-lifestyle-learning.jpg",
    publicPath: "/__crays-clubs/school-jobs-v2/01-hero-lifestyle-learning.jpg",
    creator: "CRAYS",
    license: "Original visual",
    licenseUrl: "/en/legal/imprint",
    licenseReceiptId,
    retrievedAt: "2026-08-29",
    section: "Hero learning-and-collaboration role",
    crop: "16:10 cover crop",
    focalPoint: { x: 0.5, y: 0.5 },
    altRole: "International young adults collaborating in a modern Forest City learning lounge",
    representationBoundary,
    sha256: "48733d9114ed27f89772d844b25385225b0738133d107e3ca604b144ccf59179",
    renderable: true,
    admissionState: "owner_generated_renderable",
    hotlinkAllowed: false,
    integrityNote: "Local 2400x1500 JPEG; SHA-256 verified after owner-authorized generation and export.",
  },
  learningRoom: {
    key: "learningRoom",
    order: 2,
    sourceAssetId: "imagegen-exec-1641580d-75cd-4376-9474-e96c46075801",
    sourceTitle: "02-modern-learning-room.jpg",
    sourceUrl: "/en/legal/imprint",
    assetUrl: "/__crays-clubs/school-jobs-v2/02-modern-learning-room.jpg",
    publicPath: "/__crays-clubs/school-jobs-v2/02-modern-learning-room.jpg",
    creator: "CRAYS",
    license: "Original visual",
    licenseUrl: "/en/legal/imprint",
    licenseReceiptId,
    retrievedAt: "2026-08-29",
    section: "Four-step learning function",
    crop: "3:2 cover crop",
    focalPoint: { x: 0.5, y: 0.5 },
    altRole: "Young adults learning and collaborating in a bright modern studio",
    representationBoundary,
    sha256: "2320e0c017666f2261ecbf5efb4319a060154aa64742f9bbb8e378530f4e5a5a",
    renderable: true,
    admissionState: "owner_generated_renderable",
    hotlinkAllowed: false,
    integrityNote: "Local 2400x1600 JPEG; SHA-256 verified after owner-authorized generation and export.",
  },
  skillsPractice: {
    key: "skillsPractice",
    order: 3,
    sourceAssetId: "imagegen-exec-507c2306-f2f8-4ec0-8719-00411b5cf1a8",
    sourceTitle: "03-creative-skills-practice.jpg",
    sourceUrl: "/en/legal/imprint",
    assetUrl: "/__crays-clubs/school-jobs-v2/03-creative-skills-practice.jpg",
    publicPath: "/__crays-clubs/school-jobs-v2/03-creative-skills-practice.jpg",
    creator: "CRAYS",
    license: "Original visual",
    licenseUrl: "/en/legal/imprint",
    licenseReceiptId,
    retrievedAt: "2026-08-29",
    section: "Skills evidence architecture",
    crop: "4:3 cover crop",
    focalPoint: { x: 0.5, y: 0.5 },
    altRole: "Creative learners practising media and prototyping skills together",
    representationBoundary,
    sha256: "18a3020d9e3692994fd567ee3268e99b88b979ef65a159e9ac92543c2e94a1fc",
    renderable: true,
    admissionState: "owner_generated_renderable",
    hotlinkAllowed: false,
    integrityNote: "Local 2400x1800 JPEG; SHA-256 verified after owner-authorized generation and export.",
  },
  programmeWorkshop: {
    key: "programmeWorkshop",
    order: 4,
    sourceAssetId: "imagegen-exec-bde994a7-5493-4573-a017-a91d02d23f67",
    sourceTitle: "04-international-project-studio.jpg",
    sourceUrl: "/en/legal/imprint",
    assetUrl: "/__crays-clubs/school-jobs-v2/04-international-project-studio.jpg",
    publicPath: "/__crays-clubs/school-jobs-v2/04-international-project-studio.jpg",
    creator: "CRAYS",
    license: "Original visual",
    licenseUrl: "/en/legal/imprint",
    licenseReceiptId,
    retrievedAt: "2026-08-29",
    section: "Programme discovery requirements",
    crop: "3:2 cover crop",
    focalPoint: { x: 0.5, y: 0.5 },
    altRole: "International project team reviewing a sustainable-city model",
    representationBoundary,
    sha256: "e5cd7f9b076309c231d42fa5457889791e380f5368fa6e98a48b56ec07fbd47d",
    renderable: true,
    admissionState: "owner_generated_renderable",
    hotlinkAllowed: false,
    integrityNote: "Local 2400x1600 JPEG; SHA-256 verified after owner-authorized generation and export.",
  },
  assessmentStudio: {
    key: "assessmentStudio",
    order: 5,
    sourceAssetId: "imagegen-exec-977ee1c1-a2bd-48eb-a25d-5f029f8b704b",
    sourceTitle: "05-collaborative-assessment-studio.jpg",
    sourceUrl: "/en/legal/imprint",
    assetUrl: "/__crays-clubs/school-jobs-v2/05-collaborative-assessment-studio.jpg",
    publicPath: "/__crays-clubs/school-jobs-v2/05-collaborative-assessment-studio.jpg",
    creator: "CRAYS",
    license: "Original visual",
    licenseUrl: "/en/legal/imprint",
    licenseReceiptId,
    retrievedAt: "2026-08-29",
    section: "Observed-task and assessment role",
    crop: "5:3 cover crop",
    focalPoint: { x: 0.5, y: 0.5 },
    altRole: "Young designer discussing a prototype with a supportive review group",
    representationBoundary,
    sha256: "f170b6e6c379bd02921c5fe39977e20b26cd5c238fe46953dd5d8cef5562e1bb",
    renderable: true,
    admissionState: "owner_generated_renderable",
    hotlinkAllowed: false,
    integrityNote: "Local 2500x1500 JPEG; SHA-256 verified after owner-authorized generation and export.",
  },
  employerExchange: {
    key: "employerExchange",
    order: 6,
    sourceAssetId: "imagegen-exec-e8ae80d6-fea2-4ccc-b793-6878cb18285e",
    sourceTitle: "06-creative-career-exchange.jpg",
    sourceUrl: "/en/legal/imprint",
    assetUrl: "/__crays-clubs/school-jobs-v2/06-creative-career-exchange.jpg",
    publicPath: "/__crays-clubs/school-jobs-v2/06-creative-career-exchange.jpg",
    creator: "CRAYS",
    license: "Original visual",
    licenseUrl: "/en/legal/imprint",
    licenseReceiptId,
    retrievedAt: "2026-08-29",
    section: "Employer discovery and introduction role",
    crop: "16:9 cover crop",
    focalPoint: { x: 0.5, y: 0.5 },
    altRole: "Creative professionals exchanging portfolio feedback in a waterfront lounge",
    representationBoundary,
    sha256: "73e9544677e07dac310931f4af6225c66acfde55d57b9c3d7461be8b7c741d06",
    renderable: true,
    admissionState: "owner_generated_renderable",
    hotlinkAllowed: false,
    integrityNote: "Local 2560x1440 JPEG; SHA-256 verified after owner-authorized generation and export.",
  },
};
