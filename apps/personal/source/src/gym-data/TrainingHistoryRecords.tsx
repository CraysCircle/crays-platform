import {useId,useState} from 'react';
import {ArrowLeft,ArrowRight} from '@phosphor-icons/react';
import type {GymAccess} from './client/gym-access';
import {useTrainingData} from './useTrainingData';
import {TrainingWorkoutSession} from './TrainingWorkoutSession';
import type {GymHistoryContext} from '../gym-design/GymPrototype';

type Filters={state:NonNullable<GymHistoryContext['state']>|'';from:string;to:string};
const blank:Filters={state:'',from:'',to:''};
const readable=(value:string)=>value.toLowerCase().replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const validDate=(s:string)=>!s||/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
/** Existing approved history composition with original sessions only. No
 * example fallback, guessed duration, export or delete command is provided. */
export function TrainingHistoryRecords({active,access,onAccessInvalidated,onRetry,context={},onContextChange}:{context?:GymHistoryContext;onContextChange:(next:GymHistoryContext)=>void;active:boolean;access:GymAccess|null;onAccessInvalidated:()=>void;onRetry:()=>void}){
 const title=useId(),ownerKey=access?.kind==='ready'?access.ownerKey:'';
 const applied:Filters={state:context.state??'',from:context.from??'',to:context.to??''},filterKey=JSON.stringify(applied),selected=context.sessionId??'';
 const [held,setHeld]=useState<{ownerKey:string;filterKey:string;draft:Filters}>({ownerKey:'',filterKey:'',draft:blank});
 const state=held.ownerKey===ownerKey&&held.filterKey===filterKey?held:{ownerKey,filterKey,draft:applied};
 const update=(patch:Partial<typeof held>)=>setHeld({...state,...patch,ownerKey,filterKey});
 const apply=(filters:Filters)=>{update({draft:filters});onContextChange({state:filters.state||undefined,from:filters.from||undefined,to:filters.to||undefined});};
 const query=new URLSearchParams({take:'100'});for(const k of ['state','from','to'] as const)if(applied[k])query.set(k,applied[k]);
 const data=useTrainingData(active&&!selected,access,{domain:'sessions',query:query.toString()},onAccessInvalidated);
 const sessions=data.view?.domain==='sessions'?data.view.model.sessions:null;
 const invalid=!validDate(state.draft.from)||!validDate(state.draft.to)||Boolean(state.draft.from&&state.draft.to&&state.draft.from>state.draft.to);
 const error=data.error==='PERMISSION'?'Your current permissions do not allow these workouts.':data.error==='SESSION'?'Your current CRAYS session must be checked.':data.error==='INVALID'?'Check the selected filters.':'Training records could not be loaded.';
 return <section aria-labelledby={selected?undefined:title} aria-label={selected?'Workout details':undefined} className="training-selected-section training-selected-history" data-original-training-history>
  <div className="gym-design-section-heading"><div hidden={Boolean(selected)}><h2 id={title}>Workout history</h2><p className="gym-design-muted">{selected?'Your original workout and measured sets.':'Your recorded sessions. Dates retain each session’s timezone.'}</p></div>{selected&&<button type="button" className="gym-design-action" onClick={()=>onContextChange({...context,sessionId:undefined})}><ArrowLeft size={18}/>Back to history</button>}</div>
  {!selected&&data.phase==='loading'&&<p role="status">Loading training records…</p>}
  {!selected&&data.phase==='access'&&<p role="status">{access?.kind==='denied'?'Workout access is not available for this account.':access?.kind==='signed_out'?'Sign in through the existing CRAYS account to review your workouts.':'Checking your current Gym access…'} <button type="button" className="gym-design-action" onClick={onRetry}>Check access</button></p>}
  {!selected&&data.phase==='error'&&<p role="alert">{error} <button type="button" className="gym-design-action" onClick={onRetry}>Reload records</button></p>}
  {!selected?<>
   <div className="gym-design-summary" aria-label="Loaded original sessions"><div><span>Loaded sessions</span><strong>{sessions?.length??'—'}</strong></div><div><span>Completed</span><strong>{sessions?sessions.filter(s=>s.state==='COMPLETED').length:'—'}</strong></div><div><span>In progress</span><strong>{sessions?sessions.filter(s=>s.state==='ACTIVE'||s.state==='PAUSED').length:'—'}</strong></div></div>
   <form className="gym-design-filter-form" onSubmit={e=>{e.preventDefault();if(!invalid)apply({...state.draft})}}><label>State<select value={state.draft.state} onChange={e=>update({draft:{...state.draft,state:e.target.value as Filters['state']}})}><option value="">All</option>{['ACTIVE','PAUSED','COMPLETED','ABORTED'].map(s=><option key={s} value={s}>{readable(s)}</option>)}</select></label><label>From<input type="date" value={state.draft.from} onChange={e=>update({draft:{...state.draft,from:e.target.value}})}/></label><label>To<input type="date" min={state.draft.from} value={state.draft.to} onChange={e=>update({draft:{...state.draft,to:e.target.value}})}/></label><div className="training-selected-actions" style={{gridColumn:'1/-1'}}><button className="gym-design-action" type="submit" disabled={invalid}>Apply filters<ArrowRight size={18}/></button><button className="gym-design-action" type="button" onClick={()=>apply(blank)}>Clear filters<ArrowRight size={18}/></button></div></form>
   {JSON.stringify(state.draft)!==JSON.stringify(applied)&&<p role="status">Apply filters to update the loaded sessions.</p>}
   {invalid&&<p role="alert">Choose valid dates with the end on or after the start.</p>}
   {sessions?.map(session=><button key={session.sessionId} type="button" className="gym-design-row" data-session-id={session.sessionId} onClick={()=>onContextChange({...context,sessionId:session.sessionId})}><span><strong>{session.sourceKind==='FREE'?'Free workout':session.sourceKind==='PLAN'?'Planned workout':'Template workout'}</strong><small>{new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:session.timezone}).format(new Date(session.startedAt))} · {session.timezone} · {readable(session.state)}</small></span><ArrowRight size={19}/></button>)}
   {sessions&&sessions.length===0&&<div className="gym-design-panel"><h3>No matching sessions.</h3><p>No original sessions were returned for the applied filters.</p></div>}
   {sessions&&sessions.length>=100&&<p className="gym-design-muted">Showing the returned page of up to 100 sessions. Narrow the dates or state to review other records; this count is not your complete workout total.</p>}
  </>:<TrainingWorkoutSession key={ownerKey+':'+selected} sessionId={selected} access={access} onAccessInvalidated={onAccessInvalidated}/>}
 </section>;
}
