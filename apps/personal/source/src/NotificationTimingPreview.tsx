import {useState} from 'react';
import {Bell,Clock,Check,CaretRight} from '@phosphor-icons/react';
import './chuck-preference-cards.css';
export type NotificationTimingChoice={quiet:'Off'|'22:00–08:00'|'21:00–09:00';urgent:'Hold'|'Allow reviewed urgent updates'};
export const notificationTimingKey=(category:string)=>`notifications:timing:${category}`;
export function readNotificationTiming(value:unknown):NotificationTimingChoice{try{const x=JSON.parse(String(value));if(['Off','22:00–08:00','21:00–09:00'].includes(x.quiet)&&['Hold','Allow reviewed urgent updates'].includes(x.urgent))return {quiet:x.quiet,urgent:x.urgent};}catch{}return {quiet:'Off',urgent:'Hold'};}
/** Local presentation of the saved category preference, never a delivery scheduler. */
export function NotificationTimingPreview({category,delivery,savedValue,disabled=false,onSave}:{category:string;delivery:string;savedValue:unknown;disabled?:boolean;onSave:(key:string,value:string)=>boolean}){
 const saved=readNotificationTiming(savedValue),[draft,setDraft]=useState(saved),[scenario,setScenario]=useState<'Quiet hours'|'Daytime'>('Quiet hours'),[reviewed,setReviewed]=useState(false),[message,setMessage]=useState('');
 const change=(patch:Partial<NotificationTimingChoice>)=>{setDraft({...draft,...patch});setReviewed(false);setMessage('');};
 const current=JSON.stringify(draft)===JSON.stringify(saved),quiet=scenario==='Quiet hours'&&draft.quiet!=='Off';
 const ordinary=delivery==='Muted'?'Kept in your notification list':quiet?'Held until quiet hours end':delivery==='Batched'?'Included in the next digest':'Shown in-app';
 const urgent=delivery==='Muted'?'Kept in your notification list':quiet&&draft.urgent==='Hold'?'Held until quiet hours end':quiet?'Shown only for an update explicitly marked urgent':delivery==='Batched'?'Included in the next digest':'Shown in-app';
 return <section className="chuck-preference-card" aria-label={`${category} timing and delivery example`}>
  <div className="chuck-preference-heading"><Clock size={23}/><div><h2>Your quiet hours</h2><small>{category} · {delivery}</small></div></div>
  <label>Quiet hours<select aria-label="Quiet hours" value={draft.quiet} disabled={disabled} onChange={e=>change({quiet:e.target.value as NotificationTimingChoice['quiet']})}>{['Off','22:00–08:00','21:00–09:00'].map(v=><option key={v}>{v}</option>)}</select></label>
  <label>During quiet hours<select aria-label="During quiet hours" value={draft.urgent} disabled={disabled} onChange={e=>change({urgent:e.target.value as NotificationTimingChoice['urgent']})}><option>Hold</option><option>Allow reviewed urgent updates</option></select></label>
  <div className="chuck-preference-scenarios" aria-label="Delivery example time">{(['Quiet hours','Daytime'] as const).map(v=><button key={v} type="button" aria-pressed={scenario===v} onClick={()=>setScenario(v)}>{v}</button>)}</div>
  <div className="chuck-preference-example"><span className="eyebrow">DELIVERY EXAMPLE</span><div><Bell size={18}/><span><strong>Ordinary update</strong><small>{ordinary}</small></span></div><div><Bell size={18}/><span><strong>Explicitly urgent update</strong><small>{urgent}</small></span></div></div>
  <label className="chuck-preference-check"><input type="checkbox" disabled={disabled} checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Use these timing preferences for {category.toLowerCase()} updates</label>
  <button type="button" className="secondary" disabled={disabled||!reviewed} onClick={()=>{const result=onSave(notificationTimingKey(category),JSON.stringify(draft));if(result){setReviewed(false);setMessage('Timing preference saved for this category.');}}}><Check size={19}/>Save timing preference</button>
  {message&&<p role="status">{message}</p>}
  <details><summary>About this example <CaretRight size={16}/></summary><p>Times use your device’s local time. {current?'This is your saved timing choice.':'Review this draft before saving.'} The example does not schedule push delivery or infer urgency from private messages. Your original updates remain available in-app.</p></details>
 </section>;
}
