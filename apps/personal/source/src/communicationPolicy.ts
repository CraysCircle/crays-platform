import {ownPrivateAccount} from './ownPrivateAccount';
import {circleCanParticipate,circleHistoryAllows} from './circleAccess.ts';
import type { ActionContext, Entity, ProductWorld } from "./productModel";
import {privacyState} from './privacyOverview';

// Product-level preview policy. This is not a substitute for the production
// CRAYS/Nostr authority. A route or a badge is never a communication grant.
export function canDirectMessage(w: ProductWorld, personId: string) {
  const people=w.people.filter(p=>p.id===personId);
  const p=people.length===1?people[0]:undefined;
  return Boolean(
    ownPrivateAccount(w) &&
    p &&
    p.contact===true &&
    p.consentSelf===true &&
    p.consentOther===true &&
    p.request === "accepted" &&
    !p.blocked &&
    !p.blockedByOther,
  );
}
export function canGroupCommunicate(w:ProductWorld,groupId:string){return ownPrivateAccount(w)&&circleCanParticipate(w,groupId);}
export function communicationContext(
  w: ProductWorld,
  ctx: Partial<ActionContext>,
) {
  if(ctx.chatId==='chuck'||ctx.personId==='chuck')return '';
  if(ctx.chatId){const expectedGroup=ctx.chatId==='circle'?'circle-design':ctx.chatId.startsWith('group:')?ctx.chatId.slice(6):'';const expectedPerson=ctx.chatId==='alex'?'alex':ctx.chatId.startsWith('person:')?ctx.chatId.slice(7):'';if(!expectedGroup&&!expectedPerson||expectedGroup&&(ctx.objectId!==expectedGroup||Boolean(ctx.personId))||expectedPerson&&(ctx.personId!==expectedPerson||Boolean(ctx.objectId)))return '';}
  const group = w.objects.find(
    (o) => o.id === ctx.objectId && o.owner === w.owner && o.kind === "group",
  );
  if(ctx.objectId)return group?`group:${group.id}`:'';
  if(ctx.chatId==='circle')return '';
  return ctx.personId && w.people.some(p=>p.id===ctx.personId) ? `person:${ctx.personId}` : '';
}
export function channelAllowed(w: ProductWorld, channel: string) {
  return channel.startsWith("group:")
    ? canGroupCommunicate(w, channel.slice(6))
    : channel.startsWith("person:") && canDirectMessage(w, channel.slice(7));
}
export function activeAgentPermission(
  w: ProductWorld,
  channel: string,
): Entity | undefined {
  if (!channelAllowed(w, channel)) return;
  const current=w.objects.filter(o=>o.owner===w.owner&&o.kind==='permission'&&o.channelId===channel&&o.recipient==='Chuck'&&o.allParticipantsApproved===true&&privacyState(o)==='Current'&&w.objects.filter(p=>p.id===o.id).length===1);
  // Conflicting current grants require a deliberate review; array order is not authority.
  return current.length===1?current[0]:undefined;
}
export function mayChuckReadMessage(
  w: ProductWorld,
  channel: string,
  message: Entity,
) {
  const permission = activeAgentPermission(w, channel);
  if (!permission) return false;
  const sameChannel = channel.startsWith("group:")
    ? message.groupId === channel.slice(6)
    : message.personId === channel.slice(7);
  if (!sameChannel || message.owner !== w.owner) return false;
  if(channel.startsWith('group:')&&!circleHistoryAllows(w,channel.slice(6),message))return false;
  if (permission.history === "Selected messages only")
    return (
      Array.isArray(permission.selectedMessageIds) &&
      permission.selectedMessageIds.includes(message.id)
    );
  if (permission.history === "No history") return false;
  if(permission.history!=='From now only')return false;
  const start=typeof permission.startsAt==='number'?permission.startsAt:typeof permission.startsAt==='string'?Date.parse(permission.startsAt):NaN;
  const created=typeof message.createdAt==='number'?message.createdAt:typeof message.createdAt==='string'?Date.parse(message.createdAt):NaN;
  return Number.isFinite(start)&&Number.isFinite(created)&&created>=start;
}
