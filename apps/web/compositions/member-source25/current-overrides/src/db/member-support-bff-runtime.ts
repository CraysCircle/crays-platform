import {memberAwsPgSsl} from "./member-aws-runtime";
import {isOriginalMemberSdkSubject} from "./member-test-custody-subject";
import {memberXxlNoExpiryContract,memberXxlNoExpiryRole} from "./member-xxl-no-expiry-runtime";
import "server-only";
import {member073RuntimeRole,member073NativeBinding,member073RuntimeDatabase} from "./member073-native-binding";
import {memberSupportCommandKeySchema,parseOwnMemberSupportCommandStatus} from "../lib/clubs/member-support-command-status-contract";
import {queueConfirmedNativeMemberSupport} from "./member-support-native-automation-dispatch";
import {createHash} from "node:crypto";
import {Pool, type PoolClient} from "pg";
import {MemberBookingScramClient, isMemberNativeCoreScramVerified} from "./core-member-booking-runtime-pool";
import {ownSupportCommandSchema, ownSupportReceiptSchema, ownSupportStateSchema} from "./member-support-native-contract";
import type {MemberStaySupportPorts, MemberSupportSdk} from "./member-stay-support-handler";

// Existing protected XL BFF process only. This module is not a browser-facing
// service, a new transport, or authority to install a role or change production.
const originalRole="crays_core_member_support_rpc_runtime_v1";
const role=member073RuntimeRole(originalRole);
const owner="crays_core_identity_rpc_owner_v2";
const reader="crays_core_rpc.read_own_member_support_v1(text,text,text,text)";
const documents="crays_core_rpc.read_own_member_support_documents_v1(text,text,text)";
const writer="crays_core_rpc.execute_own_member_support_v1(text,text,text,text,text,jsonb)";
const actor="crays_core_rpc.member_support_actor_v1(text,text,text)";
const identity="crays_core_rpc.resolve_auth0_identity_bundle_v2(text,text,text)";
const commandStatus="crays_core_rpc.read_own_member_support_command_v1(text,text,text,text)";
const commandStatusSql="select crays_core_rpc.read_own_member_support_command_v1($1::text,$2::text,$3::text,$4::text) as payload";
const baseExposed=[reader,documents,writer];
const baseRequired=[reader,documents,writer,actor,identity];
const requiredFor=(c:Contract)=>Object.hasOwn(c.functions,commandStatus)?[...baseRequired,commandStatus]:baseRequired;
const exposedFor=(c:Contract)=>new Set(Object.hasOwn(c.functions,commandStatus)?[...baseExposed,commandStatus]:baseExposed);
const readSql="select crays_core_rpc.read_own_member_support_v1($1::text,$2::text,$3::text,$4::text) as payload";
const documentsSql="select crays_core_rpc.read_own_member_support_documents_v1($1::text,$2::text,$3::text) as payload";
const writeSql="select crays_core_rpc.execute_own_member_support_v1($1::text,$2::text,$3::text,$4::text,$5::text,$6::jsonb) as payload";
const hash=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
type Contract=Readonly<{schema:"crays.member.support-runtime.v1";role:string;expiresAt:string;approvalReceiptSha256:string;functions:Readonly<Record<string,Readonly<{owner:string;definitionSha256:string}>>>}>;
function unavailable():never{throw Error("MEMBER_SUPPORT_RUNTIME_NOT_ADMITTED");}

export function memberSupportRuntimeConfiguration(env:NodeJS.ProcessEnv=process.env){
 const native=member073NativeBinding(originalRole,"CRAYS_MEMBER_SUPPORT_RPC",role,env);
 const raw=env.CRAYS_MEMBER_SUPPORT_RPC_CONTRACT,uriText=env.CRAYS_MEMBER_SUPPORT_RPC_DATABASE_URL;
 const target=env.CRAYS_MEMBER_SUPPORT_RPC_TARGET;
 if(!raw||!uriText||(!["xl-crays_core-test","xxl-member-core-test"].includes(target??"")&&!native))unavailable();
 const database=native?.database??(target==="xxl-member-core-test"?"member_core_01a11155_20261011":"crays_core");
 const host=native?.host??(target==="xxl-member-core-test"?"172.23.0.2":"127.0.0.1");
 const parsed:unknown=JSON.parse(raw);
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))unavailable();
 const c=parsed as Contract;
 if(Object.keys(c).sort().join(",")!=="approvalReceiptSha256,expiresAt,functions,role,schema"||
 c.schema!=="crays.member.support-runtime.v1"||c.role!==role||!/^[a-f0-9]{64}$/.test(c.approvalReceiptSha256)||
 (!memberXxlNoExpiryContract(c,originalRole,env)&&(!Number.isFinite(Date.parse(c.expiresAt))||Date.parse(c.expiresAt)<=Date.now()||Date.parse(c.expiresAt)>Date.now()+7200000))||
 !c.functions||Object.keys(c.functions).sort().join("|")!==[...requiredFor(c)].sort().join("|"))unavailable();
 for(const pin of Object.values(c.functions))if(!pin||Object.keys(pin).sort().join(",")!=="definitionSha256,owner"||
 pin.owner!==owner||!/^[a-f0-9]{64}$/.test(pin.definitionSha256))unavailable();
 const u=new URL(uriText);
 if(!["postgres:","postgresql:"].includes(u.protocol)||!(u.hostname===host||target==="xl-crays_core-test"&&u.hostname==="localhost")||!u.port||
 u.pathname!=="/"+database||decodeURIComponent(u.username)!==role||!u.password||u.search||u.hash)unavailable();
 return {contract:c,connectionString:uriText,database,fingerprint:hash(target+raw+uriText)};
}

async function verify(client:PoolClient,c:Contract,readOnly:boolean,database:string){
 const required=requiredFor(c),exposed=exposedFor(c);
 const result=await client.query(`select current_database() database,current_user role,session_user session_role,
 current_setting('transaction_read_only') read_only,r.rolsuper,r.rolbypassrls,r.rolcreatedb,r.rolcreaterole,
 r.rolreplication,r.rolinherit,r.rolcanlogin,r.rolvaliduntil,
 exists(select from pg_auth_members m where m.member=r.oid) memberships
 from pg_roles r where r.rolname=current_user`);
 const v=result.rows[0];
 if(result.rowCount!==1||v.database!==database||v.role!==role||v.session_role!==role||
 v.read_only!==(readOnly?"on":"off")||v.rolsuper||v.rolbypassrls||v.rolcreatedb||v.rolcreaterole||
 v.rolreplication||v.rolinherit||!v.rolcanlogin||v.memberships||(!memberXxlNoExpiryRole(c,originalRole,v.rolvaliduntil)&&(!(v.rolvaliduntil instanceof Date)||
 v.rolvaliduntil.toISOString()!==new Date(c.expiresAt).toISOString()||v.rolvaliduntil.getTime()<=Date.now())))unavailable();
 const functions=await client.query(`select p.oid::regprocedure::text signature,pg_get_userbyid(p.proowner) owner,
 p.prosecdef definer,pg_get_functiondef(p.oid) definition,
 has_function_privilege(current_user,p.oid,'EXECUTE') executable
 from pg_proc p where p.oid=any($1::regprocedure[])`,[required]);
 if(functions.rowCount!==required.length)unavailable();
 for(const f of functions.rows){const pin=c.functions[f.signature];if(!pin||!f.definer||f.owner!==pin.owner||
 hash(f.definition)!==pin.definitionSha256||f.executable!==exposed.has(f.signature))unavailable();}
 // Column-only grants are also forbidden. Checking table ACLs alone misses them.
 const privileges=await client.query(`select
 exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('crays_core','crays_core_rpc') and c.relkind in ('r','p','v','m','f') and (
 has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or
 has_any_column_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) broad,
 exists(select from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('crays_core','crays_core_rpc') and has_schema_privilege(current_user,n.oid,'USAGE') and has_function_privilege(current_user,p.oid,'EXECUTE')
 and not(p.oid=any($1::regprocedure[]))) extra_execute`,[[...exposed]]);
 if(privileges.rows[0]?.broad!==false||privileges.rows[0]?.extra_execute!==false)unavailable();
}

function sdkArguments(sdk:MemberSupportSdk){
 if(sdk.sessionReady!==true||!isOriginalMemberSdkSubject(sdk)||
 !/^https:\/\/[a-z0-9][a-z0-9.-]*\/$/.test(sdk.issuer)||sdk.issuer.includes("..")||
 !sdk.serverConfiguredClientId||!/^[A-Za-z0-9:_.-]{3,180}$/.test(sdk.expectedAccountId))unavailable();
 return [sdk.issuer,sdk.subject,hash(sdk.serverConfiguredClientId)];
}
function ownPayload(result:{rows:Record<string,unknown>[];rowCount:number|null},sdk:MemberSupportSdk){
 const payload=result.rows[0]?.payload;
 if(result.rowCount!==1||!payload||typeof payload!=="object"||Array.isArray(payload)||
 !("accountId" in payload)||payload.accountId!==sdk.expectedAccountId)unavailable();
 return payload;
}

/** Call inside the admitted protected BFF after its original SDK actor boundary.
 * The returned ports do not resolve identity or supply service authentication. */
export function createMemberSupportDatabasePorts():Pick<MemberStaySupportPorts,"readSupport"|"readDocuments"|"executeSupport"|"readSupportCommand"> & {close:()=>Promise<void>;readSupportHistory:(sdk:MemberSupportSdk,caseId:string)=>Promise<import("./member-support-native-contract").OwnSupportState>}{
 let active:{fingerprint:string;pool:Pool}|undefined;
 async function transaction<T>(sdk:MemberSupportSdk,write:boolean,operation:(client:PoolClient,args:string[])=>Promise<T>,requiredCapability?:string):Promise<T>{
  const args=sdkArguments(sdk),config=memberSupportRuntimeConfiguration();
  if(requiredCapability&&!Object.hasOwn(config.contract.functions,requiredCapability))unavailable();
  if(active&&active.fingerprint!==config.fingerprint)unavailable();
  active??={fingerprint:config.fingerprint,pool:new Pool({connectionString:config.connectionString,Client:MemberBookingScramClient,
   ssl:memberAwsPgSsl(config.connectionString),max:1,connectionTimeoutMillis:3000,idleTimeoutMillis:1000,application_name:"crays-member-support-test",
   options:"-c statement_timeout=5000 -c lock_timeout=1500 -c idle_in_transaction_session_timeout=5000"})};
  const client=await active.pool.connect();
  let failed=false;
  try{
   if(!isMemberNativeCoreScramVerified(client))unavailable();
   await client.query(write?"BEGIN ISOLATION LEVEL READ COMMITTED":"BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY");
   await verify(client,config.contract,!write,config.database);
   const value=await operation(client,args);
   // A new statement snapshot revalidates original identity/revocation after
   // the domain operation. Failure rolls back the write, including its receipt.
   ownSupportStateSchema.parse(ownPayload(await client.query(readSql,[...args,null]),sdk));
   await verify(client,config.contract,!write,config.database);
   if(memberSupportRuntimeConfiguration().fingerprint!==config.fingerprint)unavailable();
   await client.query("COMMIT");
   return value;
  }catch(error){failed=true;await client.query("ROLLBACK").catch(()=>undefined);throw error;}
  finally{client.release(failed);}
 }
 return {
  readSupportCommand:(sdk,idempotencyKey)=>{
   memberSupportCommandKeySchema.parse(idempotencyKey);
   return transaction(sdk,false,async(client,args)=>parseOwnMemberSupportCommandStatus(
    ownPayload(await client.query(commandStatusSql,[...args,idempotencyKey]),sdk),sdk.expectedAccountId,idempotencyKey),commandStatus);
  },
  readSupport:sdk=>transaction(sdk,false,async(client,args)=>{
   // Return the final fresh snapshot, not an earlier identity/data snapshot.
   ownSupportStateSchema.parse(ownPayload(await client.query(readSql,[...args,null]),sdk));
   return ownSupportStateSchema.parse(ownPayload(await client.query(readSql,[...args,null]),sdk));
  }),
  readSupportHistory:(sdk,caseId)=>transaction(sdk,false,async(client,args)=>{
   if(!/^[A-Za-z0-9:_.-]{3,180}$/.test(caseId))unavailable();
   ownSupportStateSchema.parse(ownPayload(await client.query(readSql,[...args,caseId]),sdk));
   const data=ownSupportStateSchema.parse(ownPayload(await client.query(readSql,[...args,caseId]),sdk));
   if(data.selectedCaseId!==caseId||data.supportCases.length!==1||data.supportCases[0]?.caseId!==caseId)unavailable();
   return data;
  }),
  readDocuments:sdk=>transaction(sdk,false,async(client,args)=>ownPayload(await client.query(documentsSql,args),sdk)),
  executeSupport:async(sdk,input)=>{const receipt=await transaction(sdk,true,async(client,args)=>{
   const command=ownSupportCommandSchema.parse(input.command);
   if(!/^[A-Za-z0-9:_.-]{16,200}$/.test(input.idempotencyKey)||!/^[A-Za-z0-9:_.-]{3,200}$/.test(input.correlationId))unavailable();
   // Exactly one command execution. COMMIT/network ambiguity is propagated to
   // the existing handler's unknown-outcome reconciliation, never auto-retried.
   return ownSupportReceiptSchema.parse(ownPayload(await client.query(writeSql,
    [...args,input.idempotencyKey,input.correlationId,JSON.stringify(command)]),sdk));
  });queueConfirmedNativeMemberSupport(sdk,receipt);return receipt;},
  close:async()=>{const old=active;active=undefined;if(old)await old.pool.end();},
 };
}
