-- Additive native registration evidence. No legacy verified flag is promoted.
alter table crays_core.crays_accounts
  add column if not exists primary_contact_revision bigint not null default 1
  check (primary_contact_revision > 0);

create or replace function crays_core.enforce_primary_contact_revision()
returns trigger language plpgsql security invoker set search_path = pg_catalog, crays_core as $$
begin
  if new.primary_contact is distinct from old.primary_contact
     or new.primary_contact_type is distinct from old.primary_contact_type then
    new.primary_contact_revision := old.primary_contact_revision + 1;
  else
    -- Callers cannot rewind/reuse a revision even when restoring an old address.
    new.primary_contact_revision := old.primary_contact_revision;
  end if;
  return new;
end;
$$;
drop trigger if exists crays_accounts_contact_revision on crays_core.crays_accounts;
create trigger crays_accounts_contact_revision before update on crays_core.crays_accounts
for each row execute function crays_core.enforce_primary_contact_revision();

create table if not exists crays_core.account_email_verifications (
  receipt_id text primary key,
  account_id text not null references crays_core.crays_accounts(account_id) on delete cascade,
  contact_revision bigint not null check (contact_revision > 0),
  contact_address text not null check (length(contact_address) between 3 and 320
    and contact_address ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  auth_identity_id text not null references crays_core.auth_identities(identity_id) on delete cascade,
  provider_subject text not null check (length(provider_subject) between 1 and 2048),
  provider_issuer text not null check (length(provider_issuer) <= 2048 and provider_issuer ~ '^https://[^/?#[:space:]]+/$'),
  proof_method text not null check (proof_method = 'auth0-userinfo-verified-email'),
  proof_token_digest text not null check (proof_token_digest ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null check (length(idempotency_key) between 1 and 128),
  verified_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (account_id, idempotency_key),
  unique (provider_issuer, proof_token_digest)
);
create unique index if not exists account_email_verifications_one_current_revision
  on crays_core.account_email_verifications(account_id, contact_revision) where revoked_at is null;
