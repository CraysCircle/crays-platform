-- Destructive schema rollback: apply only through the existing migration/backup gate.
drop table if exists crays_core.account_email_verifications;
drop trigger if exists crays_accounts_contact_revision on crays_core.crays_accounts;
drop function if exists crays_core.enforce_primary_contact_revision();
alter table crays_core.crays_accounts drop column if exists primary_contact_revision;
