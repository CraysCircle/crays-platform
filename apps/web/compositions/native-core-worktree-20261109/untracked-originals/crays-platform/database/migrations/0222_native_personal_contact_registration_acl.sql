-- Owning native contact command: scoped access to its original Core records.
-- No credentials, role memberships, account rows or issuer approvals are created.
begin;
set local lock_timeout='3s';
do $$declare target text; begin
 if current_user<>session_user or to_regrole('crays_core_native_personal_runtime_v1') is null then raise exception 'Original direct Core release authority required'; end if;
 foreach target in array array['crays_accounts','auth_identities','account_email_verifications','audit_events'] loop
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='crays_core' and c.relname=target and c.relkind='r' and c.relowner=current_user::regrole and c.relrowsecurity and c.relforcerowsecurity) then raise exception 'Original forced-RLS prerequisite missing: %',target; end if;
 end loop;
 if has_table_privilege('crays_core_native_personal_runtime_v1','crays_core.auth_identities','INSERT') or has_table_privilege('crays_core_native_personal_runtime_v1','crays_core.audit_events','INSERT') then raise exception 'Contact release already installed or unexpected prior grants'; end if;
end $$;
-- Preserve personal-chat identity lock-only triggers. The authenticated contact
-- command uses a separate transaction-local scope, checked by these same own
-- Core table policies. No new identity resolver or canonical data store.
do $$declare target text; scope_sql text; policy_name text; begin
 foreach target in array array['crays_accounts','auth_identities','account_email_verifications'] loop
  scope_sql := 'account_id=coalesce(nullif(current_setting(''crays.native_personal_account'',true),''''),nullif(current_setting(''crays.native_contact_account'',true),''''))';
  if target='auth_identities' then scope_sql:=scope_sql||' or (verified=true and provider_key=current_setting(''crays.native_personal_provider_key'',true) and provider_subject=current_setting(''crays.native_personal_provider_subject'',true))'; end if;
  foreach policy_name in array array['native_runtime_own_boundary','native_runtime_own_access'] loop
   execute format('alter policy %I on crays_core.%I using(%s) with check(%s)',policy_name,target,scope_sql,scope_sql);
  end loop;
 end loop;
end $$;
grant update(primary_contact,primary_contact_type,updated_at) on crays_core.crays_accounts to crays_core_native_personal_runtime_v1;
grant insert on crays_core.auth_identities,crays_core.account_email_verifications to crays_core_native_personal_runtime_v1;
create policy native_runtime_own_boundary on crays_core.audit_events as restrictive for all to crays_core_native_personal_runtime_v1
 using(actor_account_id=nullif(current_setting('crays.native_contact_account',true),'') and target_type='crays-account' and target_id=actor_account_id and action='identity.registration_email.verified' and outcome='changed' and risk_level='sensitive')
 with check(actor_account_id=nullif(current_setting('crays.native_contact_account',true),'') and target_type='crays-account' and target_id=actor_account_id and action='identity.registration_email.verified' and outcome='changed' and risk_level='sensitive');
create policy native_runtime_own_access on crays_core.audit_events as permissive for all to crays_core_native_personal_runtime_v1
 using(actor_account_id=nullif(current_setting('crays.native_contact_account',true),'') and target_type='crays-account' and target_id=actor_account_id and action='identity.registration_email.verified' and outcome='changed' and risk_level='sensitive')
 with check(actor_account_id=nullif(current_setting('crays.native_contact_account',true),'') and target_type='crays-account' and target_id=actor_account_id and action='identity.registration_email.verified' and outcome='changed' and risk_level='sensitive');
grant insert on crays_core.audit_events to crays_core_native_personal_runtime_v1;
grant usage on sequence crays_core.audit_events_id_seq to crays_core_native_personal_runtime_v1;
grant usage on sequence crays_core.auth_identities_id_seq to crays_core_native_personal_runtime_v1;
commit;
