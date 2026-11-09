-- Additive own-person Chuck ingress only. No model/runtime/worker is admitted.
-- Requires existing canonical-person and personal-agent assignment migrations.
begin;
-- Preserve CURRENT Core checks, including later roles such as holiday-manager.
-- Never replace them with a stale role list. Read and replace under one lock.
set local lock_timeout = '3s';
lock table crays_core.conversations, crays_core.conversation_participants,
 crays_core.messages in access exclusive mode;
do $extend_existing_checks$
declare spec record; existing_expression text;
begin
 for spec in select * from (values
  ('conversations','conversation_type','conversations_type_check','personal_chuck',''),
  ('conversations','related_entity_type','conversations_related_type_check','canonical-person',''),
  ('conversations','opened_by_role','conversations_opened_by_role_check','guest',
   ' and conversation_type = ''personal_chuck'''),
  ('conversation_participants','role_key','conversation_participants_role_key_check','guest',''),
  ('messages','sender_role','messages_sender_role_check','guest','')
 ) as checks(table_name,column_name,constraint_name,new_value,additional_condition)
 loop
  select pg_catalog.pg_get_expr(k.conbin,k.conrelid,false)
   into existing_expression
   from pg_catalog.pg_constraint k
   join pg_catalog.pg_class c on c.oid=k.conrelid
   join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   join pg_catalog.pg_attribute a on a.attrelid=c.oid
    and a.attname=spec.column_name and a.attnum>0 and not a.attisdropped
   where n.nspname='crays_core' and c.relname=spec.table_name
    and k.conname=spec.constraint_name and k.contype='c' and k.convalidated
    and k.conislocal and not k.connoinherit and k.conparentid=0
    and k.conkey=array[a.attnum]::smallint[];
  if existing_expression is null then
   raise exception 'Original single-column validated Core check required: %.%',
    spec.table_name,spec.constraint_name;
  end if;
  execute pg_catalog.format('alter table crays_core.%I drop constraint %I',
   spec.table_name,spec.constraint_name);
  execute pg_catalog.format(
   'alter table crays_core.%I add constraint %I check ((%s) or (%I = %L%s))',
   spec.table_name,spec.constraint_name,existing_expression,
   spec.column_name,spec.new_value,spec.additional_condition);
 end loop;
end
$extend_existing_checks$;
alter table crays_core.conversations add constraint canonical_person_thread_only check (related_entity_type<>'canonical-person' or conversation_type='personal_chuck');
alter table crays_core.conversations add constraint personal_chuck_private_shape check
 (conversation_type<>'personal_chuck' or (related_entity_type='canonical-person' and organization_id is null and studio_id is null and prepared_offer_id is null and deal_id is null and property_case_id is null and bank_package_id is null and loan_case_id is null and visibility_roles='[]'::jsonb and created_by_account_id is not null));
-- Guest participation/message roles remain personal-only through these triggers.
create function crays_core.guard_native_personal_guest_scope() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$ begin
 if tg_table_name='messages' then
  if new.sender_role<>'guest' then return new;end if;
 else
  if new.role_key<>'guest' then return new;end if;
 end if;
 if true then
  perform 1 from crays_core.conversations c where c.conversation_id=new.conversation_id and c.conversation_type='personal_chuck';
  if not found then raise exception 'Guest communication is personal only';end if;
 end if;
 return new;end $$;
create trigger native_personal_message_scope before insert or update on crays_core.messages for each row execute function crays_core.guard_native_personal_guest_scope();
create trigger native_personal_participant_scope before insert or update on crays_core.conversation_participants for each row execute function crays_core.guard_native_personal_guest_scope();
create table crays_core.personal_messenger_bindings (
 binding_id text primary key,
 account_id text not null unique references crays_core.crays_accounts(account_id),
 canonical_person_id text not null unique references crays_core.canonical_people(canonical_person_id),
 agent_id text not null references crays_core.personal_agent_standard_assignments(agent_id),
 conversation_id text not null unique references crays_core.conversations(conversation_id),
 participant_id text not null unique references crays_core.conversation_participants(participant_id),
 revision bigint not null default 1 check(revision>0),
 status text not null default 'active' check(status in('active','revoked')),
 purpose text not null check(purpose='own-personal-chuck'),
 created_at timestamptz not null default now()
);
create table crays_core.personal_messenger_ingress_receipts (
 receipt_id text primary key,
 binding_id text not null references crays_core.personal_messenger_bindings(binding_id),
 account_id text not null references crays_core.crays_accounts(account_id),
 message_id text not null unique references crays_core.messages(message_id),
 idempotency_key text not null check(length(idempotency_key) between 1 and 128),
 payload_sha256 text not null check(payload_sha256~'^[a-f0-9]{64}$'),
 binding_revision bigint not null check(binding_revision>0),
 contact_revision bigint not null check(contact_revision>0),
 outcome text not null check(outcome='STORED_RUNTIME_UNAVAILABLE'),
 created_at timestamptz not null default now(),
 unique(account_id,idempotency_key)
);
create table crays_core.personal_messenger_outbox (
 receipt_id text primary key references crays_core.personal_messenger_ingress_receipts(receipt_id),
 -- A durable pending-admission record, NOT a queued job for an admitted worker.
 state text not null check(state='waiting_runtime_admission'),
 created_at timestamptz not null default now()
);
create function crays_core.reject_native_ingress_mutation() returns trigger language plpgsql as $$begin raise exception 'Personal ingress original is immutable';end$$;
create trigger native_ingress_immutable before update or delete on crays_core.personal_messenger_ingress_receipts for each row execute function crays_core.reject_native_ingress_mutation();
-- New records are inaccessible to PUBLIC; trusted Core transactions still check
-- exact current account/person/agent/participant, not role-scoped business access.
revoke all on crays_core.personal_messenger_bindings,crays_core.personal_messenger_ingress_receipts,crays_core.personal_messenger_outbox from public;
revoke all on function crays_core.guard_native_personal_guest_scope(),crays_core.reject_native_ingress_mutation() from public;
-- Narrow Core request transaction context; no global/business guest policy.
alter table crays_core.personal_messenger_bindings enable row level security;
alter table crays_core.personal_messenger_bindings force row level security;
alter table crays_core.personal_messenger_ingress_receipts enable row level security;
alter table crays_core.personal_messenger_ingress_receipts force row level security;
alter table crays_core.personal_messenger_outbox enable row level security;
alter table crays_core.personal_messenger_outbox force row level security;
create policy native_own_binding on crays_core.personal_messenger_bindings for all
 using(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true))
 with check(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true));
create policy native_own_receipt on crays_core.personal_messenger_ingress_receipts for all
 using(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true))
 with check(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true));
create policy native_own_outbox on crays_core.personal_messenger_outbox for all
 using(exists(select 1 from crays_core.personal_messenger_ingress_receipts r where r.receipt_id=personal_messenger_outbox.receipt_id))
 with check(exists(select 1 from crays_core.personal_messenger_ingress_receipts r where r.receipt_id=personal_messenger_outbox.receipt_id));
create policy native_own_conversation on crays_core.conversations for all
 using(conversation_type='personal_chuck' and current_setting('crays.app_role',true)='core_service' and created_by_account_id=current_setting('crays.native_personal_account',true))
 with check(conversation_type='personal_chuck' and current_setting('crays.app_role',true)='core_service' and created_by_account_id=current_setting('crays.native_personal_account',true));
create policy native_own_participant on crays_core.conversation_participants for all
 using(account_id=current_setting('crays.native_personal_account',true) and exists(select 1 from crays_core.conversations c where c.conversation_id=conversation_participants.conversation_id and c.conversation_type='personal_chuck'))
 with check(account_id=current_setting('crays.native_personal_account',true) and exists(select 1 from crays_core.conversations c where c.conversation_id=conversation_participants.conversation_id and c.conversation_type='personal_chuck'));
create policy native_own_message on crays_core.messages for all
 using(sender_account_id=current_setting('crays.native_personal_account',true) and exists(select 1 from crays_core.conversations c where c.conversation_id=messages.conversation_id and c.conversation_type='personal_chuck'))
 with check(sender_account_id=current_setting('crays.native_personal_account',true) and exists(select 1 from crays_core.conversations c where c.conversation_id=messages.conversation_id and c.conversation_type='personal_chuck'));
create function crays_core.protect_native_personal_original() returns trigger language plpgsql set search_path=pg_catalog,crays_core as $$begin
 if exists(select 1 from crays_core.conversations c where c.conversation_id=old.conversation_id and c.conversation_type='personal_chuck') then
  if tg_op='DELETE' then raise exception 'Personal original cannot be deleted by generic message command';end if;
  if (new.body,new.sender_account_id,new.conversation_id,new.message_id,new.created_at) is distinct from (old.body,old.sender_account_id,old.conversation_id,old.message_id,old.created_at) then raise exception 'Personal original is immutable';end if;
 end if;return new;end$$;
create trigger native_personal_original_immutable before update or delete on crays_core.messages for each row execute function crays_core.protect_native_personal_original();
revoke all on function crays_core.protect_native_personal_original() from public;
commit;
