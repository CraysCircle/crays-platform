import {memberXxlNoExpiryContract,memberXxlNoExpiryRole} from "./member-xxl-no-expiry-runtime";
import "server-only";
import {member073RuntimeRole,member073NativeBinding,member073RuntimeDatabase} from "./member073-native-binding";
import {createHash} from "node:crypto";
import {Pool,type PoolClient} from "pg";
import {MemberBookingScramClient,isMemberNativeCoreScramVerified} from "./core-member-booking-runtime-pool";

export const MEMBER_TEST_STAYS_SQL="select crays_core_rpc.read_own_clubs_member_test_stays_v1($1::text,$2::text,$3::text,$4::text,$5::text,$6::integer) as payload";
const originalRole="crays_core_member_test_stays_rpc_runtime_v1";
const role=member073RuntimeRole(originalRole);
const reader="crays_core_rpc.read_own_clubs_member_test_stays_v1(text,text,text,text,text,integer)";
const identity="crays_core_rpc.resolve_auth0_identity_bundle_v2(text,text,text)";
type FunctionPin=Readonly<{owner:string;definitionSha256:string}>;
type Contract=Readonly<{schema:"crays.member.test-stays.read-runtime.v1";role:string;expiresAt:string;approvalReceiptSha256:string;functions:Readonly<Record<string,FunctionPin>>}>;
const hash=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
function unavailable():never{throw Error("MEMBER_TEST_STAYS_RUNTIME_NOT_ADMITTED");}
export function memberTestStaysRuntimeConfiguration(env:NodeJS.ProcessEnv=process.env){
 const native=member073NativeBinding(originalRole,"CRAYS_MEMBER_TEST_STAYS_RPC",role,env);
 const raw=env.CRAYS_MEMBER_TEST_STAYS_RPC_CONTRACT,uriText=env.CRAYS_MEMBER_TEST_STAYS_RPC_DATABASE_URL;
 const target=env.CRAYS_MEMBER_TEST_STAYS_RPC_TARGET;
 if(!raw||!uriText||(!["xl-crays_core-test","xxl-member-core-test"].includes(target??"")&&!native))unavailable();
 const database=native?.database??(target==="xxl-member-core-test"?"member_core_01a11155_20261011":"crays_core");
 const host=native?.host??(target==="xxl-member-core-test"?"172.23.0.2":"127.0.0.1");
 const parsed:unknown=JSON.parse(raw);
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))unavailable();
 const c=parsed as Contract;
 if(Object.keys(c).sort().join(",")!=="approvalReceiptSha256,expiresAt,functions,role,schema"||
 c.schema!=="crays.member.test-stays.read-runtime.v1"||c.role!==role||!/^[a-f0-9]{64}$/.test(c.approvalReceiptSha256)||
 (!memberXxlNoExpiryContract(c,originalRole,env)&&(!Number.isFinite(Date.parse(c.expiresAt))||Date.parse(c.expiresAt)<=Date.now()||Date.parse(c.expiresAt)>Date.now()+7200000))||
 !c.functions||Object.keys(c.functions).sort().join("|")!==[reader,identity].sort().join("|"))unavailable();
 for(const p of Object.values(c.functions))if(!p||Object.keys(p).sort().join(",")!=="definitionSha256,owner"||
 p.owner!=="crays_core_identity_rpc_owner_v2"||!/^[a-f0-9]{64}$/.test(p.definitionSha256))unavailable();
 const u=new URL(uriText);
 if(!["postgres:","postgresql:"].includes(u.protocol)||!(u.hostname===host||target==="xl-crays_core-test"&&u.hostname==="localhost")||!u.port||
 u.pathname!=="/"+database||decodeURIComponent(u.username)!==role||!u.password||u.search||u.hash)unavailable();
 return {contract:c,connectionString:uriText,database,fingerprint:hash(target+raw+uriText)};
}
async function verify(client:PoolClient,c:Contract,database:string){
 const r=await client.query(`select current_database() database,current_user role,session_user session_role,
  current_setting('transaction_read_only') read_only,r.rolsuper,r.rolbypassrls,r.rolcreatedb,r.rolcreaterole,
  r.rolreplication,r.rolinherit,r.rolcanlogin,r.rolvaliduntil,
  exists(select from pg_auth_members m where m.member=r.oid) memberships
  from pg_roles r where r.rolname=current_user`);
 const v=r.rows[0];
 if(r.rowCount!==1||v.database!==database||v.role!==role||v.session_role!==role||v.read_only!=="on"||
 v.rolsuper||v.rolbypassrls||v.rolcreatedb||v.rolcreaterole||v.rolreplication||v.rolinherit||!v.rolcanlogin||v.memberships||
 (!memberXxlNoExpiryRole(c,originalRole,v.rolvaliduntil)&&(!(v.rolvaliduntil instanceof Date)||v.rolvaliduntil.toISOString()!==new Date(c.expiresAt).toISOString()||v.rolvaliduntil.getTime()<=Date.now())))unavailable();
 const f=await client.query(`select p.oid::regprocedure::text signature,pg_get_userbyid(p.proowner) owner,
  p.prosecdef definer,pg_get_functiondef(p.oid) definition,
  has_function_privilege(current_user,p.oid,'EXECUTE') executable from pg_proc p where p.oid=any($1::regprocedure[])`,[[reader,identity]]);
 if(f.rowCount!==2)unavailable();
 for(const v of f.rows){const p=c.functions[v.signature];if(!p||!v.definer||v.owner!==p.owner||hash(v.definition)!==p.definitionSha256||v.executable!==(v.signature===reader))unavailable();}
 const broad=await client.query(`select exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('crays_core','crays_core_rpc') and c.relkind in ('r','p','v','m','f')
  and has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) broad`);
 if(broad.rows[0]?.broad!==false)unavailable();
}
let active:{fingerprint:string;pool:Pool}|undefined;
export async function queryMemberOwnTestStays(text:string,values:readonly(string|number|null)[]){
 if(text!==MEMBER_TEST_STAYS_SQL||values.length!==6||typeof values[0]!=="string"||typeof values[1]!=="string"||
 typeof values[2]!=="string"||!/^[a-f0-9]{64}$/.test(values[2])||values[3]!==null&&typeof values[3]!=="string"||
 !["original_screenshot_baseline","full_workflow"].includes(String(values[4]))||!Number.isInteger(values[5])||Number(values[5])<1||Number(values[5])>50)unavailable();
 const config=memberTestStaysRuntimeConfiguration();
 if(active&&active.fingerprint!==config.fingerprint)unavailable();
 active??={fingerprint:config.fingerprint,pool:new Pool({connectionString:config.connectionString,Client:MemberBookingScramClient,
 ssl:false,max:1,connectionTimeoutMillis:3000,idleTimeoutMillis:1000,
 application_name:"crays-member-own-test-stays-readonly",
 options:"-c default_transaction_read_only=on -c statement_timeout=3000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=5000"})};
 const client=await active.pool.connect();
 try{
  if(!isMemberNativeCoreScramVerified(client))unavailable();
  await client.query("BEGIN READ ONLY");await verify(client,config.contract,config.database);
  await client.query(text,[...values]);
  // Read Committed: the same identity-bound reader rechecks V2/revocation in
  // a fresh statement snapshot. Return only this final read, never older rows.
  const result=await client.query(text,[...values]);await verify(client,config.contract,config.database);
  if(memberTestStaysRuntimeConfiguration().fingerprint!==config.fingerprint)unavailable();
  await client.query("COMMIT");return {rows:result.rows};
 }catch(e){await client.query("ROLLBACK").catch(()=>undefined);throw e;}finally{client.release();}
}
export async function closeMemberTestStaysPool(){const old=active;active=undefined;if(old)await old.pool.end();}
