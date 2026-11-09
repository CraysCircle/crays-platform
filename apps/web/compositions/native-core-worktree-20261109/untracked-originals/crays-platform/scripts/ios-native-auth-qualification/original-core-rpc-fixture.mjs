/** TEST TRANSPORT ONLY, loaded exclusively by runtime-source-loader explicit gate.
 * Original production pool/host/DDL admission is NOT replaced in the product.
 * Actual fixed V2 SQL executes under an own disposable no-table-access RPC role.
 */
import {Pool} from 'pg';
import {lstatSync} from 'node:fs';
import {resolve} from 'node:path';
const deny=()=>{throw Error('ORIGINAL_CORE_POOL_NOT_QUALIFIED_BY_LAB_TRANSPORT');};
export const getCoreIdentityRuntimeRpcPool=deny;
let pool;
export function getCoreOriginalMemberIdentityRpcPool(){
 if(process.env.CRAYS_NATIVE_CONTROLLED_ORIGINAL_RPC_SQL!=='true')deny();
 const url=new URL(process.env.CRAYS_DATABASE_URL),socket=url.searchParams.get('host');
 if(url.hostname!=='localhost'||url.pathname!=='/ios_native_qualification'||!socket||socket!==process.env.CRAYS_NATIVE_SQL_FIXTURE_SOCKET||!socket.startsWith('/tmp/crays-ios-native-sql-')||!socket.endsWith('/socket')||lstatSync(resolve(socket,'..')).uid!==process.getuid()||(lstatSync(resolve(socket,'..')).mode&0o077)!==0)deny();
 if(!pool)pool=new Pool({host:socket,port:5432,database:'ios_native_qualification',user:'ios_native_original_rpc_fixture',ssl:false,max:1,connectionTimeoutMillis:2000,query_timeout:2500,options:'-c default_transaction_read_only=on -c statement_timeout=2000 -c lock_timeout=1000'});
 return {async query(sql,args){
  if(sql!=='select crays_core_rpc.resolve_auth0_identity_bundle_v2($1::text,$2::text,$3::text) as payload'||!Array.isArray(args)||args.length!==3)deny();
  const result=await pool.query(sql,args);return {rowCount:result.rowCount,rows:result.rows};
 }};
}
export async function closeCoreOriginalMemberIdentityRpcPool(){if(pool){const held=pool;pool=undefined;await held.end();}}

// Same explicitly gated disposable V2 SQL role; never a production fallback.
export const getCoreNativeIdentityRpcPool=getCoreOriginalMemberIdentityRpcPool;
export const closeCoreNativeIdentityRpcPool=closeCoreOriginalMemberIdentityRpcPool;
