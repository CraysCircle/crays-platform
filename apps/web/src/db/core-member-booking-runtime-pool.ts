import "server-only";
import {createHash} from "node:crypto";
import {Pool, Client, type PoolClient, type PoolConfig} from "pg";
import {MEMBER_NATIVE_HOLD_SQL,MEMBER_NATIVE_CART_SQL,type MemberNativeBookingQuery} from "./member-native-booking-rpc";

const role = "crays_core_member_booking_rpc_runtime_v1";
const exposed = new Set([
  "crays_core_rpc.issue_own_member_test_hold_v1(text,text,text,text,text)",
  "crays_core_rpc.prepare_own_member_hold_bound_cart_v1(text,text,text,text,text)",
]);
const required = [
  ...exposed,
  "crays_core_rpc.member_booking_actor_v1(text,text,text)",
  "crays_core_rpc.resolve_auth0_identity_bundle_v2(text,text,text)",
  "crays_core.cclub066_issue_test_hold(text,text,text)",
  "crays_core.cclub066_prepare_hold_bound_cart(text,text,text)",
];
type Contract = Readonly<{
  schema:"crays.member.test-booking-runtime.v1";
  role:string;
  expiresAt:string;
  approvalReceiptSha256:string;
  functions:Readonly<Record<string,Readonly<{owner:string;definitionSha256:string}>>>;
}>;
const sha = (value:string) => createHash("sha256").update(value,"utf8").digest("hex");
function unavailable():never {throw new Error("MEMBER_BOOKING_RUNTIME_NOT_ADMITTED");}

export function memberBookingRuntimeConfiguration(env:NodeJS.ProcessEnv=process.env) {
  const raw=env.CRAYS_MEMBER_TEST_BOOKING_RPC_CONTRACT;
  const uriText=env.CRAYS_MEMBER_TEST_BOOKING_RPC_DATABASE_URL;
  if (!raw || !uriText) unavailable();
  const parsed:unknown=JSON.parse(raw);
  if (!parsed || typeof parsed!=="object" || Array.isArray(parsed)) unavailable();
  const contract=parsed as Contract;
  if (Object.keys(contract).sort().join(",")!=="approvalReceiptSha256,expiresAt,functions,role,schema" ||
      contract.schema!=="crays.member.test-booking-runtime.v1" || contract.role!==role ||
      !/^[a-f0-9]{64}$/.test(contract.approvalReceiptSha256) ||
      !Number.isFinite(Date.parse(contract.expiresAt)) || Date.parse(contract.expiresAt)<=Date.now() ||
      Date.parse(contract.expiresAt)>Date.now()+2*60*60*1000 ||
      !contract.functions || Object.keys(contract.functions).sort().join("|")!==[...required].sort().join("|")) unavailable();
  for (const value of Object.values(contract.functions)) {
    if (!value || Object.keys(value).sort().join(",")!=="definitionSha256,owner" ||
        !/^[a-z][a-z0-9_]{2,100}$/.test(value.owner) || !/^[a-f0-9]{64}$/.test(value.definitionSha256)) unavailable();
  }
  const uri=new URL(uriText);
  // Reuse the admitted private XL Core transport. No published DB/new provider/Neon fallback.
  if (!['postgres:','postgresql:'].includes(uri.protocol) ||
      !['127.0.0.1','localhost'].includes(uri.hostname) || !uri.port ||
      uri.pathname!=='/crays_core' || decodeURIComponent(uri.username)!==role || !uri.password ||
      uri.search || uri.hash || env.CRAYS_MEMBER_TEST_BOOKING_RPC_TARGET!=="xl-crays_core-test") unavailable();
  return {contract,connectionString:uriText,fingerprint:sha(uriText+raw)};
}

type MemberBookingPgInternal={
 connection:{stream:{authorized?:boolean};emit:(event:string,error:Error)=>void};
 saslSession:{mechanism?:string}|null;
 _handleAuthSASL:(message:{mechanisms:string[]})=>unknown;
 _handleAuthSASLFinal:(message:unknown)=>unknown;
 _handleAuthCleartextPassword:(message:unknown)=>unknown;
 _handleAuthMD5Password:(message:unknown)=>unknown;
 _handleReadyForQuery:(message:unknown)=>unknown;
};

const memberBookingScramVerified=new WeakMap<object,boolean>();
export class MemberBookingScramClient extends Client{
 constructor(config?:PoolConfig){
  if(!config)unavailable();
  super(config);
  const internals=this as unknown as MemberBookingPgInternal;
  const required=false;
  const scram=true;
  memberBookingScramVerified.set(this,false);
  const denied=()=>internals.connection.emit("error",new Error("MEMBER_BOOKING_SCRAM_REQUIRED"));
  const sasl=internals._handleAuthSASL.bind(this);
  internals._handleAuthSASL=(message)=>{
   if(required&&(!internals.connection.stream.authorized||!message.mechanisms.includes("SCRAM-SHA-256-PLUS"))||scram&&!message.mechanisms.includes("SCRAM-SHA-256")){denied();return;}
   return sasl(message);
  };
  const final=internals._handleAuthSASLFinal.bind(this);
  internals._handleAuthSASLFinal=(message)=>{
   const session=internals.saslSession;
   if(required&&(!session||session.mechanism!=="SCRAM-SHA-256-PLUS"||internals.connection.stream.authorized!==true)||scram&&(!session||session.mechanism!=="SCRAM-SHA-256")){denied();return;}
   const result=final(message);
   // The installed original pg finalizeSession verifies the server signature;
   // original _handleAuthSASLFinal clears the session only after success.
   if(session&&internals.saslSession===null)memberBookingScramVerified.set(this,true);
   return result;
  };
  for(const method of ["_handleAuthCleartextPassword","_handleAuthMD5Password"] as const){
   const original=internals[method].bind(this);
   internals[method]=(message)=>{if(required||scram){denied();return;}return original(message);};
  }
  const ready=internals._handleReadyForQuery.bind(this);
  internals._handleReadyForQuery=(message)=>{
   if((required||scram)&&!memberBookingScramVerified.get(this)){denied();return;}
   return ready(message);
  };
 }
}

async function verify(client:PoolClient,contract:Contract) {
  const r=await client.query(`select current_database() database,current_user role,session_user session_role,
      r.rolsuper,r.rolbypassrls,r.rolcreaterole,r.rolcreatedb,r.rolinherit,r.rolcanlogin,r.rolvaliduntil,
      exists(select from pg_auth_members m where m.member=r.oid) has_memberships
      from pg_roles r where r.rolname=current_user`);
  const row=r.rows[0];
  if (r.rowCount!==1 || row.database!=="crays_core" || row.role!==role || row.session_role!==role ||
      row.rolsuper || row.rolbypassrls || row.rolcreaterole || row.rolcreatedb || row.rolinherit ||
      !row.rolcanlogin || row.has_memberships || !(row.rolvaliduntil instanceof Date) ||
      row.rolvaliduntil.toISOString()!==new Date(contract.expiresAt).toISOString() ||
      row.rolvaliduntil.getTime()<=Date.now()) unavailable();
  const result=await client.query(`select p.oid::regprocedure::text signature,p.prosecdef definer,
      pg_get_userbyid(p.proowner) owner,pg_get_functiondef(p.oid) definition,
      has_function_privilege(current_user,p.oid,'EXECUTE') executable
      from pg_proc p where p.oid=any($1::regprocedure[])`,[required]);
  if (result.rowCount!==required.length) unavailable();
  for (const fn of result.rows) {
    const pin=contract.functions[fn.signature];
    if (!pin || !fn.definer || fn.owner!==pin.owner || sha(fn.definition)!==pin.definitionSha256 ||
        fn.executable!==exposed.has(fn.signature)) unavailable();
  }
  const tables=await client.query(`select exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('crays_core','crays_core_rpc') and c.relkind in ('r','p','v','m','f')
      and has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) broad`);
  if (tables.rows[0]?.broad!==false) unavailable();
}

let current:{fingerprint:string;pool:Pool}|undefined;
export const queryMemberNativeBooking:MemberNativeBookingQuery=async(text,values)=>{
  if (text!==MEMBER_NATIVE_HOLD_SQL && text!==MEMBER_NATIVE_CART_SQL || values.length!==5) unavailable();
  const config=memberBookingRuntimeConfiguration();
  if (current && current.fingerprint!==config.fingerprint) unavailable();
  current??={fingerprint:config.fingerprint,pool:new Pool({connectionString:config.connectionString,
    Client:MemberBookingScramClient,ssl:false,max:1,idleTimeoutMillis:1000,connectionTimeoutMillis:3000,application_name:"crays-member-native-booking-test",
    options:"-c statement_timeout=5000 -c lock_timeout=1500"})};
  const client=await current.pool.connect();
  try {
    if (!memberBookingScramVerified.get(client)) unavailable();
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await verify(client,config.contract);
    const result=await client.query(text,[...values]);
    await verify(client,config.contract);
    if (memberBookingRuntimeConfiguration().fingerprint!==config.fingerprint) unavailable();
    await client.query("COMMIT");
    return {rows:result.rows,rowCount:result.rowCount};
  } catch(error) {
    await client.query("ROLLBACK").catch(()=>undefined);
    throw error;
  } finally {client.release();}
};

export async function closeMemberNativeBookingPool() {
  const old=current;current=undefined;if(old)await old.pool.end();
}

/** Read-only reuse of the same already verified native Core SCRAM client. */
export function isMemberNativeCoreScramVerified(client:object){return memberBookingScramVerified.get(client)===true;}
