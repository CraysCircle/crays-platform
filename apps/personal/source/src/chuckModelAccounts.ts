import type {ActionContext, Entity, ProductWorld} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';

// A design scenario, never an OAuth client, credential store or provider reply.
export const chuckModelProviders = [
  {id:'chatgpt', name:'ChatGPT', company:'OpenAI', mark:'O', description:'Use your own supported OpenAI account.', qualification:'OpenClaw documents ChatGPT/Codex account authorization and a separate API-key route. Account, model and feature availability still need live qualification.'},
  {id:'claude', name:'Claude', company:'Anthropic', mark:'A', description:'Use your own supported Anthropic access.', qualification:'The installed OpenClaw source documents API access and specific Claude CLI/Agent SDK paths. A general Claude subscription is not a verified native CRAYS authorization route.'},
  {id:'kimi', name:'Kimi', company:'Moonshot', mark:'K', description:'Use your own supported Kimi access.', qualification:'Moonshot API and Kimi Coding are separate providers with separate credentials. Their app authorization paths still need qualification.'},
] as const;
export type ChuckModelProvider = typeof chuckModelProviders[number]['id'];
export type ModelConnectionStatus = 'pending-preview'|'connected-demo'|'denied-preview'|'unavailable-preview'|'expired-preview'|'disconnected-preview';
export type ChuckModelAccount = Entity & {kind:'chuck-model-account'; providerId:ChuckModelProvider; version:number; status:ModelConnectionStatus; accountLabel:string; liveExecution:false};
export function ownChuckModelAccounts(w:ProductWorld):ChuckModelAccount[] {
  if(!w.identity.signedIn)return [];
  return w.objects.filter((o):o is ChuckModelAccount=>o.owner===w.owner&&o.kind==='chuck-model-account'&&chuckModelProviders.some(p=>p.id===o.providerId)&&Number.isSafeInteger(o.version)&&Number(o.version)>0&&o.liveExecution===false&&['pending-preview','connected-demo','denied-preview','unavailable-preview','expired-preview','disconnected-preview'].includes(String(o.status)));
}
export function activeChuckModelAccount(w:ProductWorld):ChuckModelAccount|undefined {
  const matches=ownChuckModelAccounts(w).filter(o=>o.providerId===w.settings.chuckModelProvider);
  return matches.length===1&&w.objects.filter(o=>o.owner===w.owner&&o.kind==='chuck-model-account'&&o.providerId===w.settings.chuckModelProvider).length===1&&matches[0].status==='connected-demo'?matches[0]:undefined;
}
export function applyChuckModelAccount(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext):{objectId:string;message:string}|null {
  if(!op.startsWith('chuck.model.'))return null;
  if(!w.identity.signedIn)throw Error('Sign in to CRAYS to manage your own Chuck connections.');
  if(ctx.personId&&ctx.personId!==w.owner)throw Error('This connection belongs to another person.');
  const provider=chuckModelProviders.find(p=>p.id===d.providerId);
  if(!provider)throw Error('Choose a supported model provider.');
  const records=w.objects.filter(o=>o.owner===w.owner&&o.kind==='chuck-model-account'&&o.providerId===provider.id);
  if(records.length>1)throw Error('This provider has conflicting records. Resolve the original connection before continuing.');
  let account=ownChuckModelAccounts(w).find(o=>o.providerId===provider.id);
  if(records.length&&!account)throw Error('This connection needs review. Its previous record is kept.');
  if(op==='chuck.model.begin') {
    if(account?.status==='pending-preview')return {objectId:account.id,message:'The same authorization preview is already open.'};
    if(account?.status==='connected-demo')throw Error('This preview account is already connected. Choose it or disconnect it first.');
    if(account&&String(account.version)!==d.version)throw Error('The connection changed. Review its current state.');
    if(!account){account={id:localPreviewId(),owner:w.owner,kind:'chuck-model-account',providerId:provider.id,version:1,status:'pending-preview',accountLabel:`Sample ${provider.name} account`,liveExecution:false};w.objects.unshift(account);}
    else{account.version++;account.status='pending-preview';}
    return {objectId:account.id,message:'Authorization preview opened. No provider was contacted.'};
  }
  if(!account||ctx.objectId!==account.id||String(account.version)!==d.version)throw Error('This authorization is old or belongs to another account. Reopen the current connection.');
  if(op==='chuck.model.complete') {
    if(account.status!=='pending-preview')throw Error('This authorization attempt is no longer pending.');
    const status=({'allow':'connected-demo','deny':'denied-preview','unavailable':'unavailable-preview'} as const)[d.outcome as 'allow'|'deny'|'unavailable'];
    if(!status)throw Error('Choose an explicit fictional authorization outcome.');
    account.status=status;account.version++;
    if(status==='connected-demo')w.settings.chuckModelProvider=provider.id;
    else if(w.settings.chuckModelProvider===provider.id)delete w.settings.chuckModelProvider;
    return {objectId:account.id,message:status==='connected-demo'?'Sample account connected for this design preview. No real model access or response is claimed.':'No model access was granted in this preview. Your CRAYS account and other connections remain available.'};
  }
  if(op==='chuck.model.use') {
    if(account.status!=='connected-demo')throw Error('Connect this provider before selecting it.');
    w.settings.chuckModelProvider=provider.id;
    return {objectId:account.id,message:'Selected for this preview. A real request would use only the separately permitted provider connection.'};
  }
  if(op==='chuck.model.disconnect'||op==='chuck.model.expire') {
    if(account.status!=='connected-demo'&&account.status!=='pending-preview')throw Error('This connection is already inactive.');
    account.status=op==='chuck.model.disconnect'?'disconnected-preview':'expired-preview';account.version++;
    if(w.settings.chuckModelProvider===provider.id)delete w.settings.chuckModelProvider;
    return {objectId:account.id,message:'This preview connection is inactive. No replacement account or paid fallback was selected. Your CRAYS account, history and files are kept.'};
  }
  throw Error('Unknown model-connection action.');
}
