import {localPerson} from './localSocialData';
import {chatPhotoExampleName} from './chatPhoto.ts';
import type { Entity, ProductWorld } from './productModel';
import { localPreviewId } from './localPreviewId';
export const wavePurposes = ['Socializing', 'Business', 'Dating'] as const;
export type WavePurpose = typeof wavePurposes[number];
export type WaveAction = 'start' | 'stop' | 'sample-peer' | 'sample-incoming' | 'wave' | 'accept' | 'decline' | 'withdraw' | 'sample-accept' | 'sample-decline' | 'peer-left' | 'block' | 'message';
// Fictional preview duration, not an adopted production presence policy.
const previewLifetime = 15 * 60 * 1000;
const uniqueObject=(w:ProductWorld,id:string)=>w.objects.filter(o=>o.id===id).length===1;
const uniquePerson=(w:ProductWorld,id:unknown)=>w.people.filter(p=>p.id===id).length===1;
export function waveSession(w:ProductWorld,now=Date.now()){if(!w.identity.signedIn)return;const sessions=w.objects.filter(o=>o.kind==='wave-preview-session'&&o.owner===w.owner&&o.status==='active'&&Number(o.expiresAt)>now);return sessions.length===1&&uniqueObject(w,sessions[0].id)?sessions[0]:undefined;}
export function wavePeers(w: ProductWorld, now = Date.now()) {
  const session = waveSession(w, now);
  if (!session) return [];
  return w.objects.filter(o => o.kind === 'wave-preview-peer' && o.owner === w.owner && uniqueObject(w,o.id) && uniquePerson(w,o.personId) && o.sessionId === session.id && o.status === 'visible' && o.purpose === session.purpose && o.optedIn === true && Number(o.expiresAt) > now &&
    w.people.some(p => p.id === o.personId && !p.blocked && !p.blockedByOther));
}
export function waveInvitations(w: ProductWorld) {
  if(!w.identity.signedIn)return [];
  return w.objects.filter(o => o.kind === 'wave-preview-invitation' && o.owner === w.owner && uniqueObject(w,o.id) && uniquePerson(w,o.personId));
}
export function waveCanChat(w: ProductWorld, invitationId: string, now = Date.now()) {
  const s = waveSession(w, now), i = waveInvitations(w).find(i => i.id === invitationId);
  return Boolean(s && i && i.sessionId === s.id && i.purpose === s.purpose && i.status === 'accepted' && i.selfConsent === true && i.otherConsent === true && Number(i.expiresAt) > now && wavePeers(w, now).some(p => p.id === i.peerId));
}
export function updateWavePreview(original: ProductWorld, action: WaveAction, data: { personId?:string; purpose?: string; peerId?: string; invitationId?: string; text?: string; attachment?:string } = {}, now = Date.now()): ProductWorld {
  const w = structuredClone(original);
  if (!w.identity.signedIn) throw Error('Sign in before opening a Wave preview.');
  if(w.objects.some(o=>o.owner===w.owner&&typeof o.kind==='string'&&o.kind.startsWith('wave-preview-')&&!uniqueObject(w,o.id)))throw Error('These Wave records are ambiguous. Reopen a valid original.');
  if(data.invitationId&&!waveInvitations(w).some(i=>i.id===data.invitationId))throw Error('This Wave invitation is unavailable or ambiguous.');
  const create = (kind: string, fields: Record<string, unknown>) => { const o: Entity = { id: localPreviewId(), owner: w.owner, kind, ...fields }; w.objects.push(o); return o; };
  const s = waveSession(w, now);
  const finish = () => {
    for (const o of w.objects.filter(o => o.owner === w.owner && o.kind === 'wave-preview-session' && o.status === 'active')) o.status = 'off';
    for (const i of waveInvitations(w).filter(i => ['pending','accepted'].includes(String(i.status)))) i.status = 'ended';
  };
  if (action === 'stop') { finish(); return w; }
  if (action === 'start') {
    if (!wavePurposes.includes(data.purpose as WavePurpose)) throw Error('Choose one purpose for Wave.');
    finish(); create('wave-preview-session', { status: 'active', purpose: data.purpose, startedAt: now, expiresAt: now + previewLifetime }); return w;
  }
  const invitation = waveInvitations(w).find(i => i.id === data.invitationId);
  if (action === 'block') {
    const peerId = data.peerId || String(invitation?.peerId || '');
    const peer = w.objects.find(o => o.id === peerId && o.owner === w.owner && o.kind === 'wave-preview-peer');
    if (!peer) throw Error('This Wave profile is unavailable.');
    const person = uniquePerson(w,peer.personId)?w.people.find(p => p.id === peer.personId):undefined;
    if(!person)throw Error('This Wave profile is unavailable or ambiguous.');
    if (person) person.blocked = true;
    for (const i of waveInvitations(w).filter(i => i.personId === peer.personId)) i.status = 'blocked';
    return w;
  }
  if (!s) throw Error('Wave is off or this preview has expired. Turn it on before continuing.');
  if (action === 'sample-peer' || action === 'sample-incoming') {
    const id=data.personId||'maya';if(data.personId&&!localPerson(data.personId))throw Error('Choose a known fictional participant.');const person=uniquePerson(w,id)?w.people.find(p=>p.id===id&&!p.blocked&&!p.blockedByOther&&(!data.personId||p.purpose===s.purpose)):undefined;
    if (!person) throw Error('This example is blocked or unavailable.');
    let peer = wavePeers(w, now).find(p => p.personId === person.id);
    if (!peer) peer = create('wave-preview-peer', { personId: person.id, sessionId: s.id, purpose: s.purpose, optedIn: true, status: 'visible', expiresAt: s.expiresAt });
    if (action === 'sample-incoming') {
      if (waveInvitations(w).some(i => i.personId === person.id)) throw Error('There is already a Wave for this person. Review its current outcome.');
      create('wave-preview-invitation', { personId: person.id, peerId: peer.id, sessionId: s.id, purpose: s.purpose, direction: 'incoming', status: 'pending', selfConsent: false, otherConsent: true, createdAt: now, expiresAt: s.expiresAt });
    }
    return w;
  }
  if (action === 'wave') {
    const peer = wavePeers(w, now).find(p => p.id === data.peerId);
    if (!peer) throw Error('This person is no longer visible for this purpose.');
    if (waveInvitations(w).some(i => i.personId === peer.personId)) throw Error('There is already a Wave for this person. A decline is not retried through another purpose.');
    create('wave-preview-invitation', { peerId: peer.id, personId: peer.personId, sessionId: s.id, purpose: s.purpose, direction: 'outgoing', status: 'pending', selfConsent: true, otherConsent: false, createdAt: now, expiresAt: s.expiresAt });
    return w;
  }
  if (!invitation || invitation.sessionId !== s.id || invitation.purpose !== s.purpose || Number(invitation.expiresAt) <= now) throw Error('This Wave is no longer current.');
  if (action === 'peer-left') {
    const peer = w.objects.find(o => o.id === invitation.peerId && o.owner === w.owner);
    if (peer) peer.status = 'left';
    invitation.status = 'ended'; return w;
  }
  if (action === 'message') {
    if (!waveCanChat(w, invitation.id, now)) throw Error('Both people must still agree and have an active Wave preview.');
    const text = (data.text || '').trim();
    if (!text || text.length > 2000) throw Error('Write a message of up to 2,000 characters.');
    if(data.attachment&&data.attachment!==chatPhotoExampleName)throw Error('Personal media transport is not connected. Review the labelled photo example.');
    create('wave-preview-message', { ...(data.attachment?{attachment:data.attachment}:{}), invitationId: invitation.id, text, createdAt: now, status: 'local-preview', author: w.owner }); return w;
  }
  if (invitation.status !== 'pending' || !wavePeers(w, now).some(p => p.id === invitation.peerId)) throw Error('This Wave has already changed or the person has left.');
  if (['accept','decline'].includes(action) && invitation.direction !== 'incoming' || ['sample-accept','sample-decline','withdraw'].includes(action) && invitation.direction !== 'outgoing') throw Error('Only the recipient can answer this Wave.');
  if (action === 'accept' || action === 'sample-accept') {
    invitation.selfConsent = true; invitation.otherConsent = true; invitation.status = 'accepted';
  } else if (action === 'decline' || action === 'sample-decline') invitation.status = 'declined';
  else if (action === 'withdraw') invitation.status = 'withdrawn';
  else throw Error('This Wave action is unavailable.');
  return w;
}
