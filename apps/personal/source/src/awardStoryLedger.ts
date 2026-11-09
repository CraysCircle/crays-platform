import type { Entity, ProductWorld } from './productModel';
import { storyCampaignsFor } from './awardStoryRegistry';

export const storyDemoStatuses = [
  'draft', 'awaiting_payment', 'payment_confirmed', 'proof_pending', 'counted',
  'cancelled', 'failed', 'expired', 'invalid_proof', 'under_review', 'reversed',
] as const;
export type StoryDemoStatus = typeof storyDemoStatuses[number];
export type StoryOrderInput = {
  id: string; campaignId: string; nominationId: string; competitionId: string;
  seasonId: string; quantity: number; sourcePostId?: string; recipientId: string; contestId?: string;
};
export type StoryOrder = Entity & StoryOrderInput & {
  contestId: string; kind: 'award-story-order-v1'; schemaVersion: 1;
  storyDemoScope: 'crays-award-stories-20261023-v1'; mock: true;
  status: StoryDemoStatus; currency: 'USD'; unitPriceMinor: 100;
  subtotalMinor: number; feeMinor: 0; totalMinor: number;
  nomineeMinor: number; prizePoolMinor: number; eventMinor: number; feeIsMock: true;
  createdAt: number; updatedAt: number;
  history: { status: StoryDemoStatus; at: number }[];
  mockPaymentId?: string; mockProofId?: string; countedAt?: number;
  reversedAt?: number; firstSupport?: boolean;
};
const scope = 'crays-award-stories-20261023-v1';
const next: Record<StoryDemoStatus, readonly StoryDemoStatus[]> = {
  draft: ['awaiting_payment', 'cancelled', 'expired'],
  awaiting_payment: ['payment_confirmed', 'cancelled', 'failed', 'expired'],
  payment_confirmed: ['proof_pending', 'reversed'],
  proof_pending: ['counted', 'invalid_proof', 'under_review', 'reversed'],
  invalid_proof: ['under_review', 'reversed'],
  under_review: ['counted', 'reversed'],
  counted: ['reversed'], cancelled: [], failed: [], expired: [], reversed: [],
};
const unresolved = new Set<StoryDemoStatus>([
  'awaiting_payment', 'payment_confirmed', 'proof_pending', 'invalid_proof', 'under_review',
]);
const identifier = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const validTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
const quantityValid = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && Number.isSafeInteger(value * 100);
const statusValid = (value: unknown): value is StoryDemoStatus =>
  typeof value === 'string' && storyDemoStatuses.some(status => status === value);
const signedIn = (world: ProductWorld) => world.identity.signedIn && typeof world.owner === 'string' && !!world.owner.trim();
const marked = (row: Entity) => row.kind === 'award-story-order-v1' && row.schemaVersion === 1 &&
  row.mock === true && row.storyDemoScope === scope;
const paymentId = (id: string) => `mock-story-payment:${id}`;
const proofId = (id: string) => `mock-story-proof:${id}`;

function campaignFor(world: ProductWorld, input: Pick<StoryOrderInput, 'campaignId' | 'nominationId' | 'competitionId' | 'seasonId' | 'recipientId'>) {
  const matches = storyCampaignsFor(world).filter(campaign => campaign.id === input.campaignId);
  if (matches.length !== 1) return undefined;
  const campaign = matches[0];
  return campaign.nominationId === input.nominationId && campaign.competitionId === input.competitionId &&
    campaign.seasonId === input.seasonId && campaign.creatorId === input.recipientId ? campaign : undefined;
}
function contestValid(world: ProductWorld, input: StoryOrderInput): boolean {
  const campaign = campaignFor(world, input);
  if (!campaign || !identifier(input.contestId)) return false;
  if (input.contestId === campaign.id) return true;
  const actions: unknown[] = 'creatorActions' in campaign && Array.isArray(campaign.creatorActions) ? campaign.creatorActions : [];
  return actions.some(action => action && typeof action === 'object' && 'id' in action && action.id === input.contestId &&
    'contestId' in action && action.contestId === input.contestId &&
    'parentCampaignId' in action && action.parentCampaignId === input.campaignId &&
    'nominationId' in action && action.nominationId === input.nominationId &&
    'competitionId' in action && action.competitionId === input.competitionId &&
    'seasonId' in action && action.seasonId === input.seasonId &&
    'creatorId' in action && action.creatorId === input.recipientId);
}
function requireSource(world: ProductWorld, input: StoryOrderInput) {
  if (!input.sourcePostId) return;
  const campaign = campaignFor(world, input);
  if (!campaign) throw new Error('Review the exact campaign source.');
  if (campaign.chapters.some(chapter => chapter.id === input.sourcePostId)) return;
  const actions: unknown[] = 'creatorActions' in campaign && Array.isArray(campaign.creatorActions) ? campaign.creatorActions : [];
  if (actions.some(action => action && typeof action === 'object' && 'id' in action && action.id === input.sourcePostId &&
    'parentCampaignId' in action && action.parentCampaignId === input.campaignId &&
    'nominationId' in action && action.nominationId === input.nominationId &&
    'competitionId' in action && action.competitionId === input.competitionId &&
    'seasonId' in action && action.seasonId === input.seasonId &&
    'creatorId' in action && action.creatorId === input.recipientId)) return;
  const posts = world.posts.filter(post => post.id === input.sourcePostId);
  if (posts.length === 1 && posts[0].author === input.recipientId && posts[0].audience === 'Public' &&
      posts[0].status === 'accepted' && posts[0].mediaAvailable && !posts[0].protected && !posts[0].archived &&
      posts[0].publishing?.awardCampaignId === input.campaignId &&
      !world.people.some(person => person.id === input.recipientId && (person.blocked || person.blockedByOther))) return;
  throw new Error('Open this campaign’s exact chapter, creator action or permitted original post; a repost cannot change the recipient.');
}
function requireOpen(world: ProductWorld, input: StoryOrderInput) {
  const recipients = world.people.filter(person => person.id === input.recipientId);
  if (recipients.length > 1 || recipients.some(person => person.blocked || person.blockedByOther)) {
    throw new Error('This recipient is blocked or ambiguous; do not start another Props payment.');
  }
  const campaign = campaignFor(world, input);
  const seasonStatus = world.settings[`awardStorySeasonStatus:${input.seasonId}`] ?? campaign?.seasonStatus;
  const actionContest = input.contestId !== campaign?.id;
  const actions: unknown[] = campaign && 'creatorActions' in campaign && Array.isArray(campaign.creatorActions) ? campaign.creatorActions : [];
  const openAction = actions.some(action => action && typeof action === 'object' && 'id' in action && action.id === input.contestId && 'status' in action && action.status === 'open');
  if (!campaign || campaign.status !== 'active' || seasonStatus !== 'open' || actionContest && !openAction) {
    throw new Error('This exact Props nomination and demo season are not open for voting.');
  }
}
function validOrder(world: ProductWorld, row: Entity): row is StoryOrder {
  if (!marked(row) || !identifier(row.id) || !identifier(row.campaignId) || !identifier(row.nominationId) ||
      !identifier(row.competitionId) || !identifier(row.seasonId) || !identifier(row.recipientId) || !identifier(row.contestId) ||
      row.sourcePostId !== undefined && !identifier(row.sourcePostId) || !quantityValid(row.quantity) ||
      !statusValid(row.status) || !validTime(row.createdAt) || !validTime(row.updatedAt) ||
      row.currency !== 'USD' || row.unitPriceMinor !== 100 || row.feeMinor !== 0 || row.feeIsMock !== true ||
      row.subtotalMinor !== row.quantity * 100 || row.totalMinor !== row.quantity * 100 ||
      row.nomineeMinor !== row.quantity * 50 || row.prizePoolMinor !== row.quantity * 25 || row.eventMinor !== row.quantity * 25) return false;
  if (!contestValid(world, { id: row.id, quantity: row.quantity, contestId: row.contestId, campaignId: row.campaignId, nominationId: row.nominationId, competitionId: row.competitionId, seasonId: row.seasonId, recipientId: row.recipientId })) return false;
  if (!Array.isArray(row.history) || !row.history.length) return false;
  let prior: StoryDemoStatus | undefined;
  let at = row.createdAt;
  const seen = new Set<StoryDemoStatus>();
  for (const item of row.history as unknown[]) {
    if (!item || typeof item !== 'object' || !('status' in item) || !('at' in item) ||
        !statusValid(item.status) || !validTime(item.at) || item.at < at || seen.has(item.status) ||
        (prior ? !next[prior].includes(item.status) : item.status !== 'draft' || item.at !== row.createdAt)) return false;
    prior = item.status; at = item.at; seen.add(item.status);
  }
  if (prior !== row.status || at !== row.updatedAt ||
      (seen.has('payment_confirmed') ? row.mockPaymentId !== paymentId(row.id) : row.mockPaymentId !== undefined) ||
      (seen.has('proof_pending') ? row.mockProofId !== proofId(row.id) : row.mockProofId !== undefined)) return false;
  if (seen.has('counted')) {
    const counted = row.history.find((item: { status: StoryDemoStatus; at: number }) => item.status === 'counted');
    if (!seen.has('payment_confirmed') || !seen.has('proof_pending') || typeof row.firstSupport !== 'boolean' || row.countedAt !== counted?.at) return false;
  } else if (row.firstSupport !== undefined || row.countedAt !== undefined) return false;
  const reversed = row.history.find((item: { status: StoryDemoStatus; at: number }) => item.status === 'reversed');
  return reversed ? row.reversedAt === reversed.at : row.reversedAt === undefined;
}
function validOrders(world: ProductWorld): StoryOrder[] {
  const ids = new Map<string, number>();
  for (const row of world.objects) ids.set(row.id, (ids.get(row.id) ?? 0) + 1);
  return world.objects.filter((row): row is StoryOrder => typeof row.owner === 'string' && !!row.owner.trim() && ids.get(row.id) === 1 && validOrder(world, row));
}
function ownOrders(world: ProductWorld): StoryOrder[] {
  return signedIn(world) ? validOrders(world).filter(row => row.owner === world.owner) : [];
}
/** Internal mock reporting input, never a public payer list or an organiser authority grant.
 * The caller must project aggregates and discard private owners/payment references. */
export function allValidStoryOrders(world: ProductWorld): StoryOrder[] {
  return validOrders(world).map(row => ({ ...row, history: row.history.map(item => ({ ...item })) }));
}
/** Read snapshots of the existing world objects; no independent persistence or payment store. */
export function storyOrders(world: ProductWorld): StoryOrder[] {
  return ownOrders(world).map(row => ({ ...row, history: row.history.map(item => ({ ...item })) }));
}
export function storyOrder(world: ProductWorld, id: string): StoryOrder | undefined {
  return storyOrders(world).find(row => row.id === id);
}
export function storyCountedQuantity(world: ProductWorld, nominationId: string, seasonId: string): number {
  const quantity = ownOrders(world).filter(row => row.nominationId === nominationId && row.seasonId === seasonId && row.status === 'counted')
    .reduce((sum, row) => sum + row.quantity, 0);
  if (!Number.isSafeInteger(quantity * 100)) throw new Error('This demo total exceeds exact safe minor-unit arithmetic.');
  return quantity;
}
/** Campaign attribution total for campaign-scoped goals; annual ranking uses nomination + season. */
export function storyCampaignCountedQuantity(world: ProductWorld, campaignId: string, seasonId: string): number {
  const quantity = ownOrders(world).filter(row => row.campaignId === campaignId && row.seasonId === seasonId && row.status === 'counted')
    .reduce((sum, row) => sum + row.quantity, 0);
  if (!Number.isSafeInteger(quantity * 100)) throw new Error('This demo total exceeds exact safe minor-unit arithmetic.');
  return quantity;
}
/** Each paid vote belongs to this exact contest; source posts never select a contest. */
export function storyContestCountedQuantity(world: ProductWorld, contestId: string, seasonId: string): number {
  const quantity = ownOrders(world).filter(row => row.contestId === contestId && row.seasonId === seasonId && row.status === 'counted')
    .reduce((sum, row) => sum + row.quantity, 0);
  if (!Number.isSafeInteger(quantity * 100)) throw new Error('This demo total exceeds exact safe minor-unit arithmetic.');
  return quantity;
}
/** Current own supporter membership, not a public payer list or an automatic prize entry. */
export function storyHasSupported(world: ProductWorld, nominationId: string, seasonId: string): boolean {
  return storyCountedQuantity(world, nominationId, seasonId) > 0;
}
export function prepareStoryOrder(world: ProductWorld, input: StoryOrderInput, now = Date.now()): ProductWorld {
  if (!signedIn(world)) throw new Error('Sign in to prepare your own demo Props order.');
  if (!input || !['id', 'campaignId', 'nominationId', 'competitionId', 'seasonId', 'recipientId'].every(key => identifier(input[key as keyof StoryOrderInput])) ||
      input.sourcePostId !== undefined && !identifier(input.sourcePostId) || !quantityValid(input.quantity) || !validTime(now)) {
    throw new Error('Review the exact Props, recipient and a positive whole number of USD 1 Props.');
  }
  input = { ...input, contestId: input.contestId === undefined ? input.campaignId : input.contestId };
  if (!contestValid(world, input)) throw new Error('Choose this campaign or one exact configured contest; chapters are attribution only.');
  const existing = world.objects.filter(row => row.id === input.id);
  if (existing.length) {
    const original = existing.length === 1 && existing[0].owner === world.owner && validOrder(world, existing[0]) ? existing[0] : undefined;
    if (!original || ['campaignId', 'nominationId', 'competitionId', 'seasonId', 'recipientId', 'quantity', 'sourcePostId', 'contestId'].some(key => original[key] !== input[key as keyof StoryOrderInput])) {
      throw new Error('This order ID already has a different original; do not create a replacement charge.');
    }
    return world;
  }
  requireOpen(world, input);
  requireSource(world, input);
  if (world.objects.some(row => row.owner === world.owner && marked(row) && row.nominationId === input.nominationId && row.seasonId === input.seasonId &&
      (!validOrder(world, row) || world.objects.filter(other => other.id === row.id).length !== 1 || unresolved.has(row.status)))) {
    throw new Error('Keep the original pending payment or proof; do not prepare another charge for this nomination.');
  }
  const row: StoryOrder = {
    id: input.id, owner: world.owner, kind: 'award-story-order-v1', schemaVersion: 1,
    storyDemoScope: scope, mock: true, campaignId: input.campaignId, nominationId: input.nominationId,
    competitionId: input.competitionId, seasonId: input.seasonId, recipientId: input.recipientId,
    ...(input.sourcePostId === undefined ? {} : { sourcePostId: input.sourcePostId }),
    contestId: input.contestId!, quantity: input.quantity, status: 'draft', currency: 'USD', unitPriceMinor: 100,
    subtotalMinor: input.quantity * 100, feeMinor: 0, totalMinor: input.quantity * 100,
    nomineeMinor: input.quantity * 50, prizePoolMinor: input.quantity * 25, eventMinor: input.quantity * 25,
    feeIsMock: true, createdAt: now, updatedAt: now, history: [{ status: 'draft', at: now }],
  };
  return { ...world, objects: [...world.objects, row] };
}
export function transitionStoryOrder(world: ProductWorld, id: string, nextStatus: StoryDemoStatus, now = Date.now()): ProductWorld {
  if (!signedIn(world)) throw new Error('Sign in to review your own demo Props order.');
  const row = ownOrders(world).find(order => order.id === id);
  if (!row || !statusValid(nextStatus)) throw new Error('Open one exact current demo Props order.');
  // A repeated or late callback never moves an order backwards or resurrects a reversal.
  if (row.history.some(item => item.status === nextStatus)) return world;
  if (!next[row.status].includes(nextStatus) || !validTime(now) || now < row.updatedAt) throw new Error('This demo order transition is not available.');
  if (nextStatus === 'awaiting_payment' || nextStatus === 'counted') requireOpen(world, row);
  if (nextStatus === 'awaiting_payment' && world.objects.some(other => other !== row && other.owner === world.owner &&
      marked(other) && other.nominationId === row.nominationId && other.seasonId === row.seasonId &&
      (!validOrder(world, other) || world.objects.filter(candidate => candidate.id === other.id).length !== 1 || unresolved.has(other.status)))) {
    throw new Error('Keep the original pending payment or proof; do not start another charge for this nomination.');
  }
  if (nextStatus === 'counted' && (!row.mockPaymentId || !row.mockProofId ||
      !Number.isSafeInteger((storyCountedQuantity(world, row.nominationId, row.seasonId) + row.quantity) * 100))) {
    throw new Error('A separately simulated payment and proof with an exact safe total are required.');
  }
  const changed: StoryOrder = {
    ...row, status: nextStatus, updatedAt: now, history: [...row.history, { status: nextStatus, at: now }],
    ...(nextStatus === 'payment_confirmed' ? { mockPaymentId: paymentId(row.id) } : {}),
    ...(nextStatus === 'proof_pending' ? { mockProofId: proofId(row.id) } : {}),
    ...(nextStatus === 'counted' ? { countedAt: now, firstSupport: !storyHasSupported(world, row.nominationId, row.seasonId) } : {}),
    ...(nextStatus === 'reversed' ? { reversedAt: now } : {}),
  };
  return { ...world, objects: world.objects.map(original => original === row ? changed : original) };
}
export function resetStoryDemo(world: ProductWorld): ProductWorld {
  if (!signedIn(world)) throw new Error('Sign in before resetting your own story demo.');
  const objects = world.objects.filter(row => row.owner !== world.owner || !marked(row));
  return objects.length === world.objects.length ? world : { ...world, objects };
}
