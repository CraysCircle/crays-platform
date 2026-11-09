import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {i as updateConfigMachineStateInDatabase} from '../../node_modules/openclaw/dist/config-machine-state-write-00ZeZq89.mjs';
import {l as runOpenClawStateWriteTransaction} from '../../node_modules/openclaw/dist/openclaw-state-db-CYbeloUH.mjs';
import {i as tableExists} from '../../node_modules/openclaw/dist/openclaw-state-db-schema-helpers-BlZefrPy.mjs';
import {i as executeSqliteQueryTakeFirstSync} from '../../node_modules/openclaw/dist/kysely-sync-K7ftY-g4.mjs';
import {r as getCronStoreKysely} from '../../node_modules/openclaw/dist/schema-DOrtVteD.mjs';
import {t as cronStoreKey} from '../../node_modules/openclaw/dist/key-BBZ40bDq.mjs';
import {n as readConfigMachineState} from '../../node_modules/openclaw/dist/config-machine-state-AJ6KDZWD.mjs';
import {n as resolveCronJobsStorePathFromConfig} from '../../node_modules/openclaw/dist/paths-BNmrkGS9.mjs';
import {a as closeOpenClawStateDatabaseAsync} from '../../node_modules/openclaw/dist/openclaw-state-db-cache-C7GkofAp.mjs';
/** Host-only startup operation. No generic key/value/path or model-facing mutation API. */
export function prepareOwnedReminderMachineState({config,env}){
 const ids=Object.keys(config?.agents?.entries??{});assert.deepEqual(ids,['crays-agent-thorben']);const a=config.agents.entries[ids[0]];
 assert.equal(config.cron?.enabled,true);assert.equal(config.cron.triggers?.enabled,false);assert(!Object.hasOwn(config.cron,'store'),'LEGACY_CRON_CONFIG_STORE_DENIED');
 assert(typeof a.workspace==='string'&&a.workspace.endsWith('/workspace'));const state=a.workspace.slice(0,-10);assert(path.isAbsolute(state)&&path.normalize(state)===state);assert.equal(a.agentDir,state+'/agents/'+ids[0]+'/agent');assert.equal(env.OPENCLAW_STATE_DIR,state);assert.equal(env.HOME,state);
 const st=fs.lstatSync(state);assert(st.isDirectory()&&!st.isSymbolicLink()&&st.uid===process.getuid()&&!(st.mode&0o077),'PRIVATE_OWN_STATE_REQUIRED');
 const expected=state+'/crays-personal-reminders-v1/jobs.json';
 // Original immediate transaction reads and conditionally updates only this exact key.
 let initialClaim=false;
 runOpenClawStateWriteTransaction(({db})=>updateConfigMachineStateInDatabase(db,'cron.store',current=>{
  assert(current===undefined||current===expected,'EXISTING_CRON_PARTITION_CONFLICT');
  if(current===undefined){
   // Exact one partition only, all original partition-keyed persisted Cron tables.
   const key=cronStoreKey(expected);for(const table of ['cron_jobs','cron_run_receipts','cron_job_runtime_authorities','cron_job_scratch']){
    if(tableExists(db,table))assert(!executeSqliteQueryTakeFirstSync(db,getCronStoreKysely(db).selectFrom(table).select('store_key').where('store_key','=',key).limit(1)),'EXISTING_CRON_PARTITION_ROWS_CONFLICT');
   }initialClaim=true;
  }return expected;
 },Date.now()),{env},{operationLabel:'crays-owned-reminder.cron-store-claim'});
 assert.equal(readConfigMachineState('cron.store',{env}),expected);assert.equal(resolveCronJobsStorePathFromConfig(config,env,env),expected,'ORIGINAL_CRON_PARTITION_READBACK_REQUIRED');
 return {status:'OWN_CRON_MACHINE_STATE_PINNED',partitionPinned:true,initialClaimFreshPartitionVerified:initialClaim,unrelatedKeysEnumerated:false,configLegacyStoreAdded:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);assert.equal(process.argv[2],'--prepare-owned-cron-machine-state');assert.equal(process.env.CRAYS_GATEWAY_UNIT,'crays-owner-tools-whatsapp-live');assert(/^[a-f0-9]{32}$/.test(process.env.INVOCATION_ID??''));assert(![0,1000].includes(process.getuid()));
 const state='/run/crays-owner-tools-whatsapp-live/state';assert.equal(process.env.OPENCLAW_STATE_DIR,state);assert.equal(process.env.HOME,state);
 const config={cron:{enabled:true,triggers:{enabled:false}},agents:{entries:{'crays-agent-thorben':{workspace:state+'/workspace',agentDir:state+'/agents/crays-agent-thorben/agent'}}}};
 try{console.log(JSON.stringify(prepareOwnedReminderMachineState({config,env:{...process.env}})));}finally{await closeOpenClawStateDatabaseAsync();}
}
