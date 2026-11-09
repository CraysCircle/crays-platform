-- Immutable baseline-assignment intent only; no runtime/account lifecycle state is stored.
-- Source-only migration: no runtime, model credentials or personal roles are created.
begin;
create table crays_core.personal_agent_standard_assignments (
 canonical_person_id text primary key references crays_core.canonical_people(canonical_person_id),
 account_id text not null references crays_core.crays_accounts(account_id),
 agent_id text not null unique check (agent_id ~ '^personal-[a-f0-9]{48}$'),
 package_version text not null,
 package_sha256 text not null check (package_sha256 ~ '^[a-f0-9]{64}$'),
 everyday_skill_sha256 text not null check (everyday_skill_sha256 ~ '^[a-f0-9]{64}$'),
 assignment_proposal jsonb not null check (jsonb_typeof(assignment_proposal) = 'object'),
 created_at timestamptz not null default now()
);
create function crays_core.guard_personal_agent_standard_assignment() returns trigger
language plpgsql set search_path=pg_catalog,crays_core as $$
begin
 if tg_op <> 'INSERT' then raise exception 'Personal-agent assignment is immutable'; end if;
 perform 1 from crays_core.canonical_people p join crays_core.crays_accounts a on a.account_id=p.account_id
 where p.canonical_person_id=new.canonical_person_id and p.account_id=new.account_id
 and p.lifecycle_state in ('active','review') and a.status in ('active','review') for share of p,a;
 if not found then raise exception 'Personal-agent account/person scope mismatch'; end if;
 return new;
end $$;
create trigger personal_agent_standard_assignment_guard before insert or update or delete
on crays_core.personal_agent_standard_assignments for each row
execute function crays_core.guard_personal_agent_standard_assignment();
revoke all on function crays_core.guard_personal_agent_standard_assignment() from public;
-- No PUBLIC/application grants: existing deployment authority must admit this migration.
revoke all on crays_core.personal_agent_standard_assignments from public;
commit;
