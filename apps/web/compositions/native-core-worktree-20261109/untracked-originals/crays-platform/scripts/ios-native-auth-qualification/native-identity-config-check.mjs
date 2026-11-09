import './runtime-source-loader.mjs';
import assert from 'node:assert/strict';
import {buildCoreNativeIdentityRpcPoolConfig,buildCoreOriginalMemberIdentityRpcPoolConfig,getCoreNativeIdentityRpcPool,closeCoreNativeIdentityRpcPool} from '../../src/db/core-identity-runtime-pool.ts';
const uri='postgresql://crays_core_identity_rpc_runtime_v1:synthetic-unused-password@ep-wandering-field-astlbgje.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const contract={role:'crays_core_identity_rpc_runtime_v1',identityOwner:'crays_core_identity_rpc_owner_v1',identityDefinitionSha256:'a'.repeat(64),generationSha256:'b'.repeat(64)};
const env={CRAYS_CORE_NATIVE_IDENTITY_RPC_DATABASE_URL:uri,CRAYS_CORE_NATIVE_IDENTITY_RPC_CONTRACT:JSON.stringify(contract)};
const c=buildCoreNativeIdentityRpcPoolConfig(env);assert.equal(c.database,'neondb');assert.equal(c.originalRequiredChannelBinding,true);assert.equal(c.ssl.rejectUnauthorized,true);assert.equal(c.originalContract.identityDefinitionSha256,contract.identityDefinitionSha256);
assert.throws(()=>buildCoreNativeIdentityRpcPoolConfig({CRAYS_CORE_ORIGINAL_MEMBER_RPC_DATABASE_URL:uri,CRAYS_CORE_ORIGINAL_MEMBER_RPC_CONTRACT:JSON.stringify({...contract,ownStateOwner:contract.identityOwner,ownStateDefinitionSha256:'c'.repeat(64)})}));
assert.throws(()=>buildCoreNativeIdentityRpcPoolConfig({...env,PGUSER:'neondb_owner'}));
assert.throws(()=>buildCoreNativeIdentityRpcPoolConfig({...env,CRAYS_CORE_NATIVE_IDENTITY_RPC_DATABASE_URL:uri.replace('crays_core_identity_rpc_runtime_v1:','neondb_owner:')}));
assert.throws(()=>buildCoreNativeIdentityRpcPoolConfig({...env,CRAYS_CORE_NATIVE_IDENTITY_RPC_CONTRACT:JSON.stringify({...contract,ownStateOwner:contract.identityOwner})}));
assert.throws(()=>buildCoreOriginalMemberIdentityRpcPoolConfig({CRAYS_CORE_ORIGINAL_MEMBER_RPC_DATABASE_URL:uri,CRAYS_CORE_ORIGINAL_MEMBER_RPC_CONTRACT:JSON.stringify(contract)}));
const previous=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env);
try {const p=getCoreNativeIdentityRpcPool();await assert.rejects(p.query('select crays_core_rpc.read_own_clubs_member_state_v1($1::text,$2::text,$3::text) as payload',['synthetic','synthetic','synthetic']));}
finally{await closeCoreNativeIdentityRpcPool();for(const[k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;}
console.log('PASS changed native identity configuration boundary; no connection opened, no credentials fetched, no original Member/TEST fallback.');
