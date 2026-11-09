import {useEffect,useId,useMemo,useState,type ReactNode,type FormEvent} from 'react';
import {useHomeCommands} from './useHomeCommands';
import type {TrainingDetail,TrainingSessions} from './client/training-api';
import type {PlanningResponse} from './client/planning-api';
import {ArrowRight} from '@phosphor-icons/react';
import {useTrainingData} from './useTrainingData';
import {usePlanningData} from './usePlanningData';
import type {GymAccess} from './client/gym-access';

const label=(value:string)=>value.toLowerCase().replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
function dateInZone(timezone:string){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(type=>parts.find(item=>item.type===type)?.value).join('-');}
function after(date:string,days:number){const value=new Date(date+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);}
/** Home reads retain separate original responses. No local workout/check-in,
 * guessed timezone, synthetic plan, inferred measurement or command authority. */
export function useOriginalTrainingHome(active:boolean,access:GymAccess|null,onInvalidated:()=>void){
 const profile=useTrainingData(active,access,{domain:'profile'},onInvalidated);
 const saved=profile.view?.domain==='profile'?profile.view.model.profile:null;
 const owner=active&&access?.kind==='ready'?access.ownerKey:'';
 const today=useMemo(()=>saved?dateInZone(saved.timezone):null,[saved?.timezone,owner]);
 const params=new URLSearchParams(today?{from:today,to:after(today,21)}:{});
 const current=useTrainingData(active,access,{domain:'sessions',query:'state=ACTIVE&take=100'},onInvalidated);
 const paused=useTrainingData(active,access,{domain:'sessions',query:'state=PAUSED&take=100'},onInvalidated);
 const programs=usePlanningData(active,access,'programs',new URLSearchParams(),onInvalidated);
 const templates=usePlanningData(active,access,'templates',new URLSearchParams(),onInvalidated);
 const calendar=usePlanningData(active&&Boolean(today),access,'calendar',params,onInvalidated);
 const readiness=usePlanningData(active,access,'readiness',new URLSearchParams(),onInvalidated);
 const [held,setHeld]=useState<{owner:string;session:TrainingDetail|null;sessions:TrainingSessions[]|null;readiness:PlanningResponse<'readiness'>|null}|null>(null);
 const commands=useHomeCommands(active?access:null,onInvalidated,readback=>setHeld(previous=>{const saved=previous?.owner===owner?previous:{owner,session:null,sessions:null,readiness:null};return readback.kind==='sessions'?{...saved,session:null,sessions:readback.models}:readback.kind==='session'?{...saved,session:readback.detail}:{...saved,readiness:readback.model};}));
 useEffect(()=>{setHeld(null);},[active,owner]);
 const savedSessionLists=held?.owner===owner?held.sessions:null;
 const savedSession=held?.owner===owner?held.session:null,savedReadiness=held?.owner===owner?held.readiness:null;
 return {access,profile,current,paused,programs,templates,calendar,readiness,today,to:today?after(today,21):null,commands,savedSession,savedReadiness,savedSessionLists,reset:()=>setHeld(null)};
}
type Data=ReturnType<typeof useOriginalTrainingHome>;
function Action({children,onClick,disabled=false,primary=false,type='button'}:{children:ReactNode;onClick?:()=>void;disabled?:boolean;primary?:boolean;type?:'button'|'submit'}){return <button type={type} className={'gym-design-action'+(primary?' primary':'')} onClick={onClick} disabled={disabled}>{children}<ArrowRight size={18}/></button>}
function Status({state,access,onRetry}:{state:{phase:string;error:string|null};access:GymAccess|null;onRetry:()=>void}){
 const message=state.phase==='error'?state.error==='PERMISSION'?'These records are not available with your current permissions.':state.error==='SESSION'?'Your CRAYS session needs to be checked.':'These saved training records could not be loaded.':state.phase==='access'?access?.kind==='signed_out'?'Sign in through your existing CRAYS account.':access?.kind==='denied'?'These records are not available with your current Gym access.':'Checking your Gym access…':state.phase==='loading'?'Loading your saved training records…':null;
 return message?<p role={state.phase==='error'?'alert':'status'}>{message}{state.phase==='error'&&<Action onClick={onRetry}>Reload records</Action>}</p>:null;
}
function Values({rows}:{rows:[string,ReactNode][]}){return <dl style={{display:'grid',gridTemplateColumns:'1fr',gap:12,minWidth:0}}>{rows.map(([name,value],index)=><div key={index} style={{display:'flex',flexWrap:'wrap',gap:8,minWidth:0}}><dt>{name}</dt><dd style={{margin:0,minWidth:0,overflowWrap:'anywhere'}}>{value}</dd></div>)}</dl>}
export function TrainingHomeRecords({data,section,onRetry,onSession,onHistory}:{data:Data;section:'workouts'|'programmes'|'next'|'readiness'|'upcoming'|'profile';onRetry:()=>void;onSession:(id:string)=>void;onHistory?:()=>void}){
 const wrap={minWidth:0,overflowWrap:'anywhere' as const};
 const templates=data.templates.view?.domain==='templates'?data.templates.view.model.templates:[];
 const events=data.calendar.view?.domain==='calendar'?data.calendar.view.model.events:null;
 // Only exact template ID + version may supply a scheduled workout's name.
 const title=(event:NonNullable<typeof events>[number])=>templates.find(template=>template.templateId===event.templateId&&String(template.templateVersion)===String(event.templateVersion))?.name??'Scheduled workout';
 const upcoming=events?.filter(event=>event.state==='PLANNED'&&data.today&&event.localDate>=data.today).map((event,index)=>({event,index})).sort((a,b)=>a.event.localDate.localeCompare(b.event.localDate)||a.index-b.index).map(item=>item.event)??[];
 if(section==='workouts'){
  const reads=[data.current,data.paused],rows=data.savedSessionLists?data.savedSessionLists.flatMap(model=>model.sessions):reads.flatMap(read=>read.view?.domain==='sessions'?read.view.model.sessions:[]);
  const saved=data.savedSession?.session??null;
  const sessions=saved?[saved,...rows.filter(row=>row.sessionId!==saved.sessionId)]:rows;
  const active=sessions.filter(row=>row.state==='ACTIVE'||row.state==='PAUSED');
  const loaded=reads.every(read=>read.view?.domain==='sessions');
  const timezone=data.profile.view?.domain==='profile'?data.profile.view.model.profile?.timezone:null;
  return <div id="gym-training-home-workouts" tabIndex={-1} style={wrap} data-original-training-home="workouts">
   {reads.map((read,index)=><Status key={index} state={read} access={data.access} onRetry={onRetry}/>)}
   <HomeCommandStatus data={data} scope="workouts"/>
   {active.map((session,index)=><section className="training-selected-review" key={session.sessionId} data-home-session-id={session.sessionId}>
    <h3>{session.sourceKind==='FREE'?'Free workout':templates.find(row=>row.templateId===session.sourceId&&String(row.templateVersion)===String(session.sourceVersion))?.name??'Your workout'}</h3>
    <p>{label(session.state)} · {new Intl.DateTimeFormat('en-GB',{timeZone:session.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(session.startedAt))}</p>
    {session.notes&&<p>{session.notes}</p>}
    <div className="training-selected-actions"><Action primary onClick={()=>onSession(session.sessionId)}>Open workout</Action>{index===0&&onHistory&&<Action onClick={onHistory}>View history</Action>}</div>
   </section>)}
   {loaded&&!active.length&&<><p>You have no open workout. Start freely and add exercises as you go.</p><div className="training-selected-actions"><button id="gym-start-free-workout" type="button" className="gym-design-action primary" disabled={data.commands.disabled||!timezone} onClick={()=>{if(!timezone)return;void data.commands.run((commands,owner)=>commands.startFreeWorkout(owner,{idempotencyKey:crypto.randomUUID(),timezone,readinessSnapshotId:null,notes:''}),'workouts');}}>Start free workout<ArrowRight size={18}/></button>{onHistory&&<Action onClick={onHistory}>View history</Action>}</div></>}
   {!timezone&&data.profile.phase==='ready'&&<p>Save your training timezone in Settings before starting a workout.</p>}
  </div>;
 }
 if(section==='programmes'){
  const model=data.programs.view?.domain==='programs'?data.programs.view.model:null;
  return <div style={wrap} data-original-training-home="programmes"><Status state={data.programs} access={data.access} onRetry={onRetry}/>{model?.programs.map(program=><div className="training-selected-review" key={program.programId}><h3>{program.name}</h3><p>{label(program.lifecycleState)}{program.weeks?` · ${program.weeks} weeks`:null}</p><p>{program.goal}</p></div>)}{model&&!model.programs.length&&<p>No saved programmes were returned.</p>}</div>;
 }
 if(section==='next'||section==='upcoming')return <div style={wrap} data-original-training-home={section}><Status state={data.profile} access={data.access} onRetry={onRetry}/>{!data.today?<p>Your saved training timezone is not available. No schedule range has been inferred.</p>:<><Status state={data.calendar} access={data.access} onRetry={onRetry}/><Status state={data.templates} access={data.access} onRetry={onRetry}/><p>{data.today} – {data.to} · {data.profile.view?.domain==='profile'?data.profile.view.model.profile?.timezone:null}</p>{(section==='next'?upcoming.slice(0,1):upcoming).map(event=><section className="training-selected-review" key={event.eventId} data-home-event-id={event.eventId}><h3>{title(event)}</h3><p>{event.localDate} · {event.localTime??'Time not supplied'} · {event.timezone}</p><p>{label(event.state)}</p></section>)}{events&&!upcoming.length&&<p>No workouts planned for this period.</p>}</>}</div>;
 if(section==='readiness')return <ReadinessActions key={data.access?.kind==='ready'?data.access.ownerKey:'signed-out'} data={data} onRetry={onRetry}/>;
 const model=data.profile.view?.domain==='profile'?data.profile.view.model:null,profile=model?.profile;
 return <div style={wrap} data-original-training-home="profile"><Status state={data.profile} access={data.access} onRetry={onRetry}/>{profile?<Values rows={[["Goals",profile.goals.join(', ')||'Not supplied'],["Experience",label(profile.experience)],["Available days",profile.availableDays.map(day=>['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][day-1]).join(', ')||'Not supplied'],["Minutes per session",profile.minutesPerSession??'Not supplied'],["Equipment",profile.equipment.join(', ')||'Not supplied'],["Units",label(profile.units)],["Timezone",profile.timezone]]}/>:model?<p>No saved training profile was returned.</p>:null}</div>;
}

export function HomeCommandStatus({data,scope}:{data:Data;scope:'workouts'|'readiness'}){
 if(data.commands.scope!==scope)return null;
 return <>{data.commands.message&&<p role={data.commands.locked?'alert':'status'}>{data.commands.message}</p>}{data.commands.locked&&<Action onClick={()=>void data.commands.reload()}>Check saved records</Action>}</>;
}
function ReadinessActions({data,onRetry}:{data:Data;onRetry:()=>void}){
 const id=useId();const [values,setValues]=useState({sleepFeeling:'',stress:'',painOrDiscomfort:'',motivation:''});
 const original=data.readiness.view?.domain==='readiness'?data.readiness.view.model:null;
 const model=data.savedReadiness??original;
 const latest=model?.reports.find(row=>row.state==='ACTIVE');
 const timezone=data.profile.view?.domain==='profile'?data.profile.view.model.profile?.timezone:null;
 const disabled=data.commands.disabled||!data.today||!timezone;
 async function submit(event:FormEvent){event.preventDefault();if(disabled)return;const score=(value:string)=>value?Number(value):null;const result=await data.commands.run((commands,owner)=>commands.saveReadiness(owner,{localDate:data.today,timezone,sleepFeeling:score(values.sleepFeeling),stress:score(values.stress),painOrDiscomfort:score(values.painOrDiscomfort),motivation:score(values.motivation),voluntaryNotes:''}),'readiness');if(result?.state==='CONFIRMED')setValues({sleepFeeling:'',stress:'',painOrDiscomfort:'',motivation:''});}
 return <div data-original-training-home="readiness">
  <Status state={data.readiness} access={data.access} onRetry={onRetry}/>
  <form onSubmit={event=>void submit(event)}>
   <div className="training-selected-fields">{([['sleepFeeling','Sleep feeling'],['stress','Stress'],['painOrDiscomfort','Discomfort'],['motivation','Motivation']]as const).map(([key,title])=><label key={key} htmlFor={id+key}>{title}<select id={id+key} value={values[key]} disabled={disabled} onChange={event=>setValues(current=>({...current,[key]:event.target.value}))}><option value="">Not specified</option>{[1,2,3,4,5].map(score=><option key={score} value={score}>{score}</option>)}</select></label>)}</div>
   <div className="training-selected-actions"><Action primary type="submit" disabled={disabled||!Object.values(values).some(Boolean)}>Save check-in</Action>{latest&&<Action disabled={data.commands.disabled} onClick={()=>void data.commands.run((commands,owner)=>commands.withdrawReadiness(owner,latest.readinessId),'readiness')}>Withdraw latest check-in</Action>}</div>
  </form>
  <HomeCommandStatus data={data} scope="readiness"/>
  {latest&&<section className="training-selected-review"><h3>Your latest check-in</h3><p>{latest.localDate} · {latest.timezone}</p><Values rows={[["Sleep feeling",latest.sleepFeeling??'Not specified'],["Stress",latest.stress??'Not specified'],["Discomfort",latest.painOrDiscomfort??'Not specified'],["Motivation",latest.motivation??'Not specified']]}/>{latest.voluntaryNotes&&<p>{latest.voluntaryNotes}</p>}</section>}
  {model&&!latest&&<p>No active voluntary check-in.</p>}
  <p className="training-selected-note">Optional self-report. Missing answers stay unspecified. Not diagnostic and never filled from wearable data. Your plan and recorded sets stay unchanged.</p>
 </div>;
}
