-- Display-only metadata on the existing immutable original version. No file paths,
-- identity/grants, payload rewrite, invented historical name or data backfill.
alter table crays_core.personal_message_attachment_versions
 add column if not exists display_name text;
alter table crays_core.personal_message_attachment_versions
 drop constraint if exists personal_original_display_name_bounded;
alter table crays_core.personal_message_attachment_versions
 add constraint personal_original_display_name_bounded check (
  display_name is null or (
   octet_length(display_name) between 1 and 255 and display_name=btrim(display_name)
   and display_name not in ('.','..')
   and position('/' in display_name)=0 and position(chr(92) in display_name)=0
   and display_name !~ '[[:cntrl:]]'
   and display_name !~ U&'[\061C\200E\200F\202A-\202E\2066-\2069\FEFF]'
  )
 );
-- The existing immutable-version trigger protects the new name as part of the row.
