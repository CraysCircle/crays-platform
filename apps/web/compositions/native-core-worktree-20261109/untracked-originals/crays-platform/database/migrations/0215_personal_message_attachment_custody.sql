-- Source release candidate, NOT an instruction to migrate a live database.
-- Child custody of EXISTING own message/ingress originals. No independent file
-- identity, generic path importer, effect grant, model disclosure or delivery.
begin;
create table crays_core.personal_message_attachment_versions (
 attachment_id text primary key check(attachment_id ~ '^personal-attachment-[0-9a-f-]{36}$'),
 version integer not null default 1 check(version=1),
 account_id text not null references crays_core.crays_accounts(account_id),
 canonical_person_id text not null references crays_core.canonical_people(canonical_person_id),
 agent_id text not null references crays_core.personal_agent_standard_assignments(agent_id),
 binding_id text not null references crays_core.personal_messenger_bindings(binding_id),
 binding_revision bigint not null check(binding_revision>0),
 contact_revision bigint not null check(contact_revision>0),
 message_id text not null references crays_core.messages(message_id),
 receipt_id text not null references crays_core.personal_messenger_ingress_receipts(receipt_id),
 registration_receipt_id text not null unique check(registration_receipt_id ~ '^personal-attachment-registration-[0-9a-f-]{36}$'),
 idempotency_key text not null check(idempotency_key ~ '^[A-Za-z0-9_-]{1,128}$'),
 command_sha256 text not null check(command_sha256 ~ '^[0-9a-f]{64}$'),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','image/heic','image/heif',
 'video/mp4','video/webm','video/quicktime','text/plain',
 'audio/mp4','audio/aac','audio/mpeg','audio/wav','audio/x-wav','audio/vnd.wave','application/pdf',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'application/vnd.openxmlformats-officedocument.presentationml.presentation')),
 byte_length bigint not null check(byte_length between 1 and 67108864),
 source_sha256 text not null check(source_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 unique(account_id,idempotency_key),
 check(expires_at>=created_at+interval '5 minutes' and expires_at<=created_at+interval '30 days')
);
create index personal_message_attachment_message on crays_core.personal_message_attachment_versions(account_id,message_id);
create table crays_core.personal_message_attachment_payloads (
 attachment_id text primary key references crays_core.personal_message_attachment_versions(attachment_id),
 original_bytes bytea not null check(octet_length(original_bytes) between 1 and 67108864)
);
-- The manifest survives erasure; an erased payload cannot be silently recreated.
create table crays_core.personal_message_attachment_erasures (
 attachment_id text primary key references crays_core.personal_message_attachment_versions(attachment_id),
 receipt_id text not null unique check(receipt_id ~ '^personal-attachment-erasure-[0-9a-f-]{36}$'),
 reason text not null check(reason in ('owner-request','retention-expired')),
 created_at timestamptz not null default now()
);
create function crays_core.assert_personal_message_attachment_original() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$begin
 if not exists(select 1 from crays_core.personal_message_attachment_versions v
  join crays_core.personal_messenger_ingress_receipts r on r.receipt_id=v.receipt_id and r.message_id=v.message_id
   and r.account_id=v.account_id and r.binding_id=v.binding_id and r.binding_revision=v.binding_revision and r.contact_revision=v.contact_revision
  join crays_core.messages m on m.message_id=v.message_id and m.sender_account_id=v.account_id
  join crays_core.personal_messenger_bindings b on b.binding_id=v.binding_id and b.account_id=v.account_id
   and b.canonical_person_id=v.canonical_person_id and b.agent_id=v.agent_id and b.conversation_id=m.conversation_id
  join crays_core.personal_message_attachment_payloads p on p.attachment_id=v.attachment_id
  where v.attachment_id=new.attachment_id and m.deleted_at is null and m.sender_role='guest'
   and m.channel='in_app' and m.visibility='internal'
   and octet_length(p.original_bytes)=v.byte_length and encode(sha256(p.original_bytes),'hex')=v.source_sha256
   and not exists(select 1 from crays_core.personal_message_attachment_erasures e where e.attachment_id=v.attachment_id))
 then raise exception 'Exact own message attachment original required';end if;return new;
end$$;
create constraint trigger personal_attachment_original after insert on crays_core.personal_message_attachment_versions
 deferrable initially deferred for each row execute function crays_core.assert_personal_message_attachment_original();
create constraint trigger personal_attachment_payload_original after insert on crays_core.personal_message_attachment_payloads
 deferrable initially deferred for each row execute function crays_core.assert_personal_message_attachment_original();
-- A durable erasure receipt must mean actual payload removal at commit, not
-- merely a hidden read. Deferred checking permits receipt + DELETE atomically.
create function crays_core.assert_personal_message_attachment_erasure() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$begin
 if exists(select 1 from crays_core.personal_message_attachment_payloads p where p.attachment_id=new.attachment_id)
 then raise exception 'Personal attachment erasure requires payload removal';end if;
 if new.reason='retention-expired' and not exists(
  select 1 from crays_core.personal_message_attachment_versions v
  where v.attachment_id=new.attachment_id and v.expires_at<=now())
 then raise exception 'Personal attachment retention has not expired';end if;
 return new;
end$$;
create constraint trigger personal_attachment_erasure_complete after insert on crays_core.personal_message_attachment_erasures
 deferrable initially deferred for each row execute function crays_core.assert_personal_message_attachment_erasure();
create function crays_core.guard_personal_message_attachment_mutation() returns trigger language plpgsql
set search_path=pg_catalog,crays_core as $$begin
 if tg_table_name='personal_message_attachment_payloads' and tg_op='DELETE'
  and exists(select 1 from crays_core.personal_message_attachment_erasures e where e.attachment_id=old.attachment_id)
 then return old;end if;
 raise exception 'Personal attachment original and receipts are immutable';
end$$;
create trigger personal_attachment_immutable before update or delete on crays_core.personal_message_attachment_versions
 for each row execute function crays_core.guard_personal_message_attachment_mutation();
create trigger personal_attachment_payload_immutable before update or delete on crays_core.personal_message_attachment_payloads
 for each row execute function crays_core.guard_personal_message_attachment_mutation();
create trigger personal_attachment_erasure_immutable before update or delete on crays_core.personal_message_attachment_erasures
 for each row execute function crays_core.guard_personal_message_attachment_mutation();
alter table crays_core.personal_message_attachment_versions enable row level security;
alter table crays_core.personal_message_attachment_versions force row level security;
alter table crays_core.personal_message_attachment_payloads enable row level security;
alter table crays_core.personal_message_attachment_payloads force row level security;
alter table crays_core.personal_message_attachment_erasures enable row level security;
alter table crays_core.personal_message_attachment_erasures force row level security;
create policy personal_attachment_own on crays_core.personal_message_attachment_versions for all
 using(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true))
 with check(current_setting('crays.app_role',true)='core_service' and account_id=current_setting('crays.native_personal_account',true));
create policy personal_attachment_payload_own on crays_core.personal_message_attachment_payloads for all
 using(exists(select 1 from crays_core.personal_message_attachment_versions v where v.attachment_id=personal_message_attachment_payloads.attachment_id))
 with check(exists(select 1 from crays_core.personal_message_attachment_versions v where v.attachment_id=personal_message_attachment_payloads.attachment_id));
create policy personal_attachment_erasure_own on crays_core.personal_message_attachment_erasures for all
 using(exists(select 1 from crays_core.personal_message_attachment_versions v where v.attachment_id=personal_message_attachment_erasures.attachment_id))
 with check(exists(select 1 from crays_core.personal_message_attachment_versions v where v.attachment_id=personal_message_attachment_erasures.attachment_id));
revoke all on crays_core.personal_message_attachment_versions,crays_core.personal_message_attachment_payloads,crays_core.personal_message_attachment_erasures from public;
revoke all on function crays_core.assert_personal_message_attachment_original(),crays_core.guard_personal_message_attachment_mutation(),crays_core.assert_personal_message_attachment_erasure() from public;
-- Existing owning Core runtime-role admission must explicitly grant the needed
-- table operations. No new role, SET ROLE, PUBLIC grant or deployment here.
commit;
