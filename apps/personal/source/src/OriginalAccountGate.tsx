import {withWorkspaceEntryDeadline} from './workspaceEntryDeadline.mjs';
import {CraysPlatformProvider} from './platform/CraysPlatformProvider';
import {openCurrentHttpMessaging} from './live-messaging/currentHttpMessaging.mjs';
import type {AdmittedHumanMessagingPort} from './live-messaging/admittedConversationSelection.mjs';
import {noteViewStability} from './viewStability';
import {Component,lazy,Suspense,useCallback,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
const PersonalPrototype=lazy(()=>withWorkspaceEntryDeadline(()=>import('./Prototype')));
import type {OriginalPlatformIdentity} from './member-club-runtime/integration/ClubMemberModule';
import {useClubModule} from './ClubModuleLoader';
import {bindChuckLoginReturns,restoreChuckLoginReturn} from './chuckLoginReturn';
import {useUnifiedWorkAccess} from './UnifiedWorkAccess';
import type {ClubsLocale} from './member-club-runtime/lib/clubs/public-site';

type AccountState=OriginalPlatformIdentity|{kind:'loading'};
type ReadyAccount=Extract<OriginalPlatformIdentity,{kind:'ready'}>;
const locales=new Set(['en','de','es','ca','fr','pt','it']);
function entryLocale():ClubsLocale {const part=window.location.pathname.split('/')[1];return (locales.has(part)?part:'en') as ClubsLocale;}

/** Original HTTPS server session is the sole admission source. No local preview identity is read. */
export default function OriginalAccountGate(){
 useEffect(()=>{noteViewStability('account-gate-mount');return()=>noteViewStability('account-gate-unmount');},[]);
 const {module,failed}=useClubModule();
 const accountEntry=useRef<HTMLDivElement|null>(null);
 const [state,setState]=useState<AccountState>({kind:'loading'});
 const [checking,setChecking]=useState(true);
 useEffect(()=>noteViewStability('account-checking',checking?'concealed':'visible'),[checking]);
 useEffect(()=>noteViewStability('account-state',state.kind),[state.kind]);
 const request=useRef<AbortController|null>(null),generation=useRef(0);
 const inFlight=useRef(false),concealed=useRef(true),backgroundRequest=useRef(false);
 const refresh=useCallback((background=false,force=false)=>{
  noteViewStability('account-refresh',background===true?'background':'foreground');
  if(background!==true){concealed.current=true;setChecking(true); }
  if(inFlight.current&&!force&&(background===true||!backgroundRequest.current))return;
  inFlight.current=true;backgroundRequest.current=background===true;
  const seq=++generation.current;request.current?.abort();const controller=new AbortController();request.current=controller;if(background!==true){concealed.current=true;setChecking(true);}
  if (!module){inFlight.current=false;return;}
  withWorkspaceEntryDeadline(signal=>module.readOriginalPlatformIdentity(signal),{signal:controller.signal}).then(next=>{if(!controller.signal.aborted&&seq===generation.current){noteViewStability('account-result',next.kind);setState(previous=>previous.kind==='ready'&&next.kind==='ready'&&previous.accountId===next.accountId&&previous.displayName===next.displayName&&previous.contact===next.contact?previous:next);concealed.current=false;setChecking(false);}}).catch(()=>{if(!controller.signal.aborted&&seq===generation.current){noteViewStability('account-result','network-unavailable');setState({kind:'unavailable',reason:'network'});setChecking(false);}}).finally(()=>{if(seq===generation.current)inFlight.current=false;});
 },[module]);
 const invalidate=useCallback(()=>refresh(false,true),[refresh]);
 useEffect(()=>{
  refresh();
  const hide=()=>{noteViewStability('account-conceal',document.visibilityState);++generation.current;request.current?.abort();inFlight.current=false;concealed.current=true;setChecking(true);};
  const visibility=()=>document.visibilityState==='visible'?refresh(!concealed.current):hide();
  const focus=()=>{if(document.visibilityState==='visible')refresh(!concealed.current);};
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh(true);},60000);
  window.addEventListener('pageshow',focus);window.addEventListener('focus',focus);window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',visibility);
  return()=>{++generation.current;request.current?.abort();inFlight.current=false;clearInterval(timer);window.removeEventListener('pageshow',focus);window.removeEventListener('focus',focus);window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',visibility);};
 },[refresh]);
 useLayoutEffect(()=>{
  const element=accountEntry.current;
  if(!element)return;
  return bindChuckLoginReturns(element,window);
 },[module,state.kind]);
 useEffect(()=>{if(state.kind==='ready'&&!checking)restoreChuckLoginReturn(window);},[state.kind,checking]);
 if (!module) return failed?<WorkspaceEntryRecovery/>:<main role="status"><p>Opening your personal workspace…</p></main>;
 const OriginalAccountEntryPresentation=module.OriginalAccountEntryPresentation;
 if(state.kind==='loading')return <AccountOpening reason="initial-account"/>;
 if(state.kind==='ready')return <><div style={{display:checking?'none':undefined}} inert={checking}><OriginalAccountDesktop key={state.accountId} account={state} onSessionInvalidated={invalidate}/></div>{checking&&<AccountOpening reason="concealed-session"/>}</>;
 const presentation=state.kind==='signed_out'?state:{kind:'unavailable' as const,status:state.kind==='unavailable'&&state.reason==='transport_unqualified'?'configuration_not_ready':state.kind==='unavailable'&&state.reason==='provenance'?'invalid_session_provenance':state.kind,retryable:state.kind==='unavailable'&&['network','core'].includes(state.reason)};
 return <div ref={accountEntry} style={{display:'contents'}}><OriginalAccountEntryPresentation locale={entryLocale()} state={presentation} onRetry={refresh}/></div>;
}

/**
 * The original Core account ID is not a person ID. Until the authorised Personal
 * projection is supplied, keep its account-scoped interactive preview separate from canonical data.
 * The preview world must never be treated as an authorised Core person projection.
 * Club resolves all its own rights and records through its original BFF.
 */
function OriginalAccountDesktop({account,onSessionInvalidated}:{account:ReadyAccount;onSessionInvalidated:()=>void}){
 useEffect(()=>{noteViewStability('account-desktop-mount');return()=>noteViewStability('account-desktop-unmount');},[]);
 const workAvailable=useUnifiedWorkAccess(account.accountId);
 const [humanMessaging,setHumanMessaging]=useState<AdmittedHumanMessagingPort>();
 const [humanMessagingState,setHumanMessagingState]=useState<'opening'|'ready'|'unavailable'>('opening');
 const [messagingRetry,setMessagingRetry]=useState(0);
 useEffect(()=>{const stop=new AbortController();let owned:(AdmittedHumanMessagingPort&{close():void})|undefined;setHumanMessaging(undefined);setHumanMessagingState('opening');void openCurrentHttpMessaging({platformAccountId:account.accountId,isCurrent:()=>!stop.signal.aborted,signal:stop.signal}).then(value=>{if(stop.signal.aborted){value.close();return;}owned=value;setHumanMessaging(value);setHumanMessagingState('ready');}).catch(()=>{if(!stop.signal.aborted)setHumanMessagingState('unavailable');});return()=>{stop.abort();owned?.close();};},[account.accountId,messagingRetry]);
 return <CraysPlatformProvider accountId={account.accountId} workEntryAvailable={workAvailable}><WorkspaceEntryBoundary><Suspense fallback={<AccountOpening reason="lazy-prototype"/>}><PersonalPrototype integration={{humanMessaging,humanMessagingState,onMessagingRetry:()=>setMessagingRetry(v=>v+1),account,onSessionInvalidated,workAvailable,onWork:()=>window.location.assign('/work/club')}}/></Suspense></WorkspaceEntryBoundary></CraysPlatformProvider>;
}

function AccountOpening({reason}:{reason:string}){
 useEffect(()=>{noteViewStability('opening-mounted',reason);return()=>noteViewStability('opening-unmounted',reason);},[reason]);
 return <main role="status" data-workspace-opening={reason} style={{position:"fixed",inset:0,background:"white",color:"#082638",padding:32,font:"18px/1.5 Crays,Avenir,sans-serif",zIndex:2147483000}}><p>Opening your personal workspace…</p></main>;
}

/** Keep a failed lazy module from unmounting the entire account entry. */
class WorkspaceEntryBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<WorkspaceEntryRecovery/>:this.props.children;}
}
function WorkspaceEntryRecovery(){
 return <main role="alert" style={{margin:32,maxWidth:600,color:'#082638'}}><h1>Your workspace could not be opened</h1><p>The connection or a required page file did not finish loading. Reload to try again. Your saved work stays where it is.</p><button className="primary" type="button" onClick={()=>window.location.reload()}>Reload workspace</button></main>;
}
