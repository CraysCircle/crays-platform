import type {Entity,ProductWorld} from './productModel.ts';
import {planState,localToday} from './activityPlans.ts';
export type CommerceFilter='All'|'Bookings'|'Orders';
const historyStates=new Set(['cancelled','declined','delivered','completed','refunded']);
const needsCheck=new Set(['unknown','failed','quoted','quote-required','change-requested','cancellation-requested']);
function stamp(o:Entity){const d=String(o.date||'');if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00Z'))&&new Date(d+'T12:00Z').toISOString().slice(0,10)===d)return d;return Number.isFinite(o.createdAt)&&Number(o.createdAt)>0?new Date(Number(o.createdAt)).toISOString().slice(0,10):'';}
export function commerceActivity(w:ProductWorld,filter:CommerceFilter='All',query=''){
 if(!w.identity.signedIn)return {current:[],history:[],conflicts:[]} as {current:Entity[];history:Entity[];conflicts:string[]};
 const own=w.objects.filter(o=>o.owner===w.owner&&['order','booking','reservation'].includes(String(o.kind))),conflicts=[...new Set(own.filter(o=>own.filter(x=>x.id===o.id).length>1).map(o=>o.id))];
 const q=query.trim().toLocaleLowerCase();const records=own.filter(o=>!conflicts.includes(o.id)&&(filter==='All'||filter==='Orders'&&o.kind==='order'||filter==='Bookings'&&o.kind!=='order')&&(!q||`${o.name||''} ${w.venues.find(v=>v.id===o.venueId)?.name||''} ${o.id} ${planState(o)}`.toLocaleLowerCase().includes(q)));
 const order=(a:Entity,b:Entity)=>Number(needsCheck.has(planState(b)))-Number(needsCheck.has(planState(a)))||(stamp(a)||'9999').localeCompare(stamp(b)||'9999')||a.id.localeCompare(b.id);
 const isHistory=(o:Entity)=>historyStates.has(planState(o))||(o.kind!=='order'&&!needsCheck.has(planState(o))&&['confirmed','going'].includes(planState(o))&&!!o.date&&!!stamp(o)&&stamp(o)<localToday(Date.now(),String(o.timezone||'Europe/Berlin')));
 return {current:records.filter(o=>!isHistory(o)).sort(order),history:records.filter(isHistory).sort((a,b)=>stamp(b).localeCompare(stamp(a))||a.id.localeCompare(b.id)),conflicts};
}
export function commerceOriginalDate(o:Entity){const date=stamp(o);if(!date)return 'Date not recorded';return new Date(`${date}T12:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
