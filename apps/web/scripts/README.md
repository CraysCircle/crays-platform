# Shared web operational source

This directory preserves original development, verification and migration programs referenced by the shared application's package.json. It is a source archive with original filenames. The programs have not been executed or accepted against the current AWS runtime.

## Source versions

The annotated tag shared-web-helpers-baseline-20261109 preserves 92 original historical files: 90 of the application's 94 referenced programs and their two imported helper modules. They match the original crays-platform subtree at historical commit 0dd822d7578dfffd55ff76eb8f37ae4c5f6f99ed retained in crays-gym.

The tag shared-web-helpers-worktree-20261109 adds the exact two different Club worktree files: verify-block111-performance-initial-payloads.mjs and verify-workbench-saved-views-schema.mjs. Every other selected helper is unchanged. Original source bytes and both versions are retained; this does not establish that these programs were used for a particular current AWS build.

The [capture manifest](../provenance/operational-helpers.json) records each selected file's SHA-256 and byte count. The [original helper-source package](../provenance/helper-source-package.json) is provenance. Its build command and dependency declarations differ from the application capture; it must not replace the application package.json.

## Open source inputs

Four referenced programs now have [protected source views](../../../source-archives/shared-web/four-protected-operational-helpers-20261109/README.md). Their original person/contact and linked sensitive literals remain private pending the separate origin clarification; the rest of their implementation is inspectable:

- [migrate-golden-operating-dataset-v1.mjs](../../../source-archives/shared-web/four-protected-operational-helpers-20261109/source/scripts/migrate-golden-operating-dataset-v1.mjs.template)
- [repair-core-golden-test-data.mjs](../../../source-archives/shared-web/four-protected-operational-helpers-20261109/source/scripts/repair-core-golden-test-data.mjs.template)
- [seed-crm-golden-source-records.mjs](../../../source-archives/shared-web/four-protected-operational-helpers-20261109/source/scripts/seed-crm-golden-source-records.mjs.template)
- [seed-erp-finance-workflow-source-slice.mjs](../../../source-archives/shared-web/four-protected-operational-helpers-20261109/source/scripts/seed-erp-finance-workflow-source-slice.mjs.template)

The four exact original files remain in their existing private GitHub repository. The archive maps the immutable private recovery paths and provides a checked in-memory restorer without publishing the private patch. No fictional-origin assertion is made; these are source templates, not runnable operational inputs.

## Execution and recovery

These programs include database writes, source-system operations, fixture imports and commands that can mutate state. Some entry points or package scripts already request apply mode. Publication is not an instruction to run them.

Before any separately authorized execution, establish the exact environment, target, role, required source datasets, protected settings, installed dependency versions and current migration assumptions. The static import review observed Node built-ins, pg and playwright; this is not a complete transitive dependency or behavioral analysis. External SQL/JSON/dataset and documentation references still require reconciliation.

No .env contents, database exports or runtime credentials are included. See [recovery limits](../docs/recovery.md), [source recovery gaps](../provenance/recovery-gaps.json) and [license status](../LICENSE-STATUS.md). The application rights record remains open; no new blanket license is inferred for these files.

The [original anonymous GitHub readback record](../provenance/operational-helpers-readback.json) confirms 99 files in the initial source/documentation selection and all 92 historical helper files against their expected original bytes and SHA-256 values. The later protected-source archive is preserved and verified separately.
