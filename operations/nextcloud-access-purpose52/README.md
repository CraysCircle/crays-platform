# Nextcloud access purpose: SQL and pool source

These sources describe a narrow PostgreSQL RPC boundary for Nextcloud membership dispatch: a pool verifies runtime roles and original function bodies, while SQL resolves current authority, claims an existing intent and records its outcome.

| Source | Representation |
| --- | --- |
| [Purpose SQL](nextcloud-access-purpose52.corrected.sql.template) | Protected source template |
| [Rollback qualification SQL](qualify_nextcloud_purpose52.rollback.candidate.sql.template) | Protected source template |
| [Pool adapter](nextcloud-access-purpose-pool52.candidate.ts) | Unchanged TypeScript original |
| [Function pins](FUNCTION_BODY_PINS52.json) | Unchanged original function-body checksums |

The SQL templates replace one fixed account fingerprint at eight positions in each original with the same opaque slot. Account fingerprints remain account-linked information even when hashed. The rest of the SQL is preserved byte for byte; dynamic identity, approval and policy joins remain visible. [The capture map](source-capture.json) records exact source and export hashes, byte ranges, names and reconstruction rules without exposing the protected value or a hash of that literal.

**These are prepared, statically reviewed sources. This package activates neither SQL nor SSO and demonstrates no deployed or complete functional outcome.** The templates are not deployment inputs. Function pins in the TypeScript, JSON and rollback assertions identify the original private SQL function bodies; they do not qualify template function bodies containing opaque slots. The pool's local TypeScript imports and the existing database schema are separate dependencies.

All four original bodies remain unchanged in protected AWS intake and in the private [original-source tree](https://github.com/CraysWorld/crays-gym/tree/6d778b44d8da1822e283fe1ec32c6ef7da29e4ba/protected-source-archives/nextcloud-purpose52) in CraysWorld/crays-gym (repository ID 1280582408), commit 6d778b44d8da1822e283fe1ec32c6ef7da29e4ba, branch codex/nextcloud-purpose52-private-source-20261109. The parent publisher fully compared all six stored files through authenticated GitBlob reads and checked the branch reference; the existing master branch stayed unchanged. Private repository access is required. [The capture map](source-capture.json) gives each exact original path and immutable commit locator. Authorized reconstruction must reproduce every original byte length and whole-file SHA256; it must never substitute a guessed account. This is source custody, not a server, database or complete application restore acceptance.

The existing independent source review concerns database permissions and the specific SQL delta. Copyright scope relies separately on the trusted Root source-owner statement and the user's CRAYS-owned-code licensing instruction. See [LICENSING.md](LICENSING.md), [exact scope](license-scope.json) and [LICENSE](LICENSE).
