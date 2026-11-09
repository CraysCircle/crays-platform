export type HolidayManagerShiftKind =
  | "request"
  | "arrival"
  | "departure"
  | "in_house"
  | "service"
  | "entitlement";

export type HolidayManagerShiftCursor = {
  snapshotId: string;
  snapshotAt: string;
  afterOrdinal: number;
  pageSize: number;
  continuationToken: string;
};

export function normalizeHolidayManagerShiftPageSize(value: string | number | null | undefined) {
  const parsed = Number(value ?? 50);
  return Number.isSafeInteger(parsed) ? Math.min(100, Math.max(10, parsed)) : 50;
}

export function encodeHolidayManagerShiftCursor(input: HolidayManagerShiftCursor) {
  return Buffer.from(JSON.stringify({ v: 2, ...input }), "utf8").toString("base64url");
}

export function decodeHolidayManagerShiftCursor(value: string | null | undefined): HolidayManagerShiftCursor | null {
  if (!value || !/^[A-Za-z0-9_-]{8,800}$/.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (
      parsed.v !== 2
      || typeof parsed.snapshotId !== "string"
      || !/^clubs_shift_snapshot_[0-9a-f-]{36}$/.test(parsed.snapshotId)
      || typeof parsed.snapshotAt !== "string"
      || typeof parsed.afterOrdinal !== "number"
      || !Number.isSafeInteger(parsed.afterOrdinal)
      || parsed.afterOrdinal < 0
      || parsed.afterOrdinal > 1000000
      || typeof parsed.pageSize !== "number"
      || !Number.isSafeInteger(parsed.pageSize)
      || parsed.pageSize < 10
      || parsed.pageSize > 100
      || typeof parsed.continuationToken !== "string"
      || !/^clubs_shift_cursor_[0-9a-f-]{36}$/.test(parsed.continuationToken)
    ) return null;
    const snapshotAt = new Date(parsed.snapshotAt);
    if (
      !Number.isFinite(snapshotAt.getTime())
      || snapshotAt.toISOString() !== parsed.snapshotAt
    ) return null;
    return {
      snapshotId: parsed.snapshotId,
      snapshotAt: parsed.snapshotAt,
      afterOrdinal: Number(parsed.afterOrdinal),
      pageSize: Number(parsed.pageSize),
      continuationToken: parsed.continuationToken,
    };
  } catch {
    return null;
  }
}
