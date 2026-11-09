begin;
drop policy native_personal_principal_mapping_read on crays_core.auth_identities;
create or replace function crays_core.reject_native_personal_identity_write() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$begin
 if nullif(current_setting('crays.native_personal_account',true),'') is not null then
  raise exception 'Native personal identity context is read and lock only';end if;
 return new;
end$$;
revoke all on function crays_core.reject_native_personal_identity_write() from public;
commit;
