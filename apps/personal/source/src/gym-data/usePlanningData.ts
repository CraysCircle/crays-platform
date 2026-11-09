import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {createPlanningApi,type PlanningDomain} from './client/planning-api';
import {createPlanningView,selectPlanningViewSnapshot} from './client/planning-view';
import type {GymAccess} from './client/gym-access';

/** Existing original-route planning reads, isolated by the current native
 * GymAccess and selected query. No commands, optimistic saves or session fork. */
export function usePlanningData(active:boolean,access:GymAccess|null,domain:PlanningDomain,params:URLSearchParams,onAccessInvalidated:()=>void,revision=0){
 const api=useMemo(()=>createPlanningApi(onAccessInvalidated),[onAccessInvalidated]);
 const controller=useMemo(()=>createPlanningView(api),[api,revision]);
 const query=params.toString(),selection=useMemo(()=>new URLSearchParams(query),[query]);
 const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getServerSnapshot);
 useEffect(()=>{
  if(active)void controller.start(access,domain,selection);else controller.clear();
  return()=>controller.clear();
 },[controller,active,access,domain,selection]);
 return selectPlanningViewSnapshot(snapshot,active?access:null,domain,selection);
}
