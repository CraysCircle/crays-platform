import {useCallback,useEffect,useState} from 'react';
import {readGymAccess,type GymAccess} from './gym-access';
/** Display ownership follows the existing shared account. Server requests
 * independently authorize the native scope; this hook grants no permission.
 */
export function useGymAccess(expectedGlobalAccountId:string,onSharedSessionCheck:()=>void){
 const [loaded,setLoaded]=useState<{expected:string;access:GymAccess}|null>(null),[revision,setRevision]=useState(0);
 const retry=useCallback(()=>{setLoaded(null);setRevision(value=>value+1);},[]);
 const invalidate=useCallback(()=>{retry();onSharedSessionCheck();},[retry,onSharedSessionCheck]);
 useEffect(()=>{
  const controller=new AbortController();
  void readGymAccess(expectedGlobalAccountId,controller.signal).then(access=>{
   if(controller.signal.aborted)return;
   setLoaded({expected:expectedGlobalAccountId,access});
   if(access.kind==='signed_out'||access.kind==='account_changed')onSharedSessionCheck();
  }).catch(()=>{/* An aborted previous owner cannot update the next owner. */});
  return()=>controller.abort();
 },[expectedGlobalAccountId,revision,onSharedSessionCheck]);
 return {access:loaded?.expected===expectedGlobalAccountId?loaded.access:null,retry,invalidate};
}
