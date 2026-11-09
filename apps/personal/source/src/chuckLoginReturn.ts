import {personalNavigationLocation,personalNavigationPlacement} from './webPersonalNavigation';
/** Public navigation adapter for the separately selected account-entry module.
 * The module owns authentication and account admission. Its current presentation
 * has no return-target port, so this host adjusts only its existing login links.
 * No click is intercepted; native keyboard/new-tab navigation remains intact.
 */
type EntryLocation=Pick<Location,'origin'|'pathname'|'search'|'hash'>;
export function chuckLoginReturnTarget(location:EntryLocation):string|null {
 if(location.origin!=='http://localhost:8990')return null;
 // Private signer references are never navigation targets, including existing
 // provider links and the global-header query path. No key bytes are retained.
 if(/(?:^#|\/)(?:nsec1|ncryptsec1)/i.test(location.hash))return null;
 if(location.search==='?chuck=open'){
  const route=personalNavigationLocation(location.pathname,location.hash);
  const module=(/^\/personal\/(club|gym)\/?$/.test(location.pathname)||/^\/(en|de|es|ca|fr|pt|it)\/account$/.test(location.pathname))&&(!location.hash||/^#[A-Za-z0-9_/-]{1,160}$/.test(location.hash));
  if(route.kind==='route'||module)return location.pathname+location.search+location.hash;
  return null;
 }
 if(location.pathname!=='/'||location.search)return null;
 const selected=personalNavigationLocation(location.pathname,location.hash);
 if(selected.kind!=='route')return null;
 const {name,id}=selected.route;
 const workspace=['apps','chuck','chuckWorkspace','chuckTasks','chuckReminders','chuckKnowledge','chuckKnowledgeNotes','chuckKnowledgeSources','chuckKnowledgePreferences','chuckResults','chuckPeople','chuckPreferences','chuckSavedPeople','chuckDismissedPeople'].includes(name);
 const original=(prefix:string)=>typeof id==='string'&&new RegExp('^'+prefix+'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$').test(id);
 // Public navigation only. Original Core/person/source checks still run after
 // original login; no private payload, action or grant enters the return URL.
 const linked=name==='appProvider'&&typeof id==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(id)||name==='conversation'&&id==='chuck'||name==='agentTask'&&original('personal-task-')||['chuckRecommendation','chuckRecommendedPerson'].includes(name)&&original('personal-workspace-')||name==='chuckOriginalMessage'&&original('personal-message-')||name==='publicNostrProfile'&&/^[0-9a-f]{64}$/.test(id??'');
 // The canonical codec contains view references only, never commands, grants or
 // private drafts. Returning to a Personal view still requires original admission.
 const personal=personalNavigationPlacement(selected.route).root==='you';
 return personal||workspace||linked?location.pathname+location.hash:null;
}
export function chuckEntryLoginHref(href:string,location:EntryLocation):string|null {
 const target=chuckLoginReturnTarget(location);
 if(!target)return null;
 let url:URL;try{url=new URL(href,location.origin);}catch{return null;}
 if(url.origin!==location.origin||url.username||url.password||url.pathname!=='/auth/login'||url.hash)return null;
 const params=url.searchParams;
 if([...params.keys()].some(key=>!['returnTo','screen_hint'].includes(key))||params.getAll('returnTo').length!==1||params.getAll('screen_hint').length>1)return null;
 const hint=params.get('screen_hint');
 if(hint!==null&&hint!=='signup')return null;
 const previous=params.get('returnTo');
 if(!previous||!/^\/(en|de|es|ca|fr|pt|it)\/account$/.test(previous))return null;
 params.set('returnTo',target);
 return url.href;
}
const CHUCK_RETURN_KEY='crays.chuck.public-login-return.v1';
/** The original callback may strip unknown public routes. Restore only this
 * tab's narrowly validated navigation after ORIGINAL account admission. Never
 * store credentials, request text, authority fields or an automatic send. */
export function restoreChuckLoginReturn(host:Window):boolean{
 let saved:string|null;try{saved=host.sessionStorage.getItem(CHUCK_RETURN_KEY);host.sessionStorage.removeItem(CHUCK_RETURN_KEY);}catch{return false;}
 if(!saved)return false;
 try{
  const record=JSON.parse(saved);if(!record||record.schema!==1||typeof record.target!=='string'||!record.target.startsWith('/')||record.target.startsWith('//')||typeof record.recordedAt!=='number'||!Number.isFinite(record.recordedAt)||Date.now()-record.recordedAt<0||Date.now()-record.recordedAt>1800000)return false;
  const target=new URL(record.target,host.location.origin);if(chuckLoginReturnTarget(target)!==record.target)return false;
  const callback=target.pathname==='/'||/^\/(en|de|es|ca|fr|pt|it)\/account$/.test(target.pathname)?target.pathname+(/^#[A-Za-z0-9_-]{1,80}$/.test(target.hash)?target.hash:''):'/en/account';
  const current=host.location.pathname+host.location.search+host.location.hash;
  if(current===record.target||current!==callback)return false;
  host.location.replace(record.target);return true;
 }catch{return false;}
}
export function bindChuckLoginReturns(root:HTMLElement,host:Window):()=>void {
 const originals=new Map<HTMLAnchorElement,{before:string;after:string}>();
 const restore=(anchor:HTMLAnchorElement,value:{before:string;after:string})=>{
  if(anchor.getAttribute('href')===value.after)anchor.setAttribute('href',value.before);
 };
 const update=()=>{
  for(const [anchor,value] of originals){
   restore(anchor,value);
  }
  originals.clear();
  if(!chuckLoginReturnTarget(host.location))return;
  for(const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')){
   const before=anchor.getAttribute('href')!;
   const after=chuckEntryLoginHref(before,host.location);
   if(after&&after!==before){originals.set(anchor,{before,after});anchor.setAttribute('href',after);}
  }
 };
 const remember=(event:Event)=>{
  if(event.defaultPrevented||!(event instanceof MouseEvent)||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const node=event.target;if(!(node instanceof Element))return;const anchor=node.closest('a[href]');if(!(anchor instanceof HTMLAnchorElement)||(anchor.target&&anchor.target!=='_self')||anchor.hasAttribute('download')||!originals.has(anchor)||anchor.getAttribute('href')!==originals.get(anchor)!.after)return;
  const target=chuckLoginReturnTarget(host.location);if(!target)return;
  try{host.sessionStorage.setItem(CHUCK_RETURN_KEY,JSON.stringify({schema:1,target,recordedAt:Date.now()}));}catch{/* Storage unavailability must never block original login. */}
 };
 root.addEventListener('click',remember);
 // Observe the opaque external module, including its asynchronous locale/state
 // renders. Disconnect around own mutations to avoid self-triggering loops.
 const observer=new MutationObserver(()=>{observer.disconnect();update();observe();});
 const observe=()=>observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['href']});
 const refresh=()=>{observer.disconnect();update();observe();};
 refresh();host.addEventListener('hashchange',refresh);host.addEventListener('popstate',refresh);
 return()=>{root.removeEventListener('click',remember);observer.disconnect();host.removeEventListener('hashchange',refresh);host.removeEventListener('popstate',refresh);for(const [anchor,value] of originals)restore(anchor,value);originals.clear();};
}
