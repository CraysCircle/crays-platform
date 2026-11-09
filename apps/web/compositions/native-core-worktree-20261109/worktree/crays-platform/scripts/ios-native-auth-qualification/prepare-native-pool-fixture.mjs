import {readFileSync} from 'node:fs';
import {Pool} from 'pg';
import assert from 'node:assert/strict';
import * as native from '../../src/db/native-personal-runtime-pool.ts';
export let nativePool, rawPool, contract;
export async function prepareIsolatedNativePool(admin){
 assert.equal(process.env.CRAYS_NATIVE_CUSTOMER_FIXTURE,'synthetic-source-composition-only');
 for(const file of ['0215_personal_message_attachment_custody.sql','0217_personal_message_original_display_name.sql','0219_native_personal_runtime_acl.sql','0222_native_personal_contact_registration_acl.sql'])await admin.query(readFileSync(new URL('../../database/migrations/'+file,import.meta.url),'utf8'));
 const uri=new URL(process.env.CRAYS_DATABASE_URL);assert.equal(uri.hostname,'localhost');assert.equal(uri.pathname,'/ios_native_qualification');uri.username=native.NATIVE_PERSONAL_RUNTIME_ROLE;
 rawPool=new Pool({connectionString:uri.toString(),ssl:false,max:2});
 const client=await rawPool.connect();
 try{const catalogue=await native.readNativePersonalRuntimeCatalogue(client);contract=Object.freeze({accessManifestSha256:native.NATIVE_PERSONAL_ACCESS_SHA256,catalogueSha256:native.nativePersonalRuntimeCatalogueSHA256(catalogue)});}
 finally{client.release();}
 nativePool=native.createVerifiedNativePersonalRuntimePool(rawPool,contract,'ios_native_qualification');
 native.bindIsolatedFixtureNativePool(nativePool);
}
