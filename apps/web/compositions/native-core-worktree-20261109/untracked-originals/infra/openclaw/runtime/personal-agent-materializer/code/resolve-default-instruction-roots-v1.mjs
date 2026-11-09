/** Fixed post-composition guide path resolution. Same artifacts and authority;
 * no per-person guide alias mounts, installation or factory activation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareChannelIndependentGeneralRuntime as prepareV5} from './prepare-approved-general-runtime.candidate-v5.mjs';
import DEPLOY from './approved-general-baseline-v5-catalogue-source-v1/FINAL_CHANNEL_INDEPENDENT_PROJECTION.json' with {type:'json'};
const hash=x=>createHash('sha256').update(x).digest('hex');
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
/** Must run after V5 (including unchanged V4 path assertions), never on request JSON. */
export function resolveDefaultInstructionRoots(prepared,context){
 assert.equal(prepared.toolCount,29);assert.equal(prepared.skillCount,32);
 assert.deepEqual(prepared.standard,DEPLOY.standard,'EXACT_FINAL_DEFAULT_STANDARD_REQUIRED');
 assert.deepEqual(prepared.legacyProjection.catalog,DEPLOY.legacyProjection.catalog,'EXACT_LEGACY_CATALOGUE_REQUIRED');
 const aliases=DEPLOY.legacyProjection.instructionAliasSuffixes.map(a=>({runtimePath:context.runtime+a.runtimeSuffix,artifactPath:a.artifactPath}));
 assert.equal(aliases.length,2);assert.deepEqual(prepared.legacyProjection.instructionAliases,aliases,'EXACT_CANONICAL_ALIAS_PROVENANCE_REQUIRED');
 const base=prepared.config,dirs=base.skills.load.extraDirs;
 assert.deepEqual(base.tools.allow,DEPLOY.standard.descriptor.tools);
 assert.deepEqual(base.agents.entries[context.agentId].skills,DEPLOY.standard.descriptor.skills);
 assert(Array.isArray(dirs)&&new Set(dirs).size===dirs.length,'UNIQUE_INSTRUCTION_DIRECTORIES_REQUIRED');
 for(const alias of aliases){assert.equal(dirs.filter(p=>p===alias.runtimePath).length,1,'EXACT_SINGLE_SOURCE_ALIAS_REQUIRED');assert(!dirs.includes(alias.artifactPath),'DUPLICATE_TARGET_GUIDE_ROOT_DENIED');}
 const resolved=dirs.map(p=>aliases.find(a=>a.runtimePath===p)?.artifactPath??p);
 assert.equal(new Set(resolved).size,resolved.length,'UNIQUE_RESOLVED_ROOTS_REQUIRED');
 const expected=[...DEPLOY.legacyProjection.catalog.skills.map(s=>s.root+'/skills'),...DEPLOY.fixedGuides.map(s=>s.extraDir)];
 assert.deepEqual(resolved.slice().sort(),expected.slice().sort(),'EVERY_GUIDE_MUST_USE_EXACT_CATALOGUE_ROOT');
 assert(!resolved.some(p=>p.startsWith(context.runtime+'/')),'NO_PRIVATE_PERSON_INSTRUCTION_ALIAS_REQUIRED');
 const config={...base,skills:{...base.skills,load:{...base.skills.load,extraDirs:resolved}}};
 for(const key of Reflect.ownKeys(base))if(key!=='skills')assert.strictEqual(config[key],base[key]);
 for(const key of Reflect.ownKeys(base.skills))if(key!=='load')assert.strictEqual(config.skills[key],base.skills[key]);
 for(const key of Reflect.ownKeys(base.skills.load))if(key!=='extraDirs')assert.strictEqual(config.skills.load[key],base.skills.load[key]);
 assert(/^[a-f0-9]{64}$/.test(prepared.projectionSha256));
 return {...prepared,config,legacyCompositionProjectionSha256:prepared.projectionSha256,
  projectionSha256:hash(encode({domain:'crays.default-instruction-direct-roots.v1',legacyProjectionSha256:prepared.projectionSha256,resolutions:aliases})),
  instructionDirectoryMode:'EXACT_IMMUTABLE_ARTIFACT_ROOTS',resolvedInstructionAliases:aliases,
  personalInstructionAliasMountsRequired:false,nativeReadonlyAliasesVerified:false,defaultFactorySwitched:false};
}
export async function prepareChannelIndependentGeneralRuntime(base,context,options){
 return resolveDefaultInstructionRoots(await prepareV5(base,context,options),context);
}
