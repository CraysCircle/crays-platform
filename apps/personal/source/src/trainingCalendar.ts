import {localPreviewId} from "./localPreviewId.ts";
import type {ProductWorld,Entity,ActionContext} from './productModel.ts';
import {planSessionReminderSource} from './planSessionReminders.ts';
import {reminderTime} from './reminders.ts';
export const trainingDemoCalendars=[{id:'preview-ms-personal',name:'My personal calendar'},{id:'preview-ms-work',name:'My work calendar'}];
const need=(v:unknown,m:string)=>{if(!v)throw Error(m);};
export function trainingCalendarConnection(w:ProductWorld){return w.objects.find(o=>o.owner===w.owner&&o.kind==='app-connection'&&o.providerId==='microsoft');}
export function trainingCalendarEvent(w:ProductWorld,planId:string,sessionId:string){return w.objects.find(o=>o.owner===w.owner&&o.kind==='training-calendar-event'&&o.sourceId===planId&&o.sourceSessionId===sessionId&&o.status!=='cancelled-preview');}
export function trainingCalendarGrant(w:ProductWorld,connectionId:string,planId:string,sessionId:string,calendarId:string){return w.objects.find(o=>o.owner===w.owner&&o.kind==='training-calendar-grant'&&o.connectionId===connectionId&&o.sourceId===planId&&o.sourceSessionId===sessionId&&o.calendarId===calendarId&&o.status==='granted-preview');}
export const trainingCalendarFields=['title','date','time','endDate','endTime','timezone'] as const;
export function trainingCalendarValues(d:Record<string,string>){return Object.fromEntries(trainingCalendarFields.map(k=>[k,String(d[k]||'').trim()]));}
export function trainingCalendarReview(d:Record<string,string>){return JSON.stringify({connectionId:d.connectionId,connectionVersion:d.connectionVersion,calendarId:d.calendarId,sourceId:d.sourceId,sourceSessionId:d.sourceSessionId,sourceSessionFingerprint:d.sourceSessionFingerprint,objectId:d.objectId||'',expectedVersion:d.expectedVersion||'0',operationId:d.operationId,action:d.action,values:trainingCalendarValues(d),guests:[],outcome:d.outcome});}
export function trainingSessionCalendarDefaults(w:ProductWorld,planId:string,sessionId:string){
 const s=planSessionReminderSource(w,planId,sessionId);const plan=w.objects.find(o=>o.owner===w.owner&&o.id===planId)!;
 const items=Array.isArray(plan.items)?plan.items:JSON.parse(String(plan.items||'[]'));const duration=String(items.find((i:any)=>i.id===sessionId)?.duration||'');
 const minutes=/^(\d+)\s*(min|mins|minutes)$/i.exec(duration)?.[1];let endDate=s.date,endTime='';
 if(minutes&&Number(minutes)>0&&Number(minutes)<=1440){const wall=new Date(Date.parse(`${s.date}T${s.time}:00Z`)+Number(minutes)*60000);endDate=wall.toISOString().slice(0,10);endTime=wall.toISOString().slice(11,16);}
 return {...s,fingerprint:JSON.stringify([s.fingerprint,duration]),title:s.name,endDate,endTime};
}
// Entirely local scenario adapter. A preview record is readback authority only
// inside the clickdummy; it never stands for a Microsoft API response.
export function applyTrainingCalendar(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('complete.trainingcalendar.'))return;
 need(w.identity.signedIn,'Sign in to use your own calendar.');
 const own=(id:string,kind:string)=>w.objects.find(o=>o.owner===w.owner&&o.id===id&&o.kind===kind);
 if(op==='complete.trainingcalendar.revoke'){
  const event=ctx.objectId?own(ctx.objectId,'training-calendar-event'):undefined;
  if(ctx.objectId)need(event,'Open your own original calendar entry.');
  const grant=trainingCalendarGrant(w,d.connectionId,String(event?.sourceId||d.sourceId),String(event?.sourceSessionId||d.sourceSessionId),d.calendarId);
  need(grant&&d.approved==='Yes','Confirm stopping your own calendar permission.');
  grant!.status='revoked';return {objectId:grant!.id,message:'Calendar access for this session stopped. Its training plan and reminder remain unchanged.'};
 }
 const c=trainingCalendarConnection(w);need(c&&c.status==='connected-demo','Connect your own Microsoft preview account.');
 need(c!.id===d.connectionId&&String(c!.version)===d.connectionVersion,'Your account changed. Review its current connection again.');
 const scopes=Array.isArray(c!.scopes)?c!.scopes:[];need(scopes.includes('calendar-read'),'Allow reading this own calendar before checking its result.');
 const calendar=trainingDemoCalendars.find(x=>x.id===d.calendarId);need(calendar,'Choose a listed Microsoft demo calendar.');
 const original=ctx.objectId?own(ctx.objectId,'training-calendar-event'):undefined;
 if(ctx.objectId)need(original,'Open your own original calendar entry.');
 const planId=String(original?.sourceId||d.sourceId),sessionId=String(original?.sourceSessionId||d.sourceSessionId);
 if(original)need(original.connectionId===c!.id&&original.calendarId===calendar!.id,'Keep this original with its own account and calendar.');
 let grant=trainingCalendarGrant(w,c!.id,planId,sessionId,calendar!.id);
 if(op==='complete.trainingcalendar.grant'){
  need(d.approved==='Yes','Approve this specific demo calendar for this training session.');
  need(scopes.some(s=>['calendar-create','calendar-change','calendar-cancel'].includes(String(s))),'Choose the specific calendar action permission in Microsoft settings.');
  if(!original)planSessionReminderSource(w,planId,sessionId);
  if(!grant){grant={id:localPreviewId(),owner:w.owner,kind:'training-calendar-grant'};w.objects.unshift(grant);}
  Object.assign(grant,{connectionId:c!.id,connectionVersion:c!.version,account:c!.account,calendarId:calendar!.id,calendarName:calendar!.name,sourceId:planId,sourceSessionId:sessionId,status:'granted-preview',version:Number(grant.version||0)+1});
  return {objectId:grant.id,message:'This demo calendar is allowed for this one training session. No calendar entry was created.'};
 }
 need(grant&&String(grant.connectionVersion)===String(c!.version),'Choose and approve this exact calendar for the current account.');
 if(op==='complete.trainingcalendar.reconcile'){
  need(original,'Choose your own original to check its preview result.');
  const record=own(String(original!.previewEventId),'training-calendar-record');need(record&&record!.connectionId===c!.id&&record!.calendarId===calendar!.id,'No matching preview record was found. Keep this result unknown; do not create a replacement.');
  Object.assign(original!,{...trainingCalendarValues(record as Record<string,string>),status:record!.status,recordVersion:record!.version,readbackAt:Date.now(),version:Number(original!.version||0)+1,unknownAction:'',liveExecution:false});
  return {objectId:original!.id,message:'The same preview entry was checked. No request was sent again.'};
 }
 need(op==='complete.trainingcalendar.commit','Choose a supported calendar action.');
 need((d.objectId||'')===(ctx.objectId||''),'Keep this review with its exact original entry.');
 need(['Create','Change','Cancel'].includes(d.action),'Choose create, change or cancel for this original.');
 need(scopes.includes(d.action==='Create'?'calendar-create':d.action==='Change'?'calendar-change':'calendar-cancel'),'This calendar action permission is missing or revoked.');
 need(d.approved==='Yes'&&d.reviewSnapshot===trainingCalendarReview(d),'Review the exact calendar, times and action again.');
 need(!d.guests?.trim(),'Invitations need their own separate reviewed permission. This training preview supports only you.');
 need(d.operationId&&d.operationId.length<=100,'Review one identifiable calendar operation.');
 if(original?.lastOperationId===d.operationId){need(original.lastReviewSnapshot===d.reviewSnapshot,'This operation already belongs to a different reviewed request.');return {objectId:original.id,message:'This original operation is already recorded. No second entry or action was made.'};}
 need(!original||original.status!=='unknown-preview','Check this original calendar result before trying another action.');
 need(!original||original.status!=='cancelled-preview','This preview entry is cancelled. Keep its result unchanged.');
 need(!original||String(original.version)===d.expectedVersion,'This calendar entry changed. Reopen its latest version before reviewing.');
 if(d.action!=='Create')need(original,'Choose the existing entry to change or cancel.');
 else need(!original,'Use Change for this existing entry.');
 let source:ReturnType<typeof trainingSessionCalendarDefaults>|undefined;
 if(d.action!=='Cancel'){
  source=trainingSessionCalendarDefaults(w,planId,sessionId);need(source.fingerprint===d.sourceSessionFingerprint,'Your training session changed. Review its current details first.');
  const start=reminderTime(d.date,d.time,d.timezone),end=reminderTime(d.endDate,d.endTime,d.timezone);need(start>Date.now()&&end>start,'Choose a future start and an end after it.');need(d.title?.trim()&&d.title.length<=200,'Name this calendar entry.');
 }
 need(['Confirmed','Confirmation interrupted'].includes(d.outcome),'Choose a preview calendar response.');
 if(d.action==='Create'){
  const prior=trainingCalendarEvent(w,planId,sessionId);if(prior){if(prior.lastOperationId===d.operationId){need(prior.lastReviewSnapshot===d.reviewSnapshot,'This operation already belongs to a different reviewed request.');return {objectId:prior.id,message:'This original operation is already recorded. Check its current result; nothing was sent again.'};}need(prior.status!=='unknown-preview','Check the existing uncertain entry instead of creating another.');need(prior.connectionId===c!.id&&prior.calendarId===calendar!.id&&JSON.stringify(trainingCalendarValues(prior as Record<string,string>))===JSON.stringify(trainingCalendarValues(d)),'This session already has a calendar entry. Open and change the original.');return {objectId:prior.id,message:'This session already has this preview entry. No duplicate was created.'};}
 }
 const event:Entity=original||{id:localPreviewId(),owner:w.owner,kind:'training-calendar-event',sourceId:planId,sourceSessionId:sessionId,sourceTaskId:w.objects.find(o=>o.owner===w.owner&&o.id===planId)?.sourceTaskId,previewEventId:localPreviewId(),version:0};
 let record=own(String(event.previewEventId),'training-calendar-record');
 if(!record){need(d.action==='Create','Check the missing original record before changing anything.');record={id:String(event.previewEventId),owner:w.owner,kind:'training-calendar-record',connectionId:c!.id,calendarId:calendar!.id,version:0};w.objects.unshift(record);}
 if(original)need(Number(record.version)===Number(original.recordVersion),'The preview calendar changed independently. Check its current result before editing.');
 const fields=d.action==='Cancel'?trainingCalendarValues(record as Record<string,string>):trainingCalendarValues(d);
 Object.assign(record,{...fields,status:d.action==='Cancel'?'cancelled-preview':'confirmed-preview',version:Number(record.version||0)+1,lastOperationId:d.operationId});
 Object.assign(event,{...fields,name:fields.title,connectionId:c!.id,connectionVersion:c!.version,account:c!.account,calendarId:calendar!.id,calendarName:calendar!.name,guests:[],invitationsSent:false,sourceSessionFingerprint:source?.fingerprint||event.sourceSessionFingerprint,sourcePlanVersion:source?.planVersion||event.sourcePlanVersion,recordVersion:record.version,status:d.outcome==='Confirmed'?record.status:'unknown-preview',unknownAction:d.outcome==='Confirmed'?'':d.action,lastOperationId:d.operationId,lastReviewSnapshot:d.reviewSnapshot,version:Number(event.version)+1,readbackAt:d.outcome==='Confirmed'?Date.now():null,liveExecution:false,scenario:'Own Microsoft calendar preview, not a provider API receipt'});
 if(!original)w.objects.unshift(event);
 return {objectId:event.id,message:d.outcome==='Confirmed'?(d.action==='Cancel'?'The same preview entry is cancelled. No real invitation was sent.':'Your preview calendar entry is recorded and checked. Nothing was created at Microsoft.'):'Confirmation was interrupted in this preview. Check this same entry before any further action.'};
}
