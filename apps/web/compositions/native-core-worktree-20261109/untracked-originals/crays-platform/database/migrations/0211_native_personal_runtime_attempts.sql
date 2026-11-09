-- Durable Core dispatch/reconciliation records, not runtime admission.
-- A trusted Core producer must resolve an actually admitted running own-person
-- host/session before preparing an attempt. No endpoint, token or model secret
-- is accepted here; there is deliberately no public/native prepare operation.
-- Existing immutable ingress receipts/outbox state remain unchanged.
begin;
create table crays_core.personal_messenger_runtime_attempts (
 attempt_id text primary key check(length(attempt_id) between 1 and 128),
 receipt_id text not null unique references crays_core.personal_messenger_ingress_receipts(receipt_id),
 account_id text not null references crays_core.crays_accounts(account_id),
 binding_id text not null references crays_core.personal_messenger_bindings(binding_id),
 binding_revision bigint not null check(binding_revision>0),
 contact_revision bigint not null check(contact_revision>0),
 agent_id text not null references crays_core.personal_agent_standard_assignments(agent_id),
 -- Core-derived current admitted host/profile/session/lifecycle fingerprint.
 -- The digest is correlation evidence, NEVER a self-asserted admission grant.
 runtime_binding_sha256 text not null check(runtime_binding_sha256~'^[a-f0-9]{64}$'),
 sdk_session_id text not null check(length(sdk_session_id) between 1 and 200),
 sdk_session_key text not null check(length(sdk_session_key) between 1 and 512),
 sdk_run_id text not null unique check(length(sdk_run_id) between 1 and 128),
 request_sha256 text not null check(request_sha256~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 unique(attempt_id,account_id)
);
create table crays_core.personal_messenger_runtime_observations (
 observation_id bigint generated always as identity primary key,
 attempt_id text not null,
 account_id text not null,
 event_key text not null check(length(event_key) between 1 and 200),
 kind text not null check(kind in ('acknowledged','transport_unknown','terminal_error','terminal_reply')),
 -- Exact bounded SDK observation, separate from the immutable Core original.
 -- A terminal_reply observation is not a canonical message nor delivery proof.
 projection jsonb not null check(jsonb_typeof(projection)='object' and octet_length(projection::text)<=65536),
 created_at timestamptz not null default now(),
 foreign key(attempt_id,account_id) references crays_core.personal_messenger_runtime_attempts(attempt_id,account_id),
 unique(attempt_id,event_key)
);
create function crays_core.guard_native_personal_runtime_attempt() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$begin
 if tg_op<>'INSERT' then raise exception 'Personal runtime attempt is immutable';end if;
 if current_setting('crays.app_role',true) is distinct from 'core_service'
  or current_setting('crays.native_personal_account',true) is distinct from new.account_id then
  raise exception 'Current own Core runtime context required';end if;
 -- Current original/assignment/verified email/participant all belong to the
 -- same person. Recheck under locks; an old receipt does not renew authority.
 perform 1 from crays_core.personal_messenger_ingress_receipts r
 join crays_core.personal_messenger_bindings b on b.binding_id=r.binding_id and b.account_id=r.account_id
 join crays_core.crays_accounts a on a.account_id=b.account_id
 join crays_core.canonical_people p on p.account_id=a.account_id and p.canonical_person_id=b.canonical_person_id
 join crays_core.personal_agent_standard_assignments s on s.account_id=a.account_id and s.canonical_person_id=p.canonical_person_id and s.agent_id=b.agent_id
 join crays_core.conversations c on c.conversation_id=b.conversation_id
 join crays_core.conversation_participants cp on cp.participant_id=b.participant_id and cp.conversation_id=c.conversation_id and cp.account_id=a.account_id
 join crays_core.messages m on m.message_id=r.message_id and m.conversation_id=c.conversation_id and m.sender_account_id=a.account_id
 join crays_core.account_email_verifications v on v.account_id=a.account_id and v.contact_revision=a.primary_contact_revision and v.contact_address=a.primary_contact
 join crays_core.auth_identities vi on vi.identity_id=v.auth_identity_id and vi.account_id=a.account_id and vi.provider_key='auth0' and vi.provider_subject=v.provider_subject and vi.verified=true
 where r.receipt_id=new.receipt_id and r.account_id=new.account_id and b.binding_id=new.binding_id
  and r.binding_revision=new.binding_revision and b.revision=new.binding_revision
  and r.contact_revision=new.contact_revision and a.primary_contact_revision=new.contact_revision
  and r.payload_sha256=new.request_sha256 and b.agent_id=new.agent_id
  and b.status='active' and b.purpose='own-personal-chuck' and a.status='active' and p.lifecycle_state='active'
  and a.primary_contact_type='contact' and v.revoked_at is null and v.proof_method='auth0-userinfo-verified-email'
  and c.conversation_type='personal_chuck' and c.related_entity_type='canonical-person' and c.related_entity_id=p.canonical_person_id
  and c.created_by_account_id=a.account_id and c.status='open'
  and cp.status='active' and cp.can_reply and not cp.can_invite and not cp.can_share_externally and m.deleted_at is null
 for share of r,b,a,p,s,c,cp,m,v,vi;
 if not found then raise exception 'Current personal original and authority required';end if;
 return new;
end$$;
create trigger native_personal_runtime_attempt_guard before insert or update or delete on crays_core.personal_messenger_runtime_attempts
 for each row execute function crays_core.guard_native_personal_runtime_attempt();
create function crays_core.assert_native_personal_runtime_attempt_current(p_attempt text,p_account text) returns void language plpgsql
set search_path=pg_catalog,crays_core as $$begin
 if current_setting('crays.app_role',true) is distinct from 'core_service'
  or current_setting('crays.native_personal_account',true) is distinct from p_account then
  raise exception 'Current own Core runtime context required';end if;
 perform 1 from crays_core.personal_messenger_runtime_attempts t
 join crays_core.personal_messenger_bindings b on b.binding_id=t.binding_id and b.account_id=t.account_id
 join crays_core.crays_accounts a on a.account_id=t.account_id
 join crays_core.canonical_people p on p.account_id=a.account_id and p.canonical_person_id=b.canonical_person_id
 join crays_core.personal_agent_standard_assignments s on s.account_id=a.account_id and s.canonical_person_id=p.canonical_person_id and s.agent_id=t.agent_id and b.agent_id=s.agent_id
 join crays_core.account_email_verifications v on v.account_id=a.account_id and v.contact_revision=a.primary_contact_revision and v.contact_address=a.primary_contact
 join crays_core.auth_identities vi on vi.identity_id=v.auth_identity_id and vi.account_id=a.account_id and vi.provider_key='auth0' and vi.provider_subject=v.provider_subject and vi.verified=true
 join crays_core.conversations c on c.conversation_id=b.conversation_id
 join crays_core.conversation_participants cp on cp.participant_id=b.participant_id and cp.conversation_id=c.conversation_id and cp.account_id=a.account_id
 join crays_core.personal_messenger_ingress_receipts r on r.receipt_id=t.receipt_id and r.account_id=t.account_id and r.binding_id=b.binding_id
 join crays_core.messages m on m.message_id=r.message_id and m.conversation_id=c.conversation_id and m.sender_account_id=a.account_id and m.deleted_at is null
 where t.attempt_id=p_attempt and t.account_id=p_account and b.status='active' and b.purpose='own-personal-chuck'
  and a.status='active' and p.lifecycle_state='active' and a.primary_contact_type='contact'
  and b.revision=t.binding_revision and a.primary_contact_revision=t.contact_revision
  and v.revoked_at is null and v.proof_method='auth0-userinfo-verified-email'
  and c.status='open' and c.conversation_type='personal_chuck' and c.related_entity_type='canonical-person'
  and c.related_entity_id=p.canonical_person_id and c.created_by_account_id=a.account_id
  and cp.status='active' and cp.can_reply and not cp.can_invite and not cp.can_share_externally
 for share of t,b,a,p,s,v,vi,c,cp,r,m;
 if not found then raise exception 'Current personal runtime attempt authority required';end if;
end$$;
create function crays_core.guard_native_personal_runtime_observation() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$declare expected_run text; expected_session text; allowed text[];
begin
 if tg_op<>'INSERT' then raise exception 'Personal runtime observation is immutable';end if;
 perform crays_core.assert_native_personal_runtime_attempt_current(new.attempt_id,new.account_id);
 select sdk_run_id,sdk_session_id into expected_run,expected_session from crays_core.personal_messenger_runtime_attempts
  where attempt_id=new.attempt_id and account_id=new.account_id;
 if jsonb_typeof(new.projection->'runId') is distinct from 'string'
  or jsonb_typeof(new.projection->'sessionId') is distinct from 'string'
  or new.projection->>'runId' is distinct from expected_run
  or new.projection->>'sessionId' is distinct from expected_session then
  raise exception 'Exact personal runtime run and session correlation required';end if;
 -- Store only a deliberately bounded Core projection, not arbitrary SDK event
 -- JSON, authentication metadata or headers. A verified producer is still
 -- required; matching text/digests are never treated as runtime authority.
 allowed:=case new.kind
  when 'acknowledged' then array['runId','sessionId','status','messageSeq']
  when 'transport_unknown' then array['runId','sessionId','requestSent']
  when 'terminal_error' then array['runId','sessionId','errorCode']
  when 'terminal_reply' then array['runId','sessionId','text'] else array[]::text[] end;
 if exists(select 1 from jsonb_object_keys(new.projection) as keys(key) where not(key=any(allowed))) then
  raise exception 'Bounded personal runtime projection required';end if;
 if new.kind='acknowledged' and (jsonb_typeof(new.projection->'status') is distinct from 'string'
  or length(new.projection->>'status') not between 1 and 64
  or (new.projection?'messageSeq' and (jsonb_typeof(new.projection->'messageSeq') is distinct from 'number'
   or (new.projection->>'messageSeq')::numeric not between 0 and 9007199254740991
   or trunc((new.projection->>'messageSeq')::numeric)<>(new.projection->>'messageSeq')::numeric))) then
  raise exception 'Valid acknowledgement projection required';end if;
 if new.kind='transport_unknown' and jsonb_typeof(new.projection->'requestSent') is distinct from 'boolean' then
  raise exception 'Explicit transport uncertainty projection required';end if;
 if new.kind='terminal_error' and (jsonb_typeof(new.projection->'errorCode') is distinct from 'string'
  or length(new.projection->>'errorCode') not between 1 and 128) then
  raise exception 'Bounded terminal error projection required';end if;
 if new.kind='terminal_reply' and (jsonb_typeof(new.projection->'text') is distinct from 'string'
  or length(btrim(new.projection->>'text'))=0 or octet_length(new.projection->>'text')>16384) then
  raise exception 'Bounded terminal reply projection required';end if;
 return new;
end$$;
create trigger native_personal_runtime_observation_guard before insert or update or delete on crays_core.personal_messenger_runtime_observations
 for each row execute function crays_core.guard_native_personal_runtime_observation();
-- Exact replay returns the existing observation; conflicting reused callback
-- identity is rejected. Unknown/ACK are retained, never rewritten as a reply.
create function crays_core.append_native_personal_runtime_observation(p_attempt text,p_event text,p_kind text,p_projection jsonb)
 returns bigint language plpgsql set search_path=pg_catalog,crays_core as $$declare
 a text; existing crays_core.personal_messenger_runtime_observations; result_id bigint;
begin
 a:=current_setting('crays.native_personal_account',true);
 if current_setting('crays.app_role',true) is distinct from 'core_service' or a is null or a='' then
  raise exception 'Current own Core runtime context required';end if;
 -- Serialize callbacks only for the exact own attempt. This is not a worker
 -- admission, gateway send or permission to retry an unknown run.
 perform 1 from crays_core.personal_messenger_runtime_attempts where attempt_id=p_attempt and account_id=a for update;
 if not found then raise exception 'Own runtime attempt required';end if;
 perform crays_core.assert_native_personal_runtime_attempt_current(p_attempt,a);
 select * into existing from crays_core.personal_messenger_runtime_observations where attempt_id=p_attempt and event_key=p_event;
 if found then
  if existing.account_id is distinct from a or existing.kind is distinct from p_kind or existing.projection is distinct from p_projection then
   raise exception 'Conflicting personal runtime callback';end if;
  return existing.observation_id;
 end if;
 insert into crays_core.personal_messenger_runtime_observations(attempt_id,account_id,event_key,kind,projection)
  values(p_attempt,a,p_event,p_kind,p_projection) returning observation_id into result_id;
 return result_id;
end$$;
alter table crays_core.personal_messenger_runtime_attempts enable row level security;
alter table crays_core.personal_messenger_runtime_attempts force row level security;
alter table crays_core.personal_messenger_runtime_observations enable row level security;
alter table crays_core.personal_messenger_runtime_observations force row level security;
create policy native_own_runtime_attempt on crays_core.personal_messenger_runtime_attempts for all
 using(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true))
 with check(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true));
create policy native_own_runtime_observation on crays_core.personal_messenger_runtime_observations for all
 using(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true))
 with check(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true));
revoke all on crays_core.personal_messenger_runtime_attempts,crays_core.personal_messenger_runtime_observations from public;
revoke all on sequence crays_core.personal_messenger_runtime_observations_observation_id_seq from public;
revoke all on function crays_core.guard_native_personal_runtime_attempt(),crays_core.assert_native_personal_runtime_attempt_current(text,text),crays_core.guard_native_personal_runtime_observation(),crays_core.append_native_personal_runtime_observation(text,text,text,jsonb) from public;
commit;
