-- Empty isolated rollback only; never discard receipt history on downgrade.
begin;
do $$begin
 if exists(select 1 from crays_core.personal_feed_states) then raise exception 'Personal feed history must be preserved';end if;
end$$;
drop table crays_core.personal_feed_outcomes,crays_core.personal_feed_attempts,crays_core.personal_feed_confirmations,crays_core.personal_feed_intents,crays_core.personal_feed_revocations,crays_core.personal_feed_states;
drop function crays_core.guard_personal_feed_effect();
commit;
