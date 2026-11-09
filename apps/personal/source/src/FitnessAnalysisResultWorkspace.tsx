import {useState} from 'react';
import {CaretRight,Check,ChatCircle,WarningCircle} from '@phosphor-icons/react';
import {MobileScroll,useKeyboard} from './mobile';
import {VoiceInput,VoiceTextarea} from './VoiceInput';
import type {ActionContext,ActionResult,ProductWorld} from './productModel';
import {localPreviewId} from './localPreviewId';
import {ownTrainingPlans,exerciseExamples,type TrainingBrief} from './trainingJourney';
import {fitnessAnalysisSource,fitnessAnalysisRecord,fitnessAnalysisCurrent,fitnessAnalysisPrepareSnapshot,fitnessAnalysisProposalPreview,fitnessAnalysisApplySnapshot} from './fitnessAnalysisResult';
import {fitnessAnalysisFindings,type FitnessFinding} from './fitnessAnalysisFindings';
import './fitness-analysis-result.css';

type Props={world:ProductWorld;taskId:string;run:(op:string,data:Record<string,string>,ctx:ActionContext)=>ActionResult;onSource:(kind:'wearable'|'training',id:string)=>void;onTask:(id:string)=>void;onPlan:(id:string)=>void};
function Plan({brief,label}:{brief:TrainingBrief;label:string}) {
 return <section className="fitness-analysis-plan"><h3>{label} · {brief.name}</h3><p>{brief.date} · {brief.time} · {brief.timezone}</p><p>Goal: {brief.goal||'Not supplied'}</p><p>Request: {brief.request||'Not supplied'}</p>{brief.lines.map(line=><p key={line.exerciseId}><strong>{exerciseExamples.find(e=>e.id===line.exerciseId)?.name||line.exerciseId}</strong><br/>{line.sets} sets · {line.reps} repetitions · {line.rest} seconds rest<br/>Note: {line.note||'Not supplied'}</p>)}</section>;
}
export function FitnessAnalysisResultWorkspace({world,taskId,run,onSource,onTask,onPlan}:Props) {
 const keyboard=useKeyboard(),record=fitnessAnalysisRecord(world,taskId),plans=ownTrainingPlans(world).filter(p=>p.status!=='archived');
 const [attemptId]=useState(()=>record?.attemptId||localPreviewId());
 const [planId,setPlanId]=useState(''),[exerciseId,setExerciseId]=useState(''),[rest,setRest]=useState(''),[reason,setReason]=useState(''),[approval,setApproval]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(false);
 const plan=plans.find(p=>p.id===planId);
 let source:ReturnType<typeof fitnessAnalysisSource>|undefined,current=false,held='',prepare='',proposal:ReturnType<typeof fitnessAnalysisProposalPreview>|undefined,apply='';
 try{source=fitnessAnalysisSource(world,taskId);if(record){fitnessAnalysisCurrent(world,taskId);current=true;}else prepare=fitnessAnalysisPrepareSnapshot(world,taskId,attemptId);}catch(e){held=e instanceof Error?e.message:String(e);}
 if(record?.state==='ready'&&current&&!record.proposal&&plan){try{proposal=fitnessAnalysisProposalPreview(world,taskId,plan.id,String(plan.version),exerciseId,rest,reason);}catch{/* Complete input is reviewed below. */}}
 if(record?.proposal?.state==='proposed'&&current){try{apply=fitnessAnalysisApplySnapshot(world,taskId);}catch(e){held=e instanceof Error?e.message:String(e);}}
 const action=(suffix:string,data:Record<string,string>)=>{keyboard.hide();const result=run(`fitness.analysis.${suffix}`,{approved:'Yes',scenario:'explicit-local-example',version:String(record?.version||''),...data},{featureId:'AL-248',objectId:taskId});setMessage(result.message);setError(!result.ok);setApproval('');};
 const check=(snapshot:string,label:string)=><label className="fitness-analysis-approval"><input type="checkbox" checked={Boolean(snapshot)&&approval===snapshot} disabled={!snapshot} onChange={()=>{keyboard.hide();setApproval(approval===snapshot?'':snapshot);}}/>{label}</label>;
 const findings=record?.state==='ready'&&current?fitnessAnalysisFindings(record.source):null;
 const findingRows=(rows:FitnessFinding[])=>rows.map(row=><section key={row.id} className="fitness-analysis-plan"><h3>{row.title}</h3><p>{row.detail}</p><details><summary>Source {row.evidence.length===1?'line':'lines'} {row.evidence.map(e=>e.line).join(', ')}</summary>{row.evidence.map(e=><p key={e.line}><strong>Line {e.line}</strong><br/>{e.text}</p>)}</details></section>);
 return <MobileScroll><article className="fitness-analysis-result" data-testid="fitness-analysis-result">
  <p className="eyebrow">YOUR CHUCK TASK · LOCAL DESIGN EXAMPLE</p><h1>Evidence first. Your decision next.</h1>
  <p>No AI model, payment, wearable provider or trainer executes here. This demonstrates the planned source review and a separately confirmed plan change.</p>
  {held&&<div className="fitness-analysis-held" role="status"><WarningCircle size={24}/><p>{held} Earlier history is retained. Source evidence is hidden while access or its exact version needs review.</p></div>}
  {!record?<><h2>Prepare this same task</h2>{source&&<><p>Selected {source.kind} original · version {source.version}</p><details><summary>Exactly selected evidence</summary><pre>{source.excerpt}</pre></details></>}{check(prepare,'I reviewed this exact request and selected evidence. Prepare an explicit local example only.')}<button className="primary" disabled={!prepare||approval!==prepare} onClick={()=>action('prepare',{attemptId,snapshot:prepare})}>Prepare local example<Check size={19}/></button></>:<>
   <section className="fitness-analysis-status"><h2>{record.state==='current'?'Prepared':record.state==='ready'?'Example result ready':record.state==='unknown'?'Outcome unknown':'Example failed'}</h2><p>{record.summary}</p><p>Same task and attempt · result version {record.version}</p></section>
   {findings&&<section data-testid="fitness-analysis-findings"><h2>What the selected evidence says</h2><p>Explicit local descriptive review of the selected excerpt only. Each finding links to its exact original lines; no AI or unselected source was used.</p>{findingRows(findings.findings)}<h2>What remains unknown</h2>{findings.unknowns.length?findingRows(findings.unknowns):<p>No additional missing structured field was identified by this limited parser. That is not proof the source is complete or validated.</p>}<h2>Questions for a separate next step</h2>{findingRows(findings.nextQuestions)}</section>}
   {current&&source&&<details><summary>Selected original evidence</summary><pre>{source.excerpt}</pre></details>}
   <details><summary>Limits and source references</summary>{record.limitations.map(line=><p key={line}>{line}</p>)}<p>Original {record.source.kind} review · v{record.source.version}. No missing value or permission is inferred.</p></details>
   {current&&record.state!=='ready'&&<section><h2>Explore the result</h2><p>Choose a fictional outcome on this same reference. Unknown never means completed.</p>{(record.state==='current'?['unknown','failed','ready']:record.state==='unknown'?['current','failed','ready']:['current']).map(outcome=><button className="secondary" key={outcome} onClick={()=>action('outcome',{outcome})}>Explore {outcome==='current'?'prepared again':outcome} example<CaretRight size={18}/></button>)}</section>}
   {record.state==='ready'&&!record.proposal&&<section><h2>A separate plan change</h2><p>The example result changes nothing. If you want to explore an edit, choose your existing plan and enter your own rest-time proposal. A free workout never becomes a plan.</p>{!plans.length?<p>No existing plan to change. Return to Training to create one through its normal review.</p>:<>
    <label>Existing plan<select aria-label="Analysis target plan" value={planId} onChange={e=>{keyboard.hide();setPlanId(e.target.value);setExerciseId('');setApproval('');}}><option value="">Choose a plan</option>{plans.map(p=><option key={p.id} value={p.id}>{p.brief.name} · v{p.version} · {p.status}</option>)}</select></label>
    {plan&&<><label>Existing exercise<select aria-label="Analysis target exercise" value={exerciseId} onChange={e=>{keyboard.hide();setExerciseId(e.target.value);setApproval('');}}><option value="">Choose an exercise</option>{plan.brief.lines.map(line=><option key={line.exerciseId} value={line.exerciseId}>{exerciseExamples.find(e=>e.id===line.exerciseId)?.name||line.exerciseId}</option>)}</select></label><label>Proposed rest in seconds<VoiceInput aria-label="Analysis proposed rest seconds" type="number" value={rest} onChange={e=>{setRest(e.target.value);setApproval('');}} onBlur={()=>keyboard.hide()}/></label><label>Your reason<VoiceTextarea aria-label="Analysis plan change reason" value={reason} onChange={e=>{setReason(e.target.value);setApproval('');}} onBlur={()=>keyboard.hide()}/></label></>}
    {proposal&&<><Plan brief={proposal.before} label="Current original"/><Plan brief={proposal.after} label="Proposed complete plan"/>{check(proposal.snapshot,'I reviewed this complete separate proposal. Save the proposal; keep my plan unchanged.')}<button className="primary" disabled={approval!==proposal.snapshot} onClick={()=>action('propose',{planId:proposal!.planId,planVersion:String(proposal!.planVersion),exerciseId:proposal!.exerciseId,rest:proposal!.rest,explanation:proposal!.explanation,snapshot:proposal!.snapshot})}>Prepare separate proposal<CaretRight size={19}/></button></>}
   </>}</section>}
   {record.proposal&&<section><h2>Separate proposal · {record.proposal.state}</h2><p>{record.proposal.explanation}</p><Plan brief={record.proposal.before} label={`Original v${record.proposal.planVersion}`}/><Plan brief={record.proposal.after} label="Complete resulting draft"/>
    {record.proposal.state==='proposed'&&<><p>Apply requires the exact same source, current target version and a draft or paused plan. An active plan must be paused personally in Training.</p>{check(apply,'I personally approve this entire resulting plan and exact rest change. Save it as a draft only.')}<button className="primary" disabled={!apply||approval!==apply} onClick={()=>action('apply',{snapshot:apply})}>Apply reviewed change<Check size={19}/></button><button className="secondary" disabled={!current} onClick={()=>action('decline',{})}>Decline proposal</button></>}
    {record.proposal.state==='applied'&&<p>The same plan is now draft v{record.proposal.appliedPlanVersion}. Earlier workouts keep their original snapshots; no activation, booking or charge occurred.</p>}
    <button className="secondary" onClick={()=>{keyboard.hide();onPlan(record.proposal!.planId);}}>Open original target plan<CaretRight size={19}/></button>
   </section>}
   <details><summary>What happened on this task</summary>{record.history.map(h=><p key={h.version}>v{h.version} · {new Date(h.at).toLocaleString('en-GB')} · {h.action} · {h.state}</p>)}</details>
  </>}
  {(source||record?.source)&&<button className="secondary" onClick={()=>{keyboard.hide();const ref=source||record!.source;onSource(ref.kind,ref.id);}}>Open original source<CaretRight size={19}/></button>}
  <button className="secondary" onClick={()=>{keyboard.hide();onTask(taskId);}}>Back to the same Chuck task<ChatCircle size={19}/></button>
  {message&&<p role={error?'alert':'status'}>{message}</p>}
 </article></MobileScroll>;
}
