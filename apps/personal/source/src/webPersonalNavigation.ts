import {libraryNavigationDefinitions} from './webLibraryNavigation';

/** Browser navigation metadata only. A route never grants access or replays an action.
 * Resolve original records after account/storage admission, in the existing presenter.
 * Private text, snapshots, approvals and callbacks deliberately have no codec here. */
export type PersonalNavigationPlacement = {
  root: 'you' | 'explore' | 'spots' | 'activity' | 'coffee' | 'shop';
  section: string;
};

type RouteDefinition = PersonalNavigationPlacement & {
  path: string;
  label: string;
  parent?: string;
  parentUsesId?: boolean;
};

export const personalNavigationDefinitions = {
  ...libraryNavigationDefinitions,
  coffee: {path: '/personal/coffee', label: 'Coffee', root: 'coffee', section: 'Overview', parent: 'home'},
  shop: {path: '/personal/shop', label: 'Shop', root: 'shop', section: 'Overview', parent: 'home'},
  home: {path: '/', label: 'Overview', root: 'you', section: 'Overview'},
  vifs: {path: '/personal/vifs', label: 'VIFs', root: 'you', section: 'VIFs', parent: 'home'},
  archived: {path: '/personal/vifs/archived', label: 'Archived', root: 'you', section: 'VIFs', parent: 'vifs'},
  requests: {path: '/personal/requests', label: 'Connection requests', root: 'you', section: 'VIFs', parent: 'vifs'},
  people: {path: '/personal/people', label: 'Find your VIFs', root: 'you', section: 'VIFs', parent: 'vifs'},
  sentRequests: {path: '/personal/requests/sent', label: 'Sent introductions', root: 'you', section: 'VIFs', parent: 'requests'},
  wave: {path: '/personal/wave', label: 'Wave Nearby', root: 'you', section: 'VIFs', parent: 'vifs'},
  waveConversation: {path: '/personal/wave/conversations/:id', label: 'Wave conversation', root: 'you', section: 'VIFs', parent: 'wave'},
  personalSpots: {path: '/personal/spots', label: 'Your Spots', root: 'you', section: 'Spots', parent: 'home'},
  personalSpot: {path:'/personal/spots/:id',label:'Your Spot',root:'you',section:'Spots',parent:'personalSpots'},
  personalSpotFeed: {path:'/personal/spots/:id/feed',label:'Spot Feed',root:'you',section:'Spots',parent:'personalSpot',parentUsesId:true},
  personalSpotChats: {path:'/personal/spots/:id/chats',label:'Spot Chats',root:'you',section:'Spots',parent:'personalSpot',parentUsesId:true},
  spotRelayDiscussion:{path:'/personal/spot-discussions/:id',label:'Spot conversation',root:'you',section:'Spots',parent:'personalSpots'},
  personalSpotWave:{path:'/personal/spots/:id/wave',label:'Wave Nearby',root:'you',section:'Spots',parent:'personalSpotPeople',parentUsesId:true},
  personalSpotPeople: {path:'/personal/spots/:id/people',label:'Spot People',root:'you',section:'Spots',parent:'personalSpot',parentUsesId:true},
  personalSpotVisit: {path:'/personal/spots/:id/visit',label:'Spot Visit',root:'you',section:'Spots',parent:'personalSpot',parentUsesId:true},
  personalSpotServices: {path:'/personal/spots/:id/services',label:'Spot Services',root:'you',section:'Spots',parent:'personalSpot',parentUsesId:true},
  personalSpotMenu:{path:'/personal/spots/:id/menu',label:'Food & drinks',root:'you',section:'Spots',parent:'personalSpot',parentUsesId:true},
  spotCatalogueService:{path:'/personal/spot-services/:id',label:'Your service',root:'you',section:'Spots',parent:'personalSpots'},
  chuck: {path: '/personal/chuck', label: 'Chuck', root: 'you', section: 'Chuck', parent: 'home'},
  chuckTasks: {path:'/personal/chuck/tasks',label:'Tasks & planning',root:'you',section:'Chuck',parent:'chuck'},
  chuckReminders: {path:'/personal/chuck/reminders',label:'Your reminders',root:'you',section:'Chuck',parent:'chuck'},
  chuckKnowledge: {path:'/personal/chuck/knowledge',label:'Knowledge',root:'you',section:'Chuck',parent:'chuck'},
  chuckKnowledgeNotes: {path:'/personal/chuck/knowledge/notes',label:'Your notes',root:'you',section:'Chuck',parent:'chuckKnowledge'},
  chuckKnowledgeSources: {path:'/personal/chuck/knowledge/sources',label:'Your original sources',root:'you',section:'Chuck',parent:'chuckKnowledge'},
  chuckKnowledgePreferences: {path:'/personal/chuck/knowledge/preferences',label:'Your memory preferences',root:'you',section:'Chuck',parent:'chuckKnowledge'},
  chuckResults: {path:'/personal/chuck/results',label:'Results',root:'you',section:'Chuck',parent:'chuck'},
  chuckWorkspace: {path: '/personal/chuck/tools', label: 'Chuck tasks and tools', root: 'you', section: 'Chuck', parent: 'chuck'},
  chuckPeople: {path:'/personal/chuck/people',label:'People',root:'you',section:'Chuck',parent:'chuck'},
  chuckPreferences: {path:'/personal/chuck/preferences',label:'Your goals & preferences',root:'you',section:'Chuck',parent:'chuckPeople'},
  chuckSavedPeople: {path:'/personal/chuck/people/saved',label:'Saved recommendations',root:'you',section:'Chuck',parent:'chuckPeople'},
  chuckDismissedPeople: {path:'/personal/chuck/people/dismissed',label:'Dismissed recommendations',root:'you',section:'Chuck',parent:'chuckPeople'},
  chuckRecommendation: {path:'/personal/chuck/people/:id',label:'Your recommendation',root:'you',section:'Chuck',parent:'chuckPeople'},
  chuckRecommendedPerson: {path:'/personal/chuck/people/:id/person',label:'Recommended person',root:'you',section:'Chuck',parent:'chuckRecommendation',parentUsesId:true},
  upcoming: {path: '/personal/upcoming', label: 'Upcoming', root: 'you', section: 'Overview', parent: 'home'},
  saved: {path: '/personal/saved', label: 'Saved', root: 'you', section: 'Overview', parent: 'home'},
  feed: {path: '/explore/feed', label: 'Feed', root: 'explore', section: 'Feed'},
  publicNostrRelays: {path: '/account/nostr/relays', label: 'Public Nostr relays', root: 'explore', section: 'Feed', parent: 'feed'},
  nostrRelaySource: {path: '/account/nostr/relays/:id', label: 'Relay preferences', root: 'explore', section: 'Feed', parent: 'publicNostrRelays'},
  publicNostrRelayAdd: {path: '/account/nostr/relays/new', label: 'Add a public relay', root: 'explore', section: 'Feed', parent: 'publicNostrRelays'},
  publicNostrCompose: {path: '/explore/feed/compose', label: 'Create a public post', root: 'explore', section: 'Feed', parent: 'feed'},
  publicNostrOriginal: {path: '/explore/feed/originals/:id', label: 'Public original', root: 'explore', section: 'Feed', parent: 'feed'},
  publicNostrAddress: {path: '/explore/feed/addresses/:id', label: 'Public original', root: 'explore', section: 'Feed', parent: 'feed'},
  memberProfile: {path: '/people/:id', label: 'Member profile', root: 'explore', section: 'Feed', parent: 'feed'},
  publicNostrProfile: {path: '/explore/people/:id', label: 'Public profile', root: 'explore', section: 'Feed', parent: 'feed'},
  discover: {path: '/spots/inspiration', label: 'Inspiration', root: 'spots', section: 'Inspiration'},
  props: {path: '/explore/props', label: 'Props', root: 'explore', section: 'Props'},
  propsOriginal: {path:'/explore/props/originals/:id',label:'Props original',root:'explore',section:'Props',parent:'props'},
  propsContest: {path:'/explore/props/contests/:id',label:'Props contest',root:'explore',section:'Props',parent:'props'},
  propsAward: {path: '/explore/props/award', label: 'CRAYS Props Award', root: 'explore', section: 'Props', parent: 'props'},
  feedReels: {path: '/explore/feed/reels', label: 'Reels', root: 'explore', section: 'Feed', parent: 'feed'},
  creatorOffers: {path: '/account/content/offers', label: 'Your offers & subscriptions', root: 'you', section: 'Overview', parent: 'ownContent'},
  spotsDiscover: {path: '/spots/discover', label: 'Find places', root: 'spots', section: 'Discover'},
  spotsConnect: {path: '/explore/connect', label: 'Connect', root: 'explore', section: 'Connect'},
  spotsExperiences: {path: '/spots/experiences', label: 'Experiences', root: 'spots', section: 'Experiences'},
  tasks: {path: '/activity/tasks', label: 'Tasks', root: 'activity', section: 'Tasks'},
  plans: {path: '/activity/plans', label: 'Plans', root: 'activity', section: 'Plans'},
  commerce: {path: '/activity/commerce', label: 'Commerce', root: 'activity', section: 'Commerce'},
  creatorPurchase:{path:'/activity/commerce/purchases/:id',label:'Creator purchase',root:'activity',section:'Commerce',parent:'commerce'},
  creatorPurchaseReceipt:{path:'/activity/commerce/receipts/:id',label:'Purchase receipt',root:'activity',section:'Commerce',parent:'commerce'},
  creatorPurchaseLicence:{path:'/activity/commerce/licences/:id',label:'Content licence',root:'activity',section:'Commerce',parent:'commerce'},
  travelMap: {path: '/activity/travel-map', label: 'Travel Map', root: 'activity', section: 'Travel Map'},
  profile: {path: '/account/profile', label: 'Profile', root: 'you', section: 'Overview'},
  library: {path: '/account/library', label: 'Library', root: 'you', section: 'Overview'},
  libraryPurchase:{path:'/account/library/purchases/:id',label:'Purchased original',root:'you',section:'Overview',parent:'library'},
  libraryPurchaseReceipt:{path:'/account/library/receipts/:id',label:'Purchase receipt',root:'you',section:'Overview',parent:'library'},
  libraryPurchaseLicence:{path:'/account/library/licences/:id',label:'Content licence',root:'you',section:'Overview',parent:'library'},
  libraryMedia: {path: '/account/library/media', label: 'Media files', root: 'you', section: 'Overview', parent: 'library'},
  learning: {path: '/account/library/learning', label: 'Your learning', root: 'you', section: 'Overview', parent: 'library'},
  books: {path: '/account/library/books', label: 'Your books', root: 'you', section: 'Overview', parent: 'library'},
  householdBudget: {path: '/account/library/household-budget', label: 'Household budget', root: 'you', section: 'Overview', parent: 'library'},
  ownContent: {path: '/account/content', label: 'Your content', root: 'you', section: 'Overview', parent: 'library'},
  contentRights: {path: '/library/originals/:id/rights', label: 'Your original rights', root: 'you', section: 'Overview', parent: 'library'},
  badges: {path: '/account/memberships', label: 'Badges & memberships', root: 'you', section: 'Overview'},
  memberships: {path: '/account/passes', label: 'Memberships & passes', root: 'you', section: 'Overview'},
  receipts: {path: '/account/receipts', label: 'Invoices & receipts', root: 'you', section: 'Overview'},
  wallets: {path: '/account/wallets', label: 'Wallets & accounts', root: 'you', section: 'Overview'},
  settings: {path: '/account/settings', label: 'Settings', root: 'you', section: 'Overview'},
  apps: {path: '/account/apps', label: 'Apps & permissions', root: 'you', section: 'Overview', parent: 'settings'},
  appProvider: {path:'/account/apps/:id',label:'App permission options',root:'you',section:'Overview',parent:'apps'},
  permissions: {path: '/account/permissions', label: 'Your permissions', root: 'you', section: 'Overview', parent: 'settings'},
  permission: {path: '/account/permissions/:id', label: 'Your permission', root: 'you', section: 'Overview', parent: 'permissions'},
  delegations: {path: '/account/delegations', label: 'Delegations & spending limits', root: 'you', section: 'Overview', parent: 'apps'},
  memory: {path: '/account/memory', label: 'Memory', root: 'you', section: 'Overview', parent: 'settings'},
  manualTask: {path: '/activity/tasks/:id', label: 'Your task', root: 'activity', section: 'Tasks', parent: 'tasks'},
  privacy: {path: '/account/privacy', label: 'Privacy & security', root: 'you', section: 'Overview', parent: 'settings'},
  devices: {path: '/account/devices', label: 'Devices & recovery', root: 'you', section: 'Overview', parent: 'settings'},
  notifications: {path:'/account/notifications',label:'Notifications',root:'you',section:'Overview',parent:'settings'},
  eventSeries: {path: '/events/series', label: 'Your event series', root: 'activity', section: 'Plans', parent: 'plans'},
  conversation: {path: '/conversations/:id', label: 'Conversation', root: 'you', section: 'VIFs', parent: 'vifs'},
  chuckOriginalMessage: {path: '/conversations/chuck/messages/:id', label: 'Original Chuck message', root: 'you', section: 'VIFs', parent: 'vifs'},
  spot: {path: '/spots/:id', label: 'Spot', root: 'spots', section: 'Discover', parent: 'spotsDiscover'},
  spotDirections: {path: '/spots/:id/directions', label: 'Map & directions', root: 'spots', section: 'Discover', parent: 'spot', parentUsesId: true},
  spotContact: {path: '/spots/:id/contact', label: 'Contact this Spot', root: 'spots', section: 'Discover', parent: 'spot', parentUsesId: true},
  spotRules: {path: '/spots/:id/rules', label: 'House rules & access', root: 'spots', section: 'Discover', parent: 'spot', parentUsesId: true},
  spotPhotos: {path: '/spots/:id/photos', label: 'Spot photos', root: 'spots', section: 'Discover', parent: 'spot', parentUsesId: true},
  spotHours: {path: '/spots/:id/hours', label: 'Opening hours', root: 'spots', section: 'Discover', parent: 'spot', parentUsesId: true},
  publishedLocationHours: {path: '/locations/:id/hours', label: 'Published location hours', root: 'you', section: 'Overview', parent: 'memberships'},
  spotCommunityFeed: {path: '/spots/:id/feed', label: 'Community feed', root: 'you', section: 'Spots', parent: 'spot', parentUsesId: true},
  spotBookings: {path: '/spots/:id/bookings', label: 'Your Spot bookings', root: 'you', section: 'Spots', parent: 'spot', parentUsesId: true},
  plan: {path: '/plans/:id', label: 'Your plan', root: 'activity', section: 'Plans', parent: 'plans'},
  task: {path: '/tasks/:id', label: 'Your task', root: 'activity', section: 'Tasks', parent: 'tasks'},
  agentTask: {path: '/chuck/tasks/:id', label: 'Your Chuck task', root: 'activity', section: 'Tasks', parent: 'tasks'},
  event: {path: '/events/:id', label: 'Event', root: 'activity', section: 'Plans', parent: 'plans'},
  ticketOrder: {path: '/tickets/orders/:id', label: 'Your event order', root: 'activity', section: 'Commerce', parent: 'commerce'},
  community: {path: '/communities/:id', label: 'Community', root: 'you', section: 'Spots', parent: 'personalSpots'},
  communityProgramme: {path: '/communities/:id/programme', label: 'Programme', root: 'you', section: 'Spots', parent: 'community', parentUsesId: true},
  membership: {path: '/memberships/:id', label: 'Your membership', root: 'you', section: 'Overview', parent: 'memberships'},
  membershipDocuments: {path: '/memberships/:id/documents', label: 'Payment & documents', root: 'you', section: 'Overview', parent: 'receipts'},
} as const satisfies Record<string, RouteDefinition>;

export type PersonalNavigationName = keyof typeof personalNavigationDefinitions;
export type PersonalNavigationRoute = {
  name: PersonalNavigationName;
  /** Original opaque source ID, never a display name, a draft or a review token. */
  id?: string;
};

const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);
const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,199}$/.test(value);

export function readPersonalNavigationRoute(value: unknown): PersonalNavigationRoute | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some(key => key !== 'name' && key !== 'id')) return;
  if (typeof raw.name !== 'string' || !own(personalNavigationDefinitions, raw.name)) return;
  const name = raw.name as PersonalNavigationName;
  const definition = personalNavigationDefinitions[name];
  if (definition.path.includes(':id')) {
    if(name==='nostrRelaySource'){if(typeof raw.id!=='string'||!raw.id||raw.id.length>520||/[?@#\\\p{Cc}]/u.test(raw.id)||/nsec1/i.test(raw.id))return;return {name,id:raw.id};}
    if (name==='publicNostrAddress') {if(typeof raw.id!=='string'||!/^naddr1[023456789acdefghjklmnpqrstuvwxyz]{1,900}$/.test(raw.id))return;return {name,id:raw.id};}
    if (!validId(raw.id)) return;
    if(name==='chuckOriginalMessage'&&!/^personal-message-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(raw.id))return;
    if(['chuckRecommendation','chuckRecommendedPerson'].includes(name)&&!/^personal-workspace-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(raw.id))return;
    if (['publicNostrOriginal','publicNostrProfile'].includes(name) && !/^[0-9a-f]{64}$/.test(raw.id)) return;
    return {name, id: raw.id};
  }
  if (raw.id !== undefined) return;
  return {name};
}

export function personalNavigationPath(value: PersonalNavigationRoute): string {
  const route = readPersonalNavigationRoute(value);
  if (!route) throw new Error('Open a valid original destination.');
  const path = personalNavigationDefinitions[route.name].path;
  return route.id ? path.replace(':id', encodeURIComponent(route.id)) : path;
}

/** Readable hash paths preserve the existing host's admitted paths and independent modules.
 * This parser does not consume Club/Gym hashes, Auth return paths or arbitrary query objects. */
export function parsePersonalNavigationPath(path: string): PersonalNavigationRoute | undefined {
  if (typeof path !== 'string' || path.length > 1000 || !path.startsWith('/') || /[?#\\]/.test(path)) return;
  // Preserve saved links to the same complete original pages after their navigation move.
  if(path==='/explore/discover')return {name:'discover'};
  if(path==='/spots/connect')return {name:'spotsConnect'};
  for (const [name, definition] of Object.entries(personalNavigationDefinitions)) {
    if (!definition.path.includes(':id') && path === definition.path) return {name: name as PersonalNavigationName};
  }
  for (const [name, definition] of Object.entries(personalNavigationDefinitions)) {
    if (!definition.path.includes(':id')) continue;
    const [prefix, suffix] = definition.path.split(':id');
    if (!path.startsWith(prefix) || !path.endsWith(suffix)) continue;
    const encoded = path.slice(prefix.length, suffix ? -suffix.length : undefined);
    let id: string;
    try { id = decodeURIComponent(encoded); } catch { continue; }
    const route = readPersonalNavigationRoute({name, id});
    // Reject aliases, encoded slashes and noncanonical/ambiguous forms.
    if (route && personalNavigationPath(route) === path) return route;
  }
}

export function personalNavigationHref(route: PersonalNavigationRoute, basePath = '/'): string {
  // The second path is solely the existing isolated component QA endpoint.
  if (basePath !== '/' && basePath !== '/__qa__/personal') throw new Error('Keep the current Personal origin.');
  const path = personalNavigationPath(route);
  return path === '/' ? basePath : basePath + '#' + path;
}

export type PersonalNavigationLocation =
  | {kind: 'route'; route: PersonalNavigationRoute}
  | {kind: 'module'}
  | {kind: 'invalid'};

export function personalNavigationLocation(pathname: string, hash: string): PersonalNavigationLocation {
  if (/^\/personal\/(club|gym)\/?$/.test(pathname) || /^\/(en|de|es|ca|fr|pt|it)\/account\/?$/.test(pathname)) return {kind: 'module'};
  if (pathname !== '/' && pathname !== '/__qa__/personal') return {kind: 'module'};
  if (!hash) return {kind: 'route', route: {name: 'home'}};
  // The existing CRAYS login accepts a simple safe fragment, not hash paths.
  // This exact return alias opens the canonical workspace without granting access.
  if (hash === '#chuck') return {kind: 'route', route: {name: 'chuck'}};
  if (!hash.startsWith('#/')) return {kind: 'invalid'};
  const route = parsePersonalNavigationPath(hash.slice(1));
  return route ? {kind: 'route', route} : {kind: 'invalid'};
}

export function personalNavigationPlacement(route: PersonalNavigationRoute): PersonalNavigationPlacement {
  const canonical = readPersonalNavigationRoute(route);
  if (!canonical) throw new Error('Open a valid original destination.');
  const {root, section} = personalNavigationDefinitions[canonical.name];
  return {root, section};
}

/** Natural parents are not the browsing history. They supply a way out of a fresh deep link. */
export function personalNavigationParents(route: PersonalNavigationRoute): PersonalNavigationRoute[] {
  const canonical=readPersonalNavigationRoute(route);if(!canonical)return [];
  const parents:PersonalNavigationRoute[]=[];const visited=new Set<string>([canonical.name]);
  let definition:RouteDefinition=personalNavigationDefinitions[canonical.name];
  while(definition.parent){
    if(visited.has(definition.parent)||!own(personalNavigationDefinitions,definition.parent))break;
    visited.add(definition.parent);const parent:PersonalNavigationRoute={name:definition.parent as PersonalNavigationName,...(definition.parentUsesId?{id:canonical.id}:{})};
    if(!readPersonalNavigationRoute(parent))break;
    parents.unshift(parent);definition=personalNavigationDefinitions[parent.name];
  }
  return parents;
}
