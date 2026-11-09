import {useId,useState,type Dispatch,type SetStateAction} from 'react';
import {DesignDialog} from './DesignDialog';
import {ArrowLeft,ArrowRight,Check,Download,Trash} from '@phosphor-icons/react';

type ExampleSession={id:string;name:string;state:'ACTIVE'|'PAUSED'|'COMPLETED'|'ABORTED';date:string;minutes:number|null;exercises:{name:string;sets:{kg:string;reps:number;rpe:number|null}[]}[]};
const examples:ExampleSession[]=[
 {id:'design-session-1',name:'Full body',state:'COMPLETED',date:'2026-10-26',minutes:42,exercises:[{name:'Squat',sets:[{kg:'40',reps:8,rpe:7},{kg:'40',reps:8,rpe:8}]},{name:'Row',sets:[{kg:'20',reps:10,rpe:null}]}]},
 {id:'design-session-2',name:'Strength & mobility',state:'ABORTED',date:'2026-10-23',minutes:18,exercises:[{name:'Squat',sets:[{kg:'35',reps:8,rpe:7}]}]},
 {id:'design-session-3',name:'Free workout',state:'PAUSED',date:'2026-10-28',minutes:null,exercises:[]},
];
const readable=(state:ExampleSession['state'])=>({ACTIVE:'Active',PAUSED:'Paused',COMPLETED:'Completed',ABORTED:'Aborted'})[state];

export type TrainingHistoryPreview={filters:{state:string;from:string;to:string};selected:string;removed:string[];dialog:'export'|'delete'|null;format:'JSON'|'CSV'|'OPENSET';reason:string;notice:string};
export const initialTrainingHistoryPreview:TrainingHistoryPreview={filters:{state:'',from:'',to:''},selected:'',removed:[],dialog:null,format:'JSON',reason:'',notice:''};
export function TrainingHistoryMockup({previewState,onPreviewState,selectedMain=false}:{previewState?:TrainingHistoryPreview;onPreviewState?:Dispatch<SetStateAction<TrainingHistoryPreview>>;selectedMain?:boolean}={}){
 const [local,setLocal]=useState<TrainingHistoryPreview>(initialTrainingHistoryPreview);
 const state=previewState??local,update=onPreviewState??setLocal;
 const {filters,selected,removed,dialog,format,reason,notice}=state;
 function field<K extends keyof TrainingHistoryPreview>(key:K,value:SetStateAction<TrainingHistoryPreview[K]>){update(previous=>({...previous,[key]:typeof value==='function'?(value as (old:TrainingHistoryPreview[K])=>TrainingHistoryPreview[K])(previous[key]):value}))}
 const setFilters=(value:SetStateAction<TrainingHistoryPreview['filters']>)=>field('filters',value);
 const setSelected=(value:SetStateAction<string>)=>field('selected',value);
 const setRemoved=(value:SetStateAction<string[]>)=>field('removed',value);
 const setDialog=(value:SetStateAction<TrainingHistoryPreview['dialog']>)=>field('dialog',value);
 const setFormat=(value:SetStateAction<TrainingHistoryPreview['format']>)=>field('format',value);
 const setReason=(value:SetStateAction<string>)=>field('reason',value);
 const setNotice=(value:SetStateAction<string>)=>field('notice',value);
 const title=useId();
 const session=examples.find(s=>s.id===selected&&!removed.includes(s.id));
 const rows=examples.filter(s=>!removed.includes(s.id)&&(!filters.state||s.state===filters.state)&&(!filters.from||s.date>=filters.from)&&(!filters.to||s.date<=filters.to));
 function closeDialog(){setDialog(null);setReason('');}
 function downloadExample(){
  if(!session||!['COMPLETED','ABORTED'].includes(session.state))return;
  if(format==='OPENSET'){
   setNotice('OpenSet is reserved for the original validated export. This design preview has no validation receipt.');closeDialog();return;
  }
  const text=format==='JSON'?JSON.stringify({prototype:true,exampleSession:session},null,2):'prototype,session,state,date\ntrue,'+session.id+','+session.state+','+session.date+'\n';
  const url=URL.createObjectURL(new Blob([text],{type:format==='JSON'?'application/json':'text/csv'}));
  const a=document.createElement('a');a.href=url;a.download='crays-DESIGN-EXAMPLE-'+session.id+'.'+format.toLowerCase();a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  closeDialog();setNotice('Design example downloaded. No original workout or export receipt was created.');
 }
 return <section aria-labelledby={title} className={selectedMain?"training-selected-section training-selected-history":undefined}>
  <div className="gym-design-section-heading"><div><h2 id={title}>{session?session.name:'Workout history'}</h2><p className="gym-design-muted">{selectedMain?'Europe/Berlin · Three clearly marked examples; no original workout records.':'Design examples · Europe/Berlin · no original workout records'}</p></div>{session&&<button type="button" className="gym-design-action" onClick={()=>{setSelected('');setNotice('')}}><ArrowLeft size={18}/>Back to history</button>}</div>
  {notice&&<p className="gym-design-notice" role="status">{notice}</p>}
  {!session?<>
   <div className="gym-design-summary" aria-label="Visible example sessions"><div><span>{selectedMain?'Visible example sessions':'Visible sessions'}</span><strong>{rows.length}</strong></div><div><span>{selectedMain?'Completed examples':'Completed'}</span><strong>{rows.filter(s=>s.state==='COMPLETED').length}</strong></div><div><span>{selectedMain?'In-progress examples':'In progress'}</span><strong>{rows.filter(s=>s.state==='ACTIVE'||s.state==='PAUSED').length}</strong></div></div>
   <form className="gym-design-filter-form" onSubmit={e=>e.preventDefault()}><label>State<select value={filters.state} onChange={e=>setFilters(v=>({...v,state:e.target.value}))}><option value="">All</option>{(['ACTIVE','PAUSED','COMPLETED','ABORTED'] as const).map(state=><option key={state} value={state}>{readable(state)}</option>)}</select></label><label>From<input type="date" value={filters.from} onChange={e=>setFilters(v=>({...v,from:e.target.value}))}/></label><label>To<input type="date" min={filters.from} value={filters.to} onChange={e=>setFilters(v=>({...v,to:e.target.value}))}/></label><button type="button" className="gym-design-action" onClick={()=>setFilters({state:'',from:'',to:''})}>Clear filters{selectedMain&&<ArrowRight size={18}/>}</button></form>
   {filters.from&&filters.to&&filters.from>filters.to?<p role="alert">Choose an end date on or after the start date.</p>:rows.length?<div>{rows.map(s=><button type="button" className="gym-design-row" key={s.id} onClick={()=>setSelected(s.id)}><span><strong>{s.name}</strong><small>{selectedMain?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(s.date+'T12:00:00Z')):s.date} · {readable(s.state)} · {s.minutes===null?'Duration unavailable':s.minutes+(selectedMain?' minutes':' min')}{selectedMain?' · Example session':''}</small></span><ArrowRight size={19}/></button>)}</div>:<div className="gym-design-panel"><h3>No matching example sessions.</h3><p>Adjust the dates or choose a different state.</p></div>}
  </>:<>
   <p className="gym-design-muted">{session.date} · {readable(session.state)} · {session.minutes===null?'Duration unavailable':session.minutes+' min'}</p>
   {session.exercises.length?session.exercises.map(exercise=><section key={exercise.name} className="gym-design-panel"><h3>{exercise.name}</h3><div className="gym-design-table-wrap"><table><caption>Example recorded sets</caption><thead><tr><th scope="col">Set</th><th scope="col">Weight</th><th scope="col">Repetitions</th><th scope="col">RPE</th></tr></thead><tbody>{exercise.sets.map((set,i)=><tr key={i}><th scope="row">{i+1}</th><td>{set.kg} kg</td><td>{set.reps}</td><td>{set.rpe===null?'k. A.':set.rpe}</td></tr>)}</tbody></table></div></section>):<p>No example exercises recorded in this session.</p>}
   {['COMPLETED','ABORTED'].includes(session.state)?<div className="gym-design-inline"><button type="button" className="gym-design-action" onClick={()=>{setFormat('JSON');setDialog('export')}}><Download size={18}/>Export workout</button><button type="button" className="gym-design-action" onClick={()=>setDialog('delete')}><Trash size={18}/>Remove example</button></div>:<p className="gym-design-muted">Export and deletion open after a workout is completed or aborted.</p>}
  </>}
  {dialog&&session&&<DesignDialog titleId={title+'-dialog'} onClose={closeDialog}><h2 id={title+'-dialog'}>{dialog==='export'?'Export workout':'Remove example workout?'}</h2><p>{session.name} · {session.date} · {readable(session.state)}</p>{dialog==='export'?<><label className="gym-design-field">Format<select autoFocus value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option>JSON</option><option>CSV</option>{session.state==='COMPLETED'&&<option>OPENSET</option>}</select></label><p className="gym-design-muted">Downloads are clearly marked design examples. Original exports will use the original workout and receipt.</p></>:<label className="gym-design-field">Reason<input autoFocus value={reason} onChange={e=>setReason(e.target.value)} placeholder="Why remove this example?"/></label>}<div className="gym-design-inline"><button type="button" className="gym-design-action" onClick={closeDialog}>Cancel</button><button type="button" disabled={dialog==='delete'&&!reason.trim()} className="gym-design-action primary" onClick={()=>{if(dialog==='export'){downloadExample();return;}setRemoved(v=>[...v,session.id]);setSelected('');closeDialog();setNotice('Example removed locally. No original workout was deleted.')}}>{dialog==='export'?(format==='OPENSET'?'Review OpenSet':'Download example'):'Remove example'}</button></div></DesignDialog>}
 </section>;
}

export function TrainingSettingsMockup({onConnections}:{onConnections:()=>void}){
 const [goal,setGoal]=useState('');
 const [experience,setExperience]=useState('');
 const [days,setDays]=useState<number[]>([]);
 const [minutes,setMinutes]=useState('');
 const [equipment,setEquipment]=useState('');
 const [units,setUnits]=useState('');
 const [rest,setRest]=useState(false),[reminders,setReminders]=useState(false);
 const [zoneMethod,setZoneMethod]=useState('UNKNOWN'),[zones,setZones]=useState(['','','','','']);
 const [limitations,setLimitations]=useState('');
 const [saved,setSaved]=useState(false);
 const ready=Boolean(goal.trim()&&experience&&days.length&&units);
 return <section><h2>Training profile & preferences</h2><p className="gym-design-muted">Choose your own goals, available time and equipment. Design preview only.</p><form className="gym-design-form" onSubmit={e=>{e.preventDefault();if(ready)setSaved(true)}} onChange={()=>setSaved(false)}>
  <label>Training goal<input required value={goal} onChange={e=>setGoal(e.target.value)} placeholder="What would you like to work towards?"/></label>
  <div className="gym-design-form-grid"><label>Experience<select required value={experience} onChange={e=>setExperience(e.target.value)}><option value="">Select experience</option><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option><option value="UNKNOWN">Not specified</option></select></label><label>Minutes per session<input type="number" min="10" max="300" value={minutes} onChange={e=>setMinutes(e.target.value)} placeholder="Optional"/></label></div>
  <fieldset className="gym-design-days"><legend>Available days</legend>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label,i)=><label key={label}><input type="checkbox" checked={days.includes(i+1)} onChange={e=>setDays(v=>e.target.checked?[...v,i+1]:v.filter(d=>d!==i+1))}/>{label}</label>)}</fieldset>
  <label>Available equipment<input value={equipment} onChange={e=>setEquipment(e.target.value)} placeholder="Separate equipment with commas"/></label>
  <label>Units<select required value={units} onChange={e=>setUnits(e.target.value)}><option value="">Select units</option><option value="METRIC">Metric · kg, km</option><option value="IMPERIAL">Imperial · lb, mi</option></select></label>
  <fieldset className="gym-design-preferences"><legend>Notifications</legend><label><input type="checkbox" checked={rest} onChange={e=>setRest(e.target.checked)}/>Rest timer notifications</label><label><input type="checkbox" checked={reminders} onChange={e=>setReminders(e.target.checked)}/>Workout reminders</label></fieldset>
  <label>Zone method<select value={zoneMethod} onChange={e=>setZoneMethod(e.target.value)}><option value="UNKNOWN">Not specified</option><option value="MANUAL_HEART_RATE">Manual heart rate</option><option value="MANUAL_POWER">Manual power</option></select></label>
  <div className="gym-design-zones">{zones.map((value,i)=><label key={i}>Z{i+1}<input type="number" min="0" value={value} onChange={e=>setZones(v=>v.map((x,j)=>j===i?e.target.value:x))}/></label>)}</div>
  <label>Voluntary limitations<textarea value={limitations} onChange={e=>setLimitations(e.target.value)} placeholder="Optional. Never inferred."/></label>
  <button disabled={!ready} className="gym-design-action primary"><Check size={18}/>Save example settings</button>
  {saved&&<p role="status" className="gym-design-notice">Example settings saved in this preview only. Your original profile and device permissions were not changed.</p>}
 </form><button type="button" className="gym-design-action" onClick={onConnections}>Open wearables & consent<ArrowRight size={18}/></button></section>;
}
