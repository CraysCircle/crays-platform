import B from './REMINDER_BASELINE_BINDINGS.json' with {type:'json'};
/** Pure proposal only. Never applies config, grants native authority, opens a store or sends. */
import assert from 'node:assert/strict';import path from 'node:path';
const POLICY='crays-personal-reminder-policy';
export const REMINDER_POLICY_ROOT='/opt/crays/openclaw/plugin-artifacts/crays-personal-reminder-policy/f406dba6c7e7edd7939ad1247f0ed8c3ab709252de225c7c24d3620383748a7a';
const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(x);
const abs=x=>typeof x==='string'&&x.startsWith('/')&&path.posix.normalize(x)===x&&!/[\x00-\x1f\x7f]/.test(x);
export function composePersonalReminderCandidate(base){
 const ids=Object.keys(base?.agents?.entries??{});assert.equal(ids.length,1,'Exact isolated personal agent required');const agentId=ids[0];assert(id(agentId));const agent=base.agents.entries[agentId];
 assert.deepEqual(base.plugins.allow,B.pluginAllow);assert.deepEqual(base.tools.allow,B.tools);assert.deepEqual(agent.tools.allow,B.tools);assert.deepEqual(agent.skills,B.skills);
 assert(abs(agent.workspace)&&agent.workspace.endsWith('/workspace'));const stateDir=agent.workspace.slice(0,-10);assert(stateDir&&abs(stateDir));assert.equal(agent.agentDir,stateDir+'/agents/'+agentId+'/agent');
 assert.equal(base.cron?.enabled,false,'Do not merge/repoint an already active scheduler');assert.equal(base.cron.store,undefined,'Existing chosen cron partition requires separate review');
 assert.deepEqual(base.agents.defaults.heartbeat,{every:'0m',target:'none'});assert.deepEqual(agent.heartbeat,{every:'0m',target:'none'});assert.equal(base.hooks?.enabled,false);
 assert.equal(base.bindings?.length,1);const route=base.bindings[0];assert.equal(route.agentId,agentId);assert.equal(route.match.channel,'whatsapp');const accountId=route.match.accountId;assert(id(accountId));
 const channel=base.channels?.whatsapp,account=channel?.accounts?.[accountId];assert(channel?.enabled===true&&account?.enabled===true);assert.deepEqual(Object.keys(channel.accounts),[accountId]);
 for(const row of [channel,account]){assert.equal(row.dmPolicy,'allowlist');assert.equal(row.groupPolicy,'disabled');assert.equal(row.configWrites,false);assert.equal(row.allowFrom.length,1);}
 const senderId=channel.allowFrom[0];assert(typeof senderId==='string'&&/^[+][1-9][0-9]{7,14}$/.test(senderId));assert.deepEqual(account.allowFrom,[senderId]);assert.deepEqual(base.commands.ownerAllowFrom,['whatsapp:'+senderId]);
 assert(Array.isArray(base.tools.allow)&&!base.tools.allow.includes('automations')&&!base.tools.allow.includes('cron'));assert.deepEqual(agent.tools.allow,base.tools.allow);
 for(const policy of [base.tools,agent.tools]){assert.equal(policy.profile,'full');assert.deepEqual(policy.deny,[]);assert.equal(policy.fs.workspaceOnly,true);assert(!policy.alsoAllow?.length);}
 assert(Array.isArray(base.plugins.allow)&&!base.plugins.allow.includes(POLICY));assert(!Object.hasOwn(base.plugins.entries,POLICY));assert(!base.plugins.load.paths.includes(REMINDER_POLICY_ROOT));
 const cronStore=stateDir+'/crays-personal-reminders-v1/jobs.json';
 const add=p=>({...p,allow:[...p.allow,'automations']});
 const candidate={...base,tools:add(base.tools),agents:{...base.agents,entries:{[agentId]:{...agent,tools:add(agent.tools)}}},plugins:{...base.plugins,allow:[...base.plugins.allow,POLICY],load:{...base.plugins.load,paths:[...base.plugins.load.paths,REMINDER_POLICY_ROOT]},entries:{...base.plugins.entries,[POLICY]:{enabled:true,config:{bindings:[{agentId,channel:'whatsapp',accountId,senderId}]}}}},cron:{...base.cron,enabled:true,triggers:{...base.cron.triggers,enabled:false}},skills:{...base.skills,workshop:{...base.skills.workshop,autonomous:{...base.skills.workshop?.autonomous,mode:'off'}}}};
 for(const[k,v]of Object.entries(base))if(!['tools','agents','plugins','cron','skills'].includes(k))assert.strictEqual(candidate[k],v);
 assert.strictEqual(candidate.agents.defaults,base.agents.defaults);assert.strictEqual(candidate.agents.entries[agentId].model,agent.model);assert.strictEqual(candidate.plugins.entries['crays-service-notices'],base.plugins.entries['crays-service-notices']);
 return {candidateConfig:candidate,scope:{agentId,channel:'whatsapp',accountId,cronStore},activation:{allowedByComposer:false,requiredSameProcessRegistryInspection:true,requiredOwnNativeRequesterAndCronRpcProof:true,requiredFreshPartitionAbsenceProof:true,requiredActualDueCancelRestartDeliveryAcceptance:true},limits:{originalFirstPartyTool:'automations',newSchedulerCreated:false,existingRecordsChanged:false,legacyJobsEnumerated:false,credentialsSupplied:false,personalAutoRepliesEnabled:false}};
}
