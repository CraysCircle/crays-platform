import {GroupRumorHistory} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/group/group-rumor-history.js';
import {KeyValueRumorHistoryBackend} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/extra/key-value-rumor-history-backend.js';
import {deserializeApplicationData} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/index.js';
import {decodeDeliveredEvidence} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/session/delivered-payload-store.js';
import {compileFilter} from '../../.qualification/marmot-pilot-v1/node_modules/applesauce-core/dist/helpers/filter.js';
import {openFencedSdkRumorStore} from './fencedSdkRumorStore.mjs';
import {createBoundedRumorHistoryBackend,createPagedSdkGroupHistory} from './boundedRumorHistory.mjs';
import {recoverSdkHistory} from './recoverSdkHistory.mjs';

const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const denied = () => Error('Current admitted SDK history required');
const fields = ['kind','accountId','conversationId','groupId','pubkey','membershipId'];

/** Durable SDK history for an existing account. Only the original parent's
 * independent conversation grant can attach a group. MLS membership alone is
 * insufficient. No fixture authority, key creation or relay is supplied here.
 */
export function createCurrentSdkHistoryFactory({identity,stores,isCurrent,signal,locks=globalThis.navigator?.locks,crypto=globalThis.crypto}) {
 if (!identity || !hex(identity.pubkey) || !hex(identity.bindingFingerprint) || !stores?.historyStore || !stores?.ingestStateStore || typeof isCurrent !== 'function' || !signal?.addEventListener || !locks?.request || !crypto?.subtle) throw denied();
 const contexts = new Map(), histories = new Map();
 let closed = false;
 const current = () => !closed && !signal.aborted && isCurrent() === true;
 const admitted = context => {
  try { return current() && contexts.get(context.binding.groupId) === context && context.group.status === 'active' && !context.group.closedSignal.aborted && context.group.snapshot.members.includes(identity.pubkey) && context.grant.isCurrent(context.binding) === true; }
  catch { return false; }
 };
 const purgeAllowed = context => current() && contexts.get(context.binding.groupId) === context && context.group.session.destroyed === true;
 const check = (context,action='read') => { if (!(action==='purge'?admitted(context)||purgeAllowed(context):admitted(context))) throw denied(); };
 const exclusive = async (scope,operation,abort) => {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope));
  return locks.request('crays.sdk-history:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),{signal:abort},operation);
 };
 const factory = groupBytes => {
  const groupId = Array.from(groupBytes,b=>b.toString(16).padStart(2,'0')).join('');
  if (!current() || !hex(groupId) || histories.has(groupId)) throw denied();
  let incarnation, opening, bounded;
  const scoped = async (action='read') => {
   const context = contexts.get(groupId);
   if (!context || incarnation && incarnation !== context) throw denied();
   check(context,action); incarnation = context;
   if (!opening) opening = openFencedSdkRumorStore({binding:context.binding,journal:stores.historyStore,exclusive,authorize:()=>admitted(context),authorizePurge:()=>admitted(context)||purgeAllowed(context),validateRumor:value=>deserializeApplicationData(new TextEncoder().encode(JSON.stringify(value))),verifyOriginal:id=>context.group.session.mediaSourceForRumor(id),signal,crypto});
   const store = await opening;
   check(context,action);
   return store;
  };
  const backend = new KeyValueRumorHistoryBackend(Object.fromEntries(['getItem','setItem','removeItem','keys','clear'].map(method=>[method,async(...args)=>(await scoped(method==='clear'?'purge':'read'))[method](...args)])));
  const query = async () => {
   const store = await scoped();
   if (!bounded) bounded = createBoundedRumorHistoryBackend({store,backend,compileFilter,scopeKey:JSON.stringify(incarnation.binding),isCurrent:()=>admitted(incarnation)});
   return bounded;
  };
  const history = createPagedSdkGroupHistory({GroupRumorHistory,backend:{addRumor:row=>backend.addRumor(row),removeRumor:id=>backend.removeRumor(id),clear:()=>backend.clear(),queryRumors:async filters=>(await query()).queryRumors(filters),queryPage:async options=>(await query()).queryPage(options)}});
  histories.set(groupId,{history,scoped,close:()=>opening?.then(store=>store.close(),()=>{})});
  return history;
 };
 factory.admit = ({grant,group}) => {
  if (!current() || !grant || grant.accountId !== identity.accountId || grant.pubkey !== identity.pubkey || grant.bindingFingerprint !== identity.bindingFingerprint || !['person','spot','circle'].includes(grant.kind) || typeof grant.conversationId !== 'string' || !/^[a-zA-Z0-9:._-]{1,200}$/.test(grant.conversationId) || ['chuck','person:chuck'].includes(grant.conversationId) || !hex(grant.groupId) || !hex(grant.membershipId) || grant.canRead !== true || typeof grant.canSend !== 'boolean' || typeof grant.isCurrent !== 'function' || typeof grant.openResources !== 'function' || group?.idStr !== grant.groupId) throw denied();
  const binding = Object.freeze(Object.fromEntries(fields.map(key=>[key,grant[key]])));
  let context = contexts.get(binding.groupId);
  if (context && (context.group !== group || JSON.stringify(context.binding) !== JSON.stringify(binding))) throw denied();
  if (!context) { context = {binding,group,grant}; contexts.set(binding.groupId,context); }
  else context.grant = grant;
  check(context);
 };
 factory.recover = async groupId => {
  const context = contexts.get(groupId), entry = histories.get(groupId);
  if (!context || !entry) throw denied();
  check(context);
  const store = await entry.scoped();
  return recoverSdkHistory({readEvidence:()=>stores.ingestStateStore.getItem(groupId+'/delivered-payloads/v1'),decodeEvidence:bytes=>decodeDeliveredEvidence(bytes,context.group.session.historyTree),parseRumor:deserializeApplicationData,currentSource:id=>context.group.session.mediaSourceForRumor(id),history:entry.history,store,isCurrent:()=>admitted(context),signal});
 };
 factory.release = groupId => {
  const entry = histories.get(groupId);
  contexts.delete(groupId); histories.delete(groupId);
  return Promise.resolve(entry?.close());
 };
 let cleanup;
 factory.close = () => {
  if (closed) return cleanup; closed = true; signal.removeEventListener('abort',factory.close);
  cleanup = Promise.all([...histories.values()].map(entry=>entry.close())).then(()=>{});
  contexts.clear(); histories.clear(); return cleanup;
 };
 signal.addEventListener('abort',factory.close,{once:true});
 return factory;
}
