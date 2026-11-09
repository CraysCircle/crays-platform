-- Never discard an original name once recorded in an immutable manifest.
begin;
lock table crays_core.personal_message_attachment_versions in access exclusive mode;
do $$begin
 if exists(select 1 from crays_core.personal_message_attachment_versions where display_name is not null) then
  raise exception 'Named original history prevents display-name downgrade';
 end if;
end$$;
alter table crays_core.personal_message_attachment_versions drop constraint personal_original_display_name_bounded;
alter table crays_core.personal_message_attachment_versions drop column display_name;
commit;
