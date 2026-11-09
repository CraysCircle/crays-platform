import type {ActionContext,Entity,ProductWorld} from './productModel.ts';
import {currentWearableReview} from './wearableJourney.ts';
import {trainingAnalysisPreview,type TrainingChuckReview} from './trainingAnalysis.ts';
import {applyTrainingJourney,ownTrainingPlans,trainingSnapshot,type TrainingBrief} from './trainingJourney.ts';

export type FitnessAnalysisSource={kind:'wearable'|'training';id:string;version:string;excerpt:string;selectionSnapshot:string};
type PlanProposal={state:'proposed'|'declined'|'applied';planId:string;planVersion:number;before:TrainingBrief;after:TrainingBrief;exerciseId:string;rest:string;explanation:string;reviewSnapshot:string;appliedPlanVersion?:number;appliedSnapshot?:string};
export type FitnessAnalysisResult={schema:'crays.fitness-analysis-example.v1';exampleOnly:true;attemptId:string;version:number;taskBinding:string;source:FitnessAnalysisSource;state:'current'|'unknown'|'failed'|'ready';summary:string;limitations:string[];proposal:PlanProposal|null;history:{version:number;at:number;action:string;state:string}[]};
const prefix='fitness.analysis.';
const limitations=[
 'Explicit local design scenario. No AI model, paid budget, wearable provider or trainer has executed this analysis.',
 'Only the selected original excerpt is included. Missing values, sensor accuracy, technique, diagnosis and target attainment are not inferred.',
 'A displayed suggestion creates no permission, booking, payment or plan edit. Every plan change needs its own complete personal review.'
];
function task(w:ProductWorld,id:string):Entity {
 if(!w.identity.signedIn)throw Error('Sign in to your own current Chuck task.');
 const rows=w.objects.filter(o=>o.id===id),t=rows[0];
 if(rows.length!==1||!t||t.owner!==w.owner||t.kind!=='agent-task'||t.origin!=='explicit-chuck-request'||t.sourceChatId!=='chuck'||t.aiExecutionRequested!==true||typeof t.sourceMessageId!=='string'||!t.sourceMessageId||t.aiRequestMessageId!==t.sourceMessageId||typeof t.request!=='string'||!t.request.trim()||!t.sourceContext||typeof t.sourceContext!=='object')throw Error('Open the exact own Chuck request and its original source.');
 return t;
}
const binding=(w:ProductWorld,t:Entity)=>JSON.stringify({owner:w.owner,id:t.id,request:t.request,messageId:t.sourceMessageId,revision:t.aiRequestRevision??1,sourceContext:t.sourceContext});
export function fitnessAnalysisSource(w:ProductWorld,taskId:string,now=Date.now()):FitnessAnalysisSource {
 const t=task(w,taskId),c=t.sourceContext as Record<string,string>;
 if(['cancelled','failed'].includes(String(t.status)))throw Error('This original Chuck task is no longer available for a new analysis.');
 if(typeof c.objectId!=='string'||!c.objectId)throw Error('Reopen the selected original source.');
 if(c.sourceId===`wearable-review:${c.objectId}`){
  const r=currentWearableReview(w,c.objectId,now);if(!r||typeof r.creationSnapshot!=='string'||!r.creationSnapshot||!r.excerpt)throw Error('The wearable source or current purpose permission changed. Review the original readings again.');
  return {kind:'wearable',id:r.id,version:`${r.connectionVersion}:${r.consentVersion}`,excerpt:r.excerpt,selectionSnapshot:r.creationSnapshot};
 }
 let r:TrainingChuckReview;try{r=JSON.parse(c.trainingReview);if(!r||typeof r.version!=='string'||typeof r.snapshot!=='string'||typeof r.question!=='string'||!r.choices)throw Error();}catch{throw Error('The exact training-field review is missing. Review the original again.');}
 const p=trainingAnalysisPreview(w,c.objectId,r.version,r.choices,r.question);
 if(p.key!==r.snapshot)throw Error('The selected training source, fields or question changed. Review the original again.');
 return {kind:'training',id:c.objectId,version:r.version,excerpt:p.text,selectionSnapshot:p.key};
}
function validResult(r:FitnessAnalysisResult):boolean {
 return Boolean(r&&r.schema==='crays.fitness-analysis-example.v1'&&r.exampleOnly===true&&typeof r.attemptId==='string'&&r.attemptId.length>=8&&Number.isSafeInteger(r.version)&&r.version>0&&typeof r.taskBinding==='string'&&r.source&&['training','wearable'].includes(r.source.kind)&&typeof r.source.id==='string'&&typeof r.source.excerpt==='string'&&typeof r.source.selectionSnapshot==='string'&&['current','unknown','failed','ready'].includes(r.state)&&typeof r.summary==='string'&&Array.isArray(r.limitations)&&r.limitations.every(x=>typeof x==='string')&&Array.isArray(r.history)&&r.history.length&&r.history.at(-1)?.version===r.version&&r.history.at(-1)?.state===r.state&&r.history.every(h=>Number.isSafeInteger(h.version)&&Number.isFinite(h.at)&&typeof h.action==='string'));
}
/** Historical result remains readable when the source later changes; new work uses the separate current-source guard. */
export function fitnessAnalysisRecord(w:ProductWorld,taskId:string):FitnessAnalysisResult|undefined {
 try{const t=task(w,taskId),r=t.fitnessAnalysis as FitnessAnalysisResult|undefined;
  if(!r||!validResult(r)||r.taskBinding!==binding(w,t)||JSON.stringify(r.limitations)!==JSON.stringify(limitations))return;
  const p=r.proposal;
  if(p){
   if(!['proposed','declined','applied'].includes(p.state)||typeof p.planId!=='string'||!Number.isSafeInteger(p.planVersion)||p.planVersion<1||typeof p.explanation!=='string'||!p.explanation.trim()||p.explanation.length>1000||!/^\d+$/.test(p.rest)||Number(p.rest)>3600||!p.before.lines.some(l=>l.exerciseId===p.exerciseId))return;
   const expected={...structuredClone(p.before),lines:p.before.lines.map(l=>({...l,...(l.exerciseId===p.exerciseId?{rest:String(Number(p.rest))}:{})}))};
   if(trainingSnapshot(expected)!==trainingSnapshot(p.after))return;
   const proof=JSON.parse(p.reviewSnapshot);
   if(proof.taskId!==taskId||proof.attemptId!==r.attemptId||JSON.stringify(proof.source)!==JSON.stringify(r.source)||!Number.isSafeInteger(proof.analysisVersion)||proof.analysisVersion>=r.version||proof.planId!==p.planId||proof.planVersion!==p.planVersion||proof.before!==trainingSnapshot(p.before)||proof.after!==trainingSnapshot(p.after)||proof.exerciseId!==p.exerciseId||proof.rest!==p.rest||proof.explanation!==p.explanation)return;
   if(p.state==='applied'&&(!Number.isSafeInteger(p.appliedPlanVersion)||p.appliedPlanVersion!==p.planVersion+1||typeof p.appliedSnapshot!=='string'))return;
  }
  return r;
 }catch{return;}
}
export function fitnessAnalysisCurrent(w:ProductWorld,taskId:string,now=Date.now()):FitnessAnalysisResult {
 const r=fitnessAnalysisRecord(w,taskId);if(!r)throw Error('This result does not match the exact current Chuck request.');
 if(JSON.stringify(fitnessAnalysisSource(w,taskId,now))!==JSON.stringify(r.source))throw Error('The source or permission changed. Earlier evidence is retained, but new analysis and changes are held.');
 return r;
}
export function fitnessAnalysisPrepareSnapshot(w:ProductWorld,id:string,attemptId:string,now=Date.now()):string {
 if(typeof attemptId!=='string'||attemptId.length<8||attemptId.length>160)throw Error('Keep one original example-analysis attempt reference.');
 return JSON.stringify({taskBinding:binding(w,task(w,id)),source:fitnessAnalysisSource(w,id,now),attemptId});
}
export function fitnessAnalysisProposalPreview(w:ProductWorld,id:string,planId:string,planVersion:string,exerciseId:string,rest:string,explanation:string,now=Date.now()) {
 const r=fitnessAnalysisCurrent(w,id,now);if(r.state!=='ready')throw Error('Review the ready local example before preparing a separate plan change.');
 const p=ownTrainingPlans(w).find(p=>p.id===planId);
 if(!p||String(p.version)!==planVersion||p.status==='archived')throw Error('Choose the exact current own existing plan. A free workout is never converted into a plan.');
 if(!p.brief.lines.some(l=>l.exerciseId===exerciseId)||!/^\d+$/.test(rest)||Number(rest)>3600||typeof explanation!=='string'||!explanation.trim()||explanation.length>1000)throw Error('Choose an exercise already in that plan, rest from 0 to 3600 seconds and your reason. These are entry bounds, not training advice.');
 const after={...structuredClone(p.brief),lines:p.brief.lines.map(l=>({...l,...(l.exerciseId===exerciseId?{rest:String(Number(rest))}:{})}))};
 const snapshot=JSON.stringify({taskId:id,analysisVersion:r.version,attemptId:r.attemptId,source:r.source,planId:p.id,planVersion:p.version,before:trainingSnapshot(p.brief),after:trainingSnapshot(after),exerciseId,rest:String(Number(rest)),explanation:explanation.trim()});
 return {snapshot,before:structuredClone(p.brief),after,planId:p.id,planVersion:p.version,exerciseId,rest:String(Number(rest)),explanation:explanation.trim(),planState:p.status};
}
export function fitnessAnalysisApplySnapshot(w:ProductWorld,id:string,now=Date.now()) {
 const r=fitnessAnalysisCurrent(w,id,now),p=r.proposal;
 if(r.state!=='ready'||!p||p.state!=='proposed')throw Error('Open this pending original plan-change proposal.');
 const plan=ownTrainingPlans(w).find(x=>x.id===p.planId);
 if(!plan||plan.version!==p.planVersion||trainingSnapshot(plan.brief)!==trainingSnapshot(p.before))throw Error('The target plan changed. Keep this proposal as history and review its current original separately.');
 if(!['draft','paused'].includes(plan.status))throw Error('Pause the active plan in its own workspace first. No automatic pause or edit.');
 return JSON.stringify({taskId:id,analysisVersion:r.version,attemptId:r.attemptId,reviewSnapshot:p.reviewSnapshot,planId:p.planId,planVersion:p.planVersion,after:trainingSnapshot(p.after)});
}
export function applyFitnessAnalysis(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null {
 if(!op.startsWith(prefix))return null;
 if(ctx.personId&&ctx.personId!==w.owner)throw Error('Open your own analysis request.');
 const id=ctx.objectId||'',t=task(w,id);
 if(data.approved!=='Yes'||data.scenario!=='explicit-local-example')throw Error('Personally review this explicit local example action.');
 if(op===prefix+'prepare'){
  const snapshot=fitnessAnalysisPrepareSnapshot(w,id,data.attemptId,now);if(snapshot!==data.snapshot)throw Error('The request or selected source changed. Review again.');
  if(t.fitnessAnalysis){const prior=fitnessAnalysisCurrent(w,id,now);if(prior.attemptId!==data.attemptId)throw Error('Keep the existing analysis attempt and its original result.');return {objectId:id,message:'Opening the same local example attempt; no second result or execution.'};}
  const r:FitnessAnalysisResult={schema:'crays.fitness-analysis-example.v1',exampleOnly:true,attemptId:data.attemptId,version:1,taskBinding:binding(w,t),source:fitnessAnalysisSource(w,id,now),state:'current',summary:'Selected source review prepared. No analysis execution or payment has occurred.',limitations:[...limitations],proposal:null,history:[{version:1,at:now,state:'current',action:'Personally prepared explicit local scenario on the same Chuck task'}]};t.fitnessAnalysis=r;
  return {objectId:id,message:'Local example prepared on this same task. No AI, budget, provider or trainer was executed.'};
 }
 const historical=fitnessAnalysisRecord(w,id);
 if(op===prefix+'apply'&&historical?.proposal?.state==='applied'&&historical.proposal.appliedSnapshot===data.snapshot)return {objectId:id,message:'This same reviewed proposal was already applied. No second plan change.'};
 const r=fitnessAnalysisCurrent(w,id,now);
 if(data.version!==String(r.version))throw Error('This original result changed. Reopen its current version.');
 const record=(action:string)=>{r.version++;r.history.push({version:r.version,at:now,state:r.state,action});};
 if(op===prefix+'outcome'){
  const allowed:Record<FitnessAnalysisResult['state'],string[]>={current:['unknown','failed','ready'],unknown:['current','failed','ready'],failed:['current'],ready:[]};
  if(!allowed[r.state].includes(data.outcome))throw Error('Reconcile the same local example attempt through an allowed result state.');
  r.state=data.outcome as FitnessAnalysisResult['state'];r.summary=r.state==='ready'?'Selected original evidence is available below. This local example preserves its source and gaps; it does not make a medical, training-suitability or target-attainment conclusion.':r.state==='unknown'?'The example outcome is unknown. Keep this same attempt; no completed analysis is implied.':r.state==='failed'?'The local example failed. No plan or payment changed.':'The same local example attempt is prepared again. No provider retry was executed.';record('Explicitly selected fictional outcome; no live model result');
  return {objectId:id,message:'Outcome retained on the same example reference; no actual model or provider execution.'};
 }
 if(op===prefix+'propose'){
  if(r.proposal)throw Error('The existing proposal is retained. Open its exact original decision.');
  const preview=fitnessAnalysisProposalPreview(w,id,data.planId,data.planVersion,data.exerciseId,data.rest,data.explanation,now);
  if(preview.snapshot!==data.snapshot)throw Error('Review the complete exact proposed plan and source again.');
  r.proposal={state:'proposed',planId:preview.planId,planVersion:preview.planVersion,before:preview.before,after:preview.after,exerciseId:preview.exerciseId,rest:preview.rest,explanation:preview.explanation,reviewSnapshot:preview.snapshot};record('Member prepared separate explicit plan-change proposal; plan unchanged');
  return {objectId:id,message:'Separate proposal prepared. The current plan and every previous workout remain unchanged.'};
 }
 if(op===prefix+'decline'){
  if(r.proposal?.state!=='proposed')throw Error('Open the pending proposal.');r.proposal.state='declined';record('Member declined separate proposal; no plan change');return {objectId:id,message:'Proposal declined; original plan and workouts retained.'};
 }
 if(op===prefix+'apply'){
  const snapshot=fitnessAnalysisApplySnapshot(w,id,now);if(data.snapshot!==snapshot)throw Error('Review the full resulting plan personally before applying.');
  const p=r.proposal!;
  applyTrainingJourney(w,'training.preview.plan.save',{version:String(p.planVersion),brief:JSON.stringify(p.after),snapshot:trainingSnapshot(p.after),approved:'Yes'},{...ctx,objectId:p.planId},now);
  p.state='applied';p.appliedSnapshot=snapshot;p.appliedPlanVersion=ownTrainingPlans(w).find(x=>x.id===p.planId)!.version;record('Member applied exact reviewed proposal through the original plan editor; no activation');
  return {objectId:id,message:'Same existing plan saved as a draft. Older workouts retain their original targets and versions.'};
 }
 throw Error('Open this analysis example’s supported action.');
}
