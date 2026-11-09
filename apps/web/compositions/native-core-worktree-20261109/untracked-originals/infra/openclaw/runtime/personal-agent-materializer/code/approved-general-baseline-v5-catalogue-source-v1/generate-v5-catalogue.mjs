/** Deterministic host-source projection builder; no imports of providers, private stores or runtime actions. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import LEGACY from '../APPROVED_GENERAL_CHANNEL_INDEPENDENT_CATALOGUE.candidate.json' with {type:'json'};
import V5 from '../approved-general-baseline-composition-v5-translation-video/FIXED_THREE_GUIDE_BINDINGS.json' with {type:'json'};
import BATCH from '../translation-video-batch-v1/TRANSLATION_VIDEO_BINDINGS.json' with {type:'json'};
export const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
export const descriptorSha=x=>createHash('sha256').update(encode(x)).digest('hex');
export function fixedGuideRows(){const w=V5.weather;return [{name:w.name,root:w.root,extraDir:w.extraDir,manifest:{relativePath:w.publishedManifest.path.slice(w.root.length+1),bytes:w.publishedManifest.bytes,sha256:w.publishedManifest.sha256},skill:{relativePath:w.publishedGuide.path.slice(w.root.length+1),bytes:w.publishedGuide.bytes,sha256:w.publishedGuide.sha256},contentAddressing:'sha256-of-manifest'},...BATCH.artifacts.map(a=>({name:a.name,root:a.root,extraDir:a.extraDir,manifest:{relativePath:a.manifestRelativePath,bytes:a.manifestBytes,sha256:a.manifestSha256},skill:{relativePath:a.relativePath,bytes:a.bytes,sha256:a.sha256},contentAddressing:'sha256-of-exact-SKILL.md'}))];}
/** Inputs exist for meaningful deterministic validation, not model/request configuration. Exactly the fixed admitted source catalogue is permitted. Actual Root verification remains the separate strict verifier's responsibility. */
export function createV5Projection(legacy=LEGACY,fixedGuides=fixedGuideRows()){
 assert.deepEqual(legacy,LEGACY,'EXACT_EXISTING_LEGACY_CATALOGUE_REQUIRED');assert.deepEqual(fixedGuides,fixedGuideRows(),'EXACT_THREE_PUBLISHED_GUIDE_PINS_REQUIRED');
 assert.equal(descriptorSha(legacy.standard.descriptor),legacy.standard.sha256);assert.equal(legacy.catalog.packageSha256,legacy.standard.sha256);
 assert.deepEqual(legacy.standard.descriptor.skills,V5.baselineInstructionNames);assert.equal(legacy.standard.descriptor.tools.length,29);assert(!legacy.standard.descriptor.tools.includes('automations'),'CHANNEL_INDEPENDENT_REMINDER_NOT_ADMITTED');
 const legacyProjection=structuredClone(Object.fromEntries(['baseProjectedSha256','standard','catalog','instructionAliasSuffixes'].map(k=>[k,legacy[k]])));
 const standard=structuredClone(legacy.standard);standard.descriptor.skills=[...standard.descriptor.skills,...fixedGuides.map(x=>x.name)];assert.equal(new Set(standard.descriptor.skills).size,32);standard.sha256=descriptorSha(standard.descriptor);
 assert.deepEqual(standard.descriptor.tools,legacy.standard.descriptor.tools);assert.deepEqual(standard.descriptor.plugins,legacy.standard.descriptor.plugins);
 // Distinct package hashes are intentional: legacy verifier uses its unchanged29 descriptor/catalogue, fixed guide verifier adds precisely three separately verified roots.
 return {legacyProjection,standard,fixedGuides:structuredClone(fixedGuides)};
}
