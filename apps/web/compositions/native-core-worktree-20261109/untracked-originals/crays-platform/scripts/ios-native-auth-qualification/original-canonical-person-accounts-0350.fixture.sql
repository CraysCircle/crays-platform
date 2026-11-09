-- Isolated setup only; exact original0350 table/RLS prefix, sourceSHA256 a93329db19d8141e9f6cdef31e9be3c9511d6bb8e90bd3a47ecd55f153b5fc80. No productive installer.
-- Read existing explicit person/account bindings only. No person creation or merge.
-- Transaction controlled by the admitted Core migration runner.
CREATE TABLE crays_core.canonical_person_accounts (
  account_id text PRIMARY KEY REFERENCES crays_core.crays_accounts(account_id),
  canonical_person_id text NOT NULL REFERENCES crays_core.canonical_people(canonical_person_id),
  purpose text NOT NULL CHECK (purpose IN ('business','customer')),
  status text NOT NULL CHECK (status IN ('active','revoked')),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  authority_ref text NOT NULL CHECK (length(btrim(authority_ref)) BETWEEN 1 AND 512),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE crays_core.canonical_person_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crays_core.canonical_person_accounts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON crays_core.canonical_person_accounts FROM PUBLIC;
CREATE POLICY canonical_person_accounts_admin ON crays_core.canonical_person_accounts
  FOR ALL TO CURRENT_USER USING (true) WITH CHECK (true);
