import {localPresenceCurrent} from './localPresence.ts';
import type { ActionContext, Entity, Post, ProductWorld } from './productModel.ts';
import { localPreviewId } from './localPreviewId.ts';

// Local design model only. Production group membership, invitations and keys
// must come from the existing CRAYS/Nostr authority, not these preview records.
export type CircleParticipant = Entity & {
  kind: 'circle-participant'; groupId: string; personId: string;
  groupVersion: number; version: number; status: 'active' | 'left' | 'revoked';
  joinedAt: number; role: 'Member' | 'Moderator' | 'Admin'; authoritySource?: 'local-circle-create';
};
export type CircleAdmission = Entity & {
  kind: 'circle-request' | 'circle-invitation'; groupId: string; personId: string;
  groupVersion: number; version: number; status: 'pending' | 'approved' | 'declined' | 'revoked' | 'accepted';
  issuedBy: string; createdAt: number; expiresAt?: number;
};
export type CircleAccessAction = 'join' | 'invite' | 'accept' | 'decide' | 'leave' | 'revoke' | 'grant-history' | 'assign-role' | 'accept-role' | 'revoke-role';
const knownGroups = new Set(['circle-design', 'demo-group-table', 'demo-group-move', 'demo-group-makers']);
const need: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw Error(message); };
const revision = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
function groupFor(w: ProductWorld, id: string) {
  const rows = w.objects.filter(o => o.id === id);
  return rows.length === 1 && rows[0].owner === w.owner && rows[0].kind === 'group' ? rows[0] : undefined;
}
function contextAllowed(w: ProductWorld, group: Entity | undefined, now = Date.now()) {
  if (!w.identity.signedIn || !group || group.suspended === true) return false;
  if (!group.venueId) return true;
  const places = w.venues.filter(v => v.id === group.venueId);
  return places.length === 1 && places[0].operatorActive && ['active', 'provisional'].includes(places[0].membership)
    && (group.audience !== 'On-site' || localPresenceCurrent(w,places[0].id,now));
}
function participants(w: ProductWorld, group: Entity, personId: string) {
  return w.objects.filter(o => o.owner === w.owner && o.kind === 'circle-participant' && o.groupId === group.id && o.personId === personId) as CircleParticipant[];
}
function participantFor(w: ProductWorld, group: Entity, personId: string) {
  const rows = participants(w, group, personId);
  return rows.length === 1 && w.objects.filter(o => o.id === rows[0].id).length === 1
    && rows[0].status === 'active' && rows[0].groupVersion === group.circleVersion
    && revision(rows[0].version) && Number.isFinite(rows[0].joinedAt) && rows[0].joinedAt > 0 ? rows[0] : undefined;
}
function knownLegacy(w: ProductWorld, group: Entity) {
  return w.owner === 'thorben' && knownGroups.has(group.id) && group.membership === 'active'
    && group.history === 'From joining only' && group.circleAccessManaged !== true && !group.circleVersion
    && !participants(w, group, w.owner).length;
}
export function circleCanParticipate(w: ProductWorld, groupId: string, now = Date.now()) {
  const group = groupFor(w, groupId);
  return Boolean(contextAllowed(w, group, now) && group?.membership === 'active'
    && (participantFor(w, group!, w.owner) || knownLegacy(w, group!)));
}
function creationRoot(group: Entity) { return JSON.stringify([group.id, group.circleCreatedBy, group.circleCreatedAt]); }
function roleAuthority(w: ProductWorld, group: Entity, personId: string, now: number) {
  const p = participantFor(w, group, personId);
  if (!p || !contextAllowed(w, group, now)) return;
  if (p.role === 'Admin' && p.authoritySource === 'local-circle-create' && group.circleCreatedBy === personId
    && Number.isFinite(group.circleCreatedAt) && group.circleCreatedAt === p.joinedAt) return { role: 'Admin' as const, key: JSON.stringify(['created', p.id, p.version, creationRoot(group)]) };
  const grants = w.objects.filter(o => o.owner === w.owner && o.kind === 'circle-role-grant' && o.groupId === group.id
    && o.personId === personId && o.participantId === p.id && o.participantVersion === p.version && o.groupVersion === group.circleVersion && o.status === 'active');
  if (grants.length !== 1) return;
  const grant = grants[0];
  // Records are produced only by the reviewed local transition below. Generic
  // edits must be sealed; this captured decision is not a production signature.
  if (w.objects.filter(o => o.id === grant.id).length !== 1 || !revision(grant.version) || !['Admin', 'Moderator'].includes(String(grant.role))
    || grant.authoritySource !== 'circle-role-decision' || grant.creationRoot !== creationRoot(group)
    || typeof grant.issuerAuthorityKey !== 'string' || !grant.issuerAuthorityKey || grant.acceptedBy !== personId
    || !Number.isFinite(grant.acceptedAt) || Number(grant.acceptedAt) > now
    || !(grant.permanentAdmin === true && grant.handoff === true && grant.role === 'Admin' || Number.isFinite(grant.expiresAt) && Number(grant.expiresAt) > now)) return;
  return { role: grant.role as 'Admin' | 'Moderator', key: JSON.stringify(['grant', grant.id, grant.version, p.id, p.version, creationRoot(group)]) };
}
export function circleCanAdmin(w: ProductWorld, groupId: string, now = Date.now()) {
  const group = groupFor(w, groupId);
  return Boolean(group && circleCanParticipate(w, groupId, now) && roleAuthority(w, group, w.owner, now)?.role === 'Admin');
}
/** Current local source authority, for separately reviewed same-Circle commercial purpose. Not a Core grant. */
export function circleAdminAuthoritySnapshot(w:ProductWorld,groupId:string,now=Date.now()){
 const group=groupFor(w,groupId);if(!group||!circleCanAdmin(w,groupId,now))return;
 return JSON.stringify({owner:w.owner,groupId,groupVersion:group.circleVersion,creationRoot:creationRoot(group),authority:roleAuthority(w,group,w.owner,now)?.key});
}
export function circleCanModerate(w: ProductWorld, groupId: string, now = Date.now()) {
  const group = groupFor(w, groupId);
  return Boolean(group && circleCanParticipate(w, groupId, now) && roleAuthority(w, group, w.owner, now));
}
export function circleRole(w: ProductWorld, groupId: string, personId: string, now = Date.now()) {
  const group = groupFor(w, groupId);
  return group && participantFor(w, group, personId) ? roleAuthority(w, group, personId, now)?.role || 'Member' : undefined;
}
export function circleRoleOffers(w: ProductWorld, groupId: string, now = Date.now()) {
  const group = groupFor(w, groupId);
  if (!group || !contextAllowed(w, group, now)) return [];
  return w.objects.filter(o => o.owner === w.owner && o.kind === 'circle-role-grant' && o.groupId === groupId
    && w.objects.filter(row => row.id === o.id).length === 1 && o.groupVersion === group.circleVersion && o.status === 'pending'
    && (o.personId === w.owner || circleCanAdmin(w, groupId, now)) && Number.isFinite(o.expiresAt) && Number(o.expiresAt) > now);
}
function continuingAdmin(w: ProductWorld, group: Entity, personId: string, now: number) {
  const proof = roleAuthority(w, group, personId, now);
  return proof?.role === 'Admin' && (proof.key.startsWith('["created",') || w.objects.some(o => o.owner === w.owner && o.kind === 'circle-role-grant'
    && o.groupId === group.id && o.personId === personId && o.status === 'active' && o.permanentAdmin === true
    && proof.key === JSON.stringify(['grant', o.id, o.version, o.participantId, o.participantVersion, creationRoot(group)])));
}
function anotherContinuingAdmin(w: ProductWorld, group: Entity, except: string, now: number) {
  return w.objects.some(o => o.owner === w.owner && o.kind === 'circle-participant' && o.groupId === group.id && o.personId !== except
    && continuingAdmin(w, group, String(o.personId), now));
}

function knownHistoryIds(w: ProductWorld, groupId: string) {
  return /^demo-group-(table|move|makers)$/.test(groupId)
    ? Array.from({ length: 7 }, (_, i) => `${groupId}-message-${i}`).filter(id => w.objects.filter(o => o.id === id && o.groupId === groupId && o.kind === 'group-message' && o.owner === w.owner).length === 1)
    : [];
}

/** Call in the existing group.message transaction after validating the text/photo. */
export function circleMessageFields(w: ProductWorld, groupId: string, now = Date.now()) {
  const group = groupFor(w, groupId);
  need(group && circleCanParticipate(w, groupId, now) && Number.isFinite(now) && now > 0, 'Current membership in this exact Circle is required.');
  if (knownLegacy(w, group)) {
    const ids = knownHistoryIds(w, groupId);
    group.circleVersion = 1; group.circleAccessManaged = true;
    w.objects.push({ id: localPreviewId(), owner: w.owner, kind: 'circle-participant', groupId, personId: w.owner,
      groupVersion: 1, version: 1, status: 'active', joinedAt: now, role: 'Member', legacyHistorySource: 'known-demo-membership', legacyHistoryIds: ids });
  }
  return { createdAt: now, author: w.owner, groupId };
}

/** Called ONLY inside the successful group.create branch, never for an opened existing group. */
export function initialiseCreatedCircle(w: ProductWorld, groupId: string, now = Date.now()) {
  const group = groupFor(w, groupId);
  need(group && contextAllowed(w, group, now) && group.circleCreatedBy === w.owner && group.circleCreatedAt === now
    && !group.circleAccessManaged && !group.circleVersion && !w.objects.some(o => o.kind === 'circle-participant' && o.groupId === groupId),
  'Initial Circle administration must be bound to this exact newly created Circle.');
  group.circleVersion = 1; group.circleAccessManaged = true; group.membership = 'active';
  w.objects.push({ id: localPreviewId(), owner: w.owner, kind: 'circle-participant', groupId, personId: w.owner,
    groupVersion: 1, version: 1, status: 'active', joinedAt: now, role: 'Admin', authoritySource: 'local-circle-create' });
}

function canonicalItem(w: ProductWorld, groupId: string, item: Entity | Post) {
  const rows = [...w.objects.filter(o => o.id === item.id), ...w.posts.filter(p => p.id === item.id)];
  if (rows.length !== 1) return;
  const source = rows[0];
  if (source.groupId !== groupId) return;
  if ('kind' in source) {
    if (source.kind !== 'group-message' || source.owner !== w.owner) return;
  } else if (!['accepted', 'partial'].includes(String(source.status)) || source.archived) return;
  return source;
}
/** Shared by chat, Shared posts, search/library and Chuck input selection. */
export function circleHistoryAllows(w: ProductWorld, groupId: string, item: Entity | Post, now = Date.now()) {
  const group = groupFor(w, groupId), source = canonicalItem(w, groupId, item);
  if (!group || !source || !circleCanParticipate(w, groupId, now)) return false;
  const participant = participantFor(w, group, w.owner);
  if (!participant) {
    // Explicit fixture policy: only the seven already seeded messages of each
    // known demo group. Unknown/undated originals are never grandfathered in.
    return knownLegacy(w, group) && /^demo-group-(table|move|makers)$/.test(groupId)
      && Array.from({ length: 7 }, (_, i) => `${groupId}-message-${i}`).includes(source.id)
      && 'kind' in source && source.kind === 'group-message' && Number.isFinite(source.createdAt);
  }
  const timestamp = Number(source.createdAt);
  if (Number.isFinite(timestamp) && timestamp >= participant.joinedAt && timestamp <= now) return true;
  if (w.owner === 'thorben' && knownGroups.has(groupId) && participant.legacyHistorySource === 'known-demo-membership'
    && Array.isArray(participant.legacyHistoryIds) && participant.legacyHistoryIds.includes(source.id)
    && knownHistoryIds(w, groupId).includes(source.id)) return true;
  return w.objects.some(grant => grant.owner === w.owner && grant.kind === 'circle-history-grant'
    && w.objects.filter(o => o.id === grant.id).length === 1 && grant.groupId === groupId
    && grant.personId === w.owner && grant.participantId === participant.id && grant.participantVersion === participant.version
    && grant.groupVersion === group.circleVersion && grant.status === 'active' && Number.isFinite(grant.expiresAt) && Number(grant.expiresAt) > now
    && Array.isArray(grant.itemIds) && grant.itemIds.includes(source.id)
    && (grant.issuedBy === group.circleCreatedBy && grant.authoritySource === 'local-circle-create'
      || grant.authoritySource === 'circle-role-decision' && grant.creationRoot === creationRoot(group) && typeof grant.issuerAuthorityKey === 'string' && Boolean(grant.issuerAuthorityKey)));
}
export function circleVisibleMessages(w: ProductWorld, groupId: string, now = Date.now()) {
  return w.objects.filter(o => o.kind === 'group-message' && circleHistoryAllows(w, groupId, o, now));
}
export function circleVisiblePosts(w: ProductWorld, groupId: string, now = Date.now()) {
  return w.posts.filter(p => circleHistoryAllows(w, groupId, p, now));
}
export function circlePendingAdmissions(w: ProductWorld, groupId: string, now = Date.now()) {
  const group = groupFor(w, groupId);
  if (!group || !contextAllowed(w, group, now)) return [];
  return w.objects.filter(o => ['circle-request', 'circle-invitation'].includes(String(o.kind)) && o.owner === w.owner
    && o.groupId === groupId && o.groupVersion === (group.circleVersion || 1) && o.status === 'pending'
    && revision(o.version) && w.objects.filter(row => row.id === o.id).length === 1
    && (o.kind === 'circle-request' && !o.expiresAt || Number.isFinite(o.expiresAt) && Number(o.expiresAt) > now)
    && (o.personId === w.owner || circleCanModerate(w, groupId, now))) as CircleAdmission[];
}

/** Names and metadata are projected only after the same current access checks as entry. */
export function circleDiscoverableGroups(w: ProductWorld, query = '', now = Date.now()) {
  if (!Number.isFinite(now) || now <= 0) return [];
  return w.objects.filter(group => {
    if (group.kind !== 'group' || groupFor(w, group.id) !== group || !contextAllowed(w, group, now)) return false;
    const visible = circleCanParticipate(w, group.id, now)
      || ['Open', 'Request to join'].includes(String(group.access))
      || group.access === 'Private' && circlePendingAdmissions(w, group.id, now).some(invite =>
        invite.kind === 'circle-invitation' && invite.personId === w.owner && invitationAuthorityCurrent(w, group, invite, now));
    return visible && String(group.name || '').toLowerCase().includes(query.trim().toLowerCase());
  });
}
function invitationAuthorityCurrent(w: ProductWorld, group: Entity, invite: CircleAdmission, now: number) {
  const authority = participantFor(w, group, invite.issuedBy), proof = roleAuthority(w, group, invite.issuedBy, now);
  return Boolean(proof && (invite.issuerAuthorityKey ? invite.issuerAuthorityKey === proof.key
    : invite.issuedBy === group.circleCreatedBy && invite.authoritySource === 'local-circle-create')
    && authority && authority.id === invite.authorityParticipantId && authority.version === invite.authorityParticipantVersion);
}

/** Local transitions are atomic even if invoked outside the outer act() clone. */
export function applyCircleAccess(w: ProductWorld, action: CircleAccessAction, data: Record<string, string>, ctx: Partial<ActionContext>, now = Date.now()) {
  const draft = structuredClone(w);
  const result = transition(draft, action, data, ctx, now);
  w.objects = draft.objects;
  return result;
}
function transition(w: ProductWorld, action: CircleAccessAction, data: Record<string, string>, ctx: Partial<ActionContext>, now: number) {
  const group = groupFor(w, ctx.objectId || '');
  need(group && w.identity.signedIn, 'Open this exact Circle in your signed-in account.');
  if (ctx.venueId) need(group.venueId === ctx.venueId, 'Keep this exact Circle and Spot context.');
  need(Number.isFinite(now) && now > 0, 'Use a valid current preview time.');
  if (action !== 'leave' && action !== 'revoke') need(contextAllowed(w, group, now), 'Current access to this Circle context is required.');
  const groupVersion = Number(group.circleVersion || 1);
  need(revision(groupVersion), 'Review the current Circle version.');
  const stamp = () => { group.circleVersion = groupVersion; group.circleAccessManaged = true; };
  const add = (kind: string, fields: Record<string, unknown>) => {
    const record = { id: localPreviewId(), owner: w.owner, kind, groupId: group.id, groupVersion, version: 1, ...fields };
    w.objects.push(record); return record;
  };
  const activate = (personId: string) => {
    const previous = participants(w, group, personId);
    need(previous.length <= 1, 'Resolve ambiguous membership originals first.');
    const participant = previous[0];
    if (participant) {
      need(participant.status !== 'active', 'This participant is already active.');
      Object.assign(participant, { status: 'active', groupVersion, version: participant.version + 1, joinedAt: now, role: 'Member' });
      delete participant.authoritySource;
      delete participant.legacyHistorySource; delete participant.legacyHistoryIds;
    } else add('circle-participant', { personId, status: 'active', joinedAt: now, role: 'Member' });
    stamp();
    if (personId === w.owner) group.membership = 'active';
  };
  const admin = () => need(circleCanAdmin(w, group.id, now), 'Current verified administration of this exact Circle is required; a role label is not enough.');
  const moderate = () => need(circleCanModerate(w, group.id, now), 'Current verified moderation of this exact Circle is required; a role label is not enough.');
  const admission = (kind: string) => {
    const rows = w.objects.filter(o => o.id === data.admissionId);
    const record = rows[0] as CircleAdmission | undefined;
    need(rows.length === 1 && record?.owner === w.owner && record.kind === kind && record.groupId === group.id
      && record.groupVersion === groupVersion && revision(record.version) && String(record.version) === data.version && record.status === 'pending'
      && (kind === 'circle-request' && !record.expiresAt || Number.isFinite(record.expiresAt) && Number(record.expiresAt) > now), 'Review the exact current, unexpired admission original and version.');
    return record;
  };
  if (action === 'join') {
    need(['Open', 'Request to join'].includes(String(group.access)), 'Accept your exact valid invitation to this private Circle.');
    if (circleCanParticipate(w, group.id, now)) return { objectId: group.id, message: 'You are already a member of this Circle.' };
    if (group.access === 'Open') { activate(w.owner); return { objectId: group.id, message: 'Joined this Circle from now. Earlier history, other communities and physical presence were not granted.' }; }
    const pending = w.objects.filter(o => o.owner === w.owner && o.kind === 'circle-request' && o.groupId === group.id && o.personId === w.owner && o.status === 'pending');
    need(pending.length <= 1, 'Resolve ambiguous pending requests first.');
    if (pending.length) {
      need(pending[0].groupVersion === groupVersion, 'This request is stale. Review the current Circle.');
      return { objectId: pending[0].id, message: 'Your same join request is still pending. No history was granted.' };
    }
    stamp(); group.membership = 'requested';
    const request = add('circle-request', { personId: w.owner, issuedBy: w.owner, createdAt: now, status: 'pending' });
    return { objectId: request.id, message: 'Your named request awaits this Circle’s authorised administrator. History remains locked.' };
  }
  if (action === 'invite') {
    moderate();
    const people = w.people.filter(p => p.id === data.personId);
    need(people.length === 1 && people[0].contact && people[0].consentSelf && people[0].consentOther
      && people[0].request === 'accepted' && !people[0].blocked && !people[0].blockedByOther && data.personId !== w.owner,
    'Select one current, mutually accepted VIF for this invitation.');
    need(!participantFor(w, group, data.personId) && !w.objects.some(o => o.owner === w.owner && o.kind === 'circle-invitation' && o.groupId === group.id && o.personId === data.personId && o.status === 'pending'), 'This person is already a member or has a pending invitation.');
    const expiresAt = Number(data.expiresAt);
    need(Number.isFinite(expiresAt) && expiresAt > now && data.approved === 'Yes', 'Confirm the exact recipient, Circle and future invitation expiry.');
    const invite = add('circle-invitation', { personId: data.personId, issuedBy: w.owner, createdAt: now, expiresAt, status: 'pending', authoritySource: 'local-circle-create' });
    const authority = participantFor(w, group, w.owner)!;
    Object.assign(invite, { authorityParticipantId: authority.id, authorityParticipantVersion: authority.version, issuerAuthorityKey: roleAuthority(w, group, w.owner, now)!.key });
    return { objectId: invite.id, message: 'Invitation prepared for this exact person and Circle. Acceptance is separate; no past history was shared.' };
  }
  if (action === 'accept') {
    const invite = admission('circle-invitation');
    need(invite.personId === w.owner && invitationAuthorityCurrent(w, group, invite, now)
      && data.approved === 'Yes', 'Only the named invitee can accept this verified Circle invitation.');
    activate(w.owner); invite.status = 'accepted'; invite.version++; invite.decidedAt = now;
    return { objectId: invite.id, message: 'Invitation accepted. Your membership and history start now; no earlier private history was unlocked.' };
  }
  if (action === 'decide') {
    moderate(); const request = admission('circle-request');
    need(['Approve', 'Decline'].includes(data.decision) && data.approved === 'Yes' && typeof request.personId === 'string' && request.personId !== w.owner,
      'Review a named participant request and its exact decision, not your own membership.');
    if (data.decision === 'Approve') activate(request.personId);
    request.status = data.decision === 'Approve' ? 'approved' : 'declined'; request.version++; request.decidedAt = now;
    return { objectId: request.id, message: 'Decision saved for this named request only. Your own membership and previous private history are unchanged.' };
  }
  if (action === 'leave') {
    const rows = participants(w, group, w.owner);
    need(rows.length <= 1, 'Resolve ambiguous membership originals first.');
    if (contextAllowed(w, group, now) && continuingAdmin(w, group, w.owner, now)) need(anotherContinuingAdmin(w, group, w.owner, now), 'Complete an accepted administration handoff before leaving this active Circle. A temporary role is not a continuing administrator.');
    if (rows[0]) { rows[0].status = 'left'; rows[0].version++; rows[0].endedAt = now; }
    stamp(); group.membership = 'none';
    for (const row of w.objects.filter(o => o.owner === w.owner && o.groupId === group.id && o.personId === w.owner && ['circle-request', 'circle-invitation', 'circle-history-grant', 'circle-role-grant'].includes(String(o.kind)) && ['pending', 'active'].includes(String(o.status)))) { row.status = 'revoked'; row.version = Number(row.version || 0) + 1; }
    return { objectId: group.id, message: 'Left this Circle. Rejoining will need a fresh boundary; contacts, other Circles and Spot membership are unchanged.' };
  }
  if (action === 'revoke') {
    moderate();
    const rows = w.objects.filter(o => o.id === data.targetId);
    const target = rows[0];
    need(rows.length === 1 && target.owner === w.owner && target.groupId === group.id && target.groupVersion === groupVersion
      && ['circle-participant', 'circle-invitation', 'circle-request', 'circle-history-grant'].includes(String(target.kind))
      && String(target.version) === data.version && ['active', 'pending'].includes(String(target.status)) && target.personId !== w.owner
      && data.approved === 'Yes', 'Review one current participant, invitation, request or history grant and its version.');
    if (!circleCanAdmin(w, group.id, now)) need(['circle-request', 'circle-invitation'].includes(String(target.kind)) || target.kind === 'circle-participant' && circleRole(w, group.id, String(target.personId), now) === 'Member', 'A moderator cannot remove administrators, moderators or history permissions.');
    if (target.kind === 'circle-participant' && continuingAdmin(w, group, String(target.personId), now)) need(anotherContinuingAdmin(w, group, String(target.personId), now), 'Keep a continuing administrator before removing this membership.');
    target.status = 'revoked'; target.version = Number(target.version) + 1; target.endedAt = now;
    return { objectId: target.id, message: 'Revoked this exact Circle permission. Other groups, identity, private VIFs and physical access are unchanged.' };
  }
  if (action === 'assign-role') {
    admin();
    const p = participantFor(w, group, data.personId);
    need(p && p.personId !== w.owner && String(p.version) === data.participantVersion && ['Admin', 'Moderator'].includes(data.role)
      && data.approved === 'Yes' && Number.isFinite(Number(data.expiresAt)) && Number(data.expiresAt) > now
      && (!data.handoff || ['Yes', 'No'].includes(data.handoff)) && (data.handoff !== 'Yes' || data.role === 'Admin'), 'Review one current member, role, membership version and future expiry.');
    need(!w.objects.some(o => o.owner === w.owner && o.kind === 'circle-role-grant' && o.groupId === group.id && o.personId === p.personId && o.status === 'pending'), 'This member already has a role offer awaiting a decision.');
    const issuer = participantFor(w, group, w.owner)!, proof = roleAuthority(w, group, w.owner, now)!;
    const offer = add('circle-role-grant', { personId: p.personId, participantId: p.id, participantVersion: p.version, role: data.role,
      issuedBy: w.owner, issuerParticipantId: issuer.id, issuerParticipantVersion: issuer.version, issuerAuthorityKey: proof.key,
      creationRoot: creationRoot(group), authoritySource: 'circle-role-decision', expiresAt: Number(data.expiresAt), createdAt: now, status: 'pending', handoff: data.handoff === 'Yes' });
    return { objectId: offer.id, message: 'Role offered to this exact member. Their personal acceptance is required. Membership and history boundaries are unchanged.' };
  }
  if (action === 'accept-role') {
    const rows = w.objects.filter(o => o.id === data.targetId), offer = rows[0], p = participantFor(w, group, w.owner);
    need(rows.length === 1 && offer.owner === w.owner && offer.kind === 'circle-role-grant' && offer.groupId === group.id && offer.groupVersion === groupVersion
      && offer.status === 'pending' && String(offer.version) === data.version && offer.personId === w.owner && p && offer.participantId === p.id && offer.participantVersion === p.version
      && offer.authoritySource === 'circle-role-decision' && offer.creationRoot === creationRoot(group) && ['Admin', 'Moderator'].includes(String(offer.role))
      && Number.isFinite(offer.expiresAt) && Number(offer.expiresAt) > now && data.approved === 'Yes', 'Accept your exact current role offer before it expires.');
    const issuer = participantFor(w, group, String(offer.issuedBy)), proof = roleAuthority(w, group, String(offer.issuedBy), now);
    need(issuer && issuer.id === offer.issuerParticipantId && issuer.version === offer.issuerParticipantVersion && proof?.role === 'Admin' && proof.key === offer.issuerAuthorityKey,
      'The offering administrator or their authority changed. Ask for a new reviewed offer.');
    for (const old of w.objects.filter(o => o.owner === w.owner && o.kind === 'circle-role-grant' && o.groupId === group.id && o.personId === w.owner && o.status === 'active')) { old.status = 'superseded'; old.version = Number(old.version) + 1; }
    offer.status = 'active'; offer.version = Number(offer.version) + 1; offer.acceptedAt = now; offer.acceptedBy = w.owner; p.role = offer.role as 'Admin' | 'Moderator';
    if (offer.handoff === true) {
      need(offer.role === 'Admin', 'A handoff must name a new administrator.');
      offer.acceptBefore = offer.expiresAt; delete offer.expiresAt; offer.permanentAdmin = true;
      issuer.role = 'Member'; delete issuer.authoritySource;
      for (const old of w.objects.filter(o => o.owner === w.owner && o.kind === 'circle-role-grant' && o.groupId === group.id && o.personId === issuer.personId && o.status === 'active')) { old.status = 'revoked'; old.version = Number(old.version) + 1; }
      group.circleAdministrationHandedTo = w.owner;
    }
    return { objectId: offer.id, message: offer.handoff === true ? 'Administration handed over after your acceptance. Both membership dates and private-history boundaries remain unchanged.' : 'Role accepted for this Circle and expiry only. No earlier private history or other Spot rights were granted.' };
  }
  if (action === 'revoke-role') {
    admin(); const rows = w.objects.filter(o => o.id === data.targetId), target = rows[0];
    need(rows.length === 1 && target.owner === w.owner && target.kind === 'circle-role-grant' && target.groupId === group.id && target.groupVersion === groupVersion
      && ['active', 'pending'].includes(String(target.status)) && String(target.version) === data.version && target.personId !== w.owner && data.approved === 'Yes', 'Review this exact role permission and version.');
    if (target.status === 'active' && target.permanentAdmin === true) need(anotherContinuingAdmin(w, group, String(target.personId), now), 'Complete another administration handoff before revoking the last continuing administrator.');
    target.status = 'revoked'; target.version = Number(target.version) + 1; target.endedAt = now;
    const p = participantFor(w, group, String(target.personId)); if (p) p.role = roleAuthority(w, group, p.personId, now)?.role || 'Member';
    return { objectId: target.id, message: 'Only this role permission ended. The person’s membership and existing authorised history remain separate.' };
  }
  need(action === 'grant-history', 'Choose a supported Circle action.'); admin();
  const participant = participantFor(w, group, data.personId);
  let itemIds: unknown; try { itemIds = JSON.parse(data.itemIds); } catch { throw Error('Select exact historical originals.'); }
  need(participant && participant.personId !== w.owner && String(participant.version) === data.participantVersion
    && Array.isArray(itemIds) && itemIds.length > 0 && itemIds.length <= 100 && new Set(itemIds).size === itemIds.length
    && itemIds.every(id => typeof id === 'string' && [...w.objects, ...w.posts].filter(o => o.id === id).length === 1
      && circleHistoryAllows(w, group.id, [...w.objects, ...w.posts].find(o => o.id === id)!, now))
    && Number.isFinite(Number(data.expiresAt)) && Number(data.expiresAt) > now && data.approved === 'Yes', 'Review exact readable originals, recipient membership version and expiry. Administration alone never reveals past private messages.');
  const grant = add('circle-history-grant', { personId: participant.personId, participantId: participant.id, participantVersion: participant.version,
    issuedBy: w.owner, authoritySource: 'circle-role-decision', creationRoot: creationRoot(group), issuerAuthorityKey: roleAuthority(w, group, w.owner, now)!.key,
    itemIds, expiresAt: Number(data.expiresAt), createdAt: now, status: 'active' });
  return { objectId: grant.id, message: 'Only these selected originals are authorised for this exact membership and expiry. No general retroactive history access was granted.' };
}
