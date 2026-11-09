import "server-only";
import {Pool} from "pg";
import {createHash} from "node:crypto";
import type {NextcloudAccessPurposeClient,Claim,DispatchInput} from "./nextcloud-access-dispatch45";
import type {NextcloudAccessAcknowledgement,NextcloudGroupObservation} from "./nextcloud-collaboration-access-adapter";
const FUNCTION_PINS={"authorize_mutation_v1": "3d04ae837202b9a9965d45b1d045e130520730517a064414ed30627de0d43e80", "claim_v1": "a9605f0318946f18a12c2be3bffa11f40017cab0808b910808bbb3db130aa2c8", "mark_unknown_v1": "0b681eacebef21b84922a222a436ea81c40d9a300bd307391d043c5ceda04a20", "observe_v1": "46dec4f0dbc889f9339faa5a4361029db033babf2c9f93ff064299e1a7374454", "resolve45": "935bdfe58063d7e03688f58ae18b16ed361302ab6b0fc403a56f55be1c285926"} as const;
const ROLE="crays_nextcloud_access_rpc_runtime_v1",OWNER="crays_nextcloud_access_rpc_owner_v1";
const SQL={claim:"select crays_nextcloud_access_rpc.claim_v1($1::text,$2::text,$3::bigint) as payload",authorize:"select crays_nextcloud_access_rpc.authorize_mutation_v1($1::text,$2::uuid) as payload",unknown:"select crays_nextcloud_access_rpc.mark_unknown_v1($1::text,$2::uuid) as payload",observe:"select crays_nextcloud_access_rpc.observe_v1($1::text,$2::uuid,$3::jsonb,$4::jsonb) as payload"} as const;
const QUALIFY=`select current_user as role,current_database() as database_name,r.rolcanlogin,r.rolinherit,r.rolsuper,r.rolbypassrls,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolconnlimit,
 not exists(select 1 from pg_catalog.pg_auth_members where member=current_user::regrole) as no_membership,
 not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname in('crays_core','crays_integration')and c.relkind in('r','p')and(has_table_privilege(current_user,c.oid,'SELECT')or has_table_privilege(current_user,c.oid,'INSERT')or has_table_privilege(current_user,c.oid,'UPDATE')or has_table_privilege(current_user,c.oid,'DELETE')or has_table_privilege(current_user,c.oid,'TRUNCATE')or has_table_privilege(current_user,c.oid,'REFERENCES')or has_table_privilege(current_user,c.oid,'TRIGGER')))as no_direct_tables
 from pg_catalog.pg_roles r where r.rolname=current_user`;
const FUNCTIONS=`select p.proname,p.prosrc,p.prosecdef,p.proconfig,o.rolname owner_name,o.rolcanlogin owner_login,o.rolsuper owner_super,o.rolbypassrls owner_bypass,
 has_function_privilege(current_user,p.oid,'EXECUTE')as can_execute
 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace join pg_catalog.pg_roles o on o.oid=p.proowner where n.nspname='crays_nextcloud_access_rpc'`;
export function createNextcloudAccessPurposePool45(config:Readonly<{databaseUrl:string;expectedHost:string;expectedDatabase:string;ca:string}>){
 const url=new URL(config.databaseUrl);
 if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!==config.expectedHost||!config.expectedHost.endsWith('.rds.amazonaws.com')||decodeURIComponent(url.username)!==ROLE||!url.password||decodeURIComponent(url.pathname.slice(1))!==config.expectedDatabase||!config.expectedDatabase||url.search||url.hash||!config.ca.includes('BEGIN CERTIFICATE'))throw Error('NEXTCLOUD45_PURPOSE_CONFIGURATION_INVALID');
 const pool=new Pool({host:config.expectedHost,port:Number(url.port||5432),database:config.expectedDatabase,user:ROLE,password:decodeURIComponent(url.password),ssl:{rejectUnauthorized:true,ca:config.ca},max:2,connectionTimeoutMillis:2500,idleTimeoutMillis:10000,statement_timeout:3000,query_timeout:3500,application_name:'crays-nextcloud-access-purpose45'});
 async function query(sql:string,values:readonly unknown[]){
  if(!(Object.values(SQL)as string[]).includes(sql))throw Error('NEXTCLOUD45_RPC_QUERY_NOT_ADMITTED');
  const client=await pool.connect();let healthy=false;
  try{
   const q=await client.query(QUALIFY),r=q.rows[0];
   if(q.rows.length!==1||r.role!==ROLE||r.database_name!==config.expectedDatabase||r.rolcanlogin!==true||r.rolinherit!==false||r.rolsuper!==false||r.rolbypassrls!==false||r.rolcreatedb!==false||r.rolcreaterole!==false||r.rolreplication!==false||r.rolconnlimit!==2||r.no_membership!==true||r.no_direct_tables!==true)throw Error('NEXTCLOUD45_PURPOSE_ROLE_REJECTED');
   const f=await client.query(FUNCTIONS);
   if(f.rows.length!==5)throw Error('NEXTCLOUD45_PURPOSE_FUNCTION_SET_REJECTED');
   for(const row of f.rows){
    const expected=FUNCTION_PINS[row.proname as keyof typeof FUNCTION_PINS];
    const settings=(row.proconfig??[]).map((x:string)=>x.replace(/\s/g,''));
    if(!expected||row.owner_name!==OWNER||row.owner_login!==false||row.owner_super!==false||row.owner_bypass!==false||row.prosecdef!==true||settings.length!==2||!settings.includes('search_path=pg_catalog,pg_temp')||!settings.includes('row_security=on')||row.can_execute!==(row.proname!=='resolve45')||createHash('sha256').update(row.prosrc,'utf8').digest('hex')!==expected)throw Error('NEXTCLOUD45_PURPOSE_FUNCTION_REJECTED');
   }
   const out=await client.query(sql,[...values]);if(out.rows.length!==1||!out.rows[0].payload)throw Error('NEXTCLOUD45_PURPOSE_PAYLOAD_INVALID');healthy=true;return out.rows[0].payload;
  }finally{client.release(!healthy);}
 }
 const rpc:NextcloudAccessPurposeClient={
  claim:(i:DispatchInput)=>query(SQL.claim,[i.actionIntentId,i.membershipProjectionId,i.projectionVersion]),
  authorize:(i:string,t:string)=>query(SQL.authorize,[i,t])as Promise<Claim>,
  unknown:(i:string,t:string)=>query(SQL.unknown,[i,t]),
  observe:(i:string,t:string,a:NextcloudAccessAcknowledgement|null,o:NextcloudGroupObservation)=>query(SQL.observe,[i,t,a===null?null:JSON.stringify(a),JSON.stringify(o)])
 };
 return Object.freeze({rpc,close:()=>pool.end()});
}
