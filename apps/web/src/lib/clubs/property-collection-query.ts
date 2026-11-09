export type ClubsPropertyRecordType = "all" | "property" | "unit";
export type ClubsPropertyViewMode = "table" | "board";
export type ClubsPropertyLifecycle =
  | "draft"
  | "review"
  | "published"
  | "suspended"
  | "archived";

export type ClubsPropertyCollectionQuery = {
  search: string;
  lifecycle: ClubsPropertyLifecycle | null;
  recordType: ClubsPropertyRecordType;
  viewMode: ClubsPropertyViewMode;
  cursor: string | null;
  pageSize: number;
};

const lifecycleValues = new Set<ClubsPropertyLifecycle>([
  "draft",
  "review",
  "published",
  "suspended",
  "archived",
]);
const recordTypes = new Set<ClubsPropertyRecordType>([
  "all",
  "property",
  "unit",
]);
const viewModes = new Set<ClubsPropertyViewMode>(["table", "board"]);

export function normalizeClubsPropertyCollectionQuery(input: {
  search?: string | null;
  lifecycle?: string | null;
  recordType?: string | null;
  viewMode?: string | null;
  cursor?: string | null;
  pageSize?: number | string | null;
}): ClubsPropertyCollectionQuery {
  const parsedPageSize = Number(input.pageSize ?? 25);
  return {
    search: (input.search ?? "").trim().slice(0, 160),
    lifecycle: lifecycleValues.has(input.lifecycle as ClubsPropertyLifecycle)
      ? (input.lifecycle as ClubsPropertyLifecycle)
      : null,
    recordType: recordTypes.has(input.recordType as ClubsPropertyRecordType)
      ? (input.recordType as ClubsPropertyRecordType)
      : "all",
    viewMode: viewModes.has(input.viewMode as ClubsPropertyViewMode)
      ? (input.viewMode as ClubsPropertyViewMode)
      : "table",
    cursor: /^[A-Za-z0-9_-]{8,500}$/.test(input.cursor ?? "")
      ? input.cursor ?? null
      : null,
    pageSize:
      Number.isSafeInteger(parsedPageSize)
        ? Math.min(50, Math.max(10, parsedPageSize))
        : 25,
  };
}

export function encodeClubsPropertyCursor(input: {
  updatedAt: string;
  recordType: "property" | "unit";
  recordId: string;
}) {
  return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
}

export function decodeClubsPropertyCursor(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (
      typeof parsed.updatedAt !== "string"
      || !["property", "unit"].includes(String(parsed.recordType))
      || typeof parsed.recordId !== "string"
    ) {
      return null;
    }
    const updatedAt = new Date(parsed.updatedAt);
    if (!Number.isFinite(updatedAt.getTime())) return null;
    return {
      updatedAt: updatedAt.toISOString(),
      recordType: parsed.recordType as "property" | "unit",
      recordId: parsed.recordId,
    };
  } catch {
    return null;
  }
}
