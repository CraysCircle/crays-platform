-- Exact rollback only while unused. Never erase an unknown/in-flight attempt.
begin;
set local lock_timeout='1500ms';
-- row_security=off does not grant bypass: a filtered non-bypass SELECT errors.
set local row_security=off;
do $$begin
 if not exists(select 1 from pg_catalog.pg_roles where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception 'Global unfiltered migration visibility required';end if;
end$$;
-- Acquire before testing emptiness and retain through COMMIT. A new producer
-- cannot commit into the gap between the check and DROP.
lock table crays_core.personal_messenger_runtime_attempts,crays_core.personal_messenger_runtime_observations in access exclusive mode;
do $$begin
 if exists(select 1 from crays_core.personal_messenger_runtime_attempts) or exists(select 1 from crays_core.personal_messenger_runtime_observations) then
  raise exception 'Reconcile and preserve personal runtime originals before rollback';end if;
end$$;
drop function crays_core.append_native_personal_runtime_observation(text,text,text,jsonb);
drop trigger native_personal_runtime_observation_guard on crays_core.personal_messenger_runtime_observations;
drop function crays_core.guard_native_personal_runtime_observation();
drop function crays_core.assert_native_personal_runtime_attempt_current(text,text);
drop trigger native_personal_runtime_attempt_guard on crays_core.personal_messenger_runtime_attempts;
drop function crays_core.guard_native_personal_runtime_attempt();
drop table crays_core.personal_messenger_runtime_observations;
drop table crays_core.personal_messenger_runtime_attempts;
commit;
