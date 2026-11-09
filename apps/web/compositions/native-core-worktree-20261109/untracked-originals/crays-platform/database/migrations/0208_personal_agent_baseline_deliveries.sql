-- Additive immutable baseline-delivery intents; existing 0207 assignments remain untouched.
-- This does not provision credentials, plugins, runtime or connected product outcomes.
begin;
create table crays_core.personal_agent_baseline_deliveries (
 canonical_person_id text not null references crays_core.personal_agent_standard_assignments(canonical_person_id),
 package_version text not null,
 account_id text not null references crays_core.crays_accounts(account_id),
 agent_id text not null check (agent_id ~ '^personal-[a-f0-9]{48}$'),
 package_sha256 text not null check (package_sha256 ~ '^[a-f0-9]{64}$'),
 assignment_proposal jsonb not null check (jsonb_typeof(assignment_proposal)='object'),
 created_at timestamptz not null default now(),
 primary key (canonical_person_id,package_version)
);
create function crays_core.guard_personal_agent_baseline_delivery() returns trigger
language plpgsql set search_path=pg_catalog,crays_core as $$
begin
 if tg_op <> 'INSERT' then raise exception 'Personal-agent baseline delivery is immutable'; end if;
 perform 1 from crays_core.personal_agent_standard_assignments b
 join crays_core.canonical_people p on p.canonical_person_id=b.canonical_person_id
 join crays_core.crays_accounts a on a.account_id=p.account_id
 where b.canonical_person_id=new.canonical_person_id and b.account_id=new.account_id
 and b.agent_id=new.agent_id and p.account_id=new.account_id
 and p.lifecycle_state in ('active','review') and a.status in ('active','review')
 for share of b,p,a;
 if not found then raise exception 'Personal-agent baseline delivery account/person scope mismatch'; end if;
 return new;
end $$;
create trigger personal_agent_baseline_delivery_guard before insert or update or delete
on crays_core.personal_agent_baseline_deliveries for each row
execute function crays_core.guard_personal_agent_baseline_delivery();
revoke all on function crays_core.guard_personal_agent_baseline_delivery() from public;
revoke all on crays_core.personal_agent_baseline_deliveries from public;
-- No new application grants or runtime authority.
commit;
