import { parseHotelMemberStayPreferences } from "./hotel-member-preferences";

/** Local TEST consumer only; the Member server independently validates all preferences. */
export function buildHotelMemberPreviewUrl(value: unknown):
  | { status: "ready_preferences_only"; href: string }
  | { status: "invalid_preferences"; reason: string } {
  const parsed = parseHotelMemberStayPreferences(value);
  if (parsed.status === "invalid_preferences") return parsed;
  const json = JSON.stringify(parsed.preferences);
  if (json.length > 2048) return { status: "invalid_preferences", reason: "preference_payload_too_large" };
  const target = new URL("http://127.0.0.1:43172/api/crays/clubs/member/stay-preferences");
  target.searchParams.set("stay_preferences", json);
  return { status: "ready_preferences_only", href: target.href };
}
