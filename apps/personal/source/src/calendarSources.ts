import type {ProductWorld,Entity,ActionContext} from './productModel.ts';
import {appById,connectionFor,mayUseApp} from './appConnections.ts';
import {localPreviewId} from './localPreviewId.ts';
import {reminderTime} from './reminders.ts';
export const calendarProviders=[{id:'microsoft',name:'Microsoft 365',readScope:'calendar-read'},{id:'google-calendar',name:'Google Calendar',readScope:'read'},{id:'caldav',name:'CalDAV calendar',readScope:'read'},{id:'icloud-calendar',name:'iCloud Calendar',readScope:'read'},{id:'nextcloud',name:'Nextcloud',readScope:'calendar-read'}] as const;
export type CalendarSourceCriteria={providerId:string;connectionId:string;connectionVersion:string;account:string;calendarId:string;rangeStart:string;rangeEnd:string;timezone:string};
export type CalendarSourceScenario='busy'|'empty'|'failed'|'private-denied';
export type CalendarBusyInterval={id:string;date:string;time:string;minutes:string;timezone:string;calendarId:string};
export type CalendarSourcePreview=Entity&{kind:'calendar-source-preview';criteria:CalendarSourceCriteria;scenario:CalendarSourceScenario;status:'ready-preview'|'failed-preview'|'denied-preview';busyIntervals:CalendarBusyInterval[];recordedAt:number;origin:'fictional-own-calendar-scenario';liveExecution:false;reviewSnapshot:string};
export type CalendarSourceQuery=Pick<CalendarSourceCriteria,'rangeStart'|'rangeEnd'|'timezone'>;
export type CalendarSourceReadiness={ready:boolean;status:'ready'|'signed-out'|'connection-required'|'permission-required'|'stale-source'|'invalid-query'|'failed'|'private-denied';message:string};
const need=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
export function calendarSourceCalendars(providerId:string){if(!calendarProviders.some(p=>p.id===providerId))return [];return [{id:providerId==='microsoft'?'preview-ms-personal':`preview-${providerId}-personal`,name:'My personal calendar · fictional preview'},{id:providerId==='microsoft'?'preview-ms-work':`preview-${providerId}-work`,name:'My work calendar · fictional preview'}];}
function validQuery(c:CalendarSourceQuery){for(const date of [c.rangeStart,c.rangeEnd]){need(/^\d{4}-\d{2}-\d{2}$/.test(date),'Choose the exact planning dates.');const parsed=new Date(`${date}T12:00:00Z`);need(Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date,'Choose valid planning dates.');reminderTime(date,'12:00',c.timezone);}const days=(Date.parse(`${c.rangeEnd}T12:00:00Z`)-Date.parse(`${c.rangeStart}T12:00:00Z`))/86400000;need(days>=0&&days<31,'Choose one to thirty-one planning days.');}
export function calendarSourceAccess(w:ProductWorld,c:CalendarSourceCriteria):CalendarSourceReadiness{
 if(!w.identity.signedIn)return {ready:false,status:'signed-out',message:'Sign in to choose your own calendar.'};
 if(!c||typeof c!=='object'||Array.isArray(c)||!['providerId','connectionId','connectionVersion','account','calendarId','rangeStart','rangeEnd','timezone'].every(key=>typeof c[key as keyof CalendarSourceCriteria]==='string'))return {ready:false,status:'invalid-query',message:'Review the exact calendar source fields.'};
 const ownConnections=w.objects.filter(o=>o.owner===w.owner&&o.kind==='app-connection'&&o.providerId===c.providerId);
 if(ownConnections.length>1)return {ready:false,status:'stale-source',message:'More than one local account record matches this provider. Resolve the account before reading a calendar.'};
 const provider=calendarProviders.find(p=>p.id===c.providerId),connection=provider?connectionFor(w,provider.id):undefined;
 if(!provider||!connection||connection.status!=='connected-demo')return {ready:false,status:'connection-required',message:'Connect your own calendar account. Its availability is unknown.'};
 const version=connection.version,scopes=connection.scopes,supported=appById(provider.id)?.scopes.map(s=>s.id)||[];
 if(!Number.isSafeInteger(Number(version))||Number(version)<1||String(Number(version))!==String(version)||!/^[1-9]\d*$/.test(c.connectionVersion))return {ready:false,status:'stale-source',message:'The account revision is invalid. Review your own current connection.'};
 if(typeof connection.account!=='string'||!connection.account.trim()||!Array.isArray(scopes)||scopes.some(scope=>typeof scope!=='string'||!supported.includes(scope))||new Set(scopes).size!==scopes.length)return {ready:false,status:'permission-required',message:'The recorded account permissions are invalid. Review them in Settings before reading.'};
 if(!mayUseApp(w,provider.id,provider.readScope))return {ready:false,status:'permission-required',message:'Allow reading the selected calendar. Missing access does not mean your time is free.'};
 if(connection.id!==c.connectionId||String(connection.version)!==c.connectionVersion||connection.account!==c.account)return {ready:false,status:'stale-source',message:'Your account or permissions changed. Review the exact calendar again.'};
 if(!calendarSourceCalendars(provider.id).some(calendar=>calendar.id===c.calendarId))return {ready:false,status:'invalid-query',message:'Choose a listed fictional calendar for this account.'};
 try{validQuery(c);}catch(error){return {ready:false,status:'invalid-query',message:error instanceof Error?error.message:'Review this planning range and time zone.'};}
 return {ready:true,status:'ready',message:'This own account may read the chosen fictional calendar preview. No write or invitation is allowed.'};
}
export function calendarSourcePreviewFor(w:ProductWorld,id:string){return w.identity.signedIn?w.objects.find(o=>o.owner===w.owner&&o.kind==='calendar-source-preview'&&o.id===id) as CalendarSourcePreview|undefined:undefined;}
export function calendarSourceCurrent(w:ProductWorld,preview:CalendarSourcePreview,query?:CalendarSourceQuery):CalendarSourceReadiness{
 const original=calendarSourcePreviewFor(w,preview.id);if(!original||JSON.stringify(original)!==JSON.stringify(preview))return {ready:false,status:'stale-source',message:'Open your own original calendar preview.'};
 const access=calendarSourceAccess(w,preview.criteria);if(!access.ready)return access;
 if(query&&(query.rangeStart!==preview.criteria.rangeStart||query.rangeEnd!==preview.criteria.rangeEnd||query.timezone!==preview.criteria.timezone))return {ready:false,status:'stale-source',message:'The planning dates or time zone changed. Review a matching calendar preview.'};
 if(preview.scenario==='failed')return {ready:false,status:'failed',message:'The fictional read failed. Calendar availability remains unknown.'};
 if(preview.scenario==='private-denied')return {ready:false,status:'private-denied',message:'This calendar is denied in the fictional scenario. Its availability remains unknown.'};
 return {ready:true,status:'ready',message:preview.scenario==='empty'?'No busy intervals in this named fictional example; this is not universal availability.':'The exact fictional busy intervals can be used as fixed planning constraints.'};
}
export function calendarSourceReview(criteria:CalendarSourceCriteria,scenario:CalendarSourceScenario){return JSON.stringify({criteria,scenario});}
export function applyCalendarSourcePreview(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('complete.calendar-source.'))return;
 need(op==='complete.calendar-source.preview','Choose a supported calendar preview action.');need(!ctx.objectId,'Calendar previews are immutable. Review a new read rather than replacing the original.');
 let criteria:CalendarSourceCriteria;try{criteria=JSON.parse(data.criteria);}catch{throw Error('Review the exact account, calendar and planning range.');}
 need(criteria&&typeof criteria==='object'&&!Array.isArray(criteria),'Review the calendar criteria.');
 for(const key of ['providerId','connectionId','connectionVersion','account','calendarId','rangeStart','rangeEnd','timezone'] as const)need(typeof criteria[key]==='string'&&criteria[key].length>0&&criteria[key].length<=300,'Review each exact calendar source field.');
 const access=calendarSourceAccess(w,criteria);need(access.ready,access.message);const scenario=data.scenario as CalendarSourceScenario;
 need(['busy','empty','failed','private-denied'].includes(scenario),'Choose an explicit fictional calendar response.');
 const reviewSnapshot=calendarSourceReview(criteria,scenario);need(data.approved==='Yes'&&data.reviewSnapshot===reviewSnapshot,'Review this exact account, calendar, dates, time zone and fictional response.');
 const busyIntervals:CalendarBusyInterval[]=[];
 if(scenario==='busy'){for(let stamp=Date.parse(`${criteria.rangeStart}T12:00:00Z`);stamp<=Date.parse(`${criteria.rangeEnd}T12:00:00Z`);stamp+=86400000){const date=new Date(stamp).toISOString().slice(0,10);reminderTime(date,'10:00',criteria.timezone);reminderTime(date,'11:00',criteria.timezone);busyIntervals.push({id:localPreviewId(),date,time:'10:00',minutes:'60',timezone:criteria.timezone,calendarId:criteria.calendarId});}}
 const record:CalendarSourcePreview={id:localPreviewId(),owner:w.owner,kind:'calendar-source-preview',name:'Your fictional calendar preview',criteria:structuredClone(criteria),scenario,status:scenario==='failed'?'failed-preview':scenario==='private-denied'?'denied-preview':'ready-preview',busyIntervals,recordedAt:Date.now(),origin:'fictional-own-calendar-scenario',liveExecution:false,reviewSnapshot};
 w.objects.unshift(record);return {objectId:record.id,message:scenario==='busy'?'The named fictional busy intervals are ready for your planning review.':scenario==='empty'?'This named fictional example has no busy intervals; real availability is unknown.':'The fictional calendar response is unavailable. Keep availability unknown.'};
}
