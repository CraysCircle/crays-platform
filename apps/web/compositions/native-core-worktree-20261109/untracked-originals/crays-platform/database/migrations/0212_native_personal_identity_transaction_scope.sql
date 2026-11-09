-- Own-account identity-row access for the existing trusted Core personal
-- transaction context. No SQL privileges, app role, JWT scopes, account or
-- authentication mapping are created by this migration. Clients/agents never
-- receive a database connection. The Core server must resolve the genuine
-- verified principal before setting crays.native_personal_account.
-- This does NOT solve pre-context native owner lookup or runtime admission.
-- No global core_service / guest / business-policy bypass is introduced.
begin;
create policy native_own_account_context_read on crays_core.crays_accounts for select
 using(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true));
-- PostgreSQL locking SELECT requires the applicable UPDATE policy as well.
-- The policies alone would also permit ordinary UPDATE with existing grants.
-- The mandatory statement-effect guards below prohibit ALL identity UPDATEs
-- whenever the native personal context is active; row-locking SELECT does not
-- invoke those triggers. Existing verified identity commands use their own
-- separate context and retain their original authorization.
create policy native_own_account_context_lock on crays_core.crays_accounts for update
 using(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true))
 with check(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true));
create policy native_own_auth_identity_context_read on crays_core.auth_identities for select
 using(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true));
create policy native_own_auth_identity_context_lock on crays_core.auth_identities for update
 using(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true))
 with check(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true));
create function crays_core.reject_native_personal_identity_write() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$begin
 if nullif(current_setting('crays.native_personal_account',true),'') is not null then
  raise exception 'Native personal identity context is read and lock only';end if;
 return new;
end$$;
create trigger aaa_native_personal_account_readonly before update on crays_core.crays_accounts
 for each row execute function crays_core.reject_native_personal_identity_write();
create trigger aaa_native_personal_auth_identity_readonly before update on crays_core.auth_identities
 for each row execute function crays_core.reject_native_personal_identity_write();
revoke all on function crays_core.reject_native_personal_identity_write() from public;
commit;
