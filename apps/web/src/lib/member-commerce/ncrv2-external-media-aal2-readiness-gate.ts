import "server-only";

export const NCRV2_EXTERNAL_MEDIA_AAL2_GATE_VERSION = 1 as const;
export const NCRV2_REQUIRED_REAL_MEDIA_COUNT = 6 as const;
export const NCRV2_EXTERNAL_CELL_MAX_AGE_MS = 5 * 60 * 1000;
export const NCRV2_MEDIA_EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const NCRV2_HUMAN_AAL2_MAX_AGE_MS = 5 * 60 * 1000;
export const NCRV2_GATE_MAX_TTL_MS = 2 * 60 * 1000;
export const NCRV2_GATE_MAX_CLOCK_SKEW_MS = 30 * 1000;

export type Ncrv2ExternalMediaAal2BlockReason =
  | "MALFORMED_SCOPE"
  | "INVALID_HASH"
  | "GATE_WINDOW_INVALID"
  | "EXTERNAL_CELL_SCOPE_MISMATCH"
  | "EXTERNAL_CELL_REAL_EVIDENCE_MISSING"
  | "EXTERNAL_CELL_NOT_SAFE_REACHABLE"
  | "EXTERNAL_CELL_EVIDENCE_STALE"
  | "MEDIA_COUNT_NOT_SIX"
  | "MEDIA_SCOPE_MISMATCH"
  | "MEDIA_NOT_REAL"
  | "MEDIA_RIGHTS_NOT_CLEARED"
  | "MEDIA_CONTENT_NOT_VERIFIED"
  | "MEDIA_EVIDENCE_STALE"
  | "MEDIA_DUPLICATE_ASSET"
  | "MEDIA_DUPLICATE_CONTENT"
  | "MEDIA_DUPLICATE_SLOT"
  | "HUMAN_AAL2_SCOPE_MISMATCH"
  | "HUMAN_AAL2_NOT_REAL"
  | "HUMAN_AAL2_NOT_ACTIVE"
  | "HUMAN_AAL2_NOT_FRESH";

export interface ExternalCellEvidence {
  receiptId: string;
  receiptSha256: string;
  persisted: boolean;
  evidenceClass: string;
  tenantId: string;
  cellScopeSha256: string;
  endpointSha256: string;
  protocol: string;
  tlsVerified: boolean;
  state: string;
  accessMode: string;
  mutationPerformed: boolean;
  observedAt: string;
}

export interface RealMediaEvidenceReceipt {
  receiptId: string;
  receiptSha256: string;
  persisted: boolean;
  evidenceClass: string;
  tenantId: string;
  slotOrdinal: number;
  assetId: string;
  assetSha256: string;
  sourceReferenceSha256: string;
  generationClass: string;
  contentVerified: boolean;
  rightsReceiptId: string;
  rightsReceiptSha256: string;
  rightsStatus: string;
  rightsValidUntil: string | null;
  observedAt: string;
}

export interface FreshHumanAal2Evidence {
  receiptId: string;
  receiptSha256: string;
  persisted: boolean;
  evidenceClass: string;
  tenantId: string;
  actorPersonId: string;
  accountReferenceHash: string;
  deviceSessionId: string;
  assuranceLevel: string;
  state: string;
  authenticatedAt: string;
  expiresAt: string;
}

export interface EvaluateNcrv2ExternalMediaAal2GateInput {
  tenantId: string;
  cellScopeSha256: string;
  mediaCollectionSha256: string;
  actorPersonId: string;
  actorAccountReferenceHash: string;
  requestedAt: string;
  expiresAt: string;
  externalCell: ExternalCellEvidence;
  media: readonly RealMediaEvidenceReceipt[];
  humanAal2: FreshHumanAal2Evidence;
}

export interface Ncrv2ExternalMediaAal2GateDecision {
  gateVersion: typeof NCRV2_EXTERNAL_MEDIA_AAL2_GATE_VERSION;
  eligible: boolean;
  status: "ELIGIBLE_FOR_NCRV2_COMBINATION_ONLY" | "BLOCKED";
  blockReasons: readonly Ncrv2ExternalMediaAal2BlockReason[];
  tenantId: string;
  cellScopeSha256: string;
  mediaCollectionSha256: string;
  actorPersonId: string;
  externalCellReceiptId: string;
  mediaReceiptIds: readonly string[];
  humanAal2ReceiptId: string;
  evaluatedAt: string;
  expiresAt: string;
  externalCellCalled: false;
  mediaMutated: false;
  formalActionAuthorized: false;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function evaluateNcrv2ExternalMediaAal2Gate(
  input: EvaluateNcrv2ExternalMediaAal2GateInput,
  observedAt: Date = new Date(),
): Readonly<Ncrv2ExternalMediaAal2GateDecision> {
  const reasons = new Set<Ncrv2ExternalMediaAal2BlockReason>();
  const add = (reason: Ncrv2ExternalMediaAal2BlockReason) => reasons.add(reason);
  const nowMs = observedAt.getTime();
  const text = (value: string) =>
    typeof value === "string" && value.trim() !== "";
  const hash = (value: string) => SHA256_PATTERN.test(value);
  const date = (value: string) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  };
  const fresh = (value: string, maxAgeMs: number) => {
    const parsed = date(value);
    return Boolean(
      parsed &&
      parsed.getTime() <= nowMs + NCRV2_GATE_MAX_CLOCK_SKEW_MS &&
      nowMs - parsed.getTime() <= maxAgeMs,
    );
  };

  if (
    !Number.isFinite(nowMs) ||
    !text(input.tenantId) ||
    !text(input.actorPersonId)
  ) {
    add("MALFORMED_SCOPE");
  }
  if (
    !hash(input.cellScopeSha256) ||
    !hash(input.mediaCollectionSha256) ||
    !hash(input.actorAccountReferenceHash)
  ) {
    add("INVALID_HASH");
  }
  const requestedAt = date(input.requestedAt);
  const gateExpiresAt = date(input.expiresAt);
  if (
    !requestedAt ||
    !gateExpiresAt ||
    requestedAt.getTime() > nowMs + NCRV2_GATE_MAX_CLOCK_SKEW_MS ||
    gateExpiresAt.getTime() <= nowMs ||
    gateExpiresAt.getTime() <= requestedAt.getTime() ||
    gateExpiresAt.getTime() - nowMs > NCRV2_GATE_MAX_TTL_MS
  ) {
    add("GATE_WINDOW_INVALID");
  }

  const cell = input.externalCell;
  if (
    cell.tenantId !== input.tenantId ||
    cell.cellScopeSha256 !== input.cellScopeSha256 ||
    !hash(cell.receiptSha256) ||
    !hash(cell.endpointSha256)
  ) {
    add("EXTERNAL_CELL_SCOPE_MISMATCH");
  }
  if (cell.persisted !== true || cell.evidenceClass !== "REAL_EXTERNAL") {
    add("EXTERNAL_CELL_REAL_EVIDENCE_MISSING");
  }
  if (
    cell.protocol !== "HTTPS" ||
    cell.tlsVerified !== true ||
    cell.state !== "REACHABLE" ||
    cell.accessMode !== "READ_ONLY" ||
    cell.mutationPerformed !== false
  ) {
    add("EXTERNAL_CELL_NOT_SAFE_REACHABLE");
  }
  if (!fresh(cell.observedAt, NCRV2_EXTERNAL_CELL_MAX_AGE_MS)) {
    add("EXTERNAL_CELL_EVIDENCE_STALE");
  }

  if (input.media.length !== NCRV2_REQUIRED_REAL_MEDIA_COUNT) {
    add("MEDIA_COUNT_NOT_SIX");
  }
  const assetIds = new Set<string>();
  const contentHashes = new Set<string>();
  const slots = new Set<number>();
  const mediaReceiptIds: string[] = [];

  for (const media of input.media) {
    mediaReceiptIds.push(media.receiptId);
    if (
      media.tenantId !== input.tenantId ||
      !hash(media.receiptSha256) ||
      !hash(media.assetSha256) ||
      !hash(media.sourceReferenceSha256) ||
      !hash(media.rightsReceiptSha256)
    ) {
      add("MEDIA_SCOPE_MISMATCH");
    }
    if (
      media.persisted !== true ||
      media.evidenceClass !== "REAL_ASSET" ||
      media.generationClass !== "CAPTURED_OR_LICENSED"
    ) {
      add("MEDIA_NOT_REAL");
    }
    if (
      !text(media.rightsReceiptId) ||
      media.rightsStatus !== "CLEARED"
    ) {
      add("MEDIA_RIGHTS_NOT_CLEARED");
    }
    const rightsValidUntil = media.rightsValidUntil
      ? date(media.rightsValidUntil)
      : null;
    if (
      media.rightsValidUntil &&
      (!rightsValidUntil || rightsValidUntil.getTime() <= nowMs)
    ) {
      add("MEDIA_RIGHTS_NOT_CLEARED");
    }
    if (media.contentVerified !== true || !text(media.assetId)) {
      add("MEDIA_CONTENT_NOT_VERIFIED");
    }
    if (!fresh(media.observedAt, NCRV2_MEDIA_EVIDENCE_MAX_AGE_MS)) {
      add("MEDIA_EVIDENCE_STALE");
    }
    if (assetIds.has(media.assetId)) {
      add("MEDIA_DUPLICATE_ASSET");
    }
    assetIds.add(media.assetId);
    if (contentHashes.has(media.assetSha256)) {
      add("MEDIA_DUPLICATE_CONTENT");
    }
    contentHashes.add(media.assetSha256);
    if (
      !Number.isInteger(media.slotOrdinal) ||
      media.slotOrdinal < 1 ||
      media.slotOrdinal > NCRV2_REQUIRED_REAL_MEDIA_COUNT ||
      slots.has(media.slotOrdinal)
    ) {
      add("MEDIA_DUPLICATE_SLOT");
    }
    slots.add(media.slotOrdinal);
  }

  const aal2 = input.humanAal2;
  if (
    aal2.tenantId !== input.tenantId ||
    aal2.actorPersonId !== input.actorPersonId ||
    aal2.accountReferenceHash !== input.actorAccountReferenceHash ||
    !hash(aal2.receiptSha256) ||
    !hash(aal2.accountReferenceHash)
  ) {
    add("HUMAN_AAL2_SCOPE_MISMATCH");
  }
  if (aal2.persisted !== true || aal2.evidenceClass !== "REAL_HUMAN") {
    add("HUMAN_AAL2_NOT_REAL");
  }
  if (
    !text(aal2.deviceSessionId) ||
    !["aal2", "aal3"].includes(aal2.assuranceLevel.toLowerCase()) ||
    aal2.state.toLowerCase() !== "active"
  ) {
    add("HUMAN_AAL2_NOT_ACTIVE");
  }
  const aal2ExpiresAt = date(aal2.expiresAt);
  if (
    !fresh(aal2.authenticatedAt, NCRV2_HUMAN_AAL2_MAX_AGE_MS) ||
    !aal2ExpiresAt ||
    aal2ExpiresAt.getTime() <= nowMs ||
    (gateExpiresAt && aal2ExpiresAt.getTime() < gateExpiresAt.getTime())
  ) {
    add("HUMAN_AAL2_NOT_FRESH");
  }

  const blockReasons = Object.freeze([...reasons].sort());
  const eligible = blockReasons.length === 0;
  return Object.freeze({
    gateVersion: NCRV2_EXTERNAL_MEDIA_AAL2_GATE_VERSION,
    eligible,
    status: eligible ? "ELIGIBLE_FOR_NCRV2_COMBINATION_ONLY" : "BLOCKED",
    blockReasons,
    tenantId: input.tenantId,
    cellScopeSha256: input.cellScopeSha256,
    mediaCollectionSha256: input.mediaCollectionSha256,
    actorPersonId: input.actorPersonId,
    externalCellReceiptId: cell.receiptId,
    mediaReceiptIds: Object.freeze(mediaReceiptIds),
    humanAal2ReceiptId: aal2.receiptId,
    evaluatedAt: observedAt.toISOString(),
    expiresAt: input.expiresAt,
    externalCellCalled: false,
    mediaMutated: false,
    formalActionAuthorized: false,
  });
}

