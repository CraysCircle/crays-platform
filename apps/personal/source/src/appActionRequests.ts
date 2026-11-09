import {localPreviewId} from "./localPreviewId.ts";
import type { ProductWorld, Entity } from "./productModel.ts";
import {connectionFor,ownAppAccount,type AppProvider} from "./appConnections.ts";
import { reminderTime } from "./reminders.ts";
export type AppActionField = { id: string; label: string; multiline?: boolean; optional?: boolean; hint?: string };
export type AppActionProfile = { id: string; providers: string[]; title: string; summary: string; icon: string; scopes: string[]; fields: AppActionField[] };
const messageFields: AppActionField[] = [
  { id:"recipient",label:"Recipient",hint:"The exact address or identifier you intend to use." },
  { id:"message",label:"Message",multiline:true },
  { id:"purpose",label:"What is this for?" },
];
export const appActionProfiles: AppActionProfile[] = [
  {id:"email-draft",providers:["gmail","microsoft"],title:"Write an email",summary:"Your wording, the right person, ready for your review.",icon:"mail",scopes:["draft"],fields:[messageFields[0],{id:"subject",label:"Subject"},...messageFields.slice(1)]},
  {id:"email-send-request",providers:["gmail","microsoft"],title:"Prepare an email to send",summary:"Check the recipient and exact message. Nothing is sent here.",icon:"send",scopes:["send"],fields:[messageFields[0],{id:"subject",label:"Subject"},...messageFields.slice(1)]},
  {id:"calendar-event",providers:["microsoft"],title:"Make time for something",summary:"Prepare an Outlook event with its own calendar and guests.",icon:"calendar",scopes:["calendar-create"],fields:[{id:"title",label:"Event name"},{id:"calendar",label:"Chosen calendar"},{id:"date",label:"Date",hint:"YYYY-MM-DD"},{id:"time",label:"Time",hint:"HH:MM"},{id:"timezone",label:"Time zone",hint:"For example Europe/Lisbon"},{id:"guests",label:"Guest email addresses",optional:true},{id:"message",label:"Event notes",multiline:true},{id:"purpose",label:"What is this for?"}]},
  {id:"telegram-message",providers:["telegram"],title:"Write a Telegram message",summary:"One chosen chat, from your own selected connection.",icon:"chat",scopes:["send"],fields:[{id:"conversation",label:"Chosen chat",hint:"An exact chat you are allowed to use; no chat is discovered automatically."},{id:"connectionType",label:"Account or bot",hint:"Name which authorised connection this request uses."},...messageFields]},
  {id:"whatsapp-message",providers:["whatsapp","whatsapp-business"],title:"Write a WhatsApp message",summary:"Keep personal and Business senders separate.",icon:"chat",scopes:["send"],fields:[...messageFields,{id:"language",label:"Message language"}]},
  {id:"signal-message",providers:["signal"],title:"Write a Signal message",summary:"Use the exact contact you choose, without reading other chats.",icon:"chat",scopes:["send"],fields:messageFields},
  {id:"nextcloud-note",providers:["nextcloud"],title:"Keep a note in Nextcloud",summary:"Prepare a new note in the folder you choose.",icon:"file",scopes:["create"],fields:[{id:"folder",label:"Chosen folder"},{id:"filename",label:"File name",hint:"For example weekend-notes.txt"},{id:"message",label:"Note content",multiline:true},{id:"purpose",label:"What is this for?"}]},
];
export const appActionsFor = (providerId:string) => appActionProfiles.filter(p=>p.providers.includes(providerId));
export const appActionFor = (providerId:string,actionId:string) => appActionsFor(providerId).find(p=>p.id===actionId);
export function appActionValues(profile:AppActionProfile, input:Record<string,string>) {
  return Object.fromEntries(profile.fields.map(f=>[f.id,String(input[f.id]||"").trim()]));
}
export function appActionReview(connection:Entity, profile:AppActionProfile, input:Record<string,string>) {
  return JSON.stringify({providerId:connection.providerId,connectionId:connection.id,connectionVersion:Number(connection.version),account:connection.account,actionId:profile.id,scopes:profile.scopes,values:appActionValues(profile,input)});
}
export function appActionAvailability(w:ProductWorld, action:Entity) {
 if(!ownAppAccount(w)||action?.owner!==w.owner||action.kind!=='app-action'||w.objects.filter(o=>o.id===action.id).length!==1)return 'review-required';
 const c=connectionFor(w,String(action.providerId));if(!c||c.id!==action.connectionId||c.status!=='connected-demo')return 'connection-required';
 const profile=appActionFor(String(action.providerId),String(action.actionId));
 const required=action.requiredScopes,granted=c.scopes;
 if(!profile||!Array.isArray(required)||!Array.isArray(granted)||required.length!==profile.scopes.length||profile.scopes.some(v=>!required.includes(v))||required.some(v=>typeof v!=='string'||!granted.includes(v)))return 'permission-required';
 if(!Number.isInteger(action.connectionVersion)||action.connectionVersion!==c.version||!Number.isInteger(action.version)||Number(action.version)<1||action.realExecution!==false||action.status!=='prepared')return 'review-required';
 const tasks=w.objects.filter(o=>o.id===action.sourceTaskId);if(tasks.length!==1||tasks[0].owner!==w.owner||tasks[0].kind!=='agent-task'||tasks[0].resultId!==action.id||tasks[0].appActionId!==action.id)return 'review-required';
 return 'ready';
}
export function prepareManagedAppAction(w:ProductWorld, provider:AppProvider, c:Entity, data:Record<string,string>, objectId?:string) {
  const profile=appActionFor(provider.id,data.actionId);
  if(!profile)throw Error('Choose an action supported by this particular app.');
  if(!ownAppAccount(w) || connectionFor(w,provider.id)?.id!==c.id || c.owner!==w.owner || c.status!=='connected-demo')throw Error('Connect your own account before preparing this request.');
  if(c.id!==data.connectionId || !/^[1-9]\d*$/.test(data.connectionVersion||'') || c.version!==Number(data.connectionVersion))throw Error('This account changed. Review the current account and permissions again.');
  if(profile.scopes.some(s=>!provider.scopes.some(p=>p.id===s) || !Array.isArray(c.scopes)||!c.scopes.includes(s)))throw Error('A permission for this exact action is missing or revoked.');
  let values:Record<string,string>;
  try{values=JSON.parse(data.values||'{}');}catch{throw Error('Review the details of this request.');}
  if(!values || typeof values!=='object' || Array.isArray(values))throw Error('Review the details of this request.');
  if(profile.fields.some(f=>values[f.id]!==undefined && typeof values[f.id]!=="string"))throw Error('Use plain text in the reviewed fields.');
  values=appActionValues(profile,values);
  for(const f of profile.fields){if(!f.optional && !values[f.id])throw Error(`Complete ${f.label.toLowerCase()}.`);if(values[f.id].length>(f.multiline?12000:1000))throw Error('Keep this request within the field limits.');}
  if(profile.id.startsWith('email-') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.recipient))throw Error('Choose one exact recipient email address.');
  if(profile.id==='calendar-event'){
    reminderTime(values.date,values.time,values.timezone);
    if(values.guests && values.guests.split(',').some(a=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.trim())))throw Error('Separate exact guest email addresses with commas.');
  }
  if(profile.id==='nextcloud-note' && (values.folder.split('/').includes('..') || /[/\\]/.test(values.filename) || ['.','..'].includes(values.filename)))throw Error('Choose a folder and a plain file name without parent-directory changes.');
  const review=appActionReview(c,profile,values);
  if(data.approved!=='Yes' || data.destinationConfirmed!=='Yes' || data.reviewSnapshot!==review)throw Error('Review the exact account, destination and content, then confirm this preparation.');
  const exact=objectId?w.objects.filter(o=>o.id===objectId):[];
  let original=objectId?exact[0]:undefined;
  if(objectId&&(exact.length!==1||original?.owner!==w.owner||original.kind!=='app-action'))throw Error('Open your own unique original app request.');
  const originalReady=(o:Entity)=>{
   if(o.connectionId!==c.id||o.providerId!==provider.id||o.actionId!==profile.id||o.realExecution!==false||!Number.isInteger(o.version)||Number(o.version)<1||!['prepared','paused-permission-revoked','paused-connection-revoked'].includes(String(o.status)))throw Error('Keep this original account, version and outcome for review. It cannot be prepared again here.');
   const tasks=w.objects.filter(t=>t.id===o.sourceTaskId);if(tasks.length!==1||tasks[0].owner!==w.owner||tasks[0].kind!=='agent-task'||tasks[0].appActionId!==o.id||tasks[0].resultId!==o.id)throw Error('This request’s original task link needs review. No replacement task was created.');
  };
  if(original){originalReady(original);if(!/^[1-9]\d*$/.test(data.originalVersion||'')||original.version!==Number(data.originalVersion))throw Error('This request changed. Open its latest version before reviewing again.');}
  const duplicates=w.objects.filter(o=>o.owner===w.owner&&o.kind==='app-action'&&o.reviewSnapshot===review&&o.status==='prepared');
  if(duplicates.length>1||duplicates.some(o=>w.objects.filter(x=>x.id===o.id).length!==1))throw Error('These original request references are ambiguous. Nothing was replaced.');
  if(!original&&duplicates.length)original=duplicates[0];
  if(original){originalReady(original);if(original.reviewSnapshot===review&&original.status==='prepared')return {objectId:original.id,message:'This same reviewed request is already prepared. Nothing was sent or created at the provider.'};}
  const now=Date.now();
  if(!original){original={id:localPreviewId(),owner:w.owner,kind:'app-action',sourceTaskId:localPreviewId(),createdAt:now,version:0};w.objects.unshift(original);}
  Object.assign(original,{name:profile.title,providerId:provider.id,connectionId:c.id,connectionVersion:c.version,account:c.account,actionId:profile.id,scope:profile.scopes[0],requiredScopes:profile.scopes,values,reviewSnapshot:review,request:values.purpose,status:'prepared',approved:false,preparationReviewed:true,realExecution:false,version:Number(original.version||0)+1,updatedAt:now});
  let task=w.objects.find(o=>o.owner===w.owner && o.id===original!.sourceTaskId && o.kind==='agent-task');
  if(!task){task={id:String(original.sourceTaskId),owner:w.owner,kind:'agent-task',createdAt:now};w.objects.unshift(task);}
  Object.assign(task,{name:`${provider.name}: ${profile.title}`,request:values.purpose,status:'prepared',sourceFunction:'AL-293',sourceContext:{appActionId:original.id,providerId:provider.id,connectionId:c.id},appActionId:original.id,connectionId:c.id,scope:profile.scopes[0],requiredScopes:profile.scopes,resultId:original.id,updatedAt:now});
  return {objectId:original.id,message:'Your exact request is prepared. No message, calendar invitation or file was sent or created externally.'};
}
