import {createContext,useContext,useId,useEffect,useState,type ReactNode} from 'react';
import {ArrowRight} from '@phosphor-icons/react';
import {ProgressPrivatePhoto} from './ProgressPrivatePhoto';
import tables from './progress-approved-tables.json';
import type {MemberProgressData,ProgressRow} from './useMemberProgress';
type Context={data:MemberProgressData;drafts:Record<string,string>;setDraft:(key:string,value:string)=>void;selected:Record<string,string>;select:(key:string,value:string)=>void;navigate:(tab:string)=>void;notice:(message:string)=>void};
export const ProgressContext=createContext<Context|null>(null);
export function useProgress(){const value=useContext(ProgressContext);if(!value)throw new Error('Missing progress owner');return value;}
const text=(value:unknown):string=>value===null||value===undefined?'Not supplied':typeof value==='string'||typeof value==='number'?String(value):typeof value==='boolean'?(value?'Yes':'No'):Array.isArray(value)?value.map(text).join(' · '):Object.entries(value as Record<string,unknown>).map(([k,v])=>k.replaceAll('_',' ')+': '+text(v)).join(' · ');
const metricUnits:Record<string,string[]>={'Body weight':['kg','lb'],'Body fat':['%'],Waist:['cm','in'],Chest:['cm','in'],Hips:['cm','in'],Thigh:['cm','in'],'Upper arm':['cm','in'],Strength:['kg','lb'],Endurance:['m','km','min'],Mobility:['score'],Attendance:['sessions'],Custom:['count','score']};
export function ProgressAction({action,primary=false}:{action:string;primary?:boolean}){
 const p=useProgress();
 const routes:Record<string,string>={'Your goals':'Goals','Create a goal':'Goals','Review sharing':'Sharing','Privacy controls':'Privacy','Record a measurement':'Measurements','Review photo sharing':'Sharing'};
 const cancel=/^(Cancel|Keep )/.test(action),review=/^(Review deletion request|Review proposed next step)$/.test(action),print=action==='Print / save PDF';
 const enabled=Boolean(routes[action])||cancel||review||print;
 function activate(event:React.MouseEvent<HTMLButtonElement>){
  if(routes[action]){p.navigate(routes[action]);return;}
  if(print){window.print();return;}
  if(review){const root=event.currentTarget.closest('[data-progress-tab]');const target=action==='Review deletion request'?root?.querySelector<HTMLElement>('.pg-section:last-child'):[...root?.querySelectorAll<HTMLElement>('.pg-section')??[]].find(node=>node.querySelector('h2')?.textContent==='Choose your next step.');target?.scrollIntoView({block:'center',behavior:'smooth'});if(target instanceof HTMLDetailsElement)target.open=true;target?.setAttribute('tabindex','-1');target?.focus({preventScroll:true});return;}
  if(cancel){const panel=event.currentTarget.closest('section,details');panel?.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[data-progress-field]').forEach(input=>p.setDraft(input.dataset.progressField!,''));if(panel instanceof HTMLDetailsElement)panel.open=false;p.notice('Your saved records have not been changed.');}
 }
 return <button type="button" className={'pg-button'+(primary?' primary':'')} disabled={!enabled} onClick={activate} title={!enabled?'Saving requires your original authorised progress connection. No change has been submitted.':undefined}>{action}<ArrowRight size={18} aria-hidden="true"/></button>;
}
export function ProgressField({fieldKey,label,kind,placeholder,options}:{fieldKey:string;label:string;kind:string;placeholder:string;options:string[]}){
 const p=useProgress(),id=useId(),value=p.drafts[fieldKey]??'';
 const [preview,setPreview]=useState<string|null>(null),[error,setError]=useState('');
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 const model=p.data.model;
 let choices=options.map(x=>({value:x,label:x})),bound=false;
 const goals=/Choose a saved goal|Current goal/.test(options.join(''));
 const trainers=options.includes('Choose an eligible trainer');
 if(goals){choices=(model?.goals??[]).map(x=>({value:String(x.goal_id),label:text(x.title)}));bound=true;}
 if(options.includes('Choose a recorded metric')){choices=[...new Set((model?.measurements??[]).map(x=>text(x.metric)))].map(x=>({value:x,label:x}));bound=true;}
 if(trainers){choices=(model?.eligibleTrainers??[]).map(x=>({value:String(x.account_id),label:text(x.display_name)}));bound=true;}
 if(fieldKey==='Goals:3'){const metric=p.drafts['Goals:1']||'Body weight';choices=(metricUnits[metric]??[]).map(x=>({value:x,label:x}));}
 if(fieldKey==='Measurements:2'||fieldKey==='Goals:10'){const selectedId=p.drafts[fieldKey==='Measurements:2'?'Measurements:0':'Goals:6'],goal=model?.goals.find(row=>row.goal_id===selectedId);choices=goal&&typeof goal.unit==='string'?[{value:goal.unit,label:goal.unit}]:[];bound=true;}
 if(options.includes('Choose your participation')){choices=(model?.challenges??[]).filter(x=>x.participation_id).map(x=>({value:String(x.participation_id),label:text(x.title)}));bound=true;}
 if(options.some(x=>/Choose supporting recorded evidence|Choose recorded challenge evidence|Saved timezone/.test(x))){choices=[];bound=true;}
 const common={id,'data-progress-field':fieldKey,name:fieldKey};
 if(kind==='select')return <select {...common} aria-label={label||placeholder||'Select an option'} value={value} disabled={bound&&!choices.length} onChange={e=>{p.setDraft(fieldKey,e.target.value);if(fieldKey==='Goals:1')p.setDraft('Goals:3','');if(fieldKey==='Measurements:0'){const goal=model?.goals.find(row=>row.goal_id===e.target.value);p.setDraft('Measurements:2',typeof goal?.unit==='string'?goal.unit:'');}if(fieldKey==='Goals:6'){const goal=model?.goals.find(row=>row.goal_id===e.target.value);for(const[key,column]of Object.entries({'Goals:7':'title','Goals:8':'description','Goals:9':'target_value','Goals:10':'unit','Goals:11':'target_date'}))p.setDraft(key,goal?.[column]===null||goal?.[column]===undefined?'':String(goal[column]));}}}><option value="">{options[0]||'Choose an option'}</option>{choices.filter(x=>!x.label.startsWith('Choose ')&&!x.label.startsWith('Unit ')).map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>;
 if(kind==='textarea')return <textarea {...common} value={value} placeholder={placeholder} onChange={e=>p.setDraft(fieldKey,e.target.value)}/>;
 if(kind==='file')return <><input {...common} aria-label={label||'Choose a private progress photo'} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{setPreview(null);setError('');const f=e.target.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024){setError('Choose a JPEG, PNG or WebP photo up to 5 MB.');e.target.value='';return;}setPreview(URL.createObjectURL(f));}}/>{error&&<p role="alert">{error}</p>}{preview&&<><img className="pg-local-photo" src={preview} alt="Private photo selected on this device; not uploaded"/><p className="pg-note">Selected on this device. Not uploaded or shared.</p></>}</>;
 return <input {...common} type={kind==='input'?'text':kind} step={kind==='number'?'any':undefined} value={kind==='checkbox'?undefined:value} checked={kind==='checkbox'?value==='true':undefined} placeholder={placeholder} onChange={e=>p.setDraft(fieldKey,kind==='checkbox'?String(e.target.checked):e.target.value)}/>;
}
type TableMap={rows:ProgressRow[];columns:string[];key:string};
export function ProgressTable({tableKey}:{tableKey:string}){
 const p=useProgress(),m=p.data.model,t=tables[tableKey as keyof typeof tables];
 const maps:Record<string,TableMap>={
 'Overview:0':{rows:m?.measurements??[],columns:['measured_at','metric','value','unit','source'],key:'measurement_id'},
 'Overview:1':{rows:m?.holistic.privateMilestones??[],columns:['title','event_kind','opted_out'],key:'milestone_id'},
 'Overview:2':{rows:m?.holistic.activityBaselineProposals??[],columns:['metric','@window','proposed_value','sample_size'],key:'proposal_id'},
 'Overview:3':{rows:m?.holistic.privatePatterns??[],columns:['statement','@window','coverage','limitations'],key:'pattern_id'},
 'Goals:0':{rows:m?.goals??[],columns:['title','target_value','target_date','state','@select'],key:'goal_id'},
 'Habits:0':{rows:m?.holistic.tasks??[],columns:['title','schedule','@event','state','@select'],key:'task_id'},
 'Measurements:0':{rows:m?.measurements??[],columns:['measured_at','metric','value','unit','source','@select'],key:'measurement_id'},
 'Gallery:0':{rows:m?.media??[],columns:['file_name','captured_at','retention_until','@private','state'],key:'media_id'},
 'Weekly review:0':{rows:m?.holistic.reportPreviews??[],columns:['@window','selected_domains','recorded_at','@reviewDecision'],key:'preview_id'},
 'Challenges:0':{rows:m?.challenges??[],columns:['title','target','starts_at','participation_state'],key:'challenge_version_id'},
 'Challenges:1':{rows:(m?.challenges??[]).filter(x=>x.challenge_version_id===p.selected['Challenges:0']),columns:['progress','target','visibility','participation_state','reward_label'],key:'challenge_version_id'},
 'Challenges:2':{rows:m?.challengeAuthority.evidence??[],columns:['occurred_at','evidence_kind','increment','event_kind'],key:'evidence_id'},
 'Challenges:3':{rows:m?.challengeAuthority.recalculations??[],columns:['recorded_at','previous_progress','recalculated_progress','trigger_kind'],key:'recalculation_id'},
 'Challenges:4':{rows:m?.challengeAuthority.appeals??[],columns:['challenge_version_id','recorded_at','disputed_progress','state'],key:'appeal_id'},
 'Sharing:0':{rows:(m?.eligibleTrainers??[]).filter(x=>x.account_id===p.drafts['Sharing:0']),columns:['qualification_title','issuing_body','valid_until'],key:'account_id'},
 'Sharing:1':{rows:m?.sharing??[],columns:['recipient_account_ids','purpose','scope','expires_at','state','@select'],key:'decision_id'},
 'Privacy:0':{rows:m?.privacyRequests??[],columns:['request_id','right_kind','requested_at','due_at','state','@download'],key:'request_id'}
 };
 const source=maps[tableKey];let records=source?.rows??[];
 if(tableKey==='Goals:0'&&p.drafts['Goals:5']&&p.drafts['Goals:5']!=='All goals')records=records.filter(x=>x.state===({Active:'active',Achieved:'achieved',Paused:'paused',Ended:'cancelled'} as Record<string,string>)[p.drafts['Goals:5']]);
 if(tableKey==='Challenges:0'&&p.drafts['Challenges:0']&&p.drafts['Challenges:0']!=='All challenges'){const state=({'Not joined':null,Joined:'joined','In progress':'in-progress',Completed:'completed',Withdrawn:'withdrawn'} as Record<string,string|null>)[p.drafts['Challenges:0']];records=records.filter(row=>row.participation_state===state);}
 if(tableKey==='Overview:0'){const goal=m?.goals.find(x=>x.goal_id===p.drafts['Overview:0']);records=goal?records.filter(x=>x.goal_id===goal.goal_id&&x.metric===(p.drafts['Overview:1']||goal.metric)&&x.unit===goal.unit):[];}
 if(['Challenges:2','Challenges:3','Challenges:4'].includes(tableKey)){const challenge=m?.challenges.find(row=>String(row.challenge_version_id)===p.selected['Challenges:0']);records=challenge?records.filter(row=>row.challenge_version_id===challenge.challenge_version_id&&row.participation_id===challenge.participation_id):[];}
 const selected=records.find(x=>String(x[source.key])===p.selected[tableKey]);
 return <><table><thead><tr>{t.headers.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{!records.length?<tr><td colSpan={t.headers.length}>{m?(tableKey==='Challenges:1'?'Select a challenge to review its details.':'No matching records returned.'):'Your original records are not loaded.'}</td></tr>:records.map((r,index)=><tr key={String(r[source.key]??index)}>{source.columns.map((key,i)=><td key={key}>{key==='@select'?<button type="button" className="pg-button" onClick={()=>p.select(tableKey,String(r[source.key]))}>Review</button>:key==='@private'?'Private by default':key==='@event'?text(m?.holistic.taskEvents.find(x=>x.task_id===r.task_id)?.action):key==='@window'?text(r.window_start)+' — '+text(r.window_end):key==='@reviewDecision'?text(m?.holistic.weeklyReviewDecisions.find(x=>x.weekly_review_id===r.preview_id)?.action):key==='@download'?typeof r.downloadPath==='string'&&r.state==='ready'&&/^\/api\/crays\/member\/fitness\/progress\/export\?requestId=[a-zA-Z0-9-]+$/.test(r.downloadPath)?<a href={r.downloadPath}>Download ready export</a>:'Not ready':<>{text(r[key])}{tableKey==='Goals:0'&&i===1&&<> {text(r.unit)} · {text(r.metric)}</>}{tableKey==='Challenges:0'&&i===2&&<> — {text(r.ends_at)}</>}{i===0&&<button type="button" className="pg-button" onClick={()=>p.select(tableKey,String(r[source.key]))} aria-label={'Review '+text(r[key])}>Details</button>}</>}</td>)}</tr>)}</tbody></table>{selected&&<details className="pg-record-detail" open><summary>Selected original record</summary><dl>{Object.entries(selected).filter(([key])=>!['tenant_id','member_id','actor_account_id','mediaUrl','downloadPath'].includes(key)).map(([key,value])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{text(value)}</dd></div>)}</dl>{tableKey==='Gallery:0'&&<ProgressPrivatePhoto key={String(selected.media_id)} record={selected}/>}</details>}</>;
}
export function ProgressReadStatus({data}:{data:MemberProgressData}){const messages:Record<string,string>={access:'Your original progress records require your existing CRAYS account and Gym permissions.',loading:'Loading your original progress records…',permission:'Your current Gym permissions do not allow these progress records.',session:'Check your existing CRAYS session to continue.',unavailable:'Your progress records could not be loaded. No saved information has been changed.'};return data.phase==='ready'?null:<div className="pg-read-status" role={data.phase==='unavailable'?'alert':'status'}><p>{messages[data.phase]}</p><div className="pg-actions"><button type="button" className="pg-button" onClick={data.reload}>Reload original records<ArrowRight size={18}/></button></div></div>;}
export function ProgressProvider({value,children}:{value:Context;children:ReactNode}){return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;}
