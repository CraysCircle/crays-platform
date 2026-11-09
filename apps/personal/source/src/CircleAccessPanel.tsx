import { useState } from 'react';
import { ShieldCheck, UserPlus, Clock, UsersThree } from '@phosphor-icons/react';
import { useKeyboard } from './mobile';
import { VoiceInput } from './VoiceInput';
import { usePreviewExpiry } from './usePreviewExpiry';
import type { ActionContext, ActionResult, Entity, ProductWorld } from './productModel.ts';
import { canReadPaidOriginal } from './paidContentAccess.ts';
import { circleCanAdmin, circleCanModerate, circleCanParticipate, circlePendingAdmissions, circleVisibleMessages, circleVisiblePosts, circleRole, circleRoleOffers, type CircleAccessAction } from './circleAccess.ts';
import './circle-access-panel.css';

export type CircleAccessPanelProps = {
  world: ProductWorld;
  groupId: string;
  onProfile?: (personId: string) => void;
  run: (op: string, data: Record<string, string>, context: ActionContext) => ActionResult;
};
type Review = { action: CircleAccessAction; data: Record<string, string>; title: string; detail: string; snapshot: string };
const time = (value: unknown) => Number.isFinite(Number(value)) ? new Date(Number(value)).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not supplied';

/** Embedded Circle controls. All decisions go through the existing domain adapter. */
export function CircleAccessPanel({ world, groupId, run, onProfile }: CircleAccessPanelProps) {
  const keyboard = useKeyboard();
  const [recipient, setRecipient] = useState(''), [inviteExpiry, setInviteExpiry] = useState('');
  const [historyRecipient, setHistoryRecipient] = useState(''), [historyExpiry, setHistoryExpiry] = useState('');
  const [roleRecipient, setRoleRecipient] = useState(''), [offeredRole, setOfferedRole] = useState('Moderator'), [roleExpiry, setRoleExpiry] = useState(''), [handoff, setHandoff] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]), [review, setReview] = useState<Review | null>(null);
  const [approved, setApproved] = useState(false), [feedback, setFeedback] = useState(''), [failed, setFailed] = useState(false);
  const groups = world.objects.filter(o => o.id === groupId);
  const group = groups.length === 1 && groups[0].kind === 'group' && groups[0].owner === world.owner ? groups[0] : undefined;
  const admin = Boolean(group && circleCanAdmin(world, groupId)), member = Boolean(group && circleCanParticipate(world, groupId));
  const manage = Boolean(group && circleCanModerate(world, groupId));
  const admissions = group ? circlePendingAdmissions(world, groupId) : [];
  const roleOffers = group ? circleRoleOffers(world, groupId) : [];
  const ownAdmissions = admissions.filter(o => o.personId === world.owner);
  const people = world.identity.signedIn ? world.people.filter(p => p.id !== world.owner && p.contact && p.consentSelf && p.consentOther && p.request === 'accepted' && !p.blocked && !p.blockedByOther) : [];
  const name = (id: unknown) => id === world.owner ? 'You' : world.people.filter(p => p.id === id).length === 1 ? world.people.find(p => p.id === id)!.name : 'Circle member';
  const profileLink=(id:unknown)=>onProfile&&typeof id==='string'&&(id===world.owner||world.people.filter(p=>p.id===id).length===1&&world.people.some(p=>p.id===id&&!p.blocked&&!p.blockedByOther))?<button type="button" className="quiet" onClick={()=>onProfile(id)}>View {name(id)==='You'?'your':name(id)+'’s'} profile</button>:null;
  const participants = manage ? world.objects.filter(o => o.owner === world.owner && o.kind === 'circle-participant' && o.groupId === groupId && o.groupVersion === group?.circleVersion && o.status === 'active'
    && world.objects.filter(other => other.id === o.id).length === 1
    && world.objects.filter(other => other.owner === world.owner && other.kind === 'circle-participant' && other.groupId === groupId && other.personId === o.personId).length === 1) : [];
  const target = participants.find(o => o.id === historyRecipient && o.personId !== world.owner);
  const roleTarget = participants.find(o => o.id === roleRecipient && o.personId !== world.owner);
  const roleGrants = group && world.identity.signedIn ? world.objects.filter(o => o.owner === world.owner && o.kind === 'circle-role-grant' && o.groupId === groupId && o.groupVersion === group.circleVersion
    && ['active', 'pending'].includes(String(o.status)) && (admin || o.personId === world.owner) && world.objects.filter(row => row.id === o.id).length === 1) : [];
  const historyItems = admin ? [
    ...circleVisibleMessages(world, groupId).map(o => ({ id: o.id, title: 'Conversation message', detail: String(o.text || '').slice(0, 110), createdAt: o.createdAt })),
    ...circleVisiblePosts(world, groupId).filter(p => canReadPaidOriginal(world, p)).map(p => ({ id: p.id, title: p.title || 'Shared post', detail: p.text.slice(0, 110), createdAt: p.createdAt })),
  ] : [];
  const grants = admin ? world.objects.filter(o => o.owner === world.owner && o.kind === 'circle-history-grant' && o.groupId === groupId && o.groupVersion === group?.circleVersion && o.status === 'active'
    && world.objects.filter(row => row.id === o.id).length === 1) : [];
  const expiries = [...admissions, ...grants, ...roleGrants, { expiresAt: review?.data.expiresAt }].map(o => Number(o.expiresAt)).filter(n => Number.isFinite(n) && n > Date.now());
  usePreviewExpiry(expiries.length ? Math.min(...expiries) : NaN);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const signature = (action: CircleAccessAction, data: Record<string, string>) => JSON.stringify({
    owner: world.owner, signedIn: world.identity.signedIn, groupId, groupVersion: group?.circleVersion,
    member, admin, manage, access: group?.access, suspended: group?.suspended,
    admissions: admissions.map(o => [o.id, o.personId, o.version, o.status, o.expiresAt]),
    participants: participants.map(o => [o.id, o.personId, o.version, o.joinedAt, circleRole(world, groupId, String(o.personId))]),
    roleGrants: roleGrants.map(o => [o.id, o.personId, o.version, o.status, o.role, o.expiresAt, o.permanentAdmin, o.issuerAuthorityKey]),
    grants: grants.map(o => [o.id, o.personId, o.version, o.expiresAt]),
    items: historyItems.map(o => [o.id, o.title, o.detail, o.createdAt]),
    vifIds: people.map(p => p.id), action, data,
  });
  const current = review && review.snapshot === signature(review.action, review.data)
    && (!review.data.expiresAt || Number.isFinite(Number(review.data.expiresAt)) && Number(review.data.expiresAt) > Date.now());
  const clearReview = () => { setReview(null); setApproved(false); setFeedback(''); };
  const prepare = (action: CircleAccessAction, data: Record<string, string>, title: string, detail: string) => {
    keyboard.hide(); setFeedback(''); setFailed(false); setApproved(false);
    setReview({ action, data, title, detail, snapshot: signature(action, data) });
  };
  const confirm = () => {
    keyboard.hide();
    if (!review || !approved || !current) { setFeedback('These details changed. Review the current Circle before confirming.'); setFailed(true); return; }
    const result = run(`complete.circle.${review.action}`, { ...review.data, approved: 'Yes' }, { featureId: 'AL-307', objectId: groupId, ...(group?.venueId ? { venueId: String(group.venueId) } : {}) });
    setFeedback(result.message); setFailed(!result.ok); setApproved(false);
    if (result.ok) { setReview(null); setSelectedIds([]); }
  };
  const revoke = (record: Entity, label: string) => prepare('revoke', { targetId: record.id, version: String(record.version) }, `Revoke ${label}?`, `Only this permission for ${name(record.personId)} in ${String(group?.name || 'this Circle')} will end. Other Circles, private contacts and physical access stay separate.`);

  if (!world.identity.signedIn || !group) return <section className="circle-access-panel"><p role="status">Sign in and open an available Circle to review its membership.</p></section>;
  return <section className="circle-access-panel" aria-label="Circle membership and history">
    <div className="circle-access-heading"><ShieldCheck size={22} /><h2>Membership & shared history</h2></div>
    <p className="circle-access-caption">{member ? 'You are a member. Earlier private history needs its own permission.' : 'Membership and access to earlier conversations are separate.'}</p>
    {!admin && member && <p className="circle-access-caption">{manage ? 'You can moderate admission and ordinary memberships. Roles and history permissions require an administrator.' : 'Your membership does not include Circle administration.'}</p>}
    {roleOffers.filter(offer => offer.personId === world.owner).map(offer => <article className="circle-access-card" key={offer.id}><strong>{offer.handoff === true ? 'Administration handoff' : `${String(offer.role)} role offered`}</strong><p>{name(offer.issuedBy)} offered you this responsibility in {String(group.name)}. Accept before {time(offer.expiresAt)} ({timezone}). Your existing joining date and history stay unchanged.</p><button className="secondary" onClick={() => prepare('accept-role', { targetId: offer.id, version: String(offer.version) }, `Accept ${String(offer.role).toLowerCase()} responsibility?`, offer.handoff === true ? 'After acceptance you become the continuing administrator. The previous administrator becomes a member. This role continues until a separate revocation, handoff or departure; the displayed deadline is for accepting this offer. No additional history or other Spot access is granted.' : `This Circle role lasts until ${time(offer.expiresAt)} (${timezone}), unless separately revoked. It does not grant earlier private history or any other Circle or Spot rights.`)}>Review role offer</button></article>)}
    {ownAdmissions.map(admission => <article className="circle-access-card" key={admission.id}>
      <strong>{admission.kind === 'circle-invitation' ? 'Your invitation' : 'Your join request'}</strong>
      <p>{admission.kind === 'circle-invitation' ? `Invited by ${name(admission.issuedBy)} · expires ${time(admission.expiresAt)} (${timezone}).` : 'Waiting for this Circle’s authorised administrator.'}</p>
      {admission.kind === 'circle-invitation' && <button className="secondary" onClick={() => prepare('accept', { admissionId: admission.id, version: String(admission.version) }, 'Accept this invitation?', `Join ${String(group.name)} as yourself. Your membership starts when you accept. Previous private messages remain locked unless separately shared.`)}>Review invitation</button>}
    </article>)}
    {!member && !ownAdmissions.length && ['Open', 'Request to join'].includes(String(group.access)) && <button className="secondary" onClick={() => prepare('join', {}, group.access === 'Open' ? 'Join this Circle?' : 'Ask to join this Circle?', `Only ${String(group.name)} is selected. Joining does not share your location or unlock earlier private conversations.`)}>{group.access === 'Open' ? 'Review joining' : 'Review join request'}</button>}
    {!member && group.access === 'Private' && !ownAdmissions.some(o => o.kind === 'circle-invitation') && <p className="circle-access-caption">A personal, valid invitation is required. No invitation is available in this account.</p>}

    {manage && <>
      <details className="circle-access-section"><summary><UserPlus size={20} /> Invite someone</summary>
        <label className="circle-access-field"><span>Recipient</span><select aria-label="Circle invitation recipient" value={recipient} onChange={e => { setRecipient(e.target.value); clearReview(); }}><option value="">Choose an accepted contact</option>{people.filter(p => !participants.some(o => o.personId === p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {!people.length && <p>No accepted contacts are available for a personal invitation.</p>}
        <label className="circle-access-field"><span>Invitation expires · {timezone}</span><VoiceInput aria-label="Circle invitation expiry" type="datetime-local" value={inviteExpiry} onBlur={() => keyboard.hide()} onChange={e => { setInviteExpiry(e.target.value); clearReview(); }} /></label>
        <button className="secondary" disabled={!people.some(p => p.id === recipient) || !Number.isFinite(Date.parse(inviteExpiry)) || Date.parse(inviteExpiry) <= Date.now()} onClick={() => prepare('invite', { personId: recipient, expiresAt: String(Date.parse(inviteExpiry)) }, `Invite ${name(recipient)}?`, `A personal invitation to ${String(group.name)}, valid until ${time(Date.parse(inviteExpiry))} (${timezone}). They decide whether to accept. No previous private history is included.`)}>Review invitation</button>
      </details>
      <details className="circle-access-section"><summary><Clock size={20} /> Requests & invitations</summary>
        {!admissions.filter(o => o.personId !== world.owner).length && <p>No current requests or invitations.</p>}
        {admissions.filter(o => o.personId !== world.owner).map(admission => <article className="circle-access-card" key={admission.id}>
          <strong>{name(admission.personId)}</strong>{profileLink(admission.personId)}<p>{admission.kind === 'circle-request' ? 'Requests membership in this Circle.' : `Invitation pending · expires ${time(admission.expiresAt)} (${timezone}).`}</p>
          {admission.kind === 'circle-request' && <div className="circle-access-actions">{(['Approve', 'Decline'] as const).map(decision => <button className="secondary" key={decision} onClick={() => prepare('decide', { admissionId: admission.id, version: String(admission.version), decision }, `${decision} ${name(admission.personId)}’s request?`, decision === 'Approve' ? 'This person joins this Circle from the decision time. Your membership and older private conversations do not change.' : 'Only this named request will be declined. Their identity, private contacts and other memberships stay separate.')}>{decision}</button>)}</div>}
          <button className="quiet" onClick={() => revoke(admission, admission.kind === 'circle-request' ? 'this request' : 'this invitation')}>Revoke {admission.kind === 'circle-request' ? 'request' : 'invitation'}</button>
        </article>)}
      </details>
      <details className="circle-access-section"><summary><UsersThree size={20} /> Members & permissions</summary>
        {participants.map(participant => <article className="circle-access-card" key={participant.id}><strong>{name(participant.personId)}</strong>{profileLink(participant.personId)}<p>{circleRole(world, groupId, String(participant.personId)) || 'Member'} · joined {time(participant.joinedAt)} ({timezone})</p>{participant.personId !== world.owner && (admin || circleRole(world, groupId, String(participant.personId)) === 'Member') && <button className="quiet" onClick={() => revoke(participant, 'this membership')}>Review removing membership</button>}</article>)}
        {grants.map(grant => <article className="circle-access-card" key={grant.id}><strong>Selected history for {name(grant.personId)}</strong>{profileLink(grant.personId)}<p>{Array.isArray(grant.itemIds) ? grant.itemIds.length : 0} selected originals · expires {time(grant.expiresAt)} ({timezone})</p>{grant.personId !== world.owner && <button className="quiet" onClick={() => revoke(grant, 'this history permission')}>Review revoking history</button>}</article>)}
      </details>
      {admin && <details className="circle-access-section"><summary><ShieldCheck size={20} /> Roles & administration handoff</summary>
        <p className="circle-access-caption">Offer a responsibility to a current member. They must personally accept it. Changing a role never changes their joining date or private-history access.</p>
        <label className="circle-access-field"><span>Member</span><select aria-label="Circle role recipient" value={roleRecipient} onChange={e => { setRoleRecipient(e.target.value); clearReview(); }}><option value="">Choose a current member</option>{participants.filter(p => p.personId !== world.owner).map(p => <option key={p.id} value={p.id}>{name(p.personId)}</option>)}</select></label>
        <label className="circle-access-field"><span>Responsibility</span><select aria-label="Circle role to offer" value={offeredRole} onChange={e => { setOfferedRole(e.target.value); setHandoff(false); clearReview(); }}><option value="Moderator">Moderator · admission and ordinary membership</option><option value="Admin">Administrator · roles and permissions</option></select></label>
        {offeredRole === 'Admin' && <label className="circle-access-choice"><input type="checkbox" checked={handoff} onChange={e => { setHandoff(e.target.checked); clearReview(); }} /><span>Hand over my continuing administration after their acceptance. I will remain a member.</span></label>}
        <label className="circle-access-field"><span>{handoff ? 'Accept handoff before' : 'Role expires'} · {timezone}</span><VoiceInput aria-label="Circle role offer expiry" type="datetime-local" value={roleExpiry} onBlur={() => keyboard.hide()} onChange={e => { setRoleExpiry(e.target.value); clearReview(); }} /></label>
        <button className="secondary" disabled={!roleTarget || !Number.isFinite(Date.parse(roleExpiry)) || Date.parse(roleExpiry) <= Date.now()} onClick={() => roleTarget && prepare('assign-role', { personId: String(roleTarget.personId), participantVersion: String(roleTarget.version), role: offeredRole, expiresAt: String(Date.parse(roleExpiry)), handoff: handoff ? 'Yes' : 'No' }, `${handoff ? 'Hand administration to' : `Offer ${offeredRole.toLowerCase()} responsibility to`} ${name(roleTarget.personId)}?`, handoff ? `They must accept before ${time(Date.parse(roleExpiry))} (${timezone}). After acceptance their administration continues, and you become a member. History and membership dates remain unchanged.` : `Their role needs personal acceptance and ends at ${time(Date.parse(roleExpiry))} (${timezone}), unless separately revoked. No earlier history is shared.`)}>Review role offer</button>
        {roleGrants.filter(o => o.personId !== world.owner).map(grant => <article className="circle-access-card" key={grant.id}><strong>{name(grant.personId)} · {String(grant.role)}</strong><p>{grant.status === 'pending' ? 'Awaiting personal acceptance' : grant.permanentAdmin === true ? 'Continuing administration' : `Expires ${time(grant.expiresAt)} (${timezone})`}</p><button className="quiet" onClick={() => prepare('revoke-role', { targetId: grant.id, version: String(grant.version) }, `Revoke ${name(grant.personId)}’s role permission?`, 'Only this role permission ends. Membership and authorised history remain separate. A continuing administrator must remain.')}>Review role revocation</button></article>)}
      </details>}
      {admin && <details className="circle-access-section"><summary><ShieldCheck size={20} /> Share selected history</summary>
        <p className="circle-access-caption">Choose only originals you can already read. Administration does not unlock earlier private content. Paid-content licences stay separate.</p>
        <label className="circle-access-field"><span>Member</span><select aria-label="Circle history recipient" value={historyRecipient} onChange={e => { setHistoryRecipient(e.target.value); setSelectedIds([]); clearReview(); }}><option value="">Choose a current member</option>{participants.filter(p => p.personId !== world.owner).map(p => <option key={p.id} value={p.id}>{name(p.personId)}</option>)}</select></label>
        {!historyItems.length && <p>No readable originals are available to share.</p>}
        {historyItems.map(item => <label className="circle-access-choice" key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={e => { setSelectedIds(ids => e.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id)); clearReview(); }} /><span><strong>{item.title}</strong><span>{item.detail}</span><small>{time(item.createdAt)} · {timezone}</small></span></label>)}
        <label className="circle-access-field"><span>History permission expires · {timezone}</span><VoiceInput aria-label="Circle history permission expiry" type="datetime-local" value={historyExpiry} onBlur={() => keyboard.hide()} onChange={e => { setHistoryExpiry(e.target.value); clearReview(); }} /></label>
        <button className="secondary" disabled={!target || !selectedIds.length || selectedIds.some(id => !historyItems.some(item => item.id === id)) || !Number.isFinite(Date.parse(historyExpiry)) || Date.parse(historyExpiry) <= Date.now()} onClick={() => target && prepare('grant-history', { personId: String(target.personId), participantVersion: String(target.version), itemIds: JSON.stringify(selectedIds), expiresAt: String(Date.parse(historyExpiry)) }, `Share selected history with ${name(target.personId)}?`, `${selectedIds.length} selected originals in ${String(group.name)}, until ${time(Date.parse(historyExpiry))} (${timezone}). This permission is bound to their current membership. No other history or Circle is included.`)}>Review selected history</button>
      </details>}
    </>}
    {member && <button className="quiet" onClick={() => prepare('leave', {}, 'Leave this Circle?', 'Your access to this Circle and its private history ends. Rejoining requires a fresh history boundary. Your private contacts, other Circles and Spot membership remain separate.')}>Review leaving this Circle</button>}

    {review && <section className="circle-access-review" aria-label="Review Circle decision">
      <h3>{review.title}</h3><p>{review.detail}</p>
      {!current && <p role="alert">The membership, permission or selected original changed. Start a new review.</p>}
      <label className="circle-access-choice"><input type="checkbox" checked={approved && Boolean(current)} disabled={!current} onChange={e => setApproved(e.target.checked)} /><span>I reviewed this exact person, Circle and decision.</span></label>
      <div className="circle-access-actions"><button className="primary" disabled={!current || !approved} onClick={confirm}>Confirm decision</button><button className="secondary" onClick={() => { keyboard.hide(); clearReview(); }}>Cancel</button></div>
    </section>}
    {feedback && <p className="circle-access-feedback" role={failed ? 'alert' : 'status'}>{feedback}</p>}
    <p className="circle-access-caption">Local design preview. Membership, message protection, Spot access and physical presence are separate.</p>
  </section>;
}
