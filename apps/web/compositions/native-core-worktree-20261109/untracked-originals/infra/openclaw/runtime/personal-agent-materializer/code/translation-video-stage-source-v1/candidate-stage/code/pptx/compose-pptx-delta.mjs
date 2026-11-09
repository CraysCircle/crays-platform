/** Fixed same-tool source upgrade only. No auth/state reads, sends or runtime activation. */
import assert from 'node:assert/strict';
const OLD_PLUGIN="/opt/crays/openclaw/renderer-artifacts/document-exports-xlsx-v03/d8ac913b1428ceb577e2cb3678ad26cac6bd476c0bbf852d262dd73de42d2714/plugin",NEW_PLUGIN="/opt/crays/openclaw/plugin-artifacts/crays-document-exports/2ba15cf0a89256da7985bcce7fc3af4f0d050ea493ebe369ab3ed09828660caf",OLD_SKILL="/opt/crays/openclaw/skill-artifacts/crays-document-exports/7b85813d43331b02bb396f0d45ed8ccaa9c6b48a530a753b7e8f12b170d10fb7/skills",NEW_SKILL="/opt/crays/openclaw/skill-artifacts/crays-document-exports/2a5bcc11c8077df16a9265257e054055907844ef1c7015575eb9d423be43cbd0/skills",ID='crays-document-exports',TOOL='crays_document_exports';
export function composePptxDelta(base){
 const ids=Object.keys(base?.agents?.entries??{});assert.equal(ids.length,1);const agent=base.agents.entries[ids[0]];
 assert.equal(base.tools.allow.length,10);assert.deepEqual(base.tools.allow,agent.tools.allow);assert.equal(base.tools.allow.filter(x=>x===TOOL).length,1);assert.equal(agent.skills.length,7);assert.equal(agent.skills.filter(x=>x===ID).length,1);
 assert.equal(base.cron?.enabled,false);assert(!base.tools.allow.includes('automations')&&!base.tools.allow.includes('cron'));assert(!base.plugins.allow.includes('crays-personal-reminder-policy'));
 assert.equal(base.plugins.load.paths.filter(x=>x===OLD_PLUGIN).length,1);assert(!base.plugins.load.paths.includes(NEW_PLUGIN));assert.equal(base.plugins.entries[ID]?.enabled,true);
 assert.equal(base.skills.load.extraDirs.filter(x=>x===OLD_SKILL).length,1);assert(!base.skills.load.extraDirs.includes(NEW_SKILL));
 const cfg={...base,plugins:{...base.plugins,load:{...base.plugins.load,paths:base.plugins.load.paths.map(x=>x===OLD_PLUGIN?NEW_PLUGIN:x)}},skills:{...base.skills,load:{...base.skills.load,extraDirs:base.skills.load.extraDirs.map(x=>x===OLD_SKILL?NEW_SKILL:x)}}};
 for(const [key,value]of Object.entries(base))if(!['plugins','skills'].includes(key))assert.strictEqual(cfg[key],value);
 assert.strictEqual(cfg.plugins.allow,base.plugins.allow);assert.strictEqual(cfg.plugins.entries,base.plugins.entries);assert.strictEqual(cfg.skills.entries,base.skills.entries);
 return cfg;
}
