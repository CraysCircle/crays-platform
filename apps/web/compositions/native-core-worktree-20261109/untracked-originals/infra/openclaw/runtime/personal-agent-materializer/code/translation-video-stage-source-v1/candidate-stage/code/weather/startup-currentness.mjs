/** Synchronous startup evidence currentness only; never Core or owner authority. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const digest=raw=>createHash('sha256').update(raw).digest('hex');
function readEvidence(file){
 const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const before=fs.fstatSync(fd,{bigint:true});
  assert(before.isFile()&&before.nlink===1n&&(before.mode&0o022n)===0n&&before.size>0n&&before.size<=8n*1024n*1024n,'BOUNDED_STARTUP_EVIDENCE_REQUIRED');
  const raw=fs.readFileSync(fd),after=fs.fstatSync(fd,{bigint:true}),linked=fs.lstatSync(file,{bigint:true});
  for(const s of [after,linked])for(const key of ['dev','ino','size','mtimeNs','ctimeNs','mode','uid','gid','nlink'])assert.equal(s[key],before[key],'STARTUP_EVIDENCE_CHANGED_DURING_READ');
  assert(!linked.isSymbolicLink());assert.equal(BigInt(raw.length),before.size);
  return raw;
 }finally{fs.closeSync(fd);}
}
export function createStartupCurrentnessGuard({runtime,unit,invocationId,plan,gate,verified}){
 assert.equal(runtime,'/run/'+unit,'EXACT_STARTUP_RUNTIME_REQUIRED');
 assert(/^[a-f0-9]{32}$/.test(invocationId??''),'LATCHED_INVOCATION_REQUIRED');
 const paths=[runtime+'/code/PLAN.json',runtime+'/review/DURABLE_ADMISSION.json',runtime+'/START_VERIFIED.json'];
 const initial=paths.map(readEvidence),hashes=initial.map(digest);
 const [p,g,v]=initial.map(raw=>JSON.parse(raw.toString('utf8')));
 assert.deepEqual(p,plan,'ALREADY_VERIFIED_PLAN_CHANGED');assert.deepEqual(g,gate,'ALREADY_VERIFIED_ADMISSION_CHANGED');assert.deepEqual(v,verified,'ALREADY_VERIFIED_START_CHANGED');
 assert.equal(p.unit,unit);assert.equal(p.run,runtime);assert.equal(p.mode,'DURABLE_OWNER_WHATSAPP_RECOVERY');assert.equal(p.launchEnabled,true);assert.equal(p.finiteTestWindowApplied,false);
 assert.equal(g.unit,unit);assert.equal(g.mode,p.mode);assert.equal(g.planSha256,hashes[0],'ACTUAL_CANDIDATE_PLAN_PIN_REQUIRED');
 for(const name of ['durableServiceAuthorized','gatewayStartAllowed','whatsappStartAllowed','originalOwnerAndBusinessExclusive','fullSourceInventoryVerified'])assert.equal(g[name],true);
 assert.equal(g.testWindowContractApplied,false);assert.equal(v.invocationId,invocationId);assert.equal(v.admissionSha256,hashes[1]);assert.equal(v.allBoundBytesMatch,true);
 // No historical baseline hash is compared with this candidate's PLAN.
 function assertStartupCurrent(){
  assert.equal(process.env.INVOCATION_ID,invocationId,'STARTUP_INVOCATION_REVOKED');
  assert.equal(process.env.CRAYS_GATEWAY_UNIT,unit,'STARTUP_UNIT_REVOKED');
  paths.forEach((file,i)=>assert.equal(digest(readEvidence(file)),hashes[i],'STARTUP_EVIDENCE_REVOKED'));
 }
 assertStartupCurrent();return assertStartupCurrent;
}
