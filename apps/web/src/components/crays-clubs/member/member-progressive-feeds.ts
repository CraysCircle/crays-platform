/** Request-scoped presentation updates only. Each loader retains its own server
 * authentication, ownership and response validation; no feed is cached. */
export async function readProgressiveMemberFeeds<T extends object>(
  loaders: { [K in keyof T]: () => Promise<T[K]> },
  signal: AbortSignal,
  publish: <K extends keyof T>(key: K, value: T[K]) => void,
): Promise<void> {
  await Promise.all((Object.keys(loaders) as (keyof T)[]).map(async key => {
    const value = await loaders[key]();
    if (!signal.aborted) publish(key, value);
  }));
}
