import {useEffect,useRef,useState} from 'react';
import {createPlanningCommands,type PlanningCommandResult} from './client/planning-commands';
import type {GymAccess} from './client/gym-access';

const messages:Record<PlanningCommandResult['state'],string>={
 CONFIRMED:'Saved. Loading your updated workout…',
 CONFLICT:'The saved record changed or a workout is already active. Reload the original records before continuing.',
 UNCONFIRMED:'The outcome could not be confirmed. Do not submit it again. Reload and review your saved records.',
 OWNER_CHANGED:'Your account changed while the request was being checked. Return to the original account to reconcile it.',
 INVALID:'Review the details. No valid change was submitted.',OFFLINE:'You are offline. Nothing was sent or queued.',
 SESSION:'Sign in through your existing CRAYS account.',PERMISSION:'Your current Gym access does not permit this change.',
 BLOCKED:'The original source prerequisites are not available, or safe recovery storage is blocked.',
 BUSY:'Your previous request is still being checked.',RECOVERY_REQUIRED:'Reload and review the saved records before another change.',
};
/** The controller survives renders; its browser recovery flag also survives tab
 * remounts/reload. Unlock requires successful original reads plus a separate
 * rendered original affected-record readback. Unknown outcomes remain locked. Readback never resends a command. */
export function usePlanningCommands(access:GymAccess|null,onInvalidated:()=>void,refresh:()=>void){
 const current=useRef({access,onInvalidated,refresh});current.current={access,onInvalidated,refresh};
 const [api]=useState(()=>createPlanningCommands({access:()=>current.current.access,online:()=>navigator.onLine,send:(...args)=>fetch(...args),onAccessInvalidated:()=>current.current.onInvalidated()}));
 const alive=useRef(true),readback=useRef<AbortController|null>(null);
 type Readback={domain:string;record:Record<string,unknown>};
 const [busy,setBusy]=useState(false),[status,setStatus]=useState<{owner:string;message:string;reviewed:boolean;record?:Readback}>({owner:'',message:'',reviewed:false});
 const owner=access?.kind==='ready'?access.ownerKey:'';
 const selected=status.owner===owner?status:{owner,message:'',reviewed:false,record:undefined};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;readback.current?.abort();};},[]);
 useEffect(()=>{readback.current?.abort();setStatus({owner,message:'',reviewed:false});},[owner]);
 const locked=Boolean(owner&&api.needsReadback(owner));
 async function run(action:(commands:ReturnType<typeof createPlanningCommands>,owner:string)=>Promise<PlanningCommandResult>){
  if(!owner||busy||locked)return null;
  setBusy(true);setStatus({owner,message:'Checking your change…',reviewed:false});
  try{
   const result=await action(api,owner);if(!alive.current||current.current.access?.kind!=='ready'||current.current.access.ownerKey!==owner)return null;
   setStatus({owner,message:messages[result.state],reviewed:false});
   if(result.readbackRequired)current.current.refresh();
   if(result.state==='CONFIRMED'){
    const controller=new AbortController();readback.current?.abort();readback.current=controller;
    try{const record=await api.reconcileReadback(owner,controller.signal);if(!controller.signal.aborted&&alive.current&&current.current.access?.kind==='ready'&&current.current.access.ownerKey===owner){current.current.refresh();setStatus({owner,message:'Your change is saved.',reviewed:true,record});}}
    catch{if(!controller.signal.aborted&&alive.current&&current.current.access?.kind==='ready'&&current.current.access.ownerKey===owner)setStatus({owner,message:'Saved, but the updated record could not be loaded. Reload it before making another change.',reviewed:false});}
   }
   if(!alive.current||current.current.access?.kind!=='ready'||current.current.access.ownerKey!==owner)return null;
   return result;
  }
  finally{if(alive.current)setBusy(false);}
 }
 async function reload(){
  if(!owner||busy||!navigator.onLine)return;
  setBusy(true);setStatus({owner,message:'Reloading original planning records…',reviewed:false});
  const controller=new AbortController();readback.current?.abort();readback.current=controller;
  try{
   const record=await api.reconcileReadback(owner,controller.signal);
   if(!controller.signal.aborted&&alive.current&&current.current.access?.kind==='ready'&&current.current.access.ownerKey===owner){current.current.refresh();setStatus({owner,message:'Your saved record has been reloaded.',reviewed:true,record});}
  }catch{if(!controller.signal.aborted&&alive.current)setStatus({owner,message:'The affected record could not be identified or reloaded. Further changes remain locked. For an unconfirmed creation, ask support to reconcile it; do not submit it again.',reviewed:false});}
  finally{if(alive.current)setBusy(false);}
 }
 useEffect(()=>{if(status.owner===owner&&status.reviewed&&status.record&&api.acknowledgeReadback(owner))setStatus(value=>({...value,reviewed:false}));},[api,owner,status]);
 return {run,reload,busy,locked,readbackRecord:selected.record,message:selected.message,disabled:busy||locked||!owner};
}
