export type PlanningTransportState = "OFFLINE" | "UNCONFIRMED";

type PlanningResponse = {
  ok: boolean;
  status: number;
};

/**
 * Planning writes are never queued or retried automatically. A transport
 * failure has an unknown server outcome, so the caller must reload authority
 * before it can send another mutation.
 */
export async function trainingPlanningRequest(
  fetcher: (url: string, init?: RequestInit) => Promise<Response>,
  url: string,
  init: RequestInit,
  online = true,
): Promise<{ r: PlanningResponse; p: Record<string, unknown> }> {
  if (!online) {
    return { r: { ok: false, status: 0 }, p: { state: "OFFLINE" } };
  }

  try {
    const r = await fetcher(url, init);
    const p = await r.json();
    if (!p || typeof p !== "object" || Array.isArray(p)) {
      throw new Error("INVALID_RESPONSE");
    }
    return { r, p: p as Record<string, unknown> };
  } catch {
    return { r: { ok: false, status: 0 }, p: { state: "UNCONFIRMED" } };
  }
}
