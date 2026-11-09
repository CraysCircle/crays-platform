import assert from 'node:assert/strict';
import B from './ARTIFACT_BINDINGS.json' with {type:'json'};
export const SELECTED_SKILL_NAMES=Object.freeze(B.artifacts.map(x=>x.name));
/** Pure fixed source composition: instructions never grant an executable tool. */
export function composeSelectedLocalSkills(base){
 const ids=Object.keys(base?.agents?.entries??{});assert.equal(ids.length,1);const id=ids[0],a=base.agents.entries[id];
 assert.equal(base.tools.allow.length,26);assert.equal(base.tools.allow.at(-1),'automations');assert.deepEqual(a.tools.allow,base.tools.allow);assert.equal(a.skills.length,21);assert.equal(new Set(a.skills).size,21);
 assert.equal(SELECTED_SKILL_NAMES.length,5);assert.equal(new Set(SELECTED_SKILL_NAMES).size,5);
 const dirs=B.artifacts.map(x=>x.extraDir);assert.equal(new Set(dirs).size,5);assert(Array.isArray(base.skills.load.extraDirs));
 for(const x of B.artifacts){assert(!a.skills.includes(x.name));assert(!base.skills.load.extraDirs.includes(x.extraDir));assert(x.extraDir===x.root+'/skills');assert(x.skillFile.startsWith(x.extraDir+'/'));}
 const candidate={...base,agents:{...base.agents,entries:{[id]:{...a,skills:[...a.skills,...SELECTED_SKILL_NAMES]}}},skills:{...base.skills,load:{...base.skills.load,extraDirs:[...base.skills.load.extraDirs,...dirs]}}};
 assert.strictEqual(candidate.tools,base.tools);assert.strictEqual(candidate.plugins,base.plugins);assert.strictEqual(candidate.auth,base.auth);assert.strictEqual(candidate.cron,base.cron);assert.strictEqual(candidate.agents.defaults,base.agents.defaults);return candidate;
}
