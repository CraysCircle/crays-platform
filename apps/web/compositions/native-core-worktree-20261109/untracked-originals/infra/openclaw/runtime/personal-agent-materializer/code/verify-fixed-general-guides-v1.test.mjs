import test from 'node:test';
import assert from 'node:assert/strict';
import {fixedGeneralGuideBindings,verifyFixedGeneralGuides} from './verify-fixed-general-guides-v1.mjs';

test('all three actual published Root-owned guide trees match exact bytes and manifests',async()=>{
 const result=await verifyFixedGeneralGuides(fixedGeneralGuideBindings());
 assert.deepEqual(result.skills.map(s=>s.name),['crays-weather-public','crays-personal-translation','crays-short-video-explanation']);
 assert.equal(result.skills.reduce((n,s)=>n+s.bytes,0),14327);
 assert.equal(result.nativeReadonlyAliasesVerified,false);
 assert.equal(result.authorityGranted,false);
});
test('changed paths, file pins, addressing or extra metadata fail before filesystem lookup',async()=>{
 const changes=[r=>r.pop(),r=>r.reverse(),r=>r[0].root='/tmp/forbidden-guide',r=>r[0].manifest.relativePath='../ARTIFACT_MANIFEST.json',r=>r[1].skill.sha256='0'.repeat(64),r=>r[1].contentAddressing='sha256-of-manifest',r=>r[0].authorityGranted=true,r=>r.push(structuredClone(r[0]))];
 for(const change of changes){const rows=fixedGeneralGuideBindings();change(rows);await assert.rejects(verifyFixedGeneralGuides(rows),/EXACT_THREE_FIXED_GUIDES_REQUIRED/);}
});
test('returned binding copies cannot alter subsequent expected fixed pins',()=>{
 const a=fixedGeneralGuideBindings();a[0].skill.sha256='0'.repeat(64);
 assert.notEqual(fixedGeneralGuideBindings()[0].skill.sha256,a[0].skill.sha256);
});
