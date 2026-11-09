import type { EquipmentId, LoadType, MovementPattern, MovementPlane } from "./vocabulary";

export type DataState = "READY" | "EMPTY" | "NO_RESULTS" | "NOT_FOUND" | "BLOCKED" | "UNAVAILABLE" | "PERMISSION_DENIED" | "REVIEW_REQUIRED";
export type ExerciseMediaStage = "START" | "PEAK" | "MAIN" | "UNKNOWN";
export type ExerciseMedia = Readonly<{
  mediaId: string;
  kind: "IMAGE" | "VIDEO";
  match: "EXACT" | "FAMILY_LEVEL";
  stage: ExerciseMediaStage;
  posterUrl: string;
  altText: string;
  width: number;
  height: number;
  attributionLabel: string;
  attributionUrl: string;
  sourceDigest: string;
  reviewReceiptDigest: string;
}>;
export type ExerciseSummary = Readonly<{
  craysExerciseId: string;
  slug: string;
  name: string;
  movementPattern: MovementPattern;
  movementPlane: MovementPlane;
  loadType: LoadType;
  equipment: readonly EquipmentId[];
  primaryMuscles: readonly string[];
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "UNKNOWN";
  goals: readonly string[];
  hasExactMedia: boolean;
  media: ExerciseMedia | null;
  mediaSequence: readonly ExerciseMedia[];
  publicationReceiptDigest: string;
}>;
export type ExerciseDetail = ExerciseSummary & Readonly<{
  description: string;
  instructions: readonly string[];
  techniqueCues: readonly string[];
  commonMistakes: readonly string[];
  secondaryMuscles: readonly string[];
  alternatives: readonly { craysExerciseId: string; name: string; reason: string }[];
  provenance: readonly { sourceKind: string; sourceReceiptDigest: string; sourceObjectId: string; licenseLabel: string; objectUrl: string }[];
  attribution: { label: string; url: string } | null;
  safetyNotice: string;
}>;
export type ExerciseSearchFilters = Readonly<{
  query?: string;
  muscle?: string;
  equipment?: EquipmentId;
  movement?: MovementPattern;
  goal?: string;
  level?: ExerciseSummary["level"];
  limitation?: string;
  media?: "EXACT" | "ANY" | "NONE";
  take: number;
  cursor?: string;
}>;
export type ExerciseSearchReadModel = Readonly<{
  contract: "crays.train-exercise-search.v2";
  state: DataState;
  items: readonly ExerciseSummary[];
  nextCursor: string | null;
  appliedFilters: ExerciseSearchFilters;
  publicationReceiptDigest: string | null;
  availableLimitations: readonly string[];
  reason: string | null;
}>;
export type ExerciseDetailReadModel = Readonly<{
  contract: "crays.train-exercise-detail.v2";
  state: DataState;
  exercise: ExerciseDetail | null;
  publicationReceiptDigest: string | null;
  reason: string | null;
}>;
