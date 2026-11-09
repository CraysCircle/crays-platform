export type TrainingWriteResult = {
  r: Response;
  p: Record<string, unknown>;
};

const synthetic = (state: "OFFLINE" | "UNCONFIRMED") => ({
  r: Response.json({ state }, { status: 503 }),
  p: { state },
});

/** A workout write is attempted at most once. Unknown outcomes require an authority reload. */
export async function trainingWriteRequest(
  send: (url: string, init: RequestInit) => Promise<Response>,
  url: string,
  init: RequestInit,
  online: boolean,
): Promise<TrainingWriteResult> {
  if (!online) return synthetic("OFFLINE");
  try {
    const r = await send(url, init);
    const p = await r.json().catch(() => ({ state: r.ok ? "UNCONFIRMED" : "UNAVAILABLE" }));
    if (r.ok && p.state === "UNCONFIRMED") return synthetic("UNCONFIRMED");
    return { r, p };
  } catch {
    return synthetic("UNCONFIRMED");
  }
}
