import {createOriginalMemberHttpPool} from "./original-member-api/client.cjs";
let originalMemberHttpPool:ReturnType<typeof createOriginalMemberHttpPool>|null=null;
import {Pool, type PoolClient, type PoolConfig} from "pg";

export const CORE_IDENTITY_RUNTIME_RPC_DATABASE_URL_ENV =
  "CRAYS_CORE_IDENTITY_RPC_DATABASE_URL";
export const CORE_IDENTITY_RUNTIME_RPC_ROLE =
  "crays_core_identity_rpc_runtime_v1";

const CORE_IDENTITY_RUNTIME_RPC_POOL_MAX = 2;
const CORE_IDENTITY_RUNTIME_RPC_DATABASE = "crays_clubs_test_20260729";
export const CORE_IDENTITY_RUNTIME_RPC_DATABASE_ENV =
  "CRAYS_CORE_IDENTITY_RPC_DATABASE";
const FOREST_CITY_MAIN_TEST_DATABASE = "crays_forest_city_main_test_20260925";
const FOREST_CITY_MAIN_TEST_HOSTS = new Set([
  "ep-divine-bonus-aszh9vim.c-4.eu-central-1.aws.neon.tech",
  "ep-divine-bonus-aszh9vim-pooler.c-4.eu-central-1.aws.neon.tech",
]);

export class CoreIdentityRuntimeRpcPoolConfigError extends Error {
  readonly code = "INVALID_CORE_IDENTITY_RPC_DATABASE_BINDING";

  constructor() {
    super("INVALID_CORE_IDENTITY_RPC_DATABASE_BINDING");
    this.name = "CoreIdentityRuntimeRpcPoolConfigError";
  }
}

function failBinding(): never {
  throw new CoreIdentityRuntimeRpcPoolConfigError();
}

function decoded(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    failBinding();
  }
}

function containsControlCharacter(value: string) {
  return /[\u0000-\u001f\u007f]/.test(value);
}

function validateConnectionParameters(parsed: URL) {
  for (const key of new Set(parsed.searchParams.keys())) {
    const values = parsed.searchParams.getAll(key);
    if (
      values.length !== 1 ||
      key !== "sslmode" ||
      !["require", "verify-full"].includes(values[0])
    ) {
      failBinding();
    }
  }
}

export function buildCoreIdentityRuntimeRpcPoolConfig(
  env: Record<string, string | undefined> = process.env,
): PoolConfig {
  const connectionString = env[CORE_IDENTITY_RUNTIME_RPC_DATABASE_URL_ENV];
  if (
    typeof connectionString !== "string" ||
    connectionString.length === 0 ||
    connectionString.trim() !== connectionString
  ) {
    failBinding();
  }

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    failBinding();
  }

  validateConnectionParameters(parsed);
  const user = decoded(parsed.username);
  const password = decoded(parsed.password);
  const database = decoded(parsed.pathname).replace(/^\//, "");
  const port = parsed.port ? Number.parseInt(parsed.port, 10) : 5432;
  const hostname = parsed.hostname.toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "");
  const expectedDatabase = env[CORE_IDENTITY_RUNTIME_RPC_DATABASE_ENV]
    ?? CORE_IDENTITY_RUNTIME_RPC_DATABASE;
  if (![CORE_IDENTITY_RUNTIME_RPC_DATABASE, FOREST_CITY_MAIN_TEST_DATABASE].includes(expectedDatabase)) {
    failBinding();
  }

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    user !== CORE_IDENTITY_RUNTIME_RPC_ROLE ||
    password.length === 0 ||
    containsControlCharacter(password) ||
    hostname.length === 0 ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    /^127\./.test(hostname) ||
    hostname.includes(":") ||
    database !== expectedDatabase ||
    (expectedDatabase === FOREST_CITY_MAIN_TEST_DATABASE &&
      (!FOREST_CITY_MAIN_TEST_HOSTS.has(hostname) || port !== 5432)) ||
    containsControlCharacter(database) ||
    database.includes("/") ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    parsed.hash.length > 0
  ) {
    failBinding();
  }

  const config: PoolConfig = {
    user,
    host: hostname,
    port,
    database,
    max: CORE_IDENTITY_RUNTIME_RPC_POOL_MAX,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    // Bound both server execution and the client wait, including checkout verification.
    statement_timeout: 2_000,
    query_timeout: 2_500,
    allowExitOnIdle: true,
    application_name: "crays-core-identity-rpc-v1",
    keepAlive: true,
    ssl: {rejectUnauthorized: true},
  };
  Object.defineProperty(config, "password", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: password,
  });
  return config;
}

async function verifyRuntimeCheckout(client: PoolClient, database: string) {
  const result = await client.query<{ admitted: boolean }>(`
    select current_user = '${CORE_IDENTITY_RUNTIME_RPC_ROLE}'
      and session_user = '${CORE_IDENTITY_RUNTIME_RPC_ROLE}'
      and current_database() = $1
      and coalesce((select rolcanlogin and not rolinherit and not rolsuper and not rolbypassrls and not rolcreatedb and not rolcreaterole and not rolreplication and rolconnlimit=8 from pg_roles where rolname=current_user),false)
      and not exists (select 1 from pg_auth_members where member=current_user::regrole)
      and has_schema_privilege(current_user,'crays_core_rpc','USAGE')
      and has_function_privilege(current_user,'crays_core_rpc.resolve_auth0_identity_bundle_v1(text)','EXECUTE')
      and has_function_privilege(current_user,'crays_core_rpc.resolve_tenant_session_v1(text,text,integer)','EXECUTE')
      and coalesce((select count(*) = 7 and bool_and(not has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='crays_core' and c.relkind='r' and c.relname=any(array['crays_accounts','auth_identities','nostr_identities','organizations','organization_memberships','role_assignments','tenant_sessions'])),false) as admitted`, [database]);
  if (result.rowCount !== 1 || result.rows[0]?.admitted !== true) failBinding();
}

type RuntimeRpcPool = { query(text: string, values: readonly unknown[]): Promise<{rowCount: number | null; rows: unknown[]}>; end(): Promise<void> };
let runtimeRpcPool: RuntimeRpcPool | null = null;

export function getCoreIdentityRuntimeRpcPool() {
  if (!runtimeRpcPool) {
    const config = buildCoreIdentityRuntimeRpcPoolConfig();
    const pool = new Pool(config);
    runtimeRpcPool = {
      async query(text, values) {
        const client = await pool.connect();
        let released = false;
        try {
          await verifyRuntimeCheckout(client, config.database!);
          return await client.query(text, [...values]);
        } catch (error) {
          client.release(true);
          released = true;
          throw error;
        } finally {
          if (!released) client.release();
        }
      },
      async end() { await pool.end(); },
    };
  }
  return runtimeRpcPool;
}

export async function closeCoreIdentityRuntimeRpcPool() {
  if (runtimeRpcPool) {
    await runtimeRpcPool.end();
  }
  runtimeRpcPool = null;
}

import {Client as OriginalMemberPgClient} from "pg";
import {createHash as originalMemberHash} from "node:crypto";

const ORIGINAL_MEMBER_URI_ENV="CRAYS_CORE_ORIGINAL_MEMBER_RPC_DATABASE_URL";
const ORIGINAL_MEMBER_CONTRACT_ENV="CRAYS_CORE_ORIGINAL_MEMBER_RPC_CONTRACT";
const ORIGINAL_MEMBER_HOST="ep-wandering-field-astlbgje.c-4.eu-central-1.aws.neon.tech";
const ORIGINAL_MEMBER_IDENTITY_SQL="select crays_core_rpc.resolve_auth0_identity_bundle_v2($1::text,$2::text,$3::text) as payload";
const ORIGINAL_MEMBER_STATE_SQL="select crays_core_rpc.read_own_clubs_member_state_v1($1::text,$2::text,$3::text) as payload";
export const ORIGINAL_MEMBER_COMBINED_READ_SQL="select crays_core_rpc.resolve_auth0_identity_bundle_v2($1::text,$2::text,$3::text) as identity_payload, crays_core_rpc.read_own_clubs_member_state_v1($1::text,$2::text,$3::text) as own_state_payload";
type OriginalMemberContract={
 role:string; identityOwner:string; ownStateOwner:string;
 identityDefinitionSha256:string;ownStateDefinitionSha256:string;generationSha256:string;
};
type OriginalMemberPgInternal={
 connection:{stream:{authorized?:boolean};emit:(event:string,error:Error)=>void};
 saslSession:{mechanism?:string}|null;
 _handleAuthSASL:(message:{mechanisms:string[]})=>unknown;
 _handleAuthSASLFinal:(message:unknown)=>unknown;
 _handleAuthCleartextPassword:(message:unknown)=>unknown;
 _handleAuthMD5Password:(message:unknown)=>unknown;
 _handleReadyForQuery:(message:unknown)=>unknown;
};
const originalMemberBindingVerified=new WeakMap<object,boolean>();
class OriginalMemberRequiredBindingClient extends OriginalMemberPgClient{
 constructor(config?:PoolConfig&{originalRequiredChannelBinding:boolean;originalRequiredScram?:boolean}){
  if(!config||typeof config.originalRequiredChannelBinding!=="boolean")originalMemberUnavailable();
  super(config);
  const internals=this as unknown as OriginalMemberPgInternal;
  const required=config.originalRequiredChannelBinding;
  const scram=config.originalRequiredScram===true;
  originalMemberBindingVerified.set(this,false);
  const denied=()=>internals.connection.emit("error",new Error("ORIGINAL_MEMBER_CHANNEL_BINDING_REQUIRED"));
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
   if(session&&internals.saslSession===null)originalMemberBindingVerified.set(this,true);
   return result;
  };
  for(const method of ["_handleAuthCleartextPassword","_handleAuthMD5Password"] as const){
   const original=internals[method].bind(this);
   internals[method]=(message)=>{if(required||scram){denied();return;}return original(message);};
  }
  const ready=internals._handleReadyForQuery.bind(this);
  internals._handleReadyForQuery=(message)=>{
   if((required||scram)&&!originalMemberBindingVerified.get(this)){denied();return;}
   return ready(message);
  };
 }
}
type OriginalMemberConfig=PoolConfig&{
 originalRequiredChannelBinding:boolean;
 originalRequiredScram?:boolean;
 originalXlTarget?:"ssh-test"|"xl-network"|"xxl-member-core-test";
 originalContract:Readonly<OriginalMemberContract>;
 Client:typeof OriginalMemberRequiredBindingClient;
};
function originalMemberUnavailable():never{throw new Error("CORE_ORIGINAL_MEMBER_CONFIGURATION_UNAVAILABLE");}
function originalMemberContract(env:Record<string,string|undefined>):Readonly<OriginalMemberContract>{
 const raw=env[ORIGINAL_MEMBER_CONTRACT_ENV];if(!raw)originalMemberUnavailable();
 let value:unknown;try{value=JSON.parse(raw);}catch{originalMemberUnavailable();}
 if(!value||typeof value!=="object"||Array.isArray(value))originalMemberUnavailable();
 const record=value as Record<string,unknown>;
 const keys=["role","identityOwner","ownStateOwner","identityDefinitionSha256","ownStateDefinitionSha256","generationSha256"];
 if(Object.keys(record).length!==keys.length||keys.some(key=>typeof record[key]!=="string"))originalMemberUnavailable();
 if(!/^crays_core_(?:identity|member_identity)_rpc_runtime_v[1-9][0-9]*$/.test(record.role as string))originalMemberUnavailable();
 for(const key of ["identityOwner","ownStateOwner"]){
  if(!/^crays_[a-z0-9_]+_owner_v[1-9][0-9]*$/.test(record[key] as string))originalMemberUnavailable();
 }
 for(const key of ["identityDefinitionSha256","ownStateDefinitionSha256","generationSha256"]){
  if(!/^[a-f0-9]{64}$/.test(record[key] as string))originalMemberUnavailable();
 }
 return Object.freeze({...record}) as Readonly<OriginalMemberContract>;
}
export function buildCoreOriginalMemberIdentityRpcPoolConfig(env:Record<string,string|undefined>=process.env):OriginalMemberConfig{
 const contract=originalMemberContract(env),raw=env[ORIGINAL_MEMBER_URI_ENV];
 if(!raw||Object.keys(env).some(key=>key.startsWith("PG")&&env[key]!==undefined))originalMemberUnavailable();
 let uri:URL;try{uri=new URL(raw);}catch{originalMemberUnavailable();}
 const decode=(value:string)=>{let decoded:string;try{decoded=decodeURIComponent(value);}catch{originalMemberUnavailable();}if(/[\u0000-\u001f\u007f]/.test(decoded))originalMemberUnavailable();return decoded;};
 const xlTarget=env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_XL_TARGET;
 if(xlTarget!==undefined){
  if(xlTarget!=="ssh-test"&&xlTarget!=="xl-network"&&xlTarget!=="xxl-member-core-test")originalMemberUnavailable();
  const host=xlTarget==="xxl-member-core-test"?"172.23.0.2":xlTarget==="ssh-test"?"127.0.0.1":"crays-shared-core-postgres-xl";
  const expectedDatabase=xlTarget==="xxl-member-core-test"?"member_core_01a11155_20261011":"crays_core";
  const port=xlTarget==="ssh-test"?58439:5432;
  if(!["postgres:","postgresql:"].includes(uri.protocol)||uri.hostname!==host||Number(uri.port||"5432")!==port||decode(uri.pathname.slice(1))!==expectedDatabase||decode(uri.username)!==contract.role||contract.role!=="crays_core_member_identity_rpc_runtime_v3"||contract.identityOwner!=="crays_core_identity_rpc_owner_v2"||contract.ownStateOwner!==contract.identityOwner||!uri.password||uri.hash)originalMemberUnavailable();
  if(uri.searchParams.size!==1||uri.searchParams.getAll("sslmode").length!==1||uri.searchParams.get("sslmode")!=="disable")originalMemberUnavailable();
  // SSL is off on the existing XL database. Only explicit private Docker or
  // authenticated loopback SSH test transport is admitted; no public endpoint.
  return {host,port,database:expectedDatabase,user:contract.role,password:decode(uri.password),ssl:false,enableChannelBinding:false,
   application_name:"crays-original-xl-member-read-v1",max:2,idleTimeoutMillis:10_000,connectionTimeoutMillis:5_000,
   statement_timeout:2_000,query_timeout:2_500,
   options:"-c default_transaction_read_only=on -c statement_timeout=2000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=5000",
   originalRequiredChannelBinding:false,originalRequiredScram:true,originalXlTarget:xlTarget,originalContract:contract,Client:OriginalMemberRequiredBindingClient} as OriginalMemberConfig;
 }
 if(!["postgres:","postgresql:"].includes(uri.protocol)||uri.hostname!==ORIGINAL_MEMBER_HOST||(uri.port||"5432")!=="5432"||decode(uri.pathname.slice(1))!=="neondb"||decode(uri.username)!==contract.role||!uri.password||uri.hash)originalMemberUnavailable();
 const ssl=uri.searchParams.getAll("sslmode"),binding=uri.searchParams.getAll("channel_binding");
 if(ssl.length!==1||!["require","verify-full"].includes(ssl[0])||binding.length>1||binding.length===1&&binding[0]!=="require")originalMemberUnavailable();
 for(const key of uri.searchParams.keys())if(!["sslmode","channel_binding"].includes(key))originalMemberUnavailable();
 return {
  host:ORIGINAL_MEMBER_HOST,port:5432,database:"neondb",user:contract.role,password:decode(uri.password),
  ssl:{rejectUnauthorized:true},enableChannelBinding:true,
  application_name:"crays-original-member-identity-ownstate-v1",
  max:CORE_IDENTITY_RUNTIME_RPC_POOL_MAX,idleTimeoutMillis:10_000,connectionTimeoutMillis:5_000,
  statement_timeout:2_000,query_timeout:2_500,
  options:"-c default_transaction_read_only=on -c statement_timeout=2000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=5000",
  originalRequiredChannelBinding:binding.length===1,originalContract:contract,Client:OriginalMemberRequiredBindingClient,
 } as OriginalMemberConfig;
}
const ORIGINAL_MEMBER_CHECKOUT_SQL=`select current_database() database,current_user role,session_user session_role,current_setting('transaction_read_only') read_only,
 r.rolcanlogin,r.rolinherit,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,
 exists(select 1 from pg_auth_members m where m.member=r.oid) has_membership,
 exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='crays_core' and c.relkind in ('r','p','v','m','f') and
 (has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or has_any_column_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) direct_core_acl,
 exists(select 1 from pg_namespace n where n.nspname not like 'pg_%' and n.nspname<>'information_schema' and has_schema_privilege(current_user,n.oid,'CREATE')) schema_create
 from pg_roles r where r.rolname=current_user`;
const ORIGINAL_MEMBER_FUNCTIONS_SQL=`select p.oid::regprocedure::text signature,n.nspname schema_name,p.proname name,p.prosecdef security_definer,
 owner.rolname owner,owner.rolcanlogin owner_login,owner.rolsuper owner_super,owner.rolbypassrls owner_bypass,
 has_function_privilege(current_user,p.oid,'EXECUTE') executable,
 pg_get_functiondef(p.oid) definition
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles owner on owner.oid=p.proowner
 where p.oid in (to_regprocedure($1),to_regprocedure($2)) order by p.proname`;
async function verifyOriginalMemberCheckout(client:PoolClient,config:OriginalMemberConfig){
 if((config.originalRequiredChannelBinding||config.originalRequiredScram)&&!originalMemberBindingVerified.get(client))originalMemberUnavailable();
 const result=await client.query(ORIGINAL_MEMBER_CHECKOUT_SQL);
 if(result.rowCount!==1||result.rows.length!==1)originalMemberUnavailable();
 const row=result.rows[0];
 if(row.database!==(config.originalXlTarget==="xxl-member-core-test"?"member_core_01a11155_20261011":config.originalXlTarget?"crays_core":"neondb")||row.role!==config.originalContract.role||row.session_role!==row.role||row.read_only!=="on"||row.rolcanlogin!==true||
 row.rolinherit!==false||row.rolsuper!==false||row.rolcreatedb!==false||row.rolcreaterole!==false||row.rolreplication!==false||row.rolbypassrls!==false||
 row.has_membership!==false||row.direct_core_acl!==false||row.schema_create!==false)originalMemberUnavailable();
 const functions=await client.query(ORIGINAL_MEMBER_FUNCTIONS_SQL,["crays_core_rpc.resolve_auth0_identity_bundle_v2(text,text,text)","crays_core_rpc.read_own_clubs_member_state_v1(text,text,text)"]);
 if(functions.rowCount!==2||functions.rows.length!==2)originalMemberUnavailable();
 for(const fn of functions.rows){
  const identity=fn.name==="resolve_auth0_identity_bundle_v2";
  if(!identity&&fn.name!=="read_own_clubs_member_state_v1")originalMemberUnavailable();
  const owner=identity?config.originalContract.identityOwner:config.originalContract.ownStateOwner;
  const digest=identity?config.originalContract.identityDefinitionSha256:config.originalContract.ownStateDefinitionSha256;
  if(fn.schema_name!=="crays_core_rpc"||fn.owner!==owner||fn.security_definer!==true||fn.owner_login!==false||fn.owner_super!==false||fn.owner_bypass!==false||fn.executable!==true||typeof fn.definition!=="string"||
  originalMemberHash("sha256").update(fn.definition,"utf8").digest("hex")!==digest||config.originalXlTarget&&!fn.definition.includes("CRAYS_MEMBER_BINDING_GENERATION:"+config.originalContract.generationSha256))originalMemberUnavailable();
 }
}
let originalMemberPool:{key:string;pool:Pool;query:(text:string,values?:readonly unknown[])=>Promise<{rows:Record<string,unknown>[];rowCount:number|null}>}|null=null;
export function getCoreOriginalMemberIdentityRpcPool(){
 if(process.env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_ENDPOINT!==undefined){
  if(!originalMemberHttpPool)originalMemberHttpPool=createOriginalMemberHttpPool();
  return originalMemberHttpPool;
 }
 const config=buildCoreOriginalMemberIdentityRpcPoolConfig();
 const fingerprint=(value:OriginalMemberConfig)=>originalMemberHash("sha256").update(JSON.stringify({host:value.host,port:value.port,database:value.database,user:value.user,password:value.password,required:value.originalRequiredChannelBinding,scram:value.originalRequiredScram===true,xlTarget:value.originalXlTarget??null,contract:value.originalContract}),"utf8").digest("hex");
 const key=fingerprint(config);
 if(originalMemberPool&&originalMemberPool.key!==key)originalMemberUnavailable();
 if(!originalMemberPool){
  const pool=new Pool(config);
  originalMemberPool={key,pool,query:async(text,values=[])=>{
   if(text!==ORIGINAL_MEMBER_IDENTITY_SQL&&text!==ORIGINAL_MEMBER_STATE_SQL&&text!==ORIGINAL_MEMBER_COMBINED_READ_SQL)originalMemberUnavailable();
   const current=buildCoreOriginalMemberIdentityRpcPoolConfig();
   if(fingerprint(current)!==key)originalMemberUnavailable();
   const held=[...values];if(held.length!==3||held.some(value=>typeof value!=="string"||value.length<1||value.length>2048))originalMemberUnavailable();
   const client=await pool.connect();let healthy=false;
   try{
    await verifyOriginalMemberCheckout(client,config);
    const result=await client.query(text,held);
    await verifyOriginalMemberCheckout(client,config);
    const after=buildCoreOriginalMemberIdentityRpcPoolConfig();
    if(fingerprint(after)!==key)originalMemberUnavailable();
    healthy=true;return {rows:result.rows,rowCount:result.rowCount};
   }finally{client.release(!healthy);}
  }};
 }
 return {query:originalMemberPool.query};
}
export async function closeCoreOriginalMemberIdentityRpcPool(){
 if(originalMemberHttpPool){await originalMemberHttpPool.end();originalMemberHttpPool=null;}
 const held=originalMemberPool;originalMemberPool=null;if(held)await held.pool.end();
}
