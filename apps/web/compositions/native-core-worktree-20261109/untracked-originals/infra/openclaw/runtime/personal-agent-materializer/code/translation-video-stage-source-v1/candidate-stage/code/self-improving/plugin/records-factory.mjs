import {executePersonalRecord} from './records-store.mjs';
import {realpathSync,lstatSync} from 'node:fs';
const TOOL='crays_personal_records';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(x)&&!['__proto__','prototype','constructor'].includes(x);
const config=ctx=>typeof ctx.getRuntimeConfig==='function'?ctx.getRuntimeConfig():ctx.runtimeConfig??ctx.config;
const directoryIdentity=path=>{const s=lstatSync(path,{bigint:true});return `${s.dev}:${s.ino}`;};
const result=payload=>({content:[{type:'text',text:JSON.stringify(payload)}],details:payload});
export function createNativePersonalRecords(ctx) {
  if(!object(ctx)||!id(ctx.agentId)||ctx.senderIsOwner!==true||typeof ctx.assertInvocationCurrent!=='function'||
    typeof ctx.sessionKey!=='string'||!ctx.sessionKey.startsWith(`agent:${ctx.agentId}:`)||
    !ctx.sessionKey.slice(`agent:${ctx.agentId}:`.length)||ctx.sessionKey.slice(`agent:${ctx.agentId}:`.length).startsWith(':'))return null;
  let agentDir,workspace,initial;
  try {
    initial=config(ctx)?.agents?.entries?.[ctx.agentId];
    if(!object(initial)||typeof ctx.agentDir!=='string'||typeof ctx.workspaceDir!=='string'||
      (initial.agentDir!==undefined && realpathSync(initial.agentDir)!==realpathSync(ctx.agentDir))||realpathSync(initial.workspace)!==realpathSync(ctx.workspaceDir))return null;
    agentDir=realpathSync(ctx.agentDir);workspace=realpathSync(ctx.workspaceDir);
  }catch{return null;}
  const capturedAgentDirectory=directoryIdentity(agentDir),capturedWorkspace=directoryIdentity(workspace);
  const agentId=ctx.agentId,sessionKey=ctx.sessionKey,nativeCurrent=ctx.assertInvocationCurrent.bind(ctx);
  const guard=()=>{
    nativeCurrent();const row=config(ctx)?.agents?.entries?.[agentId];
    if(ctx.agentId!==agentId||ctx.sessionKey!==sessionKey||ctx.senderIsOwner!==true||!object(row)||
      (row.agentDir!==undefined && realpathSync(row.agentDir)!==agentDir)||realpathSync(row.workspace)!==workspace||
      realpathSync(ctx.agentDir)!==agentDir||realpathSync(ctx.workspaceDir)!==workspace||
      directoryIdentity(agentDir)!==capturedAgentDirectory||directoryIdentity(workspace)!==capturedWorkspace)throw new Error('Invocation revoked');
  };
  return {name:TOOL,label:'Personal notes and tasks',
    description:'Save only explicit user-authored private notes, task lists or journal entries. Never copy disclosed CRAYS source context, infer facts or build profiles. Local records only: no reminders, calendar, contacts or automatic memory learning. Read/list/create/update/delete with exact versions and idempotency keys. Operation fields: create(kind,title,text,idempotencyKey); update(id,expectedVersion,title,text,state,idempotencyKey), NEVER kind; delete(id,expectedVersion,idempotencyKey); read(id); list(optional offset). Before update read the current record and preserve unrequested fields. Every update requires state: note/journal=open; task=open or done. Never infer a corrected fact or bypass conflicts.',
    parameters:{type:'object',additionalProperties:false,required:['operation'],properties:{
      operation:{type:'string',enum:['create','update','delete','read','list']},kind:{type:'string',enum:['note','task','journal'],description:'CREATE ONLY. Immutable after creation; omit from update/delete/read/list.'},
      id:{type:'string'},title:{type:'string',maxLength:256},text:{type:'string',maxLength:8192},
      state:{type:'string',enum:['open','done'],description:'UPDATE REQUIRED. Preserve current state unless explicitly changed. note/journal require open; only task may be done. Omit on create/delete/read/list.'},expectedVersion:{type:'integer',minimum:1,maximum:2147483646,description:'UPDATE/DELETE REQUIRED. Exact current version from read; conflict requires reread, not guessing.'},
      idempotencyKey:{type:'string',minLength:16,maxLength:96},offset:{type:'integer',minimum:0,maximum:10000}}},
    async execute(_callId,args,signal) {
      if(signal?.aborted)return result({status:'cancelled',code:'INVOCATION_CANCELLED'});
      const current=()=>{if(signal?.aborted)throw new Error('Aborted');guard();};
      try {current();return result(executePersonalRecord({agentId,agentDir,workspace,guard:current},args));}
      catch(e){return result({status:'denied',code:e.safeCode??'PERSONAL_RECORDS_UNAVAILABLE',...e.safeValidation?{validation:e.safeValidation}:{}});}
    }};
}
export default {id:'crays-personal-records',name:'Private personal notes/tasks',version:'0.1.0',
  configSchema:{jsonSchema:{type:'object',additionalProperties:false,properties:{}}},
  register(api){if(typeof api?.registerTool!=='function')throw new Error('Native registration required');
    api.registerTool({contextVersion:2,create:createNativePersonalRecords},{name:TOOL,optional:true});}};
