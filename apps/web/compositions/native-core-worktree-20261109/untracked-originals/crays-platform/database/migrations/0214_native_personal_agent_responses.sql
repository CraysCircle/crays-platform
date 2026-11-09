-- Canonical assistant replies in the EXISTING conversation/messages store.
-- No HTTP/native response-writing operation or runtime grant is introduced.
-- Only a separately admitted trusted Core SDK producer may call the fixed
-- promotion function. Correlated observations alone do not admit a runtime.
begin;
create table crays_core.personal_messenger_agent_responses (
 message_id text primary key check(message_id ~ '^personal-message-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
  references crays_core.messages(message_id) deferrable initially deferred,
 attempt_id text not null unique references crays_core.personal_messenger_runtime_attempts(attempt_id),
 observation_id bigint not null unique references crays_core.personal_messenger_runtime_observations(observation_id),
 account_id text not null references crays_core.crays_accounts(account_id),
 binding_id text not null references crays_core.personal_messenger_bindings(binding_id),
 agent_id text not null references crays_core.personal_agent_standard_assignments(agent_id),
 request_message_id text not null references crays_core.messages(message_id),
 created_at timestamptz not null default now()
);
alter table crays_core.personal_messenger_agent_responses enable row level security;
alter table crays_core.personal_messenger_agent_responses force row level security;
create policy native_own_agent_response_read on crays_core.personal_messenger_agent_responses for select
 using(current_setting('crays.app_role',true)='core_service'
  and account_id=current_setting('crays.native_personal_account',true));
create policy native_core_agent_response_insert on crays_core.personal_messenger_agent_responses for insert
 with check(current_setting('crays.app_role',true)='core_service'
  and current_setting('crays.native_personal_runtime_producer',true)='sdk-terminal'
  and account_id=current_setting('crays.native_personal_account',true));
create function crays_core.guard_native_personal_agent_response() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$begin
 if tg_op<>'INSERT' then raise exception 'Canonical personal agent response is immutable';end if;
 if current_setting('crays.native_personal_runtime_producer',true) is distinct from 'sdk-terminal' then
  raise exception 'Trusted Core SDK response producer required';end if;
 perform crays_core.assert_native_personal_runtime_attempt_current(new.attempt_id,new.account_id);
 perform 1 from crays_core.personal_messenger_runtime_attempts t
 join crays_core.personal_messenger_runtime_observations o on o.attempt_id=t.attempt_id and o.account_id=t.account_id
 join crays_core.personal_messenger_ingress_receipts r on r.receipt_id=t.receipt_id and r.account_id=t.account_id
 where t.attempt_id=new.attempt_id and t.account_id=new.account_id and t.binding_id=new.binding_id and t.agent_id=new.agent_id
  and r.message_id=new.request_message_id and o.observation_id=new.observation_id and o.kind='terminal_reply'
  and o.projection->>'runId'=t.sdk_run_id and o.projection->>'sessionId'=t.sdk_session_id
 for share of t,o,r;
 if not found then raise exception 'Exact terminal response and original provenance required';end if;
 return new;
end$$;
create trigger native_personal_agent_response_immutable before insert or update or delete
 on crays_core.personal_messenger_agent_responses for each row execute function crays_core.guard_native_personal_agent_response();
-- The descriptor may precede its message within one transaction, but may
-- never be committed pointing to an existing human or another conversation.
create function crays_core.assert_native_personal_agent_response_message() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$begin
 perform 1 from crays_core.messages m
 join crays_core.personal_messenger_bindings b on b.binding_id=new.binding_id and b.account_id=new.account_id
 join crays_core.personal_messenger_runtime_observations o on o.observation_id=new.observation_id
 where m.message_id=new.message_id and m.conversation_id=b.conversation_id
  and m.sender_account_id is null and m.sender_role='system' and m.channel='in_app'
  and m.message_type='system_notification' and m.visibility='internal' and m.body_format='plain_text'
  and m.body=o.projection->>'text' and m.deleted_at is null;
 if not found then raise exception 'Canonical response provenance must reference its exact assistant message';end if;
 return new;
end$$;
create constraint trigger native_personal_agent_response_message after insert on crays_core.personal_messenger_agent_responses
 deferrable initially deferred for each row execute function crays_core.assert_native_personal_agent_response_message();
-- An assistant is NOT the human account. Nullable canonical sender plus typed
-- agent provenance prevents an answer from being rendered as an owner message.
create policy native_own_agent_message_read on crays_core.messages for select using(
 current_setting('crays.app_role',true)='core_service' and sender_account_id is null and sender_role='system'
 and exists(select 1 from crays_core.personal_messenger_agent_responses r
  join crays_core.personal_messenger_bindings b on b.binding_id=r.binding_id and b.account_id=r.account_id
  where r.message_id=messages.message_id and b.conversation_id=messages.conversation_id
   and r.account_id=current_setting('crays.native_personal_account',true)));
create policy native_core_agent_message_insert on crays_core.messages for insert with check(
 current_setting('crays.app_role',true)='core_service'
 and current_setting('crays.native_personal_runtime_producer',true)='sdk-terminal'
 and sender_account_id is null and sender_role='system'
 and exists(select 1 from crays_core.personal_messenger_agent_responses r
  join crays_core.personal_messenger_bindings b on b.binding_id=r.binding_id and b.account_id=r.account_id
  where r.message_id=messages.message_id and b.conversation_id=messages.conversation_id
   and r.account_id=current_setting('crays.native_personal_account',true)));
create function crays_core.guard_native_personal_message_author() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$declare owner_id text; expected_text text;
begin
 select created_by_account_id into owner_id from crays_core.conversations
  where conversation_id=new.conversation_id and conversation_type='personal_chuck';
 if not found then return new;end if;
 if new.sender_role='guest' and new.sender_account_id=owner_id then return new;end if;
 if new.sender_role<>'system' or new.sender_account_id is not null or new.channel<>'in_app'
  or new.message_type<>'system_notification' or new.body_format<>'plain_text' or new.visibility<>'internal'
  or new.delivery_status<>'not_sent' or new.metadata<>'{}'::jsonb
  or new.attachment_refs<>'[]'::jsonb or new.related_document_ids<>'[]'::jsonb or new.related_task_ids<>'[]'::jsonb then
  raise exception 'Typed canonical personal message author required';end if;
 select o.projection->>'text' into expected_text from crays_core.personal_messenger_agent_responses r
 join crays_core.personal_messenger_runtime_observations o on o.observation_id=r.observation_id
 join crays_core.personal_messenger_bindings b on b.binding_id=r.binding_id and b.account_id=r.account_id
 where r.message_id=new.message_id and r.account_id=owner_id and b.conversation_id=new.conversation_id;
 if not found or new.body is distinct from expected_text then raise exception 'Canonical answer must equal exact terminal original';end if;
 return new;
end$$;
create trigger native_personal_message_author before insert or update on crays_core.messages
 for each row execute function crays_core.guard_native_personal_message_author();
create function crays_core.persist_native_personal_agent_response(p_attempt text,p_observation bigint,p_message text)
 returns text language plpgsql set search_path=pg_catalog,crays_core as $$declare
 a text; t crays_core.personal_messenger_runtime_attempts; o crays_core.personal_messenger_runtime_observations;
 existing crays_core.personal_messenger_agent_responses; original_id text; conversation text;
begin
 a:=current_setting('crays.native_personal_account',true);
 if current_setting('crays.app_role',true) is distinct from 'core_service'
  or current_setting('crays.native_personal_runtime_producer',true) is distinct from 'sdk-terminal'
  or a is null or a='' then raise exception 'Trusted current Core SDK response context required';end if;
 select * into t from crays_core.personal_messenger_runtime_attempts where attempt_id=p_attempt and account_id=a for update;
 if not found then raise exception 'Own personal attempt required';end if;
 perform crays_core.assert_native_personal_runtime_attempt_current(p_attempt,a);
 select * into o from crays_core.personal_messenger_runtime_observations
  where observation_id=p_observation and attempt_id=p_attempt and account_id=a and kind='terminal_reply';
 if not found then raise exception 'Terminal response required; ACK or unknown is not an answer';end if;
 select * into existing from crays_core.personal_messenger_agent_responses where attempt_id=p_attempt;
 if found then
  if existing.observation_id<>p_observation then raise exception 'Conflicting terminal response';end if;
  return existing.message_id;
 end if;
 select r.message_id,b.conversation_id into original_id,conversation
 from crays_core.personal_messenger_ingress_receipts r join crays_core.personal_messenger_bindings b on b.binding_id=r.binding_id
 where r.receipt_id=t.receipt_id and r.account_id=a and b.account_id=a;
 if not found then raise exception 'Exact original conversation required';end if;
 insert into crays_core.personal_messenger_agent_responses(message_id,attempt_id,observation_id,account_id,binding_id,agent_id,request_message_id)
  values(p_message,p_attempt,p_observation,a,t.binding_id,t.agent_id,original_id);
 insert into crays_core.messages(message_id,conversation_id,sender_account_id,sender_role,channel,message_type,body,body_format,visibility,delivery_status)
  values(p_message,conversation,null,'system','in_app','system_notification',o.projection->>'text','plain_text','internal','not_sent');
 return p_message;
end$$;
revoke all on crays_core.personal_messenger_agent_responses from public;
revoke all on function crays_core.guard_native_personal_agent_response(),crays_core.assert_native_personal_agent_response_message(),crays_core.guard_native_personal_message_author(),crays_core.persist_native_personal_agent_response(text,bigint,text) from public;
commit;
