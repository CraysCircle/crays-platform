export type ShiftWorkItemFocus = {
  raw: string;
  kind: "request" | "arrival" | "departure" | "in_house" | "service" | "entitlement";
  recordId: string;
  version: number;
};

const prefixes: Record<string, ShiftWorkItemFocus["kind"]> = {
  request: "request",
  arrival: "arrival",
  departure: "departure",
  "in-house": "in_house",
  service: "service",
  entitlement: "entitlement",
};

export function parseShiftWorkItemFocus(value: string | null | undefined): ShiftWorkItemFocus | null {
  if (!value || value.length > 220) return null;
  const firstSeparator = value.indexOf(":");
  const lastSeparator = value.lastIndexOf(":");
  if (firstSeparator < 1 || lastSeparator <= firstSeparator + 1) return null;
  const kind = prefixes[value.slice(0, firstSeparator)];
  const recordId = value.slice(firstSeparator + 1, lastSeparator);
  const versionText = value.slice(lastSeparator + 1);
  const version = Number(versionText);
  if (
    !kind
    || recordId.trim() !== recordId
    || recordId.length < 3
    || recordId.length > 180
    || !/^[A-Za-z0-9:_.-]+$/.test(recordId)
    || !/^\d+$/.test(versionText)
    || !Number.isSafeInteger(version)
    || version < 1
    || version > 2147483647
  ) return null;
  return { raw: value, kind, recordId, version };
}

export function shiftWorkItemFocusDomId(raw: string) {
  return `clubs-shift-focus-${encodeURIComponent(raw)}`;
}
