import {localPreviewId} from "./localPreviewId.ts";
import type { ProductWorld, Entity, ActionContext } from './productModel.ts';
import { canonicalAgentTaskRef, canonicalTaskUsage, agentRequestFingerprint } from './taskOriginals.ts';
import { applyCraysPlan, ownPlanContracts, planContractActive, planUsage } from './craysPlans.ts';
export const chuckCostSource={version:'openai-standard-usd-credit-2026-10-20-v2',url:'https://developers.openai.com/api/docs/pricing',fxUSDperEUR:1.1253,fxDate:'2026-10-16',creditEUR:.01,creditUSD:.01};
export const chuckCostScenarios=[
 {id:'quick',name:'Quick draft',model:'gpt-6-luna',inputRate:.1,outputRate:.5,input:4000,output:1000,maxInput:6000,maxOutput:1600,searches:0,actualInput:3200,actualOutput:800,maximum:.2},
 {id:'balanced',name:'Balanced draft',model:'gpt-6.1-sol',inputRate:2,outputRate:10,input:6000,output:1500,maxInput:10000,maxOutput:2500,searches:0,actualInput:5800,actualOutput:1350,maximum:5},
 {id:'research',name:'Draft with research',model:'gpt-6.1-sol',inputRate:2,outputRate:10,input:15000,output:2000,maxInput:18000,maxOutput:3000,searches:2,actualInput:14200,actualOutput:1750,maximum:9},
];
function need(ok:unknown,m:string):asserts ok{if(!ok)throw Error(m);}
const legacyCostVersion='openai-standard-2026-10-18-v1';
const credits=(usd:number,version:string)=>Math.ceil((usd/(version===legacyCostVersion?chuckCostSource.fxUSDperEUR*chuckCostSource.creditEUR:chuckCostSource.creditUSD)-1e-9)*10)/10;
const own=(w:ProductWorld,id:string,kind?:string)=>w.objects.find(o=>o.owner===w.owner&&o.id===id&&(!kind||o.kind===kind));
const signature=agentRequestFingerprint;
const contractSignature=(c:Entity)=>JSON.stringify([c.id,c.owner,c.planId,c.segment,c.serviceScopeId,c.pricingVersion,c.currentPeriodStart,c.currentPeriodEnd,c.allowances]);
export function chuckScenarioQuote(id:string,version=chuckCostSource.version){need([chuckCostSource.version,legacyCostVersion].includes(version),'Open the original supported cost version.');const s=chuckCostScenarios.find(o=>o.id===id);need(s,'Choose a supported cost scenario.');const cost=(i:number,o:number)=>(i*s.inputRate+o*s.outputRate)/1e6+s.searches*.01;return {...s,estimatedUSD:cost(s.input,s.output),upperUSD:cost(s.maxInput,s.maxOutput),estimatedCredits:credits(cost(s.input,s.output),version),minimumMaximumCredits:credits(cost(s.maxInput,s.maxOutput),version),actualUSD:cost(s.actualInput,s.actualOutput),actualCredits:credits(cost(s.actualInput,s.actualOutput),version)};}
export function chuckTaskCostReviews(w:ProductWorld,taskId:string){const ref=canonicalAgentTaskRef(w,taskId);return w.objects.filter(o=>o.kind==='chuck-cost-review'&&o.owner===w.owner&&o.taskId===ref.id);}
export function chuckPayers(w:ProductWorld){return ownPlanContracts(w).filter(c=>planContractActive(c)&&c.segment==='guest'&&c.serviceScopeId===w.owner);}
export function chuckPayerName(w:ProductWorld,c:Entity){if(c.segment==='venue'){const s=own(w,String(c.serviceScopeId),'venue-setup');return String((s?.config as {name?:string}|undefined)?.name||'Your Spot');}return c.segment==='creator'?'Your Creator allowance':'Your personal allowance';}
function request(w:ProductWorld,id:string){const ref=canonicalAgentTaskRef(w,id),t=ref.task;need(t.aiExecutionRequested===true&&['explicit-chuck-request','explicit-chuck-refinement'].includes(String(t.executionOrigin))&&typeof t.aiRequestMessageId==='string'&&!!t.aiRequestMessageId&&Number.isInteger(Number(t.aiRequestRevision))&&Number(t.aiRequestRevision)>0,'Send an explicit Chuck request first. Manual work and saved samples are not paid AI execution.');return ref;}
function currentReview(w:ProductWorld,r:Entity,active=true){const ref=request(w,String(r.taskId));need(signature(ref.task)===r.requestFingerprint,'This request changed. Review the new exact revision.');const c=own(w,String(r.contractId),'crays-plan-contract');need(c&&c.segment==='guest'&&c.serviceScopeId===w.owner&&contractSignature(c)===r.contractFingerprint&&(!active||planContractActive(c)),'This exact payer or membership changed.');const q=chuckScenarioQuote(String(r.scenarioId),String(r.priceVersion));need([chuckCostSource.version,legacyCostVersion].includes(String(r.priceVersion))&&Number(r.maxCredits)>=q.minimumMaximumCredits,'Cost terms changed. Review again.');return {ref,c,q};}
export function applyChuckTaskCosts(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('complete.task.cost.'))return;
 need(w.identity.signedIn,'Sign in to manage your own task allowance.');const create=(fields:Record<string,unknown>)=>{const o={id:localPreviewId(),owner:w.owner,...fields} as Entity;w.objects.unshift(o);return o;};
 if(op==='complete.task.cost.review'){
  const ref=request(w,ctx.objectId||d.taskId),t=ref.task;need(!['cancelled','revoked','paused','stopped','forbidden','blocked'].includes(String(t.status)),'Resume an allowed task before reviewing additional work.');
  const c=own(w,d.contractId,'crays-plan-contract');need(c&&c.segment==='guest'&&c.serviceScopeId===w.owner&&planContractActive(c),'Choose your own existing active personal allowance. Basic Chuck and manual app features remain separate.');
  const q=chuckScenarioQuote(d.scenarioId);const max=Number(d.maxCredits);need(Number.isFinite(max)&&Number.isInteger(max*10)&&max>=q.minimumMaximumCredits&&max<=1000,'Choose a maximum covering this scenario’s explicit token/tool ceilings.');
  const rows=canonicalTaskUsage(w,ref);need(!rows.some(o=>o.status==='reserved'),'Resolve the existing task reservation before another cost review.');
  const key=`${ref.canonicalKey}:request:${t.aiRequestRevision}:${t.aiRequestMessageId}`;need(!rows.some(o=>o.status==='captured'&&(!o.executionKey||o.executionKey===key)),'This original request already has captured usage; do not bill it again.');
  const r=create({kind:'chuck-cost-review',taskId:ref.id,canonicalTaskKey:ref.canonicalKey,contractId:c.id,payerScopeId:c.serviceScopeId,payerName:chuckPayerName(w,c),scenarioId:q.id,priceVersion:chuckCostSource.version,requestFingerprint:signature(t),contractFingerprint:contractSignature(c),requestRevision:t.aiRequestRevision,requestMessageId:t.aiRequestMessageId,executionKey:key,maxCredits:max,estimatedCredits:q.estimatedCredits,quote:q,sourceURL:chuckCostSource.url,status:'reviewed',createdAt:Date.now(),simulation:true});
  return {objectId:r.id,message:'Scenario cost estimate prepared. No credits used and no provider contacted.'};
 }
 const r=own(w,ctx.objectId||'','chuck-cost-review');need(r,'Open your own exact task cost review.');
 if(op==='complete.task.cost.revoke'){
  need(d.approved==='Yes','Confirm stopping this additional AI work.');const task=own(w,String(r.taskId),'agent-task');need(task,'Original task is unavailable.');
  const reserved=w.objects.find(o=>o.kind==='crays-usage'&&o.owner===w.owner&&o.costReviewId===r.id&&o.status==='reserved');if(reserved)applyCraysPlan(w,'complete.plan.release',{taskId:task.id,reservationId:reserved.id},{...ctx,objectId:String(r.contractId)});
  r.status=r.status==='completed'?'completed':'revoked';if(task.aiExecutionApprovalReviewId===r.id)task.aiExecutionApproved=false;
  return {objectId:r.id,message:reserved?'Unexecuted preview reservation released. Your original request and manual work remain.':'New extra work stopped. Previously captured preview usage was not refunded.'};
 }
 const {ref,c,q}=currentReview(w,r),t=ref.task;
 if(op==='complete.task.cost.approve'){
  need(d.approved==='Yes','Approve this exact request, payer and maximum first.');if(r.status==='approved')return {objectId:r.id,message:'This original reservation already exists.'};need(r.status==='reviewed','This cost review is not available for new work.');
  need(Number(r.maxCredits)<=Number(planUsage(w,c.id)?.remaining||0),'This allowance cannot cover the approved maximum. Choose another own allowance or stop; no automatic top-up.');
  t.aiExecutionApproved=true;t.aiExecutionApprovalReviewId=r.id;t.aiExecutionApprovedRevision=r.requestRevision;t.aiExecutionApprovedMessageId=r.requestMessageId;
  const result=applyCraysPlan(w,'complete.plan.reserve',{taskId:t.id,credits:String(r.maxCredits),approved:'Yes',permitted:'Yes',costReviewId:r.id},{...ctx,objectId:c.id});need(result,'Reservation was not created.');r.reservationId=result.objectId;r.status='approved';return {objectId:r.id,message:'Maximum reserved for this exact simulated task. Nothing consumed yet.'};
 }
 if(op==='complete.task.cost.complete'){
  if(r.status==='completed')return {objectId:String(r.resultId),message:'The same result and receipt already exist; no second charge.'};
  need(r.status==='approved'&&t.aiExecutionApproved===true&&t.aiExecutionApprovalReviewId===r.id&&t.aiExecutionApprovedRevision===t.aiRequestRevision&&t.aiExecutionApprovedMessageId===t.aiRequestMessageId,'The exact request approval is absent or revoked.');need(!['cancelled','paused','revoked','stopped','forbidden','blocked'].includes(String(t.status)),'This task is not permitted to do new work.');
  need(q.actualCredits<=Number(r.maxCredits),'Simulated receipt exceeds the approved maximum.');
  const receipt=create({kind:'chuck-usage-receipt',taskId:t.id,costReviewId:r.id,reservationId:r.reservationId,executionKey:r.executionKey,requestRevision:r.requestRevision,source:'synthetic-fixture',model:q.model,inputTokens:q.actualInput,outputTokens:q.actualOutput,searchCalls:q.searches,supplierUSD:q.actualUSD,...(r.priceVersion===legacyCostVersion?{supplierEUR:q.actualUSD/chuckCostSource.fxUSDperEUR}:{}),chargedCredits:q.actualCredits,priceVersion:r.priceVersion,status:'known-preview',createdAt:Date.now(),simulation:true});
  r.receiptId=receipt.id;
  applyCraysPlan(w,'complete.plan.capture',{taskId:t.id,credits:String(q.actualCredits),approved:'Yes',permitted:'Yes',costReviewId:r.id,receiptId:receipt.id},{...ctx,objectId:c.id});
  const result=create({kind:'task-result',resultType:'chuck-cost-preview',name:'Your preview draft',taskRequest:t.request,sourceTaskId:t.id,costReviewId:r.id,receiptId:receipt.id,scenario:q.name,status:'prepared-demo',text:'A starting outline for your request: clarify the outcome, compare the options that fit your selected context, and choose the next practical step. This local sample is editable planning material, not a live model response.',createdAt:Date.now(),simulation:true});
  r.status='completed';r.receiptId=receipt.id;r.resultId=result.id;r.capturedCredits=q.actualCredits;r.releasedCredits=Number(r.maxCredits)-q.actualCredits;t.status='completed';t.costResultId=result.id;if(!t.resultId)t.resultId=result.id;
  return {objectId:result.id,message:'Simulated result ready. Scenario usage captured once; unused reservation released. No real supplier expense claimed.'};
 }
 throw Error('This task cost action is unavailable.');
}
