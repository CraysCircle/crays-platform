-- Trusted Core/JWT principal resolution before own-account context exists.
-- Request fields never supply these transaction-local provider settings.
-- Only the exact verified login mapping is readable at this stage; no global
-- account/role read, identity edit, account creation or SQL privilege is granted.
begin;
create policy native_personal_principal_mapping_read on crays_core.auth_identities for select
 using(current_setting('crays.app_role',true)='core_service' and verified=true
  and provider_key=current_setting('crays.native_personal_provider_key',true)
  and provider_subject=current_setting('crays.native_personal_provider_subject',true));
create or replace function crays_core.reject_native_personal_identity_write() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$begin
 if nullif(current_setting('crays.native_personal_account',true),'') is not null
  or nullif(current_setting('crays.native_personal_provider_subject',true),'') is not null then
  raise exception 'Native personal identity context is read and lock only';end if;
 return new;
end$$;
revoke all on function crays_core.reject_native_personal_identity_write() from public;
commit;
