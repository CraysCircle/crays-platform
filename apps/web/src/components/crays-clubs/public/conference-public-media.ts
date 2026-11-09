export type ConferenceMediaKey =
  | "heroVenue"
  | "archiveStage"
  | "archivePanel"
  | "networking"
  | "recording"
  | "arrival";

export type ConferenceMediaRecord = {
  key: ConferenceMediaKey;
  sourceAssetId: string;
  sourceTitle: string;
  sourceUrl: string;
  assetUrl: string;
  creator: string;
  license: string;
  licenseUrl: string;
  retrievedAt: "2026-08-25";
  section: string;
  crop: string;
  altRole: string;
  representationBoundary: string;
  sha256: string | null;
  integrityNote: string;
};

const poolRoot = "/__crays-clubs/phase9-owner/forest-city-v16";
const manifestUrl = `${poolRoot}/manifest.json`;
const dossierRoot = "/__crays-clubs/conference-dossier";

function ownerMedia(
  key: ConferenceMediaKey,
  file: string,
  section: string,
  crop: string,
  altRole: string,
): ConferenceMediaRecord {
  return {
    key,
    sourceAssetId: `phase9-owner/forest-city-v16/${file}`,
    sourceTitle: file,
    sourceUrl: manifestUrl,
    assetUrl: `${poolRoot}/${file}`,
    creator: "CRAYS owner-authorized Forest City media pool",
    license: "Owner-authorized media",
    licenseUrl: manifestUrl,
    retrievedAt: "2026-08-25",
    section,
    crop,
    altRole,
    representationBoundary:
      "Forest City place context only; not evidence of a CRAYS Conference edition, venue, programme, speaker, audience, recording, or participation state.",
    sha256: null,
    integrityNote:
      "Repository-owned derivative governed by the phase9-owner Forest City v16 manifest; no third-party conference scene is used.",
  };
}

function dossierMedia(
  key: ConferenceMediaKey,
  file: string,
  sha256: string,
  section: string,
  crop: string,
  altRole: string,
): ConferenceMediaRecord {
  const assetUrl = `${dossierRoot}/${file}`;
  return {
    key,
    sourceAssetId: `conference-dossier/${file}`,
    sourceTitle: file,
    sourceUrl: assetUrl,
    assetUrl,
    creator: "CRAYS Conference design asset generated from the approved wireframe direction",
    license: "CRAYS project-owned media",
    licenseUrl: assetUrl,
    retrievedAt: "2026-08-25",
    section,
    crop,
    altRole,
    representationBoundary:
      "Illustrative Forest City place context only; not evidence of a CRAYS Conference edition, venue, programme, speaker, audience, recording, or participation state.",
    sha256,
    integrityNote:
      "Project-bound original generated for this Conference layout; no third-party event image, person, claim, or logo is depicted.",
  };
}

export const conferenceMedia: Record<ConferenceMediaKey, ConferenceMediaRecord> = {
  heroVenue: dossierMedia(
    "heroVenue",
    "conference-forest-city-hero-v1.png",
    "babf8744bd72a6d5f92bc90489fdd8921957dcc14428a39dacd3b5b7c5a3f947",
    "Hero place-context image",
    "Wide crop with waterfront and city lights retained",
    "Forest City night context",
  ),
  archiveStage: dossierMedia(
    "archiveStage",
    "conference-forest-city-archive-v1.png",
    "e1c42543b0b4527f1dafe3948e1bb87ca114762cb2e40ca9c8906328d8ae0ce3",
    "Archive evidence-gate context",
    "Panoramic waterfront crop",
    "Forest City night context",
  ),
  archivePanel: ownerMedia(
    "archivePanel",
    "intro-forest-city-portrait.webp",
    "Archive context panel",
    "Portrait crop with building geometry retained",
    "Forest City building context",
  ),
  networking: ownerMedia(
    "networking",
    "work-forest-city-aerial.webp",
    "Programme place context",
    "Wide aerial crop",
    "Forest City aerial context",
  ),
  recording: ownerMedia(
    "recording",
    "forest-city-marina-pool.webp",
    "Recording-rights boundary context",
    "Wide architectural crop",
    "Forest City marina context",
  ),
  arrival: ownerMedia(
    "arrival",
    "forest-city-beach-boardwalk.webp",
    "Participation boundary context",
    "Wide boardwalk crop",
    "Forest City boardwalk context",
  ),
};
