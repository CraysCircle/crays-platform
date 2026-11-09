import "server-only";
import {assertNativeCartReview,type NativeCartContext,NativeCartContextRejected} from "@/lib/clubs/member-demo-vendure-provider";
import {createHash} from "node:crypto";
import {Pool,type PoolClient} from "pg";
import {MemberBookingScramClient,isMemberNativeCoreScramVerified} from "./core-member-booking-runtime-pool";
const role="crays_core_member_demo_commerce_rpc_runtime_v1";
const statusSignature="crays_core_rpc.read_own_member_demo_commerce_command_v1(text,text,text,text)";
export class MemberCommerceStatusNotAdmitted extends Error{constructor(){super("COMMERCE_STATUS_RPC_NOT_ADMITTED");}}
export const commerceSql={status:"select crays_core_rpc.read_own_member_demo_commerce_command_v1($1::text,$2::text,$3::text,$4::text) as payload",read:"select crays_core_rpc.read_own_member_demo_commerce_v1($1::text,$2::text,$3::text) as payload",prepare:"select crays_core_rpc.prepare_own_member_demo_commerce_v1($1::text,$2::text,$3::text,$4::jsonb,$5::text) as payload",finish:"select crays_core_rpc.finish_own_member_demo_commerce_v1($1::text,$2::text,$3::text,$4::text,$5::jsonb,$6::text) as payload"} as const;
const signatures={actor:"crays_core_rpc.member_demo_commerce_actor_v1(text,text,text)",identity:"crays_core_rpc.resolve_auth0_identity_bundle_v2(text,text,text)",read:"crays_core_rpc.read_own_member_demo_commerce_v1(text,text,text)",prepare:"crays_core_rpc.prepare_own_member_demo_commerce_v1(text,text,text,jsonb,text)",finish:"crays_core_rpc.finish_own_member_demo_commerce_v1(text,text,text,text,jsonb,text)"};
type Contract={schema:string;role:string;expiresAt:string;approvalReceiptSha256:string;functions:Record<string,{owner:string;definitionSha256:string}>};
function admittedSignatures(c:Contract){const base=Object.values(signatures);return Object.hasOwn(c.functions,statusSignature)?[...base,statusSignature]:base;}
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
function config(){const text=process.env.CRAYS_MEMBER_DEMO_COMMERCE_RPC_CONTRACT,url=process.env.CRAYS_MEMBER_DEMO_COMMERCE_RPC_DATABASE_URL;if(!text||!url||process.env.CRAYS_MEMBER_DEMO_COMMERCE_RPC_TARGET!=="xxl-member-core-test")throw Error("COMMERCE_CORE_NOT_ADMITTED");const c:Contract=JSON.parse(text),u=new URL(url);if(c.schema!=="crays.member.demo-commerce.write-runtime.v1"||c.role!==role||!Number.isFinite(Date.parse(c.expiresAt))||Date.parse(c.expiresAt)<=Date.now()||Date.parse(c.expiresAt)>Date.now()+7200000||!/^[a-f0-9]{64}$/.test(c.approvalReceiptSha256)||u.hostname!=="172.23.0.2"||u.pathname!=="/member_core_01a11155_20261011"||decodeURIComponent(u.username)!==role||!u.password||u.search||u.hash||u.port!=="5432"||!["postgres:","postgresql:"].includes(u.protocol)||Object.keys(c.functions).sort().join("|")!==admittedSignatures(c).sort().join("|"))throw Error("COMMERCE_CORE_CONTRACT_INVALID");return {c,url,fingerprint:hash(text+url)};}
async function verify(client:PoolClient,c:Contract){
 const v=(await client.query(`select current_database() database,current_user role,session_user session_role,r.rolsuper,r.rolbypassrls,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolinherit,r.rolcanlogin,r.rolvaliduntil,exists(select from pg_auth_members m where m.member=r.oid) memberships from pg_roles r where r.rolname=current_user`)).rows[0];
 if(!v||v.database!=="member_core_01a11155_20261011"||v.role!==role||v.session_role!==role||v.rolsuper||v.rolbypassrls||v.rolcreatedb||v.rolcreaterole||v.rolreplication||v.rolinherit||!v.rolcanlogin||v.memberships||!(v.rolvaliduntil instanceof Date)||v.rolvaliduntil.toISOString()!==new Date(c.expiresAt).toISOString())throw Error("COMMERCE_CORE_ROLE_INVALID");
 const expected=admittedSignatures(c),executable=expected.filter(signature=>signature!==signatures.actor&&signature!==signatures.identity);
 const f=await client.query("select p.oid::regprocedure::text signature,pg_get_userbyid(p.proowner) owner,p.prosecdef definer,pg_get_functiondef(p.oid) definition,has_function_privilege(current_user,p.oid,'EXECUTE') executable from pg_proc p where p.oid=any($1::regprocedure[])",[expected]);if(f.rowCount!==expected.length)throw Error("COMMERCE_CORE_FUNCTION_INVALID");for(const r of f.rows){const pin=c.functions[r.signature];if(!pin||pin.owner!=="crays_core_identity_rpc_owner_v2"||r.owner!==pin.owner||!r.definer||r.executable!==executable.includes(r.signature)||hash(r.definition)!==pin.definitionSha256)throw Error("COMMERCE_CORE_FUNCTION_INVALID");}
 const extra=await client.query("select exists(select from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('crays_core','crays_core_rpc') and has_function_privilege(current_user,p.oid,'EXECUTE') and not(p.oid=any($1::regprocedure[]))) extra",[executable]);if(extra.rows[0]?.extra!==false)throw Error("COMMERCE_CORE_EXTRA_FUNCTION_DENIED");
 const broad=await client.query("select exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('crays_core','crays_core_rpc') and c.relkind in ('r','p','v','m','f') and has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) broad");if(broad.rows[0]?.broad!==false)throw Error("COMMERCE_CORE_BROAD_ROLE_DENIED");
}
let active:{fingerprint:string;pool:Pool}|undefined;
export async function queryMemberDemoCommerce(kind:keyof typeof commerceSql,values:unknown[],guard?:{mode:"prepare";context:NativeCartContext}|{mode:"statusBarrier";accountId:string}){
 if(!(kind in commerceSql)||values.length!==({status:4,read:3,prepare:5,finish:6}[kind]))throw Error("COMMERCE_CORE_QUERY_DENIED");if(kind==="prepare"&&guard?.mode!=="prepare")throw new NativeCartContextRejected();if(guard&&guard.mode==="statusBarrier"&&kind!=="status")throw new NativeCartContextRejected();const x=config();if(kind==="status"&&!Object.hasOwn(x.c.functions,statusSignature))throw new MemberCommerceStatusNotAdmitted();if(active&&active.fingerprint!==x.fingerprint)throw Error("COMMERCE_RUNTIME_CHANGED");active??={fingerprint:x.fingerprint,pool:new Pool({connectionString:x.url,Client:MemberBookingScramClient,ssl:false,max:1,connectionTimeoutMillis:3000,idleTimeoutMillis:1000,application_name:"crays-member-demo-commerce",options:"-c statement_timeout=5000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=7000"})};
 const client=await active.pool.connect();try{if(!isMemberNativeCoreScramVerified(client))throw Error("COMMERCE_SCRAM_REQUIRED");await client.query(kind==="read"||kind==="status"?"BEGIN READ ONLY":"BEGIN");await verify(client,x.c);
 if(guard){
  const accountId=guard.mode==="prepare"?guard.context.review.accountId:guard.accountId;
  if(accountId!=="acct_384c05e7-e716-4dc9-864d-8c63bf13876c")throw new NativeCartContextRejected();
  await client.query("select pg_advisory_xact_lock(hashtextextended($1::text,30111))",[accountId]);
  if(guard.mode==="prepare"){
   const current=await client.query(commerceSql.read,values.slice(0,3));
   if(current.rows.length!==1)throw new NativeCartContextRejected();
   const command=JSON.parse(String(values[3])),payload=current.rows[0].payload;
   assertNativeCartReview(guard.context,payload,command);
   if(command.action==="restart"&&(payload.cart?.state!=="reconciliation_required"||payload.cart.canStartFreshCart!==true||payload.cart.unknownCommandId!==command.commandId))throw new NativeCartContextRejected();
  }
 }
 const result=await client.query(commerceSql[kind],values);await verify(client,x.c);if(config().fingerprint!==x.fingerprint)throw Error("COMMERCE_RUNTIME_CHANGED");await client.query("COMMIT");if(result.rows.length!==1)throw Error("COMMERCE_CORE_ENVELOPE_INVALID");return result.rows[0].payload;}catch(e){await client.query("ROLLBACK").catch(()=>undefined);throw e;}finally{client.release();}
}
