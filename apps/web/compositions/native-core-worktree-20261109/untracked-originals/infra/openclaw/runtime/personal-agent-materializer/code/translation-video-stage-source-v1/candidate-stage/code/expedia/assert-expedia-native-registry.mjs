/** Exact selected original plugin/dependency pins. This creates no native policy or caller authority. */
import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash}from'node:crypto';
import B from './BASELINE_BINDINGS.json' with {type:'json'};
import {assertExpediaModelPolicy,assertExpediaPersonalHome}from'./compose-expedia-search-delta.mjs';
function pinnedRootFile(row){
 const p=B.pluginRoot+'/'+row.relative;assert(row.bytes>0&&row.bytes<=1048576);const fd=fs.openSync(p,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);let data;
 try{const before=fs.fstatSync(fd,{bigint:true});assert(before.isFile()&&before.uid===0n&&before.gid===0n&&before.nlink===1n&&(before.mode&0o777n)===0o444n&&before.size===BigInt(row.bytes),'EXPEDIA_IMMUTABLE_ROOT_FILE_REQUIRED');data=Buffer.alloc(row.bytes+1);let n=0;while(n<data.length){const got=fs.readSync(fd,data,n,data.length-n,null);if(!got)break;n+=got;}assert.equal(n,row.bytes);assert.equal(createHash('sha256').update(data.subarray(0,n)).digest('hex'),row.sha256,'EXPEDIA_CONTENT_PIN_REQUIRED');const after=fs.fstatSync(fd,{bigint:true});for(const k of ['dev','ino','uid','gid','mode','nlink','size','mtimeNs','ctimeNs'])assert.equal(after[k],before[k],'EXPEDIA_FILE_CHANGED_DURING_READ');}finally{data?.fill(0);fs.closeSync(fd);}
}
export function assertExpediaLoadedRecord(record){
 assert.equal(record.id,B.pluginId);assert.equal(record.status,'loaded');assert.equal(record.origin,'config','EXPEDIA_INSTALLED_CONFIG_ORIGIN_REQUIRED');assert.equal(record.source,B.pluginRoot+'/dist/index.js','EXPEDIA_ORIGINAL_ENTRYPOINT_REQUIRED');assert.equal(record.rootDir,B.pluginRoot,'EXPEDIA_EXACT_ROOT_REQUIRED');
 for(const row of B.contentPins)pinnedRootFile(row);
 return true;
}
export function assertExpediaNativeRegistry({config,registry}){
 assertExpediaModelPolicy(config);assertExpediaPersonalHome(config,process.env);assert(Array.isArray(registry?.plugins)&&Array.isArray(registry.tools)&&Array.isArray(registry.typedHooks)&&Array.isArray(registry.trustedToolPolicies));
 const records=registry.plugins.filter(p=>p.id===B.pluginId);assert.equal(records.length,1,'EXPEDIA_REQUIRED_SINGLE_NATIVE_RECORD');assertExpediaLoadedRecord(records[0]);
 const tools=registry.tools.filter(p=>p.pluginId===B.pluginId);assert.equal(tools.length,5,'EXPEDIA_ORIGINAL_FIVE_REGISTRATIONS_REQUIRED');assert.deepEqual(tools.flatMap(t=>t.names).sort(),[...B.registeredOriginalToolNames].sort());
 for(const tool of tools){assert.equal(tool.origin,'config');assert.equal(tool.source,B.pluginRoot+'/dist/index.js');assert.equal(tool.rootDir,B.pluginRoot);assert.equal(typeof tool.factory,'function');assert.equal(tool.names.length,1);}
 assert.equal(registry.typedHooks.filter(p=>p.pluginId===B.pluginId).length,0,'EXPEDIA_HAS_NO_TYPED_HOOKS');assert.equal(registry.trustedToolPolicies.filter(p=>p.pluginId===B.pluginId).length,0,'EXPEDIA_HAS_NO_TRUSTED_POLICY');
 return Object.freeze({originalNativeRegistrations:5,configuredModelTools:3,signupDeferred:true,verifyDeferred:true,credentialsRead:false,modelOrProviderCalled:false,liveSearchProven:false,bookingCompleted:false});
}
