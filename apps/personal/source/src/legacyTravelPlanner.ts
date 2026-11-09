import {applyTravelComparisons} from './travelComparisons.ts';
import type {ActionContext,ActionResult,ProductWorld} from './productModel.ts';
import {resolveStateTaskRef,type StateTaskRef} from './stateTaskBridge.ts';
import {applyTripPlanner} from './tripPlanner.ts';
export type LegacyTask={id:string;title:string;request:string;status:string;resultId:string;sourceChatId?:string;sourceMessageId?:string;readyAt?:number;createdAt?:number};
type LegacyState={world:ProductWorld;tasks:LegacyTask[]};
const need=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
/** The short-lived DTO is only validation context for the existing manual trip
 * domain. It is never returned or persisted as another agent/task authority.
 * State.tasks remains the only original for legacy travel work. */
export function applyLegacyTravelPlanner<T extends LegacyState>(state:T,ref:StateTaskRef,op:string,data:Record<string,string>,ctx:ActionContext):{state:T;result:ActionResult}{
 try{
  need(ref.origin==='travel','Use the existing travel task for this plan.');const resolved=resolveStateTaskRef(state,ref);const original=resolved.task as LegacyTask;
  need(['complete.trip.save','complete.trip.check-packing'].includes(op),'Choose a supported manual travel-planning action.');
  need(!['cancelled','failed','stopped','deleted','paused'].includes(String(original.status)),'This travel task is stopped. Its saved result remains available, but new changes are not allowed.');
  need(!ctx.sourceTaskId||ctx.sourceTaskId===ref.id,'Keep this request with its exact original travel task.');need(!ctx.capabilityId||ctx.capabilityId==='B2C-CAP-021','Keep this original itinerary capability.');
  need(!state.world.objects.some(o=>o.id===ref.id),'This travel identity conflicts with another stored object. Reopen the original context.');
  const plans=state.world.objects.filter(o=>o.kind==='trip-plan'&&o.sourceTaskId===ref.id);need(plans.length<=1,'This travel task has ambiguous trip results.');const plan=plans[0];
  if(plan)need(plan.owner===ref.owner&&plan.sourceTaskOrigin==='travel'&&original.resultId===plan.id,'The saved trip is not the exact result of this own travel task.');
  if(ctx.objectId)need(plan&&plan.id===ctx.objectId,'Open this travel task’s own original trip.');
  if(op==='complete.trip.check-packing')need(plan&&ctx.objectId===plan.id,'Open this travel task’s original packing list.');
  if(!plan&&original.resultId){
   const actualObject=state.world.objects.some(o=>o.id===original.resultId)||state.world.posts.some(o=>o.id===original.resultId);
   need(!actualObject&&original.resultId===`result-${original.id}`,'An existing or unknown result must not be overwritten by this manual planner.');
  }
  const next=structuredClone(state),w=next.world;
  const projection={id:ref.id,owner:ref.owner,kind:'agent-task',name:original.title,request:original.request,status:original.status,capabilityId:'B2C-CAP-021',resultId:plan?.id||'',sourceChatId:original.sourceChatId||'chuck',sourceMessageId:original.sourceMessageId||'',origin:'legacy-travel-validation-dto',projectionOnly:true};
  w.objects.unshift(projection);
  const action=applyTripPlanner(w,op,data,{...ctx,sourceTaskId:ref.id,capabilityId:'B2C-CAP-021',...(plan?{objectId:plan.id}:{})});
  need(action,'This manual travel action is not supported.');
  const resultPlan=w.objects.find(o=>o.id===action!.objectId&&o.owner===ref.owner&&o.kind==='trip-plan'&&o.sourceTaskId===ref.id);need(resultPlan,'The saved trip lost its exact original travel reference.');
  Object.assign(resultPlan!,{sourceTaskOrigin:'travel'});
  w.objects=w.objects.filter(o=>o!==projection);
  need(!w.objects.some(o=>o.id===ref.id),'A temporary travel projection must never become a persisted agent task.');
  const legacy=next.tasks.find(t=>t.id===ref.id)!;
  if(op==='complete.trip.save')Object.assign(legacy,{resultId:resultPlan!.id,status:'saved'});
  return {state:next,result:{world:w,ok:true,objectId:resultPlan!.id,message:action!.message}};
 }catch(error){return {state,result:{world:state.world,ok:false,objectId:ctx.objectId||'',message:error instanceof Error?error.message:String(error)}};}
}

/** Budget handoff keeps State.tasks as the sole legacy original. The optional
 * domain authority is supplied here after resolution, never by user data. */
export function applyLegacyTravelBudget<T extends LegacyState>(state:T,op:string,data:Record<string,string>,ctx:ActionContext):{state:T;result:ActionResult}{
 try{
  need(op==='complete.travel.budget-attach','Choose the exact reviewed budget handoff.');
  const trip=state.world.objects.find(o=>o.id===data.tripId&&o.owner===state.world.owner&&o.kind==='trip-plan'&&o.sourceTaskOrigin==='travel');
  need(trip,'Open this own original travel trip.');
  const resolved=resolveStateTaskRef(state,{owner:state.world.owner,origin:'travel',id:String(trip!.sourceTaskId)}),original=resolved.task;
  need(original.resultId===trip!.id,'Keep the budget with this travel task’s exact trip result.');
  const plans=state.world.objects.filter(o=>o.kind==='trip-plan'&&o.sourceTaskId===original.id);need(plans.length===1&&plans[0].id===trip!.id,'This original travel task has ambiguous trip results.');
  const next=structuredClone(state),action=applyTravelComparisons(next.world,op,data,ctx,{legacyTrip:{id:original.id,owner:state.world.owner,resultId:String(original.resultId),status:String(original.status)}});
  need(action,'This budget action is unavailable.');
  return {state:next,result:{world:next.world,ok:true,objectId:action!.objectId,message:action!.message}};
 }catch(error){return {state,result:{world:state.world,ok:false,objectId:ctx.objectId||'',message:error instanceof Error?error.message:String(error)}};}
}
