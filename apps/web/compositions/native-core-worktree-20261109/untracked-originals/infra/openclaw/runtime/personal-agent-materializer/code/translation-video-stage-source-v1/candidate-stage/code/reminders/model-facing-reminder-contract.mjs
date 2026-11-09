/** Model presentation only. Original execute, requester/policy/receipt/Cron guards remain mandatory. */
import assert from 'node:assert/strict';
import {t as bindOriginalAvailability,i as readOriginalAvailability} from '/run/crays-owner-tools-whatsapp-live/node_modules/openclaw/dist/agent-tool-availability-Bgm3tNkT.mjs';
const object=(properties,required=[])=>({type:'object',additionalProperties:false,properties,...required.length?{required}:{}});
const string=(extra={})=>({type:'string',...extra});
const at=object({kind:{const:'at'},at:string({pattern:'^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d(?:\\.\\d{3})?Z$'})},['kind','at']);
const every=object({kind:{const:'every'},everyMs:{type:'integer',minimum:60000,maximum:31622400000},anchorMs:{type:'integer',minimum:0}},['kind','everyMs']);
const cron=object({kind:{const:'cron'},expr:string({maxLength:160}),tz:string({minLength:1,maxLength:80})},['kind','expr','tz']);
const payload=object({kind:{const:'agentTurn'},message:string({minLength:1,maxLength:500,pattern:'^[^\\u0000-\\u001f\\u007f]+$'})},['kind','message']);
const requestId=string({minLength:16,maxLength:80,pattern:'^[-_a-zA-Z0-9]{16,80}$',description:'Create an opaque unique request token yourself; do not ask the user. Keep it for the same logical request. If a prior call has an unknown outcome, reconcile it; never generate a replacement token to retry blindly.'});
const parameters=object({action:{type:'string',enum:['status','list','get','add','update','remove']},job:object({declarationKey:requestId,schedule:{anyOf:[at,every,cron]},payload,enabled:{type:'boolean'}},['declarationKey']),jobId:string(),includeDisabled:{type:'boolean'},offset:{type:'integer',minimum:0,maximum:10000},limit:{type:'integer',minimum:1,maximum:50}},['action']);
const description=`Personal reminders: ADD job ONLY {declarationKey,schedule,payload}. Never name/delivery/sessionTarget. Use (await catalog.search('automations'))[0].describe().
ADD: {action:"add",job:{declarationKey:"a_unique_request_token_16_to_80_chars",schedule:{kind:"at",at:"UTC ISO timestamp ending Z"},payload:{kind:"agentTurn",message:"literal reminder text"}}}. Generate declarationKey yourself. The job contains ONLY declarationKey,schedule,payload. Do not send name,agentId,enabled,sessionTarget,delivery,toolsAllow,timeoutSeconds,wakeMode or failureAlert. The trusted policy supplies identity, delivery and execution limits.
SCHEDULE: at must be at least60seconds and at most366days in the future; account for execution delay without silently changing the requested time. every requires everyMs60000..31622400000; cron requires a five-field expr and explicit IANA tz. Text is literal, nonempty,max500characters,no control characters. Conditional/script/stream/command jobs are unavailable.
UPDATE: {action:"update",jobId,job:{declarationKey,...only schedule,payload,enabled that change}}. GET/REMOVE: {action:"get"|"remove",jobId}. LIST: {action:"list",includeDisabled?,offset?,limit?}; STATUS:{action:"status"}. IDs must come from confirmed own receipts. Do not add fields from generic automation examples.
Unknown commit/delivery is not failure or absence. Do not recreate blindly. Report saved only after a real successful tool result; saved is not delivered. Original requester, policy, currentness, receipt, scheduler and channel checks remain decisive.`;
export function alignPersonalReminderToolPresentation(tool,{unit,config,selfRemoveOnly=false}){
 if(unit!=='crays-owner-tools-whatsapp-live')return tool;
 if(config?.plugins?.entries?.['crays-personal-reminder-policy']?.enabled!==true)return tool;
 assert.equal(tool?.name,'automations');assert.equal(typeof tool.execute,'function');
 if(selfRemoveOnly)return tool;
 // Original Code Mode validates the trusted policy's adjusted native job, not the narrower model input.
 // Preserve the ORIGINAL Cron execution contract via the original SDK availability metadata.
 // The trusted policy still rejects unsupported caller fields and supplies own identity/delivery.
 assert.equal(readOriginalAvailability(tool),undefined,'UNEXPECTED_ORIGINAL_REMINDER_AVAILABILITY');
 const originalExecutionParameters=tool.parameters;
 const executionBinding={prepare(){},executionSchema(){return originalExecutionParameters;}};
 bindOriginalAvailability(tool,executionBinding);
 assert.strictEqual(readOriginalAvailability(tool),executionBinding);
 // Mutate only model-facing values on the SAME native tool. WeakMap/WeakSet authority stays keyed to this object.
 const descriptionDescriptor=Object.getOwnPropertyDescriptor(tool,'description'),parametersDescriptor=Object.getOwnPropertyDescriptor(tool,'parameters');
 assert(descriptionDescriptor&&Object.hasOwn(descriptionDescriptor,'value')&&descriptionDescriptor.writable===true,'MUTABLE_ORIGINAL_DESCRIPTION_REQUIRED');
 assert(parametersDescriptor&&Object.hasOwn(parametersDescriptor,'value')&&parametersDescriptor.writable===true,'MUTABLE_ORIGINAL_PARAMETERS_REQUIRED');
 Object.defineProperties(tool,{description:{...descriptionDescriptor,value:description},parameters:{...parametersDescriptor,value:structuredClone(parameters)}});
 return tool;
}
