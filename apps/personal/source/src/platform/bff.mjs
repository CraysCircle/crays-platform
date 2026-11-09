/** Fixed same-origin reads. Each module continues to validate its own response and rights. */
export const CRAYS_BFF_READS = Object.freeze({ moduleManifest: '/platform/modules', workAccess: '/api/crays/platform/work-access' });
export const CRAYS_DATA_CHANNELS = Object.freeze({
 chuck: Object.freeze({ endpoint: '/api/crays/personal/chuck', protocol: 'persisted-graphql', implementation: 'live-chuck/protocol.mjs' }),
 club: Object.freeze({ endpoint: '/api/club-member/graphql', protocol: 'persisted-graphql', implementation: 'version-pinned-club-module' }),
 messaging: Object.freeze({ endpoint: '/api/crays/personal/messaging', protocol: 'module-http', implementation: 'live-messaging/currentHttpMessaging.mjs' }),
 personalProjection: Object.freeze({ endpoint: null, protocol: 'unconfigured', implementation: null }),
 gym: Object.freeze({ endpoint: null, protocol: 'unconfigured', implementation: null }),
});
export async function readCraysBff(key, { signal, fetch: fetcher = globalThis.fetch } = {}) {
 if (!Object.hasOwn(CRAYS_BFF_READS, key)) throw Error('UNKNOWN_BFF_READ');
 const response = await fetcher(CRAYS_BFF_READS[key], { method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal });
 if (!response.ok) throw Error('BFF_READ_UNAVAILABLE');
 return response;
}
