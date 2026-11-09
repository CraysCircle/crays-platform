import type {ActionContext,ProductWorld,Entity} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';
import {reminderTime} from './reminders.ts';
import {habitsFor,habitDateSource,habitDateSourceCurrent,habitToday,type HabitDateSource} from './personalHabits.ts';
import {checklistsFor,checklistItemSource,checklistSourceCurrent,type ChecklistItemSource} from './personalChecklists.ts';
export type AgendaSource={id:string;kind:string;name:string;status:string;version:string;date:string;time:string;timezone:string;checklist?:Readonly<ChecklistItemSource>;estimateMinutes?:string;deadline?:string;habit?:Readonly<HabitDateSource>;preferredTime?:string};
export type AgendaEntry={id:string;name:string;kind:'task'|'appointment'|'break';time:string;minutes:string;note:string;done:boolean;source?:AgendaSource};
export type DayAgenda=Entity&{kind:'day-agenda';date:string;timezone:string;goal:string;entries:AgendaEntry[];version:number;sourceTaskId:string;status:'saved';reviewSnapshot:string;origin:'manual-plan';realExecution:false};
const need=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
export function agendaSources(w:ProductWorld):AgendaSource[]{
 if(!w.identity.signedIn)return [];
 const originals=w.objects.filter(o=>o.owner===w.owner&&['booking','agent-task'].includes(String(o.kind))&&!['cancelled','stopped','failed','declined','deleted'].includes(String(o.status))).map(o=>({id:o.id,kind:String(o.kind),name:String(o.name||'Your own item'),status:String(o.status||'unknown'),version:String(o.version||0),date:String(o.date||''),time:String(o.time||''),timezone:String(o.timezone||'')}));
 const checklistSources:AgendaSource[]=[];for(const list of checklistsFor(w))for(const item of list.items){try{const source=checklistItemSource(w,list.id,item.id);if(checklistSourceCurrent(w,source).ready)checklistSources.push(checklistAgendaSource(source));}catch{}}const habitSources:AgendaSource[]=[];for(const habit of habitsFor(w))try{const source=habitDateSource(w,habit.id,habitToday(habit.timezone));if(habitDateSourceCurrent(w,source).ready)habitSources.push(habitAgendaSource(source));}catch{}return [...originals,...checklistSources,...habitSources];
}
export const checklistAgendaSourceId=(listId:string,itemId:string)=>`checklist-item:${encodeURIComponent(listId)}:${encodeURIComponent(itemId)}`;
function checklistAgendaSource(source:Readonly<ChecklistItemSource>):AgendaSource{return {id:checklistAgendaSourceId(source.listId,source.itemId),kind:'checklist-item',name:source.name,status:'open',version:source.fingerprint,date:'',time:'',timezone:'',checklist:source,estimateMinutes:source.estimateMinutes,deadline:source.dueDate};}
export const habitAgendaSourceId=(habitId:string,date:string)=>`habit-date:${encodeURIComponent(habitId)}:${encodeURIComponent(date)}`;
export function parseHabitAgendaSourceId(id:string):{habitId:string;date:string}|undefined{const match=/^habit-date:([^:]+):([^:]+)$/.exec(id);if(!match)return;try{const habitId=decodeURIComponent(match[1]),date=decodeURIComponent(match[2]);if(habitId&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&habitAgendaSourceId(habitId,date)===id)return {habitId,date};}catch{}}
function habitAgendaSource(source:Readonly<HabitDateSource>):AgendaSource{return {id:habitAgendaSourceId(source.habitId,source.date),kind:'habit-date',name:source.name,status:'open',version:source.fingerprint,date:source.date,time:'',timezone:source.timezone,habit:source,estimateMinutes:source.estimateMinutes,preferredTime:source.time};}
export function agendaSourceFor(w:ProductWorld,id:string){if(id.startsWith('habit-date:')){if(!w.identity.signedIn)return;const parsed=parseHabitAgendaSourceId(id);if(!parsed)return;try{const source=habitDateSource(w,parsed.habitId,parsed.date);return habitDateSourceCurrent(w,source).ready?habitAgendaSource(source):undefined;}catch{return;}}return agendaSources(w).find(source=>source.id===id);}
export function agendaSourceCurrent(w:ProductWorld,source:AgendaSource){
 if(source.kind==='habit-date'){
  if(!source.habit||source.id!==habitAgendaSourceId(source.habit.habitId,source.habit.date)||JSON.stringify(source)!==JSON.stringify(habitAgendaSource(source.habit)))return {ready:false,status:'source-changed',message:'Review this exact original routine and date reference.'};
  return habitDateSourceCurrent(w,source.habit);
 }
 if(source.kind==='checklist-item'){
  if(!source.checklist||source.id!==checklistAgendaSourceId(source.checklist.listId,source.checklist.itemId)||JSON.stringify(source)!==JSON.stringify(checklistAgendaSource(source.checklist)))return {ready:false,status:'source-changed',message:'Review this exact original checklist item reference.'};
  return checklistSourceCurrent(w,source.checklist);
 }
 const original=agendaSourceFor(w,source.id);return original&&JSON.stringify(original)===JSON.stringify(source)?{ready:true,status:'ready',message:'This own original is current.'}:{ready:false,status:'source-changed',message:'A selected original changed or is unavailable. Remove its old plan entry and choose its current version.'};
}
export function agendaFor(w:ProductWorld,id:string):DayAgenda|undefined{return w.identity.signedIn?w.objects.find(o=>o.owner===w.owner&&o.kind==='day-agenda'&&o.id===id) as DayAgenda|undefined:undefined;}
export function agendaSnapshot(name:string,date:string,timezone:string,goal:string,entries:AgendaEntry[]){return JSON.stringify({name,date,timezone,goal,entries});}
export function agendaConflicts(entries:AgendaEntry[]):string[]{const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));const conflicts:string[]=[];for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(minutes(entries[i].time)<minutes(entries[j].time)+Number(entries[j].minutes)&&minutes(entries[j].time)<minutes(entries[i].time)+Number(entries[i].minutes))conflicts.push(`${entries[i].name} overlaps ${entries[j].name}`);return conflicts;}
export function applyDayAgenda(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('complete.agenda.'))return;
 need(w.identity.signedIn,'Sign in to work with your own day.');
 const existing=ctx.objectId?agendaFor(w,ctx.objectId):undefined;
 if(ctx.objectId)need(existing,'Open your own original day plan.');
 if(existing)need(String(existing.version)===d.expectedVersion,'This day plan changed. Reopen its current version.');
 if(op==='complete.agenda.check'){
  need(existing&&['Yes','No'].includes(d.done),'Choose your own plan and completion state.');
  const row=existing!.entries.find(i=>i.id===d.entryId);need(row,'This item is not in the original day plan.');row!.done=d.done==='Yes';existing!.version++;existing!.reviewSnapshot=agendaSnapshot(String(existing!.name),existing!.date,existing!.timezone,existing!.goal,existing!.entries);
  return {objectId:existing!.id,message:'Updated this plan item only. No original booking, calendar entry or other task was changed.'};
 }
 need(op==='complete.agenda.save','This planning action is unavailable.');
 need(d.name?.trim()&&d.name.length<=160&&d.goal?.trim()&&d.goal.length<=3000,'Give your day a name and a focus.');
 reminderTime(d.date,'12:00',d.timezone);
 let entries:AgendaEntry[];try{entries=JSON.parse(d.entries);}catch{throw Error('Review the entries in this day.');}
 need(Array.isArray(entries)&&entries.length>0&&entries.length<=40,'Keep one to forty entries in your day.');
 const ids=new Set<string>();const sourceIds=new Set<string>();
 for(const item of entries){
  need(item&&typeof item.id==='string'&&item.id.trim()&&item.id.length<=120&&!ids.has(item.id),'Each entry needs its own identity.');ids.add(item.id);
  need(typeof item.name==='string'&&item.name.trim()&&item.name.length<=200&&['task','appointment','break'].includes(item.kind),'Name each task, appointment or break.');
  need(typeof item.note==='string'&&item.note.length<=3000&&typeof item.done==='boolean','Review each entry’s note and state.');
  const previous=existing?.entries.find(i=>i.id===item.id);need(item.done===(previous?.done||false),'New blocks start unfinished. Change completion through the original plan item.');
  need(typeof item.time==='string'&&typeof item.minutes==='string','Review the time and duration of each block.');
  reminderTime(d.date,item.time,d.timezone);need(/^\d+$/.test(item.minutes)&&Number(item.minutes)>0&&Number(item.minutes)<=1440,'Choose a positive duration in minutes.');
  const end=Number(item.time.slice(0,2))*60+Number(item.time.slice(3))+Number(item.minutes);need(end<=1440,'Keep this block within the selected day. Split an overnight block into two days.');if(end<1440)reminderTime(d.date,`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`,d.timezone);
  if(item.source){need(!sourceIds.has(item.source.id),'Use an original source only once in this day.');sourceIds.add(item.source.id);need(item.source.id!==ctx.sourceTaskId&&item.source.id!==existing?.sourceTaskId,'The day-planning task cannot be its own agenda item.');const sourceObject=w.objects.find(o=>o.owner===w.owner&&o.id===item.source!.id);need(!existing||sourceObject?.resultId!==existing.id,'This day plan cannot include its own result task.');const sourceState=agendaSourceCurrent(w,item.source);need(sourceState.ready,sourceState.message);const current=agendaSourceFor(w,item.source.id);need(current,'This exact own source is unavailable.');if(current?.date){need(current.date===d.date,'This original belongs to another date. Choose that date or keep a separate manual task.');if(current.kind==='habit-date')need(current.timezone===d.timezone,'Keep the exact routine date in its reviewed time zone. Your block time remains your choice.');if(current.time)need(current.time===item.time&&current.timezone===d.timezone,'Keep this source appointment’s exact time and time zone. Changing this plan does not reschedule it.');}}
 }
 need(!agendaConflicts(entries).length||d.conflictsApproved==='Yes','Review and acknowledge the overlapping blocks. Your original times will not be moved.');
 need(d.approved==='Yes'&&d.reviewSnapshot===agendaSnapshot(d.name,d.date,d.timezone,d.goal,entries),'Review this exact day, its sources and any overlaps before saving.');
 if(existing&&ctx.sourceTaskId)need(ctx.sourceTaskId===existing.sourceTaskId,'Keep this day plan with its original day-planning task.');
 const fingerprint=JSON.stringify({snapshot:d.reviewSnapshot,sourceTaskId:ctx.sourceTaskId||''});
 const duplicate=!existing?w.objects.find(o=>o.owner===w.owner&&o.kind==='day-agenda'&&o.creationFingerprint===fingerprint):undefined;
 const sourceTask=ctx.sourceTaskId?w.objects.find(o=>o.owner===w.owner&&o.kind==='agent-task'&&o.id===ctx.sourceTaskId):undefined;
 if(ctx.sourceTaskId)need(sourceTask&&sourceTask.capabilityId==='B2C-CAP-001'&&!['cancelled','stopped','paused','failed'].includes(String(sourceTask.status))&&(!sourceTask.resultId||sourceTask.resultId===existing?.id||sourceTask.resultId===duplicate?.id),'Resume the exact own day-planning task before adding its result.');
 if(existing){const linked=w.objects.find(o=>o.id===existing.sourceTaskId&&o.owner===w.owner&&o.kind==='agent-task');need(linked&&linked.capabilityId==='B2C-CAP-001'&&(!linked.resultId||linked.resultId===existing.id),'Reopen the exact original day-planning task.');}
 if(duplicate)return {objectId:duplicate.id,message:'Your original day plan is already saved. No duplicate was created.'};
 const id=existing?.id||localPreviewId(),taskId=String(existing?.sourceTaskId||sourceTask?.id||localPreviewId());
 const fields={name:d.name.trim(),date:d.date,timezone:d.timezone,goal:d.goal.trim(),entries:entries.map(i=>({...i,name:i.name.trim()})).sort((a,b)=>a.time.localeCompare(b.time)),status:'saved',reviewSnapshot:d.reviewSnapshot,version:(existing?.version||0)+1,origin:'manual-plan',realExecution:false};
 if(existing)Object.assign(existing,fields);else w.objects.unshift({id,owner:w.owner,kind:'day-agenda',...fields,sourceTaskId:taskId,creationFingerprint:fingerprint,createdAt:Date.now()});
 let task=w.objects.find(o=>o.id===taskId&&o.owner===w.owner&&o.kind==='agent-task');if(!task){task={id:taskId,owner:w.owner,kind:'agent-task'};w.objects.unshift(task);}
 if(!task.capabilityId)Object.assign(task,{name:fields.name,request:fields.goal,status:'saved',capabilityId:'B2C-CAP-001',sourceFunction:'AL-293',sourceChatId:'chuck',origin:'manual-plan',aiExecutionRequested:false,aiExecutionApproved:false});
 need(task.capabilityId==='B2C-CAP-001','The linked original must remain your day-planning task.');
 Object.assign(task,{resultId:id,sourceContext:{...(task.sourceContext as Record<string,unknown>||{}),objectId:id},updatedAt:Date.now()});
 return {objectId:id,message:'Your reviewed day is saved. No calendar, booking, reminder or message was changed.'};
}
