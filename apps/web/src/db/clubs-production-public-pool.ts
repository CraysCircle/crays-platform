import {Pool, type PoolClient, type PoolConfig} from "pg";

export const PRODUCTION_PUBLIC_DATABASE_URL_ENV = "CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL";
export const PRODUCTION_PUBLIC_RUNTIME_ROLE = "crays_clubs_public_rpc_runtime_v1";
const HOSTS = new Set([
  "crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com",
  "ep-wandering-field-astlbgje.c-4.eu-central-1.aws.neon.tech",
  "ep-wandering-field-astlbgje-pooler.c-4.eu-central-1.aws.neon.tech",
]);
export class ProductionPublicBindingError extends Error {
  readonly code = "INVALID_CLUBS_PRODUCTION_PUBLIC_BINDING";
  constructor() {super("INVALID_CLUBS_PRODUCTION_PUBLIC_BINDING");}
}
function fail(): never {throw new ProductionPublicBindingError();}
function decode(value: string) {try {return decodeURIComponent(value);} catch {return fail();}}

export function buildProductionPublicPoolConfig(env: Record<string, string | undefined> = process.env): PoolConfig {
  const binding = env[PRODUCTION_PUBLIC_DATABASE_URL_ENV];
  if (!binding || binding.trim() !== binding) fail();
  let url: URL;
  try {url = new URL(binding);} catch {return fail();}
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    if (key !== "sslmode" || values.length !== 1 || !["require", "verify-full"].includes(values[0])) fail();
  }
  const password = decode(url.password);
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      decode(url.username) !== PRODUCTION_PUBLIC_RUNTIME_ROLE ||
      !HOSTS.has(url.hostname) || (url.port && url.port !== "5432") ||
      decode(url.pathname) !== "/neondb" || url.hash ||
      !password || /[\u0000-\u001f\u007f]/.test(password)) fail();
  const config: PoolConfig = {
    user: PRODUCTION_PUBLIC_RUNTIME_ROLE,host: url.hostname,port: 5432,database: "neondb",
    max: 2,idleTimeoutMillis: 10000,connectionTimeoutMillis: 5000,
    statement_timeout: 5000,query_timeout: 5500,allowExitOnIdle: true,
    ssl: {rejectUnauthorized: true},application_name: "crays-clubs-production-public-v1",
  };
  Object.defineProperty(config, "password", {value: password,enumerable: false,writable: false,configurable: false});
  return config;
}

async function verify(client: PoolClient) {
  const {rows} = await client.query<{admitted: boolean}>(`
    SELECT current_database()='neondb' AND current_user=$1 AND session_user=$1
    AND coalesce((SELECT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
      AND NOT rolinherit AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication
      AND rolconnlimit=8 FROM pg_roles WHERE rolname=current_user),false)
    AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
    AND has_schema_privilege(current_user,'crays_core_rpc','USAGE')
    AND NOT has_schema_privilege(current_user,'crays_core_rpc','CREATE')
    AND NOT has_schema_privilege(current_user,'crays_core','USAGE')
    AND coalesce((SELECT bool_and(NOT has_table_privilege(current_user,c.oid,
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
        AND c.relkind IN ('r','p','v','m','f')),false)
    AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND c.relkind='S'
      AND has_sequence_privilege(current_user,c.oid,'USAGE,SELECT,UPDATE'))
    AND (SELECT count(*)=7 AND bool_and(p.oid IN (
      to_regprocedure('crays_core_rpc.club_public_ambassadors_prod_v1()'),
      to_regprocedure('crays_core_rpc.club_public_ambassador_portrait_prod_v1(text,text)'),
      to_regprocedure('crays_core_rpc.hospitality_public_content_prod_v1(text)'),
      to_regprocedure('crays_core_rpc.hospitality_public_media_manifest_prod_v1(text)'),
      to_regprocedure('crays_core_rpc.hospitality_public_media_read_prod_v1(text)'),
      to_regprocedure('crays_core_rpc.hospitality_public_planning_policy_prod_v1(text)'),
      to_regprocedure('crays_core_rpc.club_public_hotel_planning_base_sale_prod_v1(text,date)')))
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='crays_core_rpc' AND has_function_privilege(current_user,p.oid,'EXECUTE'))
    AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
        AND n.nspname<>'crays_core_rpc' AND has_schema_privilege(current_user,n.oid,'USAGE')
        AND has_function_privilege(current_user,p.oid,'EXECUTE')
        AND NOT (n.nspname='public' AND p.oid=to_regprocedure('public.show_db_tree()')
          AND NOT p.prosecdef AND encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')=
            '3cfbbce2aee1851aec351d1e99b7c071fa8bbf4b7c5f165f1fbb7f7e6506389a'))
    AS admitted`, [PRODUCTION_PUBLIC_RUNTIME_ROLE]);
  if (rows.length !== 1 || rows[0].admitted !== true) fail();
}

type PublicPool = {query(text: string, values: readonly unknown[]): Promise<{rowCount: number | null; rows: unknown[]}>; end(): Promise<void>};
let singleton: PublicPool | null = null;
export function getProductionPublicPool(): PublicPool {
  if (!singleton) {
    const pool = new Pool(buildProductionPublicPoolConfig());
    singleton = {
      async query(text,values) {
        const client = await pool.connect();
        let failed = false;
        try {
          await client.query("BEGIN READ ONLY");
          await verify(client);
          const result = await client.query(text,[...values]);
          await client.query("COMMIT");
          return result;
        } catch (error) {
          failed = true;
          try {await client.query("ROLLBACK");} catch { /* Connection is discarded. */ }
          throw error;
        } finally {client.release(failed);}
      },
      async end() {await pool.end();},
    };
  }
  return singleton;
}
export async function closeProductionPublicPool() {
  if (singleton) await singleton.end();
  singleton = null;
}
