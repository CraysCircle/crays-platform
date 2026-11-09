# Nextcloud Purpose45: corrective source deltas

These two CRAYS-authored patches document the change from the privately retained Purpose45 proposal to the already preserved Purpose52 SQL and pool adapter. The SQL delta records the row-lock admission and receipt-collision correction; the pool delta updates the corresponding original function-body pin.

| Corrective source | Public representation |
| --- | --- |
| [SQL 45-to-52 delta](SQL52_EXACT_ORIGINAL45_DELTA.patch.template) | Source template with five account-fingerprint spans replaced by one opaque slot |
| [Pool pin delta](POOL52_EXACT45_PIN_DELTA.patch) | Unchanged original patch |

**Only these two corrective patches are published here.** The original Purpose45 SQL and pool TypeScript have unresolved author provenance and remain private. This package neither publishes nor grants a license to those original files. Its patch context does not establish a license for the predecessor module.

The four complete historical originals (54,412 bytes) are preserved in private [CraysWorld/crays-gym at commit 20888ce47eff4f5b69abcd3ea1dfe255a1631ef8](https://github.com/CraysWorld/crays-gym/tree/20888ce47eff4f5b69abcd3ea1dfe255a1631ef8/protected-source-archives/nextcloud-purpose45-history), branch codex/nextcloud-purpose45-private-source-20261109. The parent publisher verified all six stored files by complete authenticated GitBlob readback and checked the branch; private access is required. [The capture map](source-capture.json) provides exact original paths, sizes, whole-file hashes and private recovery links.

The SQL patch's fixed account fingerprint remains private. Its five replacements preserve every other source byte; authorized recovery must restore the exact mapped bytes and verify the original length and SHA256. The protected patch is not an applicable or runnable migration input. Function hashes refer to original private bodies, not opaque-slot templates. Existing source reviews reconstructed both raw deltas in memory; no SQL was executed.

[Purpose52](../nextcloud-access-purpose52/README.md) already preserves the corrected result. The intermediate corrected45 SQL is byte-identical to that Purpose52 original and is not duplicated. These are historical source snapshots: SQL and SSO are not activated by publication, and no runtime delivery, complete application recovery or functional acceptance is claimed.

The trusted Root source-author statement covers the two own corrective deltas only. See [LICENSING.md](LICENSING.md), [exact revision scope](license-scope.json) and [LICENSE](LICENSE) for AGPL-3.0-only / CRAYS AG terms. Database-rights review is separate from copyright authority.
