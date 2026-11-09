-- Never erase a canonical answer/provenance to roll back a deployment.
begin;
set local lock_timeout='1500ms';
set local row_security=off;
do $$begin
 if not exists(select 1 from pg_catalog.pg_roles where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception 'Global unfiltered migration visibility required';end if;
end$$;
lock table crays_core.personal_messenger_agent_responses in access exclusive mode;
do $$begin
 if exists(select 1 from crays_core.personal_messenger_agent_responses) then
  raise exception 'Preserve canonical agent replies before rollback';end if;
end$$;
drop function crays_core.persist_native_personal_agent_response(text,bigint,text);
drop trigger native_personal_message_author on crays_core.messages;
drop function crays_core.guard_native_personal_message_author();
drop policy native_core_agent_message_insert on crays_core.messages;
drop policy native_own_agent_message_read on crays_core.messages;
drop trigger native_personal_agent_response_message on crays_core.personal_messenger_agent_responses;
drop function crays_core.assert_native_personal_agent_response_message();
drop trigger native_personal_agent_response_immutable on crays_core.personal_messenger_agent_responses;
drop function crays_core.guard_native_personal_agent_response();
drop table crays_core.personal_messenger_agent_responses;
commit;
