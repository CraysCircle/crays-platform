import type {ProductWorld,Entity} from './productModel.ts';
export type StateTaskRef={owner:string;origin:'agent'|'travel';id:string};
type LegacyTravelTask={id:string;title:string;request:string;status:string;resultId:string;sourceChatId?:string;sourceMessageId?:string};
type ActiveTaskState={world:ProductWorld;tasks:LegacyTravelTask[]};
// Exact refs only. Alias graph resolution belongs to taskOriginals, never to a
// name/title heuristic. Travel remains in its active owner's existing store.
export function resolveStateTaskRef(state:ActiveTaskState,ref:StateTaskRef){
 if(!state.world.identity.signedIn||ref.owner!==state.world.owner)throw Error('Open this task in its own signed-in account.');
 if(!ref.id||!['agent','travel'].includes(ref.origin))throw Error('Choose an exact original task reference.');
 const records=ref.origin==='travel'?state.tasks.filter(t=>t.id===ref.id):state.world.objects.filter(o=>o.id===ref.id&&o.owner===ref.owner&&o.kind==='agent-task');
 if(records.length!==1)throw Error('This original task is missing or ambiguous. Reopen its current view.');
 const task=records[0];return {ref:{...ref},canonicalKey:`${ref.owner}:${ref.origin}:${ref.id}`,task,status:String(task.status),resultId:String(task.resultId||'')};
}
export function requestExistingAgentRefinement(w:ProductWorld,ref:StateTaskRef,input:{text:string;messageId:string;context:Record<string,string>}){
 if(ref.origin!=='agent')throw Error('Keep travel work in its existing task store.');
 const resolved=resolveStateTaskRef({world:w,tasks:[]},ref),task=resolved.task as Entity;
 const text=input.text.trim();if(!text||!input.messageId)throw Error('Send the exact refinement you want.');
 if(task.aiRequestMessageId===input.messageId){if(String(task.request)!==text)throw Error('This message already belongs to a different request.');return w;}
 const history=Array.isArray(task.aiRequestHistory)?task.aiRequestHistory as {messageId:string;request:string;revision:number}[]:[];
 const old=history.find(h=>h.messageId===input.messageId);if(old){if(old.request!==text)throw Error('This message already belongs to a different request.');return w;}
 const copy=structuredClone(w),original=copy.objects.find(o=>o.owner===ref.owner&&o.kind==='agent-task'&&o.id===ref.id)!;
 const revision=Number(original.aiRequestRevision||0)+1;
 Object.assign(original,{originalRequest:original.originalRequest||original.request||'',request:text,executionOrigin:'explicit-chuck-refinement',aiExecutionRequested:true,aiExecutionApproved:false,aiRequestMessageId:input.messageId,aiRequestRevision:revision,aiRequestHistory:[...history,{messageId:input.messageId,request:text,revision}],latestSourceMessageId:input.messageId,sourceContext:{...(original.sourceContext as Record<string,string>||{}),...input.context,sourceTaskId:original.id},status:'prepared-not-executed',version:Number(original.version||0)+1});
 copy.history.unshift({id:`refinement-${input.messageId}`,owner:ref.owner,featureId:'AL-293',op:'task.refinement.request',objectId:ref.id,context:{sourceTaskId:ref.id,sourceMessageId:input.messageId,taskOrigin:'agent',aiRequestRevision:String(revision)},outcome:'Your refinement request stays with this original task. No AI execution or charge has been approved.',at:Date.now()});
 return copy;
}
