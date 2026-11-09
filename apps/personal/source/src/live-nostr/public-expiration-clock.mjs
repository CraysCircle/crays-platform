/** Public NIP-40 visibility only. No relay deletion or privacy guarantee.
 * Ambiguous/malformed expiration is hidden by explicit local policy, not repaired.
 * Input must already be a wire-verified immutable original.
 */
export function publicExpirationMilliseconds(event) {
  const tags = event.tags.filter(tag => tag[0] === 'expiration');
  if (!tags.length) return null;
  if (tags.length !== 1 || tags[0].length !== 2 || !/^(0|[1-9][0-9]*)$/.test(tags[0][1])) return 0;
  const seconds = Number(tags[0][1]);
  return Number.isSafeInteger(seconds) && seconds <= Math.floor(Number.MAX_SAFE_INTEGER / 1000) ? seconds * 1000 : 0;
}
export function visiblePublicOriginals(originals, now = Date.now()) {
  const visible = originals.filter(({event}) => {
    const expires = publicExpirationMilliseconds(event);
    return expires === null || expires > now;
  });
  return visible.length === originals.length ? originals : Object.freeze(visible);
}
export function nextPublicExpiration(originals, now = Date.now()) {
  let next = null;
  for (const {event} of originals) {
    const expires = publicExpirationMilliseconds(event);
    if (expires !== null && expires > now && (next === null || expires < next)) next = expires;
  }
  return next;
}
