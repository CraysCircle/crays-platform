import {createContext,useContext,useEffect,useMemo,useRef,type ReactNode,type RefObject} from 'react';
import {createPublicPlaybackCoordinator} from './public-feed.mjs';

const PlaybackContext=createContext<ReturnType<typeof createPublicPlaybackCoordinator>|null>(null);
export function PublicPlaybackProvider({scope,children}:{scope:string;children:ReactNode}){
 const current=useRef(scope);current.current=scope;
 const coordinator=useMemo(()=>createPublicPlaybackCoordinator({isCurrent:()=>current.current===scope}),[scope]);
 // Pause, not dispose: StrictMode replays effects with this same instance.
 // Child registrations release their own DOM nodes; no timers/global registry.
 useEffect(()=>()=>{coordinator.pauseAll();},[coordinator]);
 return <PlaybackContext.Provider value={coordinator}>{children}</PlaybackContext.Provider>;
}

type ReleaseReason='scope-change'|'item-change'|'disabled'|'unmount';
export function usePublicPlayback(element:RefObject<HTMLMediaElement|null>,options:{enabled?:boolean;identity?:string;isAllowed?:()=>boolean;onPause?:()=>void;onRelease?:(reason:ReleaseReason)=>void}={}){
 const coordinator=useContext(PlaybackContext),latest=useRef(options),currentCoordinator=useRef(coordinator);latest.current=options;currentCoordinator.current=coordinator;
 const enabled=options.enabled!==false;
 useEffect(()=>{
  const player=element.current;if(!coordinator||!player||!enabled)return;
  const identity=options.identity,registration=coordinator.register({
   pause(){player.pause();latest.current.onPause?.();},
   isAllowed:()=>player.isConnected&&!document.hidden&&player.closest('[data-flow-current]')?.getAttribute('data-flow-current')!=='false'&&(latest.current.isAllowed?.()??true),
  });
  const play=()=>{registration.claim();};player.addEventListener('play',play);
  return()=>{
   const reason:ReleaseReason=currentCoordinator.current!==coordinator?'scope-change':latest.current.enabled===false?'disabled':latest.current.identity!==identity?'item-change':'unmount';
   player.removeEventListener('play',play);registration.release();latest.current.onRelease?.(reason);
  };
 },[coordinator,element,enabled,options.identity]);
}
