import type { Entity, ProductWorld } from './productModel.ts';

/** Identity only. This reference never proves model execution, a price, or permission. */
export type CanonicalAgentTaskRef = {
  owner: string;
  origin: 'agent';
  id: string;
  canonicalKey: string;
  task: Entity;
  aliasIds: string[];
  manualOrigin: boolean;
  explicitRefinementRequest: boolean;
};
function requireTask(test: unknown, message: string): asserts test {
  if (!test) throw Error(message);
}
const aliasKinds = new Set(['personal-mesh-preview','personal-document-import','personal-chess-game','personal-community-query','personal-recommendation-result','private-contact-report','personal-image-result','personal-webtool','private-matching-preference','grocery-delivery-preview','flight-checkin-result','personal-creative-preview','address-book-query','media-summary-preview','mailbox-search-result','mailbox-reply-result','personal-budget','personal-receipt','personal-decision-preview','private-music-workspace','smart-home-preview','link-reputation','housing-watch-result','mail-alias-workspace','emergency-access-preview','personal-plan', 'pdf-questions', 'article-explanation', 'personal-news-digest', 'source-comparison', 'public-research', 'personal-deadline', 'private-document-bundle', 'personal-note', 'personal-note-search', 'personal-habit', 'personal-occasion', 'personal-checklist', 'appointment-plan', 'week-plan', 'day-agenda', 'trip-plan', 'travel-comparison', 'app-action', 'agent-result', 'task-result']);

export function canonicalAgentTaskRef(world: ProductWorld, inputId: string): CanonicalAgentTaskRef {
  requireTask(typeof inputId === 'string' && !!inputId.trim(), 'Choose the exact original Chuck task.');
  const unique = (id: string): Entity => {
    const found = world.objects.filter(o => o.id === id);
    requireTask(found.length === 1, found.length ? 'This task reference is ambiguous.' : 'The original task link is missing.');
    requireTask(found[0].owner === world.owner, 'This task or result belongs to another account.');
    return found[0];
  };
  const resolve = (id: string, seen = new Set<string>()): Entity => {
    requireTask(!seen.has(id), 'The original task links contain a cycle.');
    const path = new Set(seen); path.add(id);
    const item = unique(id);
    if (item.kind === 'agent-task') {
      // A task is its own original, not an alias for a guessed parent task.
      requireTask(!item.sourceTaskId, 'Conflicting task-to-task provenance requires review.');
      return item;
    }
    requireTask(aliasKinds.has(String(item.kind)), 'This item is not an original Chuck task or a supported linked result.');
    const forward = aliasKinds.has(String(item.kind)) && typeof item.sourceTaskId === 'string' ? item.sourceTaskId : '';
    if (item.sourceTaskId && !forward) throw Error('This result does not have a supported original-task link.');
    const reverse = world.objects.filter(o => o.kind === 'agent-task' && o.resultId === item.id);
    requireTask(reverse.every(o => o.owner === world.owner), 'This result is claimed by another account’s task.');
    const targets = [...new Set([forward, ...reverse.map(o => o.id)].filter(Boolean))];
    requireTask(targets.length > 0, 'This item is not an original Chuck task or a linked result.');
    const originals = targets.map(target => resolve(target, path));
    requireTask(new Set(originals.map(o => o.id)).size === 1, 'This result points to conflicting original tasks.');
    return originals[0];
  };
  const task = resolve(inputId);
  const aliases = new Set([task.id, inputId]);
  // Existing exact edges only. Never infer from a title, UUID prefix, or absent Travel task.
  for (const item of world.objects.filter(o => o.owner === world.owner && o.id !== task.id)) {
    const isCandidate = (aliasKinds.has(String(item.kind)) && item.sourceTaskId === task.id) || task.resultId === item.id;
    if (!isCandidate) continue;
    requireTask(resolve(item.id).id === task.id, 'The task and result disagree about their original.');
    aliases.add(item.id);
  }
  const linkedManual = world.objects.some(o => o.owner === world.owner && o.kind === 'personal-plan' && o.sourceTaskId === task.id &&
    task.synthetic === true && task.sourceFunction === 'AL-293' &&
    (task.sourceContext as { objectId?: unknown } | undefined)?.objectId === o.id);
  const linkedManualWorkspace = world.objects.some(o=>o.owner===world.owner&&['pdf-questions', 'article-explanation', 'personal-news-digest', 'source-comparison', 'public-research', 'personal-deadline', 'private-document-bundle', 'personal-note', 'personal-note-search', 'personal-habit', 'personal-occasion','personal-checklist','appointment-plan','week-plan','day-agenda','trip-plan','travel-comparison'].includes(String(o.kind))&&(o.origin==='manual-plan'||o.kind==='personal-note-search'&&o.origin==='manual-search'||['trip-plan','travel-comparison'].includes(String(o.kind))&&o.originMode==='manual-plan')&&o.sourceTaskId===task.id&&task.resultId===o.id);
  const explicitRefinementRequest = task.aiExecutionRequested === true && task.executionOrigin === 'explicit-chuck-refinement' &&
    typeof task.aiRequestMessageId === 'string' && !!task.aiRequestMessageId && Number(task.aiRequestRevision) > 0;
  return {
    owner: world.owner, origin: 'agent', id: task.id,
    canonicalKey: `${world.owner}:agent:${task.id}`,
    task, aliasIds: [...aliases].sort(),
    manualOrigin: task.origin === 'manual-plan' || linkedManual || linkedManualWorkspace,
    explicitRefinementRequest,
  };
}

export function requireAgentBillingPurpose(ref: CanonicalAgentTaskRef) {
  requireTask(ref.task.aiExecutionApproved !== false, 'This task’s current AI cost approval is absent or revoked.');
  requireTask(ref.task.aiExecutionRequested !== false, 'Manually preparing or saving a plan is not paid Chuck execution.');
  requireTask(!ref.manualOrigin || (ref.explicitRefinementRequest && ref.task.aiExecutionApproved === true),
    'This manual plan needs a separate exact Chuck request and cost approval before paid work.');
}

/** Read legacy aliases without rewriting any prior receipt or inventing a new task. */
export function canonicalTaskUsage(world: ProductWorld, ref: CanonicalAgentTaskRef) {
  return world.objects.filter(entry => {
    if (entry.kind !== 'crays-usage' || entry.owner !== ref.owner) return false;
    if (entry.taskOrigin && entry.taskOrigin !== 'agent') return false;
    if (entry.canonicalTaskKey && entry.canonicalTaskKey !== ref.canonicalKey) {
      requireTask(!ref.aliasIds.includes(String(entry.taskId)), 'A previous usage record has conflicting task provenance.');
      return false;
    }
    let previous: CanonicalAgentTaskRef | undefined;
    try { previous = canonicalAgentTaskRef(world, String(entry.taskId || '')); }
    catch (error) {
      if (ref.aliasIds.includes(String(entry.taskId)) || entry.canonicalTaskKey === ref.canonicalKey) throw error;
      // An unrelated unresolved historical row is retained and still counted by planUsage.
      return false;
    }
    if (entry.canonicalTaskKey === ref.canonicalKey)
      requireTask(previous.canonicalKey === ref.canonicalKey, 'This receipt no longer matches its original task.');
    return previous.canonicalKey === ref.canonicalKey;
  });
}

export function agentRequestFingerprint(task: Entity) {
  return JSON.stringify([task.id,task.owner,task.request,task.aiRequestMessageId,task.aiRequestRevision,task.executionOrigin,task.sourceContext,task.sourceFunction]);
}
