-- Deliberately fail closed: rollback must not discard registered originals or
-- revive erased bytes. A separate reviewed export/retention/restore plan is due.
do $$begin raise exception 'Personal media custody rollback requires explicit data-preserving release plan';end$$;
