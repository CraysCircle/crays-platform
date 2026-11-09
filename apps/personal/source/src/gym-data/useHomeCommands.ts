import {useEffect,useMemo,useRef,useState} from 'react';
import {createHomeCommands,type HomeResult,type HomeReadback} from './client/home-commands';
import type {GymAccess} from './client/gym-access';
type Factory=ReturnType<typeof createHomeCommands>;
type Scope='workouts'|'readiness';
/** Retain the authoritative result before allowing another explicit action. */
export function useHomeCommands(access:GymAccess|null,onAccessInvalidated:()=>void,onSaved:(value:HomeReadback)=>void){
 const current=useRef({access,onAccessInvalidated,onSaved,alive:true});current.current={...current.current,access,onAccessInvalidated,onSaved};
 const commands=useMemo(()=>createHomeCommands({access:()=>current.current.access,online:()=>typeof navigator!=='undefined'&&navigator.onLine,send:(url,init)=>fetch(url,init),onAccessInvalidated:()=>current.current.onAccessInvalidated()}),[]);
 const owner=access?.kind==='ready'?access.ownerKey:'';
 const [held,setHeld]=useState({owner:'',busy:false,message:'',saved:0,scope:null as Scope|null});
 const state=held.owner===owner?held:{owner,busy:false,message:'',saved:0,scope:null as Scope|null};
 const request=useRef<AbortController|null>(null);
 const matches=(key:string)=>current.current.alive&&current.current.access?.kind==='ready'&&current.current.access.ownerKey===key;
 useEffect(()=>{current.current.alive=true;return()=>{current.current.alive=false;request.current?.abort();};},[]);
 useEffect(()=>()=>{request.current?.abort();},[owner]);
 async function reload(key=owner){
  if(!matches(key))return false;request.current?.abort();const controller=new AbortController();request.current=controller;
  try{const saved=await commands.reconcileReadback(key,controller.signal);if(controller.signal.aborted||!matches(key))return false;current.current.onSaved(saved);setHeld({owner:key,busy:false,scope:saved.kind==='sessions'||saved.kind==='session'?'workouts':'readiness',message:saved.kind==='sessions'?'Your saved workouts are reloaded.':saved.kind==='session'?'Your workout is ready. Open it to begin.':saved.model.reports.find(row=>row.readinessId===saved.recordId)?.state==='WITHDRAWN'?'Your check-in is withdrawn.':'Your check-in is saved.',saved:Date.now()});return true;}
  catch{if(!controller.signal.aborted&&matches(key))setHeld({owner:key,busy:false,message:'Your last change could not be confirmed. Do not submit it again. Check your saved records or contact support.',saved:0,scope:commands.pendingKind(key)==='start'?'workouts':'readiness'});return false;}
 }
 useEffect(()=>{if(state.saved&&state.owner===owner&&commands.acknowledgeReadback(owner))setHeld(value=>value.owner===owner?{...value,saved:0}:value);},[commands,owner,state.saved,state.owner]);
 async function run(task:(commands:Factory,owner:string)=>Promise<HomeResult>,scope:Scope){
  const key=owner;if(!matches(key)||commands.isBusy()||commands.isLocked(key))return null;
  setHeld({owner:key,busy:true,message:'Saving your change…',saved:0,scope});
  const result=await task(commands,key);if(!matches(key))return null;
  if(result.state==='CONFIRMED'||result.state==='CONFLICT'){const restored=await reload(key);return restored?result:{state:'UNCONFIRMED' as const};}
  const messages:Record<HomeResult['state'],string>={CONFIRMED:'Your change is saved.',CONFLICT:'A workout is already open or this check-in changed. Reload your saved records before continuing.',UNCONFIRMED:'Your last change could not be confirmed. Do not submit it again.',INVALID:'Choose at least one answer from 1 to 5 and check the values.',OFFLINE:'You are offline. No change was sent.',SESSION:'Please check your existing CRAYS login.',PERMISSION:'Your current Gym access does not allow this change.',BLOCKED:'This action is not available right now.',BUSY:'Your change is still being saved.',RECOVERY_REQUIRED:'Check your last saved change before continuing.',OWNER_CHANGED:'Your CRAYS account changed. Reopen Training.'};
  setHeld({owner:key,busy:false,message:messages[result.state],saved:0,scope});return result;
 }
 return{run,reload,scope:state.scope??(commands.pendingKind(owner)==='start'?'workouts':commands.pendingKind(owner)?'readiness':owner&&commands.isLocked(owner)?'workouts':null),busy:state.busy,message:state.message,locked:owner?commands.isLocked(owner):false,disabled:!owner||state.busy||commands.isBusy()||commands.isLocked(owner)};
}
