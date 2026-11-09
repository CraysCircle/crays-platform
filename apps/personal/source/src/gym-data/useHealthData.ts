import {useCallback,useEffect,useMemo,useSyncExternalStore} from 'react';
import {useGymAccess} from './client/use-gym-access';
import {createHealthApi,type HealthDomain} from './client/health-api';
import {createHealthView,selectHealthViewSnapshot} from './client/health-view';

export function useHealthAccess(active:boolean,globalAccountId:string|undefined,onSessionInvalidated:(()=>void)|undefined){
 const check=useCallback(()=>onSessionInvalidated?.(),[onSessionInvalidated]);
 return useGymAccess(active?(globalAccountId??''):'',check);
}
/** Existing global/native Gym access is display isolation; the server still
 * authorizes every read. Keep the external-store snapshot stable, then select
 * during render so an account/URL change never paints old private readings.
 */
export function useHealthData(active:boolean,access:ReturnType<typeof useHealthAccess>['access'],domain:HealthDomain|null,params:URLSearchParams,onAccessInvalidated:()=>void){
 const api=useMemo(()=>createHealthApi(onAccessInvalidated),[onAccessInvalidated]);
 const controller=useMemo(()=>createHealthView(api),[api]);
 const query=params.toString(),selection=useMemo(()=>new URLSearchParams(query),[query]);
 const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getServerSnapshot);
 useEffect(()=>{
  if(active&&domain)void controller.start(access,domain,selection);else controller.clear();
  // Clear, not permanently dispose: React StrictMode replays this effect.
  // The external-store subscription removes its own listener on unmount.
  return()=>controller.clear();
 },[controller,active,access,domain,selection]);
 return selectHealthViewSnapshot(snapshot,active&&domain?access:null,domain??'overview',selection);
}
