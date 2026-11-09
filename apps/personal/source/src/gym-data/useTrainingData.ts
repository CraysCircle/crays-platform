import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {createTrainingApi} from './client/training-api';
import {createTrainingView,selectTrainingViewSnapshot,type TrainingSelection} from './client/training-view';
import type {GymAccess} from './client/gym-access';

/** Original same-origin Training reads. Callers supply the existing native
 * GymAccess; this hook creates no session, login, pool or write capability. */
export function useTrainingData(active:boolean,access:GymAccess|null,selection:TrainingSelection,onAccessInvalidated:()=>void){
 const api=useMemo(()=>createTrainingApi(onAccessInvalidated),[onAccessInvalidated]);
 const controller=useMemo(()=>createTrainingView(api),[api]);
 const domain=selection.domain;
 const query=selection.domain==='sessions'?selection.query:'';
 const sessionId=selection.domain==='detail'||selection.domain==='timers'?selection.sessionId:'';
 const request=useMemo<TrainingSelection>(()=>domain==='sessions'?{domain,query}:domain==='detail'||domain==='timers'?{domain,sessionId}:{domain},[domain,query,sessionId]);
 const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getServerSnapshot);
 useEffect(()=>{
  if(active)void controller.start(access,request);else controller.clear();
  // Effect replay must remain usable; subscriptions remove their own listeners.
  return()=>controller.clear();
 },[controller,active,access,request]);
 return selectTrainingViewSnapshot(snapshot,active?access:null,request);
}
