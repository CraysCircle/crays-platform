import {useEffect,useMemo,useRef,useState} from 'react';
import {createWorkoutCommands,type WorkoutResult,type WorkoutReadback} from './client/workout-commands';
import type {GymAccess} from './client/gym-access';
type Factory=ReturnType<typeof createWorkoutCommands>;
/** Keep original saved workout visible before unlocking the next action. */
export function useWorkoutCommands(access:GymAccess|null,sessionId:string,onAccessInvalidated:()=>void,onSaved:(value:WorkoutReadback)=>void){
 const current=useRef({access,sessionId,onAccessInvalidated,onSaved,alive:true});current.current={...current.current,access,sessionId,onAccessInvalidated,onSaved};
 const commands=useMemo(()=>createWorkoutCommands({access:()=>current.current.access,online:()=>typeof navigator!=='undefined'&&navigator.onLine,send:(url,init)=>fetch(url,init),onAccessInvalidated:()=>current.current.onAccessInvalidated()}),[]);
 const owner=access?.kind==='ready'?access.ownerKey:'';
 const [held,setHeld]=useState({owner:'',busy:false,message:'',saved:0});
 const state=held.owner===owner?held:{owner,busy:false,message:'',saved:0};
 const request=useRef<AbortController|null>(null);
 const matches=(key:string)=>current.current.alive&&current.current.access?.kind==='ready'&&current.current.access.ownerKey===key&&current.current.sessionId===sessionId;
 useEffect(()=>{current.current.alive=true;return()=>{current.current.alive=false;request.current?.abort();};},[]);
 useEffect(()=>()=>{request.current?.abort();},[owner]);
 async function reload(key=owner){
  if(!matches(key))return false;request.current?.abort();const controller=new AbortController();request.current=controller;
  try{const saved=await commands.reconcileReadback(key,sessionId,controller.signal);if(controller.signal.aborted||!matches(key))return false;current.current.onSaved(saved);setHeld({owner:key,busy:false,message:'Your workout is saved.',saved:Date.now()});return true;}
  catch{if(!controller.signal.aborted&&matches(key))setHeld({owner:key,busy:false,message:'Your last change could not be confirmed. Do not submit it again. Check the saved workout or contact support.',saved:0});return false;}
 }
 useEffect(()=>{if(state.saved&&state.owner===owner&&commands.acknowledgeReadback(owner,sessionId))setHeld(value=>value.owner===owner?{...value,saved:0}:value);},[commands,owner,sessionId,state.saved,state.owner]);
 async function run(task:(commands:Factory,owner:string)=>Promise<WorkoutResult>){
  const key=owner;if(!matches(key)||commands.isBusy()||commands.isLocked(key))return null;
  setHeld({owner:key,busy:true,message:'Saving your workout…',saved:0});
  const result=await task(commands,key);if(!matches(key))return null;
  if(result.state==='CONFIRMED'){const restored=await reload(key);return restored?result:{state:'UNCONFIRMED' as const};}
  const messages:Record<WorkoutResult['state'],string>={CONFIRMED:'Your workout is saved.',CONFLICT:'This workout changed elsewhere. Reload it before making another change.',UNCONFIRMED:'Your last change could not be confirmed. Do not submit it again.',INVALID:'Check the values before saving.',OFFLINE:'You are offline. No change was sent.',SESSION:'Please check your existing CRAYS login.',PERMISSION:'Your current Gym access does not allow this change.',BLOCKED:'This action is not available for the current workout.',BUSY:'Your change is still being saved.',RECOVERY_REQUIRED:'Check your last saved change before continuing.',OWNER_CHANGED:'Your CRAYS account changed. Reopen your workout.'};
  setHeld({owner:key,busy:false,message:messages[result.state],saved:0});return result;
 }
 return{run,reload,pendingSessionId:owner?commands.pendingSessionId(owner):null,busy:state.busy,message:state.message,locked:owner?commands.isLocked(owner):true,disabled:!owner||state.busy||commands.isBusy()||commands.isLocked(owner)};
}
