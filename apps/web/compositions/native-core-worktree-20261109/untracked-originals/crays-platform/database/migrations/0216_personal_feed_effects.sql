-- Source candidate only. Never applied by app startup. No feed contents/paths,
-- provider credentials, identity, agent or canonical feed master created here.
begin;
create table crays_core.personal_feed_states (
 state_id uuid primary key, account_id text not null references crays_core.crays_accounts(account_id),
 canonical_person_id text not null references crays_core.canonical_people(canonical_person_id),
 agent_id text not null references crays_core.personal_agent_standard_assignments(agent_id),
 runtime_attempt_id text not null references crays_core.personal_messenger_runtime_attempts(attempt_id),
 engine_sha256 text not null check(engine_sha256~'^[a-f0-9]{64}$'),
 initial_state_sha256 text not null check(initial_state_sha256~'^[a-f0-9]{64}$'),
 continuity_sha256 text not null check(continuity_sha256~'^[a-f0-9]{64}$'),
 worker_binding_sha256 text not null check(worker_binding_sha256~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(), unique(state_id,account_id), unique(account_id,agent_id)
);
create table crays_core.personal_feed_revocations (
 state_id uuid primary key references crays_core.personal_feed_states,
 account_id text not null references crays_core.crays_accounts(account_id),
 receipt_id uuid not null unique, created_at timestamptz not null default now(),
 foreign key(state_id,account_id) references crays_core.personal_feed_states(state_id,account_id)
);
create table crays_core.personal_feed_intents (
 intent_id uuid primary key, account_id text not null references crays_core.crays_accounts(account_id),
 state_id uuid not null, runtime_attempt_id text not null references crays_core.personal_messenger_runtime_attempts(attempt_id),
 expected_version bigint not null check(expected_version between 1 and 9007199254740990),
 expected_state_sha256 text not null check(expected_state_sha256~'^[a-f0-9]{64}$'),
 operation text not null check(operation in ('add','remove','blogs','scan','articles','read','unread','read-all')),
 plan jsonb not null check(jsonb_typeof(plan)='object' and octet_length(plan::text)<=32768),
 plan_sha256 text not null check(plan_sha256~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '10 minutes',
 check(expires_at>created_at and expires_at<=created_at+interval '10 minutes'),
 foreign key(state_id,account_id) references crays_core.personal_feed_states(state_id,account_id),
 unique(intent_id,account_id)
);
-- Explicit native-owner confirmation, separate from model proposal/chat ACK.
create table crays_core.personal_feed_confirmations (
 intent_id uuid primary key, account_id text not null, receipt_id uuid not null unique,
 plan_sha256 text not null check(plan_sha256~'^[a-f0-9]{64}$'),
 destructive_confirmed boolean not null, disclosure_confirmed boolean not null,
 created_at timestamptz not null default now(),
 foreign key(intent_id,account_id) references crays_core.personal_feed_intents(intent_id,account_id)
);
create table crays_core.personal_feed_attempts (
 attempt_id uuid primary key, intent_id uuid not null unique, account_id text not null,
 worker_binding_sha256 text not null check(worker_binding_sha256~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 foreign key(intent_id,account_id) references crays_core.personal_feed_intents(intent_id,account_id),
 unique(attempt_id,account_id)
);
create table crays_core.personal_feed_outcomes (
 receipt_id uuid primary key, attempt_id uuid not null, account_id text not null,
 event_key uuid not null,
 kind text not null check(kind in ('unknown','succeeded','failed_no_effect','reconciled_succeeded','reconciled_no_effect')),
 state_version bigint not null check(state_version between 1 and 9007199254740991),
 state_sha256 text not null check(state_sha256~'^[a-f0-9]{64}$'),
 evidence_sha256 text not null check(evidence_sha256~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 ordinal bigint generated always as identity unique,
 foreign key(attempt_id,account_id) references crays_core.personal_feed_attempts(attempt_id,account_id),
 unique(attempt_id,event_key)
);
create function crays_core.guard_personal_feed_effect() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$declare v_runtime text; v_agent text; v_person text; v_plan jsonb; v_hash text; v_expires timestamptz;begin
 if tg_op<>'INSERT' then raise exception 'Personal feed authority records are immutable';end if;
 if current_setting('crays.app_role',true) is distinct from 'core_service'
  or current_setting('crays.native_personal_account',true) is distinct from new.account_id
  or current_setting('crays.personal_feed_producer',true) is distinct from 'typed-feed-v1' then
  raise exception 'Scoped typed personal feed producer required';end if;
 if tg_table_name='personal_feed_states' then
  perform crays_core.assert_native_personal_runtime_attempt_current(new.runtime_attempt_id,new.account_id);
  select agent_id into v_agent from crays_core.personal_messenger_runtime_attempts where attempt_id=new.runtime_attempt_id and account_id=new.account_id;
  perform 1 from crays_core.personal_agent_standard_assignments where agent_id=v_agent and account_id=new.account_id and canonical_person_id=new.canonical_person_id;
  if not found or new.agent_id is distinct from v_agent then raise exception 'Exact existing personal feed assignment required';end if;
 elsif tg_table_name='personal_feed_intents' then
  perform crays_core.assert_native_personal_runtime_attempt_current(new.runtime_attempt_id,new.account_id);
  select s.agent_id,t.agent_id into v_agent,v_person from crays_core.personal_feed_states s
   join crays_core.personal_messenger_runtime_attempts t on t.attempt_id=new.runtime_attempt_id and t.account_id=s.account_id
   where s.state_id=new.state_id and s.account_id=new.account_id;
  if v_agent is null or v_agent is distinct from v_person then raise exception 'Exact existing personal feed invocation required';end if;
 elsif tg_table_name in ('personal_feed_confirmations','personal_feed_attempts') then
  select runtime_attempt_id,plan,plan_sha256,expires_at into v_runtime,v_plan,v_hash,v_expires from crays_core.personal_feed_intents where intent_id=new.intent_id and account_id=new.account_id;
  if v_runtime is null or v_expires<=clock_timestamp() then raise exception 'Current unexpired personal feed intent required';end if;
  perform crays_core.assert_native_personal_runtime_attempt_current(v_runtime,new.account_id);
  if tg_table_name='personal_feed_confirmations' then
   if new.plan_sha256 is distinct from v_hash or ((v_plan->>'destructive')::boolean and not new.destructive_confirmed)
    or (v_plan->'disclosure'<>'null'::jsonb and not new.disclosure_confirmed) then raise exception 'Exact owner feed confirmation required';end if;
  else
   perform 1 from crays_core.personal_feed_confirmations where intent_id=new.intent_id and account_id=new.account_id and plan_sha256=v_hash;
   if not found then raise exception 'Owner feed confirmation required';end if;
  end if;
 elsif tg_table_name='personal_feed_outcomes' then
  select i.runtime_attempt_id into v_runtime from crays_core.personal_feed_attempts a join crays_core.personal_feed_intents i on i.intent_id=a.intent_id and i.account_id=a.account_id where a.attempt_id=new.attempt_id and a.account_id=new.account_id;
  if v_runtime is null then raise exception 'Original own feed attempt required';end if;
  perform crays_core.assert_native_personal_runtime_attempt_current(v_runtime,new.account_id);
 end if;
 return new;
end$$;
revoke all on function crays_core.guard_personal_feed_effect() from public;
do $$declare name text;begin
 foreach name in array array['personal_feed_states','personal_feed_revocations','personal_feed_intents','personal_feed_confirmations','personal_feed_attempts','personal_feed_outcomes'] loop
 execute format('alter table crays_core.%I enable row level security',name);
 execute format('alter table crays_core.%I force row level security',name);
 execute format('create policy own_feed_select on crays_core.%I for select using(current_setting(''crays.app_role'',true)=''core_service'' and account_id=current_setting(''crays.native_personal_account'',true))',name);
 execute format('create policy own_feed_insert on crays_core.%I for insert with check(current_setting(''crays.app_role'',true)=''core_service'' and account_id=current_setting(''crays.native_personal_account'',true) and current_setting(''crays.personal_feed_producer'',true)=''typed-feed-v1'')',name);
 execute format('create trigger personal_feed_immutable before insert or update or delete on crays_core.%I for each row execute function crays_core.guard_personal_feed_effect()',name);
 execute format('revoke all on crays_core.%I from public',name);
 end loop;
end$$;
revoke all on sequence crays_core.personal_feed_outcomes_ordinal_seq from public;
commit;
