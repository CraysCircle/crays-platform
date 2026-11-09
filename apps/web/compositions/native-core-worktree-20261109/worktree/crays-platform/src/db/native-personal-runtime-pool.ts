import "server-only";
import {createHash} from "node:crypto";
import {Pool, type PoolClient, type PoolConfig} from "pg";
import accessSource from "./native-personal-runtime-access.json";

// Server-owned connection selection, never request/model input. The original
// business pool and identity-only RPC pool are deliberately independent.
const access = JSON.parse(JSON.stringify(accessSource)) as typeof accessSource;
export const NATIVE_PERSONAL_RUNTIME_ROLE = access.role;
export const NATIVE_PERSONAL_ACCESS_SHA256 = digest(access);
const URL_ENV = "CRAYS_CORE_NATIVE_PERSONAL_DATABASE_URL";
const CONTRACT_ENV = "CRAYS_CORE_NATIVE_PERSONAL_DATABASE_CONTRACT";
type Contract = Readonly<{accessManifestSha256:string; catalogueSha256:string}>;
const denied = () => new Error("NATIVE_PERSONAL_DATABASE_BINDING_UNAVAILABLE");
function digest(value:unknown) {return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
function parseContract(value:string|undefined):Contract {
  if (!value || value.length>512) throw denied();
  let c:Record<string,unknown>;try {c=JSON.parse(value);}catch {throw denied();}
  if (!c || Array.isArray(c) || Object.keys(c).sort().join(",")!=="accessManifestSha256,catalogueSha256" ||
      c.accessManifestSha256!==NATIVE_PERSONAL_ACCESS_SHA256 || typeof c.catalogueSha256!=="string" || !/^[a-f0-9]{64}$/.test(c.catalogueSha256)) throw denied();
  return Object.freeze({accessManifestSha256:NATIVE_PERSONAL_ACCESS_SHA256,catalogueSha256:c.catalogueSha256});
}
export function buildNativePersonalRuntimePoolConfig(env:Record<string,string|undefined>=process.env): {config:PoolConfig;contract:Contract} {
  const value=env[URL_ENV],contract=parseContract(env[CONTRACT_ENV]);
  if (!value || value.trim()!==value || /[\x00-\x20\x7f]/.test(value)) throw denied();
  let uri:URL,user:string,password:string,database:string;
  try {uri=new URL(value);user=decodeURIComponent(uri.username);password=decodeURIComponent(uri.password);database=decodeURIComponent(uri.pathname);}catch {throw denied();}
  if (!['postgres:','postgresql:'].includes(uri.protocol) || uri.hostname!==access.host ||
      (uri.port!==''&&uri.port!=='5432') || user!==access.role || database!=='/'+access.database ||
      !password || /[\x00-\x1f\x7f]/.test(password) || uri.hash) throw denied();
  for (const key of new Set(uri.searchParams.keys())) if (key!=='sslmode'||uri.searchParams.getAll(key).length!==1||!['require','verify-full'].includes(uri.searchParams.get(key)!)) throw denied();
  const config:PoolConfig & {enableChannelBinding:boolean}={user,host:access.host,port:5432,database:access.database,
    max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:5000,statement_timeout:5000,
    query_timeout:7500,idle_in_transaction_session_timeout:10000,allowExitOnIdle:true,
    keepAlive:true,application_name:'crays-native-personal-v1',ssl:{rejectUnauthorized:true},enableChannelBinding:true};
  Object.defineProperty(config,'password',{enumerable:false,configurable:false,writable:false,value:password});
  return {config,contract};
}

/** Public catalogue metadata only; no personal rows, secrets or authority claims.
 * Owning release admission records this fingerprint AFTER the actual migration.
 * Neither a model nor a native client supplies or approves this contract. */
export async function readNativePersonalRuntimeCatalogue(client:PoolClient) {
  const role=await client.query(`select current_user role,session_user session_role,current_database() database,
    rolcanlogin,rolinherit,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolconnlimit,
    exists(select 1 from pg_auth_members where member=current_user::regrole) memberships,
    coalesce(nullif(current_setting('crays.native_personal_account',true),''),nullif(current_setting('crays.native_personal_provider_key',true),''),nullif(current_setting('crays.native_personal_provider_subject',true),''),nullif(current_setting('crays.native_contact_account',true),'')) retained_context
    from pg_roles where rolname=current_user`);
  const tables=await client.query(`select c.relname name,pg_get_userbyid(c.relowner) owner,c.relrowsecurity rls,c.relforcerowsecurity forced,
    has_table_privilege(current_user,c.oid,'SELECT') sel,has_table_privilege(current_user,c.oid,'INSERT') ins,
    has_table_privilege(current_user,c.oid,'UPDATE') upd,has_table_privilege(current_user,c.oid,'DELETE') del,
    has_table_privilege(current_user,c.oid,'TRUNCATE') trunc,has_table_privilege(current_user,c.oid,'REFERENCES') refs,has_table_privilege(current_user,c.oid,'TRIGGER') trig,
    (select coalesce(json_agg(a.attname order by a.attname),'[]'::json) from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped and has_column_privilege(current_user,c.oid,a.attnum,'UPDATE')) update_columns,
    (select coalesce(json_agg(json_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname),'[]'::json) from pg_policy p where p.polrelid=c.oid and current_user::regrole::oid=any(p.polroles)) policies,
    (select coalesce(json_agg(json_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) order by t.tgname),'[]'::json) from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal) triggers
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='crays_core' and c.relkind='r' order by c.relname`);
  const sequences=await client.query(`select c.relname name,has_sequence_privilege(current_user,c.oid,'USAGE') usage,has_sequence_privilege(current_user,c.oid,'SELECT') sel,has_sequence_privilege(current_user,c.oid,'UPDATE') upd
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='crays_core' and c.relkind='S' order by c.relname`);
  const functions=await client.query(`select p.oid::regprocedure::text name,pg_get_userbyid(p.proowner) owner,p.prosecdef security_definer,
    pg_get_functiondef(p.oid) definition,has_function_privilege(current_user,p.oid,'EXECUTE') executable
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='crays_core' and p.prokind='f' order by p.oid::regprocedure::text`);
  return {role:role.rows[0],tables:tables.rows,sequences:sequences.rows,functions:functions.rows};
}
export function nativePersonalRuntimeCatalogueSHA256(catalogue:Awaited<ReturnType<typeof readNativePersonalRuntimeCatalogue>>) {return digest(catalogue);}

/** Internal trusted-host composition seam, not an injectable user grant. The
 * production getter below fixes the original target/database. Isolated tests
 * may compose this SAME verifier with their explicitly synthetic private PG. */
export async function verifyNativePersonalRuntimeCheckout(client:PoolClient, contract:Contract, expectedDatabase=access.database) {
  const c=await readNativePersonalRuntimeCatalogue(client),r=c.role;
  if (!r || r.role!==access.role || r.session_role!==access.role || r.database!==expectedDatabase || !r.rolcanlogin ||
      r.rolinherit||r.rolsuper||r.rolcreatedb||r.rolcreaterole||r.rolreplication||r.rolbypassrls||r.rolconnlimit!==8||r.memberships||r.retained_context!==null ||
      contract.accessManifestSha256!==NATIVE_PERSONAL_ACCESS_SHA256) throw denied();
  for (const table of c.tables) {
    const expected=access.tables.find(x=>x.table===table.name);
    if (!expected) {if(table.sel||table.ins||table.upd||table.del||table.trunc||table.refs||table.trig||table.update_columns.length)throw denied();continue;}
    const columns=[...('lockColumn' in expected&&expected.lockColumn?[expected.lockColumn]:[]),...('updateColumns' in expected&&expected.updateColumns?expected.updateColumns:[])].sort();
    const privs=expected.privileges as string[];
    if (!table.rls||!table.forced||table.owner===access.role||table.upd||table.trunc||table.refs||table.trig||
        table.sel!==privs.includes('SELECT')||table.ins!==privs.includes('INSERT')||table.del!==privs.includes('DELETE')||JSON.stringify(table.update_columns)!==JSON.stringify(columns))throw denied();
    const restrictive=table.policies.find((p:{name:string})=>p.name==='native_runtime_own_boundary');
    const permissive=table.policies.find((p:{name:string})=>p.name==='native_runtime_own_access');
    if(!restrictive||restrictive.permissive||restrictive.command!=='*'||!permissive||!permissive.permissive||permissive.command!=='*'||restrictive.using!==permissive.using||restrictive.check!==permissive.check)throw denied();
  }
  if(access.tables.some(t=>!c.tables.some(x=>x.name===t.table)))throw denied();
  for(const s of c.sequences)if(s.usage!==access.sequences.includes(s.name)||s.sel||s.upd)throw denied();
  if(access.sequences.some(s=>!c.sequences.some(x=>x.name===s)))throw denied();
  for(const fn of c.functions)if(fn.security_definer&&fn.executable&&!access.functions.some(x=>fn.name==='crays_core.'+x))throw denied();
  if(access.functions.some(x=>!c.functions.some(f=>f.name==='crays_core.'+x&&f.executable)))throw denied();
  if(digest(c)!==contract.catalogueSha256)throw denied();
}

/** Ownership stays with the trusted host. Verification failure destroys the
 * checked-out connection before any personal SQL starts. No SET ROLE/fallback. */
export function createVerifiedNativePersonalRuntimePool(pool:Pool,contract:Contract,expectedDatabase=access.database) {
  const captured=Object.freeze({...contract});
  return Object.freeze({async connect() {
    const client=await pool.connect();
    try {await verifyNativePersonalRuntimeCheckout(client,captured,expectedDatabase);return client;}
    catch {client.release(true);throw denied();}
  },async end(){await pool.end();}});
}
let current:ReturnType<typeof createVerifiedNativePersonalRuntimePool>|null=null;
export function getNativePersonalRuntimePool() {
  if(!current) {const {config,contract}=buildNativePersonalRuntimePoolConfig();current=createVerifiedNativePersonalRuntimePool(new Pool(config),contract);}
  return current;
}
export async function closeNativePersonalRuntimePool() {const pool=current;current=null;if(pool)await pool.end();}
