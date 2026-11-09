import {useCallback,useEffect,useMemo,type ReactNode,Component} from 'react';
import type {OriginalPlatformIdentity,MemberRoutePort,SessionState} from './member-club-runtime/integration/ClubMemberModule';
import {useClubModule} from './ClubModuleLoader';
export type ClubIdentity=OriginalPlatformIdentity|{kind:'loading'};
export default function WebClubHost({hash,onNavigate,onIdentity,toolbarTarget,originalAccount,onSessionInvalidated}:{hash:string;onNavigate:(hash:string)=>void;onIdentity:(state:ClubIdentity)=>void;toolbarTarget:HTMLElement|null;originalAccount?:Extract<OriginalPlatformIdentity,{kind:'ready'}>;onSessionInvalidated?:()=>void}){
 const {module,failed}=useClubModule();
 const route=useMemo<MemberRoutePort>(()=>({getSnapshot:()=>hash,subscribe:()=>()=>{},navigate:next=>{if(next.startsWith('#'))onNavigate(next);}}),[hash,onNavigate]);
 useEffect(()=>{if(originalAccount){onIdentity(originalAccount);return;}const controller=new AbortController();onIdentity({kind:'loading'});module?.readOriginalPlatformIdentity(controller.signal).then(state=>{if(!controller.signal.aborted)onIdentity(state);}).catch(()=>{if(!controller.signal.aborted)onIdentity({kind:'unavailable',reason:'network'});});return()=>controller.abort();},[onIdentity,originalAccount,module]);
 const sessionChanged=useCallback((state:SessionState)=>{if(!originalAccount)return;if(state.kind==='signed_out'||(state.kind==='ready'&&state.account.id!==originalAccount.accountId)||(state.kind==='unavailable'&&state.status==='invalid_session_provenance'))onSessionInvalidated?.();},[originalAccount,onSessionInvalidated]);
 if (!module) return <section role={failed?'alert':'status'}><p>{failed?'Your Club is temporarily unavailable. Please reload.':'Opening your Club…'}</p></section>;
 const ClubMemberModule=module.ClubMemberModule;
 return <ClubHostBoundary><ClubMemberModule locale="en" route={route} toolbarTarget={toolbarTarget} expectedAccountId={originalAccount?.accountId} onSessionChange={sessionChanged}/></ClubHostBoundary>;
}
class ClubHostBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<section className="club-runtime-hold" role="alert"><h1>Your Club account is unavailable.</h1><p>Reopen Club to retry. Your original account and saved records have not been changed.</p></section>:this.props.children;}}
