import assert from 'node:assert/strict';
import PROJECTION from './SHARED_DEFAULT_PROJECTION.json' with {type:'json'};
import STANDARD from './PROJECTED_RUNTIME_STANDARD.json' with {type:'json'};
import {sha} from './verify-shared-artifacts.mjs';
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
export const projectionSha256=sha(encode(PROJECTION));
export const projectedStandard=STANDARD;
/** Fixed server source only. Does not accept caller-selected catalogs, roots or skill names. */
export function applySharedDefaultInheritance(config,{agentId,basePackageSha256}){
 assert.equal(basePackageSha256,PROJECTION.basePackageSha256);assert.equal(sha(encode(STANDARD.descriptor)),STANDARD.sha256);assert.equal(STANDARD.descriptor.runtimeProjectionSha256,projectionSha256);
 const out=structuredClone(config),a=out.agents.entries[agentId];assert(a&&Object.keys(out.agents.entries).length===1);assert.equal(a.skills.length,21);assert.equal(out.tools.allow.length,25);
 for(const p of PROJECTION.pluginRootReplacements){const i=out.plugins.load.paths.indexOf(p.oldRoot);assert(i>=0&&out.plugins.load.paths.lastIndexOf(p.oldRoot)===i);assert(!out.plugins.load.paths.includes(p.newRoot));out.plugins.load.paths[i]=p.newRoot;}
 const replacement=PROJECTION.preferenceSkillReplacement;const i=out.skills.load.extraDirs.indexOf(replacement.before.root+'/skills');assert(i>=0&&out.skills.load.extraDirs.lastIndexOf(replacement.before.root+'/skills')===i);out.skills.load.extraDirs[i]=replacement.after.root+'/skills';
 for(const s of PROJECTION.selectedOriginalInstructions){assert(!a.skills.includes(s.name));assert(!out.skills.load.extraDirs.includes(s.root+'/skills'));a.skills.push(s.name);out.skills.load.extraDirs.push(s.root+'/skills');out.skills.entries[s.name]={enabled:true};}
 assert.deepEqual(out.tools,config.tools);assert.deepEqual(a.tools,config.agents.entries[agentId].tools);assert.deepEqual(out.auth,config.auth);assert.deepEqual(out.channels,config.channels);assert.deepEqual(out.bindings,config.bindings);assert.deepEqual(out.cron,config.cron);assert.deepEqual(a.skills,STANDARD.descriptor.skills);
 // Inactive bundles remain in the source catalog; none becomes selectable through this projection.
 for(const s of PROJECTION.inactiveOriginalInstructions)assert(!out.skills.load.extraDirs.includes(s.root+'/skills'));
 return out;
}
