import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight} from '@phosphor-icons/react';
import {createExerciseApi,type ExerciseSearchResponse} from './client/exercise-api';
import type {useOriginalTrainingPlanning} from './TrainingPlanningRecords';
type Data=ReturnType<typeof useOriginalTrainingPlanning>;
type Exercise=ExerciseSearchResponse['items'][number];
const safeVersion=(value:unknown)=>{const number=Number(value);return Number.isSafeInteger(number)&&number>0?number:null;};
export function PlanningCommandStatus({data}:{data:Data}){
 const saved=data.commands.readbackRecord;
 if(!data.commands.message&&!data.commands.locked&&!saved)return null;
 const readable=(value:unknown)=>typeof value==='string'?value.toLowerCase().replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase()):'';
 return <div className="training-selected-note" style={{display:'grid',gap:12,marginBlock:'16px 24px'}}><p role="status" aria-live="polite">{data.commands.message||(data.commands.locked?'Your last change needs to be checked before another submission.':'')}</p>
 {saved&&<section aria-label="Saved change" className="training-selected-review"><h3>{typeof saved.record.name==='string'?saved.record.name:saved.domain==='sessions'?'Your workout':saved.domain==='calendar'?'Workout scheduled':'Your training plan'}</h3><p>{readable(saved.record.lifecycleState??saved.record.state)}{typeof saved.record.localDate==='string'?' · '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(saved.record.localDate+'T12:00:00Z')):''}{typeof saved.record.localTime==='string'?' · '+saved.record.localTime.slice(0,5):''}</p>{typeof saved.record.linkedProgrammeName==='string'&&<p>{saved.record.linkedProgrammeName} · {readable(saved.record.linkedProgrammeState)}</p>}</section>}
 {data.commands.locked&&!data.commands.busy&&<button type="button" className="gym-design-action" onClick={()=>void data.commands.reload()}>Reload saved change</button>}</div>;
}
/** Existing approved form fields, now bound to original schemas and records. */
export function TrainingPlanningForm({data,kind,onInvalidated}:{data:Data;kind:'template'|'program'|'schedule';onInvalidated:()=>void}){
 const [draft,setDraft]=useState({owner:data.owner,name:'',goal:'',sets:'3',rest:'90',weeks:'4',templateId:'',date:'',time:'18:00',query:''});
 const value=draft.owner===data.owner?draft:{owner:data.owner,name:'',goal:'',sets:'3',rest:'90',weeks:'4',templateId:'',date:'',time:'18:00',query:''};
 const change=(key:keyof typeof value,next:string)=>setDraft({...value,[key]:next});
 const [selection,setSelection]=useState<{owner:string;items:Exercise[]}>({owner:'',items:[]});
 const selected=selection.owner===data.owner?selection.items:[];
 const [search,setSearch]=useState<{owner:string;query:string;items:Exercise[];message:string}>({owner:'',query:'',items:[],message:''});
 const results=search.owner===data.owner&&search.query===value.query?search.items:[];
 const templates=data.templates.view?.domain==='templates'?data.templates.view.model.templates.filter(row=>row.lifecycleState==='ACTIVE'):[];
 const template=templates.find(row=>row.templateId===value.templateId);
 const templateVersion=template?safeVersion(template.templateVersion):null;
 useEffect(()=>{
  if(kind!=='template'||value.query.trim().length<2||!data.owner)return;
  const controller=new AbortController(),owner=data.owner,query=value.query;
  const timer=setTimeout(()=>void createExerciseApi(onInvalidated).search(new URLSearchParams({q:query.trim(),take:'10'}),controller.signal).then(model=>{if(!controller.signal.aborted)setSearch({owner,query,items:[...model.items],message:model.items.length?'':'No published matching exercises were returned.'});}).catch(()=>{if(!controller.signal.aborted)setSearch({owner,query,items:[],message:'Exercises could not be loaded.'});}),250);
  return()=>{clearTimeout(timer);controller.abort();};
 },[kind,value.query,data.owner,onInvalidated]);
 async function submit(event:FormEvent){
  event.preventDefault();
  if(kind==='template')await data.commands.run((commands,owner)=>commands.createTemplate(owner,{templateId:null,expectedVersion:null,name:value.name,notes:'',lifecycleState:'ACTIVE',exercises:selected.map(row=>({craysExerciseId:row.craysExerciseId,setType:'STRAIGHT',targetSets:Number(value.sets),targetRepsMin:8,targetRepsMax:12,targetDurationSeconds:null,targetDistanceMeters:null,restSeconds:Number(value.rest),notes:''}))}));
  else if(kind==='program'&&template&&templateVersion&&Number.isInteger(Number(value.weeks))&&Number(value.weeks)>=1&&Number(value.weeks)<=104)await data.commands.run((commands,owner)=>commands.createProgram(owner,{name:value.name,goal:value.goal,weeks:Number(value.weeks),schedule:Array.from({length:Number(value.weeks)},(_,index)=>({week:index+1,day:1,templateId:template.templateId,templateVersion})),changeReason:'Member created in Plan & Schedule'}));
  else if(kind==='schedule'&&template&&templateVersion&&data.timezone)await data.commands.run((commands,owner)=>commands.schedule(owner,{programId:null,programVersion:null,templateId:template.templateId,templateVersion,localDate:value.date||data.selectedDay||data.today,localTime:value.time||null,timezone:data.timezone}));
 }
 const disabled=data.commands.disabled||data.templates.phase!=='ready';
 const field=(label:string,key:keyof typeof value,type='text',min?:number,max?:number)=><label>{label}<input value={value[key]} type={type} min={min} max={max} required onChange={event=>change(key,event.target.value)}/></label>;
 const templateField=<label>{kind==='program'?'Active template':'Template'}<select required value={value.templateId} onChange={event=>change('templateId',event.target.value)}><option value="">Choose a workout</option>{templates.map(row=><option key={row.templateId} value={row.templateId}>{row.name}</option>)}</select></label>;
 return <form onSubmit={event=>void submit(event)}><fieldset disabled={disabled} style={{border:0,padding:0,margin:0,minWidth:0}}><legend className="sr-only">{kind==='template'?'Create a workout template':kind==='program'?'Create a training programme':'Schedule a workout'}</legend><div className="training-selected-fields">
 {kind==='template'?<><label>Search exercises<input value={value.query} placeholder="Exercise name" onChange={event=>change('query',event.target.value)}/></label>{field('Template name','name')}{field('Sets','sets','number',1,20)}{field('Rest seconds','rest','number',0,3600)}</>:kind==='program'?<>{field('Programme name','name')}{field('Goal','goal')}{templateField}{field('Weeks','weeks','number',1,104)}</>:<>{templateField}<label>Date<input required type="date" value={value.date||data.selectedDay||data.today||''} onChange={event=>change('date',event.target.value)}/></label><label>Local time<input type="time" value={value.time} onChange={event=>change('time',event.target.value)}/></label><label>Timezone<input readOnly value={data.timezone??''}/></label></>}
 </div>{kind==='template'&&<><ul style={{listStyle:'none',padding:0,margin:'16px 0',display:'grid',gap:12}}>{results.map(row=><li key={row.craysExerciseId} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>{row.name}<button className="gym-design-action" type="button" disabled={selected.some(item=>item.craysExerciseId===row.craysExerciseId)} onClick={()=>setSelection({owner:data.owner,items:[...selected,row]})}>Add exercise</button></li>)}</ul>{search.owner===data.owner&&search.query===value.query&&<p>{search.message}</p>}<ul style={{listStyle:'none',padding:0,margin:'16px 0',display:'flex',flexWrap:'wrap',gap:12}}>{selected.map(row=><li key={row.craysExerciseId}><button type="button" className="gym-design-action" onClick={()=>setSelection({owner:data.owner,items:selected.filter(item=>item.craysExerciseId!==row.craysExerciseId)})}>{row.name} ×</button></li>)}</ul><p>Your selected exercises use straight sets with 8–12 repetitions per set.</p></>}
 {kind==='program'&&<p>This draft schedules the selected template on day 1 of each week. Review it before activation.</p>}
 <div className="training-selected-actions">{kind==='template'&&<button type="button" className="gym-design-action" disabled={selected.length!==1} onClick={()=>void data.commands.run((commands,owner)=>commands.requestSubstitution(owner,{originalExerciseId:selected[0].craysExerciseId,reasonCodes:['PREFERENCE']}))}>Find alternative<ArrowRight aria-hidden size={18}/></button>}<button className="gym-design-action primary" type="submit" disabled={kind==='template'?!selected.length:!templateVersion||kind==='schedule'&&!data.timezone}>{kind==='template'?'Save workout template':kind==='program'?'Create draft programme':'Schedule workout'}<ArrowRight aria-hidden size={18}/></button></div></fieldset></form>;
}
