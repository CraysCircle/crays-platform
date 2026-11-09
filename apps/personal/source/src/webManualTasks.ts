import {localPreviewId} from './localPreviewId';
import type {Entity,ProductWorld} from './productModel';
export type ManualStep={id:string;text:string;done:boolean};
export type ManualFile={id:string;name:string;url:string;size:number};
export type ManualTaskInput={name:string;notes:string;startDate:string;deadline:string;reminder:string;timezone:string;priority:string;repeat:string;list:string;myDay:boolean;steps:ManualStep[];files:ManualFile[]};
export type ManualTask=Entity&ManualTaskInput&{kind:'web-manual-task';version:number;status:'open'|'done'|'archived'|'deleted';completedAt?:number;previousStatus?:string;previousTaskId?:string};
export const emptyManualTask=():ManualTaskInput=>({name:'',notes:'',startDate:'',deadline:'',reminder:'',timezone:'Europe/Berlin',priority:'Normal',repeat:'None',list:'Personal',myDay:false,steps:[],files:[]});
function need(test:unknown,message:string):asserts test{if(!test)throw Error(message);}
function signedIn(w:ProductWorld){need(w.identity.signedIn===true&&typeof w.owner==='string'&&!!w.owner.trim()&&w.owner===w.owner.trim(),'Sign in to manage your own tasks.');}
function validDate(s:string){return !s||/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
export function ownManualTasks(w:ProductWorld){if(w.identity.signedIn!==true||typeof w.owner!=='string'||!w.owner.trim()||w.owner!==w.owner.trim())return [];return w.objects.filter(o=>{if(o.kind!=='web-manual-task'||o.owner!==w.owner||w.objects.filter(x=>x.id===o.id).length!==1||!Number.isInteger(o.version)||Number(o.version)<1||!['open','done','archived','deleted'].includes(String(o.status)))return false;try{validate(o as ManualTask);return true;}catch{return false;}}) as ManualTask[];}
export function unreadableManualTaskCount(w:ProductWorld){if(w.identity.signedIn!==true||typeof w.owner!=='string'||!w.owner.trim())return 0;const visible=new Set(ownManualTasks(w).map(o=>o.id));return w.objects.filter(o=>o.kind==='web-manual-task'&&o.owner===w.owner&&!visible.has(o.id)).length;}

export function manualTaskFor(w:ProductWorld,id:string){const rows=ownManualTasks(w).filter(t=>t.id===id);return rows.length===1&&w.objects.filter(o=>o.id===id).length===1?rows[0]:undefined;}
function fileBytes(url:string){const data=url.split(',')[1]||'';return data.length*3/4-(data.endsWith('==')?2:data.endsWith('=')?1:0);}
function validate(input:ManualTaskInput){
 need(!!input&&['name','notes','startDate','deadline','reminder','timezone','priority','repeat','list'].every(k=>typeof (input as unknown as Record<string,unknown>)[k]==='string')&&typeof input.myDay==='boolean'&&Array.isArray(input.steps)&&Array.isArray(input.files),'This task needs its original field types reviewed.');

 need(input.name.trim().length>0&&input.name.trim().length<=200,'Give this task a name of up to 200 characters.');need(input.notes.length<=12000,'Keep notes within 12,000 characters.');
 need(validDate(input.startDate)&&validDate(input.deadline),'Choose valid start and deadline dates.');need(!input.startDate||!input.deadline||input.deadline>=input.startDate,'The deadline must be on or after the start date.');
 need(!input.reminder||/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.reminder)&&validDate(input.reminder.slice(0,10))&&Number(input.reminder.slice(11,13))<=23&&Number(input.reminder.slice(14,16))<=59,'Choose a valid reminder date and time.');try{new Intl.DateTimeFormat('en',{timeZone:input.timezone});}catch{throw Error('Choose a valid time zone.');}
 need(['Low','Normal','High'].includes(input.priority)&&['None','Daily','Weekly','Monthly'].includes(input.repeat),'Choose the priority and repeat options.');need(input.list.trim().length>0&&input.list.trim().length<=60,'Choose a list name of up to 60 characters.');
 need(input.steps.length<=50&&new Set(input.steps.map(s=>s.id)).size===input.steps.length&&input.steps.every(s=>s&&typeof s.id==='string'&&!!s.id.trim()&&typeof s.text==='string'&&s.text.trim()&&s.text.length<=300&&typeof s.done==='boolean'),'Add up to 50 uniquely named substeps.');
 need(input.files.every(f=>f&&typeof f.id==='string'&&!!f.id.trim()&&typeof f.name==='string'&&typeof f.url==='string'&&typeof f.size==='number')&&new Set(input.files.map(f=>f.id)).size===input.files.length&&input.files.reduce((sum,f)=>sum+f.size,0)<=2_000_000,'Keep attached files within 2 MB in total for this browser preview.');
 need(input.files.length<=10&&input.files.every(f=>f.name&&f.name.length<=200&&Number.isFinite(f.size)&&f.size<=2_000_000&&f.size>=0&&Number.isInteger(f.size)&&fileBytes(f.url)===f.size&&/^data:[^,]*;base64,[A-Za-z0-9+/=]*$/.test(f.url)),'Attach up to 10 local files, at most 2 MB each.');
}
export function saveManualTask(w:ProductWorld,input:ManualTaskInput,id?:string,version?:number):ProductWorld{
 signedIn(w);validate(input);const old=id?manualTaskFor(w,id):undefined;need(!id||old&&old.version===version,'This task changed or is unavailable. Reopen it before saving.');need(!old||!['deleted','archived'].includes(old.status),'Restore the task before editing it.');
 const record:ManualTask={...old,...structuredClone(input),id:old?.id||'web-manual-task-'+localPreviewId(),owner:w.owner,kind:'web-manual-task',name:input.name.trim(),list:input.list.trim(),status:old?.status||'open',version:(old?.version||0)+1,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now(),liveExecution:false};
 return {...w,objects:old?w.objects.map(o=>o===old?record:o):[...w.objects,record]};
}
export function changeManualTask(w:ProductWorld,id:string,action:'complete'|'reopen'|'archive'|'delete'|'restore'|'focus',version:number):ProductWorld{
 signedIn(w);need(['complete','reopen','archive','delete','restore','focus'].includes(action),'Choose an available task action.');const old=manualTaskFor(w,id);need(old&&old.version===version,'This task changed or is unavailable. Reopen it before continuing.');let next={...old,version:old.version+1,updatedAt:Date.now()};
 if(action==='restore'){need(['archived','deleted'].includes(old.status),'Only archived or removed tasks can be restored.');next.status=old.previousStatus==='done'?'done':'open';}
 else if(action==='archive'||action==='delete'){need(!['archived','deleted'].includes(old.status),'This task is already stored away.');next.previousStatus=old.status;next.status=action==='archive'?'archived':'deleted';}
 else{need(!['archived','deleted'].includes(old.status),'Restore this task first.');if(action==='focus')next.myDay=!old.myDay;else if(action==='complete'){next.status='done';next.completedAt=Date.now();}else{next.status='open';delete next.completedAt;}}
 return {...w,objects:w.objects.map(o=>o===old?next:o)};
}
export function nextManualOccurrence(w:ProductWorld,id:string,version:number):ProductWorld{
 signedIn(w);const old=manualTaskFor(w,id);need(old&&old.version===version&&old.status==='done'&&old.repeat!=='None','Complete this repeating manual task before preparing the next occurrence.');
 const date=new Date((old.startDate||old.deadline||new Date().toISOString().slice(0,10))+'T12:00:00Z');const shift=(value:Date)=>{if(old.repeat==='Monthly'){const day=value.getUTCDate();value.setUTCDate(1);value.setUTCMonth(value.getUTCMonth()+1);value.setUTCDate(Math.min(day,new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth()+1,0)).getUTCDate()));}else value.setUTCDate(value.getUTCDate()+(old.repeat==='Weekly'?7:1));return value.toISOString().slice(0,10);};const nextDate=shift(date);
 if(ownManualTasks(w).some(t=>t.previousTaskId===id&&t.startDate===nextDate))return w;
 const input:ManualTaskInput={...old,name:old.name,startDate:nextDate,deadline:old.deadline?shift(new Date(old.deadline+'T12:00:00Z')):'',reminder:'',myDay:false,steps:old.steps.map(s=>({...s,done:false})),files:structuredClone(old.files)};
 const updated=saveManualTask(w,input),created=updated.objects.at(-1)!;return {...updated,objects:updated.objects.map(o=>o===created?{...o,previousTaskId:id}:o)};
}
export function withManualTaskExample(w:ProductWorld):ProductWorld{
 if(!w.identity.signedIn||w.owner!=='thorben'||w.identity.destination!=='Demo account'||w.settings.webManualExampleV1)return w;
 const example:ManualTask={...emptyManualTask(),id:'web-manual-task-pack-documents',owner:w.owner,kind:'web-manual-task',name:'Pack documents for Lisbon',notes:'Check the travel documents and keep copies together.',startDate:'2026-10-26',priority:'High',myDay:true,steps:[{id:'passport',text:'Check passport',done:false},{id:'copies',text:'Save document copies',done:false}],version:1,status:'open',sourceAuthority:'fictional-preview',liveExecution:false};
 return {...w,settings:{...w.settings,webManualExampleV1:true},objects:[...w.objects,...(w.objects.some(o=>o.id===example.id)?[]:[example])]};
}
