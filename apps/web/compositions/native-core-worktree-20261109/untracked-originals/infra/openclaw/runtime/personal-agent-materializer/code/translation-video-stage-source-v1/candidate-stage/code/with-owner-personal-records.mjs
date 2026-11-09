/** Pure narrow addition to the existing owner composer, never an auth/config/state loader. */
import assert from 'node:assert/strict';
const ID='crays-agent-thorben',PLUGIN='crays-personal-records',TOOL='crays_personal_records';
const ARTIFACT='/opt/crays/openclaw/plugin-artifacts/'+PLUGIN+'/315bccd5e9d5507617090cce5040cf05538347ec701cf9d33dd850f7762e0356';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const names=x=>Array.isArray(x)&&x.every(y=>typeof y==='string');
export function withOwnerPersonalRecords(base,{runtime}={}) {
 assert(object(base)&&typeof runtime==='string'&&/^\/run\/crays-owner-tools-[a-z0-9-]+$/.test(runtime),'Owner runtime required');
 assert(object(base.agents?.entries)&&Object.keys(base.agents.entries).length===1&&object(base.agents.entries[ID]),'Exact isolated owner composer required');
 const agent=base.agents.entries[ID];
 assert.equal(agent.workspace,runtime+'/state/workspace');assert.equal(agent.agentDir,runtime+'/state/agents/'+ID+'/agent');
 assert(names(base.plugins?.allow)&&object(base.plugins.entries)&&names(base.plugins.load?.paths),'Existing narrow plugin composer required');
 for(const policy of [base.tools,agent.tools])assert(object(policy)&&names(policy.allow)&&names(policy.deny)&&!policy.deny.some(x=>x==='*'||x===TOOL)&&policy.fs?.workspaceOnly===true,'Existing tool policy denied or unbounded');
 assert(!base.plugins.deny?.some(x=>x==='*'||x===PLUGIN),'Plugin explicitly denied');
 assert(base.plugins.enabled!==false&&base.plugins.entries[PLUGIN]?.enabled!==false,'Plugin explicitly disabled');
 assert(!base.plugins.load.paths.some(p=>p.includes('/'+PLUGIN+'/')&&p!==ARTIFACT),'Conflicting records artifact');
 const toolPolicy=x=>({...x,allow:[...new Set([...x.allow,TOOL])]});
 // Copy only modified public policy branches. Keep existing native auth/account references untouched.
 return {...base,agents:{...base.agents,entries:{[ID]:{...agent,tools:toolPolicy(agent.tools)}}},tools:toolPolicy(base.tools),plugins:{...base.plugins,
  allow:[...new Set([...base.plugins.allow,PLUGIN])],load:{...base.plugins.load,paths:[...new Set([...base.plugins.load.paths,ARTIFACT])]},
  entries:{...base.plugins.entries,[PLUGIN]:{...base.plugins.entries[PLUGIN],enabled:true}}}};
}
export function ownerRecordsModelProofPrompt(nonce) {
 assert(typeof nonce==='string'&&/^[a-zA-Z0-9_-]{16,48}$/.test(nonce),'Public fixture nonce required');
 const title='CRAYS explicit synthetic note '+nonce,text='Public synthetic save/read fixture '+nonce;
 return 'Use crays_personal_records to save exactly this explicitly requested public synthetic note: '+JSON.stringify({operation:'create',kind:'note',title,text,idempotencyKey:'owner_note_'+nonce})+
  '. Read that exact note using the real id returned by the create receipt (operation read). Report the actual saved version and exact returned text. Do not invent receipts, substitute read/exec for this tool, create other notes, or inspect any other existing personal records.';
}
