begin;

-- NCRV2-094 preparation only. CRAYS Core owns canonical people,
-- relationships and communication channels. Provider contacts and mail
-- activities are scoped projections; an email address is never an identity or
-- merge key.

create table if not exists crays_core.canonical_people (
  canonical_person_id text primary key,
  person_version bigint not null check (person_version >= 1),
  account_id text references crays_core.crays_accounts(account_id),
  display_name_sha256 text not null check (
    display_name_sha256 ~ '^[0-9a-f]{64}$'
  ),
  encrypted_display_name_ref text not null check (
    encrypted_display_name_ref ~ '^secret://'
  ),
  field_authority_version text not null,
  lifecycle_state text not null check (lifecycle_state in (
    'review','active','suspended','merged','split','disabled',
    'pseudonymized','tombstoned'
  )),
  superseded_by_person_id text references crays_core.canonical_people(
    canonical_person_id
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (lifecycle_state = 'merged' and superseded_by_person_id is not null)
    or (lifecycle_state <> 'merged' and superseded_by_person_id is null)
  ),
  check (superseded_by_person_id is distinct from canonical_person_id)
);

create unique index if not exists canonical_people_one_current_account_uq
  on crays_core.canonical_people(account_id)
  where account_id is not null
    and lifecycle_state in ('review','active','suspended','disabled');

create table if not exists crays_core.canonical_relationships (
  canonical_relationship_id text primary key,
  relationship_version bigint not null check (relationship_version >= 1),
  canonical_person_id text not null
    references crays_core.canonical_people(canonical_person_id),
  organization_id text not null
    references crays_core.organizations(organization_id),
  crays_tenant_id text not null,
  vertical_root text not null references crays_core.vertical_roots(vertical_root),
  partner_tenant_id text not null,
  operator_legal_entity_id text not null,
  store_id text,
  relationship_kind text not null,
  purpose text not null,
  source_authority text not null check (
    source_authority in ('crays_core','twenty','erpnext','vendure','plane')
  ),
  source_record_id text not null,
  source_record_version text not null,
  policy_version text not null,
  lifecycle_state text not null check (lifecycle_state in (
    'pending','active','suspended','revoked','expired','conflict','tombstoned'
  )),
  valid_from timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from),
  unique (
    canonical_person_id,
    organization_id,
    partner_tenant_id,
    operator_legal_entity_id,
    store_id,
    relationship_kind,
    purpose,
    source_authority,
    source_record_id
  )
);

create index if not exists canonical_relationships_scope_state_idx
  on crays_core.canonical_relationships (
    crays_tenant_id,
    partner_tenant_id,
    operator_legal_entity_id,
    coalesce(store_id, ''),
    canonical_person_id,
    lifecycle_state
  );

create table if not exists crays_core.canonical_communication_channels (
  communication_channel_id text primary key,
  channel_version bigint not null check (channel_version >= 1),
  canonical_person_id text not null
    references crays_core.canonical_people(canonical_person_id),
  channel_type text not null check (channel_type = 'email'),
  email_address_sha256 text not null check (
    email_address_sha256 ~ '^[0-9a-f]{64}$'
  ),
  encrypted_channel_value_ref text not null check (
    encrypted_channel_value_ref ~ '^secret://'
  ),
  channel_label text not null check (
    channel_label in ('primary','work','billing','support','other')
  ),
  field_authority text not null check (
    field_authority in ('crays_core','twenty','erpnext','vendure','person')
  ),
  field_authority_version text not null,
  verification_state text not null check (
    verification_state in ('unverified','verified','bounced','revoked','conflict')
  ),
  verified_at timestamptz,
  lifecycle_state text not null check (
    lifecycle_state in ('active','suspended','revoked','tombstoned','conflict')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verification_state <> 'verified' or verified_at is not null),
  unique (canonical_person_id, channel_label, channel_type)
);

-- Intentionally no unique constraint on email_address_sha256: equal email
-- hashes are a reconciliation signal, never permission to merge people.
create index if not exists canonical_channels_email_collision_idx
  on crays_core.canonical_communication_channels (
    email_address_sha256,
    lifecycle_state
  );

create table if not exists crays_integration.contact_provider_projections (
  contact_provider_projection_id text primary key,
  projection_version bigint not null check (projection_version >= 1),
  canonical_person_id text not null
    references crays_core.canonical_people(canonical_person_id),
  canonical_organization_id text
    references crays_core.organizations(organization_id),
  canonical_relationship_id text not null
    references crays_core.canonical_relationships(
      canonical_relationship_id
    ),
  communication_channel_id text not null
    references crays_core.canonical_communication_channels(
      communication_channel_id
    ),
  communication_channel_version bigint not null check (
    communication_channel_version >= 1
  ),
  crays_tenant_id text not null,
  vertical_root text not null references crays_core.vertical_roots(vertical_root),
  partner_tenant_id text not null,
  operator_legal_entity_id text not null,
  store_id text,
  purpose text not null,
  provider text not null check (
    provider in ('nextcloud','twenty','erpnext','plane','vendure')
  ),
  provider_instance_id text not null,
  provider_organization_scope_id text not null,
  provider_contact_ref text not null,
  projected_field_set_sha256 text not null check (
    projected_field_set_sha256 ~ '^[0-9a-f]{64}$'
  ),
  field_authority_version text not null,
  source_person_version bigint not null check (source_person_version >= 1),
  source_relationship_version bigint not null check (
    source_relationship_version >= 1
  ),
  lifecycle_state text not null check (lifecycle_state in (
    'prepared','pending','active','suspended','revoked',
    'conflict','unknown','failed','tombstoned'
  )),
  reconciliation_state text not null check (reconciliation_state in (
    'pending','matched','duplicate','ambiguous','stale',
    'missing_source','conflicting_edit','repaired','quarantined'
  )),
  last_action_receipt_id text
    references crays_integration.action_receipts(receipt_id),
  last_reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    provider,
    provider_instance_id,
    provider_organization_scope_id,
    provider_contact_ref
  )
);

create unique index if not exists contact_projection_current_canonical_uq
  on crays_integration.contact_provider_projections (
    canonical_person_id,
    canonical_relationship_id,
    provider,
    provider_instance_id,
    provider_organization_scope_id,
    purpose
  )
  where lifecycle_state in ('prepared','pending','active','suspended');

create index if not exists contact_projection_scope_state_idx
  on crays_integration.contact_provider_projections (
    crays_tenant_id,
    partner_tenant_id,
    operator_legal_entity_id,
    coalesce(store_id, ''),
    provider,
    lifecycle_state,
    reconciliation_state
  );

create table if not exists crays_integration.contact_reconciliation_cases (
  contact_reconciliation_case_id text primary key,
  case_version bigint not null check (case_version >= 1),
  crays_tenant_id text not null,
  partner_tenant_id text not null,
  operator_legal_entity_id text not null,
  store_id text,
  provider text not null check (
    provider in ('nextcloud','twenty','erpnext','plane','vendure')
  ),
  provider_instance_id text not null,
  case_type text not null check (case_type in (
    'duplicate_provider_contact','email_collision','ambiguous_mapping',
    'stale_projection','missing_source','conflicting_edit'
  )),
  candidate_person_ids jsonb not null,
  candidate_projection_ids jsonb not null,
  evidence_sha256 text not null check (
    evidence_sha256 ~ '^[0-9a-f]{64}$'
  ),
  resolution_action text check (resolution_action in (
    'merge','split','remap','quarantine','reject'
  )),
  resolution_action_intent_id text
    references crays_integration.action_intents(action_intent_id),
  resolution_receipt_id text
    references crays_integration.action_receipts(receipt_id),
  state text not null check (
    state in ('open','assigned','preflighted','resolved','quarantined','rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(candidate_person_ids) = 'array'),
  check (jsonb_typeof(candidate_projection_ids) = 'array'),
  check (
    state not in ('resolved','quarantined','rejected')
    or (
      resolution_action is not null
      and resolution_action_intent_id is not null
      and resolution_receipt_id is not null
    )
  )
);

create table if not exists crays_integration.bounded_mail_activities (
  bounded_mail_activity_id text primary key,
  activity_version bigint not null check (activity_version >= 1),
  mailbox_authority_binding_id text not null
    references crays_integration.mailbox_authority_bindings(
      mailbox_authority_binding_id
    ),
  mailbox_binding_version bigint not null check (mailbox_binding_version >= 1),
  mail_compose_intent_id text
    references crays_integration.mail_compose_intents(mail_compose_intent_id),
  crays_tenant_id text not null,
  vertical_root text not null references crays_core.vertical_roots(vertical_root),
  partner_tenant_id text not null,
  operator_legal_entity_id text not null,
  store_id text,
  context_urn text not null,
  canonical_relationship_id text not null
    references crays_core.canonical_relationships(
      canonical_relationship_id
    ),
  direction text not null check (direction in ('inbound','outbound')),
  rfc_message_id_sha256 text not null check (
    rfc_message_id_sha256 ~ '^[0-9a-f]{64}$'
  ),
  in_reply_to_sha256 text check (
    in_reply_to_sha256 is null or in_reply_to_sha256 ~ '^[0-9a-f]{64}$'
  ),
  references_set_sha256 text not null check (
    references_set_sha256 ~ '^[0-9a-f]{64}$'
  ),
  thread_identity_sha256 text not null check (
    thread_identity_sha256 ~ '^[0-9a-f]{64}$'
  ),
  sender_canonical_person_id text not null
    references crays_core.canonical_people(canonical_person_id),
  internal_domain boolean not null,
  subject_sha256 text not null check (subject_sha256 ~ '^[0-9a-f]{64}$'),
  body_sha256 text not null check (body_sha256 ~ '^[0-9a-f]{64}$'),
  attachment_manifest_sha256 text not null check (
    attachment_manifest_sha256 ~ '^[0-9a-f]{64}$'
  ),
  data_class text not null,
  visibility_policy_version text not null,
  observed_at timestamptz not null,
  source_state text not null check (
    source_state in ('observed','confirmed','moved','deleted','unknown','failed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mailbox_authority_binding_id, rfc_message_id_sha256)
);

create index if not exists bounded_mail_activity_scope_time_idx
  on crays_integration.bounded_mail_activities (
    crays_tenant_id,
    partner_tenant_id,
    operator_legal_entity_id,
    coalesce(store_id, ''),
    context_urn,
    observed_at desc
  );

create table if not exists crays_integration.bounded_mail_activity_recipients (
  bounded_mail_activity_recipient_id text primary key,
  bounded_mail_activity_id text not null
    references crays_integration.bounded_mail_activities(
      bounded_mail_activity_id
    ),
  recipient_kind text not null check (recipient_kind in ('to','cc','bcc')),
  canonical_person_id text not null
    references crays_core.canonical_people(canonical_person_id),
  canonical_relationship_id text not null
    references crays_core.canonical_relationships(
      canonical_relationship_id
    ),
  communication_channel_id text not null
    references crays_core.canonical_communication_channels(
      communication_channel_id
    ),
  communication_channel_version bigint not null check (
    communication_channel_version >= 1
  ),
  email_address_sha256 text not null check (
    email_address_sha256 ~ '^[0-9a-f]{64}$'
  ),
  created_at timestamptz not null default now(),
  unique (bounded_mail_activity_id, canonical_person_id, recipient_kind)
);

create table if not exists crays_integration.bounded_mail_activity_views (
  bounded_mail_activity_view_id text primary key,
  bounded_mail_activity_id text not null
    references crays_integration.bounded_mail_activities(
      bounded_mail_activity_id
    ),
  consumer text not null check (
    consumer in ('crays','nextcloud','twenty','erpnext','plane','vendure')
  ),
  consumer_instance_id text not null,
  consumer_organization_scope_id text not null,
  subject_visibility text not null check (
    subject_visibility in ('none','hash_only','full')
  ),
  body_visibility text not null check (
    body_visibility in ('none','preview','full')
  ),
  encrypted_subject_projection_ref text check (
    encrypted_subject_projection_ref is null
    or encrypted_subject_projection_ref ~ '^secret://'
  ),
  encrypted_body_projection_ref text check (
    encrypted_body_projection_ref is null
    or encrypted_body_projection_ref ~ '^secret://'
  ),
  visibility_policy_version text not null,
  projection_state text not null check (
    projection_state in ('pending','active','suppressed','revoked',
                         'conflict','unknown','failed')
  ),
  last_action_receipt_id text
    references crays_integration.action_receipts(receipt_id),
  last_reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (subject_visibility = 'full'
      and encrypted_subject_projection_ref is not null)
    or (subject_visibility <> 'full'
      and encrypted_subject_projection_ref is null)
  ),
  check (
    (body_visibility in ('preview','full')
      and encrypted_body_projection_ref is not null)
    or (body_visibility = 'none'
      and encrypted_body_projection_ref is null)
  ),
  unique (
    bounded_mail_activity_id,
    consumer,
    consumer_instance_id,
    consumer_organization_scope_id
  )
);

create or replace function crays_integration.validate_contact_provider_projection()
returns trigger language plpgsql as $$
declare
  person crays_core.canonical_people%rowtype;
  relationship crays_core.canonical_relationships%rowtype;
  channel crays_core.canonical_communication_channels%rowtype;
begin
  select * into person from crays_core.canonical_people
   where canonical_person_id = new.canonical_person_id;
  select * into relationship from crays_core.canonical_relationships
   where canonical_relationship_id = new.canonical_relationship_id;
  select * into channel from crays_core.canonical_communication_channels
   where communication_channel_id = new.communication_channel_id;
  if person.lifecycle_state <> 'active'
     or relationship.lifecycle_state <> 'active'
     or channel.lifecycle_state <> 'active'
     or person.person_version <> new.source_person_version
     or relationship.relationship_version <>
       new.source_relationship_version
     or channel.channel_version <> new.communication_channel_version
  then raise exception 'CONTACT_PROJECTION_SOURCE_NOT_CURRENT'; end if;
  if relationship.canonical_person_id <> new.canonical_person_id
     or channel.canonical_person_id <> new.canonical_person_id
  then raise exception 'CONTACT_PROJECTION_EMAIL_ONLY_MAPPING_DENIED'; end if;
  if relationship.crays_tenant_id <> new.crays_tenant_id
     or relationship.vertical_root <> new.vertical_root
     or relationship.partner_tenant_id <> new.partner_tenant_id
     or relationship.operator_legal_entity_id <> new.operator_legal_entity_id
     or relationship.store_id is distinct from new.store_id
     or relationship.purpose <> new.purpose
  then raise exception 'CONTACT_PROJECTION_SCOPE_MISMATCH'; end if;
  if tg_op = 'UPDATE' and (
    old.canonical_person_id <> new.canonical_person_id
    or old.canonical_relationship_id <> new.canonical_relationship_id
    or old.communication_channel_id <> new.communication_channel_id
    or old.provider <> new.provider
    or old.provider_instance_id <> new.provider_instance_id
    or old.provider_organization_scope_id <>
      new.provider_organization_scope_id
    or old.provider_contact_ref <> new.provider_contact_ref
  ) then raise exception 'CONTACT_PROJECTION_IDENTITY_IMMUTABLE'; end if;
  return new;
end;
$$;

create or replace function crays_integration.validate_bounded_mail_activity()
returns trigger language plpgsql as $$
declare
  mailbox crays_integration.mailbox_authority_bindings%rowtype;
  relationship crays_core.canonical_relationships%rowtype;
begin
  select * into mailbox from crays_integration.mailbox_authority_bindings
   where mailbox_authority_binding_id =
     new.mailbox_authority_binding_id;
  select * into relationship from crays_core.canonical_relationships
   where canonical_relationship_id = new.canonical_relationship_id;
  if mailbox.binding_version <> new.mailbox_binding_version
     or mailbox.lifecycle_state not in ('active','suspended')
     or relationship.lifecycle_state not in ('active','suspended')
  then raise exception 'MAIL_ACTIVITY_SOURCE_NOT_CURRENT'; end if;
  if mailbox.crays_tenant_id <> new.crays_tenant_id
     or mailbox.vertical_root <> new.vertical_root
     or mailbox.partner_tenant_id <> new.partner_tenant_id
     or mailbox.operator_legal_entity_id <> new.operator_legal_entity_id
     or mailbox.store_id is distinct from new.store_id
     or relationship.crays_tenant_id <> new.crays_tenant_id
     or relationship.vertical_root <> new.vertical_root
     or relationship.partner_tenant_id <> new.partner_tenant_id
     or relationship.operator_legal_entity_id <>
       new.operator_legal_entity_id
     or relationship.store_id is distinct from new.store_id
  then raise exception 'MAIL_ACTIVITY_SCOPE_MISMATCH'; end if;
  return new;
end;
$$;

create or replace function crays_integration.validate_bounded_mail_activity_recipient()
returns trigger language plpgsql as $$
declare
  activity crays_integration.bounded_mail_activities%rowtype;
  relationship crays_core.canonical_relationships%rowtype;
  channel crays_core.canonical_communication_channels%rowtype;
begin
  select * into activity from crays_integration.bounded_mail_activities
   where bounded_mail_activity_id = new.bounded_mail_activity_id;
  select * into relationship from crays_core.canonical_relationships
   where canonical_relationship_id = new.canonical_relationship_id;
  select * into channel from crays_core.canonical_communication_channels
   where communication_channel_id = new.communication_channel_id;
  if relationship.canonical_person_id <> new.canonical_person_id
     or channel.canonical_person_id <> new.canonical_person_id
     or channel.channel_version <> new.communication_channel_version
     or channel.email_address_sha256 <> new.email_address_sha256
     or activity.canonical_relationship_id <> new.canonical_relationship_id
  then raise exception 'MAIL_ACTIVITY_EMAIL_ONLY_RECIPIENT_DENIED'; end if;
  return new;
end;
$$;

create or replace function crays_integration.validate_bounded_mail_activity_view()
returns trigger language plpgsql as $$
declare
  activity crays_integration.bounded_mail_activities%rowtype;
begin
  select * into activity from crays_integration.bounded_mail_activities
   where bounded_mail_activity_id = new.bounded_mail_activity_id;
  if activity.internal_domain
     and new.consumer not in ('crays','nextcloud')
     and new.projection_state <> 'suppressed'
  then raise exception 'MAIL_ACTIVITY_INTERNAL_DOMAIN_PROJECTION_DENIED'; end if;
  if new.consumer not in ('crays','nextcloud')
     and new.body_visibility = 'full'
  then raise exception 'MAIL_ACTIVITY_FULL_BODY_PROJECTION_DENIED'; end if;
  if new.visibility_policy_version <>
     activity.visibility_policy_version
  then raise exception 'MAIL_ACTIVITY_VISIBILITY_POLICY_MISMATCH'; end if;
  return new;
end;
$$;

create trigger contact_provider_projection_guard
before insert or update on crays_integration.contact_provider_projections
for each row execute function
  crays_integration.validate_contact_provider_projection();
create trigger bounded_mail_activity_guard
before insert or update on crays_integration.bounded_mail_activities
for each row execute function
  crays_integration.validate_bounded_mail_activity();
create trigger bounded_mail_activity_recipient_guard
before insert or update
on crays_integration.bounded_mail_activity_recipients
for each row execute function
  crays_integration.validate_bounded_mail_activity_recipient();
create trigger bounded_mail_activity_view_guard
before insert or update on crays_integration.bounded_mail_activity_views
for each row execute function
  crays_integration.validate_bounded_mail_activity_view();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'canonical_people',
    'canonical_relationships',
    'canonical_communication_channels'
  ] loop
    execute format('alter table crays_core.%I enable row level security',
      table_name);
    execute format('alter table crays_core.%I force row level security',
      table_name);
    execute format(
      'create policy %I on crays_core.%I for all using (current_setting(''crays.app_role'',true)=''core_service'') with check (current_setting(''crays.app_role'',true)=''core_service'')',
      'canonical_contact_core_' || table_name, table_name);
  end loop;
  foreach table_name in array array[
    'contact_provider_projections',
    'contact_reconciliation_cases',
    'bounded_mail_activities',
    'bounded_mail_activity_recipients',
    'bounded_mail_activity_views'
  ] loop
    execute format('alter table crays_integration.%I enable row level security',
      table_name);
    execute format('alter table crays_integration.%I force row level security',
      table_name);
    execute format(
      'create policy %I on crays_integration.%I for all using (current_setting(''crays.app_role'',true) in (''core_service'',''integration_service'')) with check (current_setting(''crays.app_role'',true) in (''core_service'',''integration_service''))',
      'canonical_contact_projection_' || table_name, table_name);
  end loop;
end $$;

commit;
