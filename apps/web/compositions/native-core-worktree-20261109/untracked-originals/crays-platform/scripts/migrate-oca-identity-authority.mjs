import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const migrationId="0158_openclaw_identity_authority";
const apply=process.argv.includes("--apply"),rollback=process.argv.includes("--rollback");
if(apply&&rollback)throw new Error("Choose either --apply or --rollback.");
const connectionString=process.env.CRAYS_DATABASE_URL;
const sql=readFileSync(resolve(process.cwd(),"database","migrations",rollback?`${migrationId}.down.sql`:`${migrationId}.sql`),"utf8");
const summary={migrationId,mode:rollback?"rollback":apply?"apply":"dry-run",target:getRedactedDatabaseTarget(connectionString),statementCountApprox:sql.split(";").filter(v=>v.trim()).length,productionAuthorized:false,openClawRuntimeMutation:false,providerCalls:0,secretValuesLogged:false};
if(!apply&&!rollback){console.log(JSON.stringify({...summary,note:"Dry run only; no database mutation."},null,2));process.exit(0);}
if(!connectionString)throw new Error("CRAYS_DATABASE_URL is required.");
if(process.env.CRAYS_DATABASE_ENVIRONMENT==="production")throw new Error("Production migration is not authorized by OCA-017.");
const confirmation=`${rollback?"ROLLBACK":"APPLY"}_${migrationId}`;
if(process.env.CONFIRM_CRAYS_DATABASE_MIGRATION!==confirmation)throw new Error(`Set CONFIRM_CRAYS_DATABASE_MIGRATION=${confirmation}.`);
const {default:pg}=await import("pg");const pool=new pg.Pool({connectionString,ssl:false,max:1});
try{const client=await pool.connect();try{await client.query("begin");for(const [k,v] of [["crays.app_role","core_service"],["crays.tenant_id","migration-control"],["crays.actor_role","programme_governance"],["crays.actor_id","migration-control"]])await client.query("select set_config($1,$2,true)",[k,v]);await client.query(sql);await client.query("commit");console.log(JSON.stringify({...summary,applied:apply,rolledBack:rollback},null,2));}catch(e){await client.query("rollback");throw e;}finally{client.release();}}finally{await pool.end();}
