import {act,type ActionContext,type ActionResult,type ProductWorld} from './productModel.ts';

/** Synchronous canonical preview state; React renders/persists the published snapshot. */
export class PreviewStateCell<T> {
 private current:T;
 private publish:(next:T)=>void;
 private scopeOf:((state:T)=>string)|undefined;
 private scopeKey:string;
 private scopeRevision=0;
 private reconcile:((previous:T,next:T)=>T)|undefined;
 constructor(initial:T,publish:(next:T)=>void,scopeOf?:(state:T)=>string,reconcile?:(previous:T,next:T)=>T){this.reconcile=reconcile;this.current=initial;this.publish=publish;this.scopeOf=scopeOf;this.scopeKey=scopeOf?.(initial)||'';}
 getState=()=>this.current;
 getScopeRevision=()=>this.scopeRevision;
 setState=(update:T|((previous:T)=>T))=>{
  const proposed=typeof update==='function'?(update as (previous:T)=>T)(this.current):update;
  const next=this.reconcile?.(this.current,proposed)??proposed;
  if(Object.is(next,this.current))return;
  const scopeKey=this.scopeOf?.(next)||'';
  if(scopeKey!==this.scopeKey){this.scopeRevision++;this.scopeKey=scopeKey;}
  this.current=next;
  this.publish(next);
 };
}
/** Old async UI callbacks cannot write into a later identity generation. */
export function bindPreviewStateScope<T>(store:{getScopeRevision:()=>number;setState:(update:T|((previous:T)=>T))=>void}){
 const expected=store.getScopeRevision();
 return (update:T|((previous:T)=>T))=>{if(store.getScopeRevision()===expected)store.setState(update);};
}
export function runCurrentPreviewAction<T extends {world:ProductWorld}>(store:{getState:()=>T;setState:(update:T|((previous:T)=>T))=>void;getScopeRevision?:()=>number},expected:{owner:string;signedIn:boolean;scopeRevision?:number},op:string,data:Record<string,string>,ctx:ActionContext):ActionResult{
 const latest=store.getState();
 if(latest.world.owner!==expected.owner||latest.world.identity.signedIn!==expected.signedIn||expected.scopeRevision!==undefined&&store.getScopeRevision?.()!==expected.scopeRevision)return {ok:false,world:latest.world,objectId:ctx.objectId||'',message:'Your account context changed. Reopen the current original before continuing.'};
 const result=act(latest.world,op,data,ctx);
 if(result.ok)store.setState(s=>({...s,world:result.world}));
 return result;
}
