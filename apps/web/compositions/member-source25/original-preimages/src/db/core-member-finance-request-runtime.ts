import {memberXxlNoExpiryContract,memberXxlNoExpiryRole} from "./member-xxl-no-expiry-runtime";
import "server-only";
import {member073RuntimeRole,member073NativeBinding,member073RuntimeDatabase} from "./member073-native-binding";
import {createHash} from "node:crypto";
import {Pool,type PoolClient} from "pg";
import {MemberBookingScramClient,isMemberNativeCoreScramVerified} from "./core-member-booking-runtime-pool";

export const MEMBER_FINANCE_REQUEST_READ_SQL="select crays_core_rpc.read_own_member_finance_change_requests_v1($1::text,$2::text,$3::text) as payload";
const originalRole="crays_core_member_finance_change_request_rpc_runtime_v1";
const role=member073RuntimeRole(originalRole);
const reader="crays_core_rpc.read_own_member_finance_change_requests_v1(text,text,text)";
const writer="crays_core_rpc.submit_own_member_finance_change_request_v1(text,text,text,jsonb,text)";
export const MEMBER_FINANCE_REQUEST_WRITE_SQL="select crays_core_rpc.submit_own_member_finance_change_request_v1($1::text,$2::text,$3::text,$4::jsonb,$5::text) as payload";
const identity="crays_core_rpc.resolve_auth0_identity_bundle_v2(text,text,text)";
type FunctionPin=Readonly<{owner:string;definitionSha256:string}>;
type Contract=Readonly<{schema:"crays.member.finance-request.runtime.v1";role:string;expiresAt:string;approvalReceiptSha256:string;functions:Readonly<Record<string,FunctionPin>>}>;
const privateFunctions=["crays_core_rpc.member_finance_change_request_actor_v1(text,text,text)","crays_core_rpc.member_finance_change_request_orders_v1(text)","crays_core_rpc.member_finance_change_request_json_v1(crays_core.member_demo_finance_change_requests)"];
const signatures=[reader,writer,identity,...privateFunctions];
const hash=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
function unavailable():never{throw Error("MEMBER_FINANCE_REQUEST_RUNTIME_NOT_ADMITTED");}
export function memberFinanceRequestRuntimeConfiguration(env:NodeJS.ProcessEnv=process.env){
 const native=member073NativeBinding(originalRole,"CRAYS_MEMBER_FINANCE_REQUEST_RPC",role,env);
 const raw=env.CRAYS_MEMBER_FINANCE_REQUEST_RPC_CONTRACT,uriText=env.CRAYS_MEMBER_FINANCE_REQUEST_RPC_DATABASE_URL;
 const target=env.CRAYS_MEMBER_FINANCE_REQUEST_RPC_TARGET;
 if(!raw||!uriText||(!["xl-crays_core-test","xxl-member-core-test"].includes(target??"")&&!native))unavailable();
 const database=native?.database??(target==="xxl-member-core-test"?"member_core_01a11155_20261011":"crays_core");
 const host=native?.host??(target==="xxl-member-core-test"?"172.23.0.2":"127.0.0.1");
 const parsed:unknown=JSON.parse(raw);
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))unavailable();
 const c=parsed as Contract;
 if(Object.keys(c).sort().join(",")!=="approvalReceiptSha256,expiresAt,functions,role,schema"||
 c.schema!=="crays.member.finance-request.runtime.v1"||c.role!==role||!/^[a-f0-9]{64}$/.test(c.approvalReceiptSha256)||
 (!memberXxlNoExpiryContract(c,originalRole,env)&&(!Number.isFinite(Date.parse(c.expiresAt))||Date.parse(c.expiresAt)<=Date.now()||Date.parse(c.expiresAt)>Date.now()+7200000))||
 !c.functions||Object.keys(c.functions).sort().join("|")!==signatures.slice().sort().join("|"))unavailable();
 for(const p of Object.values(c.functions))if(!p||Object.keys(p).sort().join(",")!=="definitionSha256,owner"||
 p.owner!=="crays_core_identity_rpc_owner_v2"||!/^[a-f0-9]{64}$/.test(p.definitionSha256))unavailable();
 const u=new URL(uriText);
 if(!["postgres:","postgresql:"].includes(u.protocol)||!(u.hostname===host||target==="xl-crays_core-test"&&u.hostname==="localhost")||!u.port||
 u.pathname!=="/"+database||decodeURIComponent(u.username)!==role||!u.password||u.search||u.hash)unavailable();
 return {contract:c,connectionString:uriText,database,fingerprint:hash(target+raw+uriText)};
}
async function verify(client:PoolClient,c:Contract,database:string,write:boolean){
 const r=await client.query(`select current_database() database,current_user role,session_user session_role,
  current_setting('transaction_read_only') read_only,r.rolsuper,r.rolbypassrls,r.rolcreatedb,r.rolcreaterole,
  r.rolreplication,r.rolinherit,r.rolcanlogin,r.rolvaliduntil,
  exists(select from pg_auth_members m where m.member=r.oid) memberships
  from pg_roles r where r.rolname=current_user`);
 const v=r.rows[0];
 if(r.rowCount!==1||v.database!==database||v.role!==role||v.session_role!==role||v.read_only!==(write?"off":"on")||
 v.rolsuper||v.rolbypassrls||v.rolcreatedb||v.rolcreaterole||v.rolreplication||v.rolinherit||!v.rolcanlogin||v.memberships||
 (!memberXxlNoExpiryRole(c,originalRole,v.rolvaliduntil)&&(!(v.rolvaliduntil instanceof Date)||v.rolvaliduntil.toISOString()!==new Date(c.expiresAt).toISOString()||v.rolvaliduntil.getTime()<=Date.now())))unavailable();
 const f=await client.query(`select p.oid::regprocedure::text signature,pg_get_userbyid(p.proowner) owner,
  p.prosecdef definer,pg_get_functiondef(p.oid) definition,
  has_function_privilege(current_user,p.oid,'EXECUTE') executable from pg_proc p where p.oid::regprocedure::text=any($1::text[])`,[signatures]);
 if(f.rowCount!==6)unavailable();
 for(const v of f.rows){const p=c.functions[v.signature];const expectedDefiner=v.signature!==privateFunctions[2];if(!p||v.definer!==expectedDefiner||v.owner!==p.owner||hash(v.definition)!==p.definitionSha256||v.executable!==[reader,writer].includes(v.signature))unavailable();}
 const broad=await client.query(`select exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('crays_core','crays_core_rpc') and c.relkind in ('r','p','v','m','f')
  and has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) broad`);
 if(broad.rows[0]?.broad!==false)unavailable();
 const extra=await client.query(`select exists(select from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('crays_core','crays_core_rpc') and has_schema_privilege(current_user,n.oid,'USAGE') and has_function_privilege(current_user,p.oid,'EXECUTE')
 and p.oid<>ALL($1::regprocedure[])) extra`,[[reader,writer]]);
 if(extra.rows[0]?.extra!==false)unavailable();
}
let active:{fingerprint:string;pool:Pool}|undefined;
export class MemberFinanceRequestCommitUnknown extends Error {constructor(){super("MEMBER_FINANCE_REQUEST_COMMIT_UNKNOWN");}}
/** SDK checks and strict payload validation happen INSIDE the transaction before COMMIT.
 * No automatic write retry. Unknown COMMIT is reconciled with the original requestId via read feed.
 */
export async function queryMemberFinanceRequests<T>(write:boolean,values:readonly string[],guard:()=>Promise<void>,validate:(payload:unknown)=>T):Promise<T>{
 if(values.length!==(write?5:3)||values.some(v=>typeof v!=="string")||!/^[a-f0-9]{64}$/.test(values[2]))unavailable();
 const config=memberFinanceRequestRuntimeConfiguration();
 if(active&&active.fingerprint!==config.fingerprint)unavailable();
 active??={fingerprint:config.fingerprint,pool:new Pool({connectionString:config.connectionString,Client:MemberBookingScramClient,
 ssl:false,max:1,connectionTimeoutMillis:3000,idleTimeoutMillis:1000,application_name:"crays-member-finance-request-only",
 options:"-c statement_timeout=5000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=5000"})};
 const client=await active.pool.connect();let commitAttempted=false;let destroyed=false;
 try{
  if(!isMemberNativeCoreScramVerified(client))unavailable();
  await client.query(write?"BEGIN":"BEGIN READ ONLY");await verify(client,config.contract,config.database,write);await guard();
  const sql=write?MEMBER_FINANCE_REQUEST_WRITE_SQL:MEMBER_FINANCE_REQUEST_READ_SQL;
  const result=await client.query(sql,[...values]);
  if(result.rows.length!==1||Object.keys(result.rows[0]).join(",")!=="payload")unavailable();
  const payload=validate(result.rows[0].payload);
  // Fresh statement snapshot rechecks the exact original identity/binding after the write.
  const fresh=await client.query(MEMBER_FINANCE_REQUEST_READ_SQL,values.slice(0,3));
  if(fresh.rows.length!==1)unavailable();
  await guard();await verify(client,config.contract,config.database,write);
  if(memberFinanceRequestRuntimeConfiguration().fingerprint!==config.fingerprint)unavailable();
  commitAttempted=true;await client.query("COMMIT");return payload;
 }catch(e){
  if(commitAttempted){client.release(true);destroyed=true;throw new MemberFinanceRequestCommitUnknown();}
  await client.query("ROLLBACK").catch(()=>undefined);throw e;
 }finally{if(!destroyed)client.release();}
}
export async function closeMemberFinanceRequestPool(){const old=active;active=undefined;if(old)await old.pool.end();}
