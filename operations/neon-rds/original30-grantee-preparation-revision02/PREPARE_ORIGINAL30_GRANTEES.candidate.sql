-- SOURCE ONLY. Root opens one transaction, binds private expected/admission JSON
-- using parameterized set_config(..., true), executes this candidate, fsyncs the
-- complete returned postimage privately, then separately decides COMMIT.
-- No COMMIT/LOGIN/PASSWORD/GRANT/ALTER ROLE/global replay here.
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='2s';
SET LOCAL createrole_self_grant='';
CREATE FUNCTION pg_temp.original30_names() RETURNS text[]
LANGUAGE sql IMMUTABLE AS $names$ SELECT ARRAY['crays_core_member_application_rpc_runtime_v1_073a','crays_core_member_application_rpc_runtime_v1_073b','crays_core_member_demo_catalog_rpc_runtime_v1_073a','crays_core_member_demo_catalog_rpc_runtime_v1_073b','crays_core_member_demo_commerce_rpc_runtime_v1_073a','crays_core_member_demo_commerce_rpc_runtime_v1_073b','crays_core_member_demo_documents_rpc_runtime_v1_073a','crays_core_member_demo_documents_rpc_runtime_v1_073b','crays_core_member_demo_finance_rpc_runtime_v1_073a','crays_core_member_demo_finance_rpc_runtime_v1_073b','crays_core_member_demo_saved_plan_rpc_runtime_v1_073a','crays_core_member_demo_saved_plan_rpc_runtime_v1_073b','crays_core_member_demo_services_rpc_runtime_v1_073a','crays_core_member_demo_services_rpc_runtime_v1_073b','crays_core_member_finance_change_request_rpc_runtime_v1_073a','crays_core_member_finance_change_request_rpc_runtime_v1_073b','crays_core_member_privacy_rpc_runtime_v1_073a','crays_core_member_privacy_rpc_runtime_v1_073b','crays_core_member_profile_rpc_runtime_v1_073a','crays_core_member_profile_rpc_runtime_v1_073b','crays_core_member_purchase_fulfilment_rpc_runtime_v1_073a','crays_core_member_purchase_fulfilment_rpc_runtime_v1_073b','crays_core_member_support_rpc_runtime_v1_073a','crays_core_member_support_rpc_runtime_v1_073b','crays_core_member_support_tools_rpc_runtime_v2_073a','crays_core_member_support_tools_rpc_runtime_v2_073b','crays_core_member_test_stays_rpc_runtime_v1_073a','crays_core_member_test_stays_rpc_runtime_v1_073b','crays_member073_finance_worker','crays_member073_support_worker']::text[] $names$;
CREATE FUNCTION pg_temp.original30_roles() RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $roles$
SELECT jsonb_agg(jsonb_build_object('name',rolname,'login',rolcanlogin,'inherit',rolinherit,'createDB',rolcreatedb,'createRole',rolcreaterole,'superuser',rolsuper,'bypassRLS',rolbypassrls,'replication',rolreplication,'connectionLimit',rolconnlimit,'validUntil',rolvaliduntil,'migrationAdminCanSet',pg_has_role(current_user,oid,'SET'),'migrationAdminHasUsage',pg_has_role(current_user,oid,'USAGE'),'configSHA256',CASE WHEN rolconfig IS NULL THEN NULL ELSE encode(sha256(convert_to(rolconfig::text,'UTF8')),'hex') END) ORDER BY rolname COLLATE "C") FROM pg_roles
$roles$;
CREATE FUNCTION pg_temp.original30_memberships() RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $memberships$
SELECT coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'member',u.rolname,'grantor',g.rolname,'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option) ORDER BY r.rolname COLLATE "C",u.rolname COLLATE "C",g.rolname COLLATE "C"),'[]'::jsonb) FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member JOIN pg_roles g ON g.oid=m.grantor
$memberships$;
CREATE FUNCTION pg_temp.original30_guard(created text[]) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $guard$
DECLARE
 expected jsonb := current_setting('crays.original30_expected',true)::jsonb;
 admission jsonb := current_setting('crays.original30_admission',true)::jsonb;
 names text[] := pg_temp.original30_names();
 actual_roles jsonb; actual_memberships jsonb;
 expected_roles jsonb; expected_memberships jsonb;
 bootstrap_name text;
BEGIN
 IF expected IS NULL OR admission IS NULL
   OR jsonb_typeof(expected->'roles') IS DISTINCT FROM 'array'
   OR jsonb_typeof(expected->'memberships') IS DISTINCT FROM 'array'
   OR (SELECT count(*) FROM jsonb_object_keys(expected)) <> 2
   OR jsonb_array_length(expected->'roles') <> 131
   OR jsonb_array_length(expected->'memberships') <> 245 THEN
   RAISE EXCEPTION USING MESSAGE='ROOT_FULL_PREIMAGE_BINDING_REQUIRED';
 END IF;
 IF session_user <> 'crays_rds_admin' OR current_user <> session_user
   OR current_database() <> 'postgres'
   OR current_setting('server_version_num')::int NOT BETWEEN 180000 AND 189999
   OR current_setting('transaction_read_only') <> 'off'
   OR current_setting('createrole_self_grant') <> ''
   OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolcreaterole AND NOT rolsuper) THEN
   RAISE EXCEPTION USING MESSAGE='EXACT_ROOT_PREPARATION_SESSION_REQUIRED';
 END IF;
 IF admission->'executionApproved' IS DISTINCT FROM 'true'::jsonb
   OR admission->'exclusiveRoleWriterFenceHeld' IS DISTINCT FROM 'true'::jsonb
   OR admission->'prepareOriginal30Only' IS DISTINCT FROM 'true'::jsonb
   OR admission->'existingRolesAlterAllowed' IS DISTINCT FROM 'false'::jsonb
   OR admission->'ordinaryConnectAllowed' IS DISTINCT FROM 'false'::jsonb
   OR admission->'restoreExecutionAllowed' IS DISTINCT FROM 'false'::jsonb
   OR admission->>'actor' IS DISTINCT FROM 'crays_rds_admin'
   OR admission->>'targetDatabase' IS DISTINCT FROM 'crays_core_xl_20261109'
   OR coalesce(admission->>'rootScopeId','') = ''
   OR coalesce(admission->>'reviewSHA256','') !~ '^[a-f0-9]{64}$'
   OR coalesce(admission->>'sourceSQLSHA256','') !~ '^[a-f0-9]{64}$'
   OR (admission->>'notBeforeUTC')::timestamptz IS NULL
   OR (admission->>'expiresAtUTC')::timestamptz IS NULL
   OR clock_timestamp() < (admission->>'notBeforeUTC')::timestamptz
   OR clock_timestamp() >= (admission->>'expiresAtUTC')::timestamptz
   OR (admission->>'expiresAtUTC')::timestamptz-(admission->>'notBeforeUTC')::timestamptz > interval '10 minutes' THEN
   RAISE EXCEPTION USING MESSAGE='FRESH_EXACT_ROOT_ADMISSION_REQUIRED';
 END IF;
 IF created IS NULL OR cardinality(created)>30
    OR created IS DISTINCT FROM names[1:cardinality(created)] THEN
   RAISE EXCEPTION USING MESSAGE='EXACT_CREATED_PREFIX_REQUIRED';
 END IF;
 IF EXISTS(SELECT FROM pg_database WHERE datname='crays_core_xl_20261109') THEN
   RAISE EXCEPTION USING MESSAGE='TARGET_DATABASE_MUST_REMAIN_ABSENT';
 END IF;
 SELECT rolname INTO bootstrap_name FROM pg_roles WHERE oid=10 AND rolsuper;
 IF bootstrap_name IS NULL OR admission->>'bootstrapGrantorName' IS DISTINCT FROM bootstrap_name
   OR NOT EXISTS(SELECT FROM jsonb_array_elements(expected->'roles') e WHERE e->>'name'=bootstrap_name AND e->'superuser'='true'::jsonb) THEN
   RAISE EXCEPTION USING MESSAGE='NATIVE_BOOTSTRAP_GRANTOR_REQUIRED';
 END IF;
 IF EXISTS(SELECT FROM jsonb_array_elements(expected->'roles') e WHERE e->>'name'=ANY(names))
   OR EXISTS(SELECT FROM pg_roles WHERE rolname=ANY(names) AND NOT rolname=ANY(created)) THEN
   RAISE EXCEPTION USING MESSAGE='UNCREATED_NAMES_MUST_BE_ABSENT';
 END IF;
 SELECT jsonb_agg(e ORDER BY e->>'name' COLLATE "C") INTO expected_roles FROM (
   SELECT value AS e FROM jsonb_array_elements(expected->'roles')
   UNION ALL
   SELECT jsonb_build_object('name',n,'login',false,'inherit',false,
    'createDB',false,'createRole',false,'superuser',false,'bypassRLS',false,
    'replication',false,'connectionLimit',-1,'validUntil',NULL,
    'migrationAdminCanSet',false,'migrationAdminHasUsage',false,'configSHA256',NULL)
   FROM unnest(created) n
 ) x;
 SELECT coalesce(jsonb_agg(e ORDER BY e->>'role' COLLATE "C",
   e->>'member' COLLATE "C",e->>'grantor' COLLATE "C"),'[]'::jsonb)
 INTO expected_memberships FROM (
   SELECT value AS e FROM jsonb_array_elements(expected->'memberships')
   UNION ALL
   SELECT jsonb_build_object('role',n,'member','crays_rds_admin',
    'grantor',bootstrap_name,'admin',true,'inherit',false,'set',false)
   FROM unnest(created) n
 ) x;
 actual_roles:=pg_temp.original30_roles();
 actual_memberships:=pg_temp.original30_memberships();
 IF actual_roles IS DISTINCT FROM expected_roles THEN
   RAISE EXCEPTION USING MESSAGE='FULL_ROLE_PROJECTION_NOT_EXACT';
 END IF;
 IF actual_memberships IS DISTINCT FROM expected_memberships THEN
   RAISE EXCEPTION USING MESSAGE='FULL_MEMBERSHIP_PROJECTION_NOT_EXACT';
 END IF;
END
$guard$;
DO $prepare$
DECLARE created text[]:=ARRAY[]::text[];
BEGIN
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_application_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_application_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_application_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_application_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_catalog_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_catalog_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_catalog_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_catalog_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_commerce_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_commerce_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_commerce_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_commerce_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_documents_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_documents_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_documents_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_documents_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_finance_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_finance_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_finance_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_finance_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_saved_plan_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_saved_plan_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_saved_plan_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_saved_plan_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_services_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_services_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_demo_services_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_demo_services_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_finance_change_request_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_finance_change_request_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_finance_change_request_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_finance_change_request_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_privacy_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_privacy_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_privacy_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_privacy_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_profile_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_profile_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_profile_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_profile_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_purchase_fulfilment_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_purchase_fulfilment_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_purchase_fulfilment_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_purchase_fulfilment_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_support_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_support_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_support_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_support_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_support_tools_rpc_runtime_v2_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_support_tools_rpc_runtime_v2_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_support_tools_rpc_runtime_v2_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_support_tools_rpc_runtime_v2_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_test_stays_rpc_runtime_v1_073a" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_test_stays_rpc_runtime_v1_073a');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_core_member_test_stays_rpc_runtime_v1_073b" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_core_member_test_stays_rpc_runtime_v1_073b');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_member073_finance_worker" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_member073_finance_worker');
 PERFORM pg_temp.original30_guard(created);
 CREATE ROLE "crays_member073_support_worker" NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
 created:=array_append(created,'crays_member073_support_worker');
 PERFORM pg_temp.original30_guard(created);
END
$prepare$;
-- PRIVATE RESULT ONLY: Root consumes this in the same session without stdout.
SELECT jsonb_build_object(
 'roles',pg_temp.original30_roles(),
 'memberships',pg_temp.original30_memberships(),
 'actor',current_user,'sessionActor',session_user,'database',current_database(),
 'targetDatabase','crays_core_xl_20261109',
 'createdRoleNames',to_jsonb(pg_temp.original30_names()),
 'createroleSelfGrant',current_setting('createrole_self_grant'),
 'postimageValidatedBeforeCommit',true,'commitAcknowledged',false,
 'fullOriginalAuthenticationParity',false,'ordinaryConsumerConnectGranted',false,
 'restoreExecutionApproved',false
) AS preparation_private_pending_postimage;
-- Root MUST NOT hand an uncommitted/unknown-commit postimage to Runner04.
