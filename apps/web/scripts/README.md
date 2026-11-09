# Shared web operational source

This directory preserves original development, verification and migration programs referenced by the shared application's package.json. It is a source archive with original filenames. The programs have not been executed or accepted against the current AWS runtime.

## Source versions

The annotated tag shared-web-helpers-baseline-20261109 preserves 92 original historical files: 90 of the application's 94 referenced programs and their two imported helper modules. They match the original crays-platform subtree at historical commit 0dd822d7578dfffd55ff76eb8f37ae4c5f6f99ed retained in crays-gym.

The tag shared-web-helpers-worktree-20261109 adds the exact two different Club worktree files: verify-block111-performance-initial-payloads.mjs and verify-workbench-saved-views-schema.mjs. Every other selected helper is unchanged. Original source bytes and both versions are retained; this does not establish that these programs were used for a particular current AWS build.

The [capture manifest](../provenance/operational-helpers.json) records each selected file's SHA-256 and byte count. The [original helper-source package](../provenance/helper-source-package.json) is provenance. Its build command and dependency declarations differ from the application capture; it must not replace the application package.json.

## Open source inputs

Four referenced programs remain outside this public selection pending independent review of embedded contact and realistic business fixture literals:

- migrate-golden-operating-dataset-v1.mjs
- repair-core-golden-test-data.mjs
- seed-crm-golden-source-records.mjs
- seed-erp-finance-workflow-source-slice.mjs

The original files remain preserved in the protected source intake and their historical Git repository. A test/seed label alone is not treated as proof that contact data is synthetic.

## Execution and recovery

These programs include database writes, source-system operations, fixture imports and commands that can mutate state. Some entry points or package scripts already request apply mode. Publication is not an instruction to run them.

Before any separately authorized execution, establish the exact environment, target, role, required source datasets, protected settings, installed dependency versions and current migration assumptions. The static import review observed Node built-ins, pg and playwright; this is not a complete transitive dependency or behavioral analysis. External SQL/JSON/dataset and documentation references still require reconciliation.

No .env contents, database exports or runtime credentials are included. See [recovery limits](../docs/recovery.md), [source recovery gaps](../provenance/recovery-gaps.json) and [license status](../LICENSE-STATUS.md). The application rights record remains open; no new blanket license is inferred for these files.

The [anonymous GitHub readback record](../provenance/operational-helpers-readback.json) confirms 99 current source/documentation files and all 92 historical helper files against their expected original bytes and SHA-256 values.
