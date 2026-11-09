/** Frontend ownership, not admission. Core/BFF remains the authority for every request. */
export const CRAYS_MODULES = Object.freeze({
 personal: Object.freeze({ id: 'personal', mode: 'personal', data: 'preview-and-module-adapters', authority: 'core-session' }),
 club: Object.freeze({ id: 'club', mode: 'personal', data: 'persisted-graphql', authority: 'club-bff' }),
 gym: Object.freeze({ id: 'gym', mode: 'personal', data: 'local-design', authority: 'unconfigured' }),
 coffee: Object.freeze({ id: 'coffee', mode: 'personal', data: 'public-franchise-information', authority: 'public' }),
 shop: Object.freeze({ id: 'shop', mode: 'personal', data: 'public-franchise-information', authority: 'public' }),
 pro: Object.freeze({ id: 'pro', mode: 'work', data: 'unconfigured', authority: 'unconfigured' }),
 work: Object.freeze({ id: 'work', mode: 'work', data: 'delegated-business-application', authority: 'work-bff' }),
});
export const CRAYS_NAVIGATION = Object.freeze([
 ['you', 'You', 'personal'], ['explore', 'Explore', 'personal'], ['spots', 'Spots', 'personal'],
 ['activity', 'Activity', 'personal'], ['club', 'Club', 'club'], ['gym', 'Gym', 'gym'],
 ['coffee', 'Coffee', 'coffee'], ['shop', 'Shop', 'shop'],
].map(([id, label, module]) => Object.freeze({ id, label, module })));
export function canonicalAccountBinding(accountId) {
 if (typeof accountId !== 'string' || !accountId.trim() || accountId.length > 1024 || /[\u0000-\u001f\u007f]/.test(accountId)) throw Error('INVALID_CANONICAL_ACCOUNT');
 // An account ID is not a person ID. Only an authorised Core projection may supply the latter.
 return Object.freeze({ accountId, personId: null, authority: 'original-core-session' });
}
export function previewStorageKey(baseKey, accountId) {
 canonicalAccountBinding(accountId);
 if (typeof baseKey !== 'string' || !baseKey) throw Error('INVALID_PREVIEW_NAMESPACE');
 // Byte-compatible with existing worlds. Never migrate or reinterpret their owner as Core identity.
 return `${baseKey}:interactive-preview:${encodeURIComponent(accountId)}`;
}
export function moduleForNavigation(root) {
 const entry = CRAYS_NAVIGATION.find(value => value.id === root);
 if (!entry) throw Error('UNKNOWN_NAVIGATION_ROOT');
 return CRAYS_MODULES[entry.module];
}
