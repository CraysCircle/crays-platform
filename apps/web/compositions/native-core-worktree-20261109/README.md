# Native Core: original working-tree source slice

This directory preserves the 28 tracked modifications from the native Core checkout recorded on 9 November 2026, together with each exact committed preimage at `c2018d04f6a52d8716326a098dde7624cbb18963`. It keeps the original TypeScript, configuration, dependency lock and task instructions. It does not replace the current shared web application or assert that this older Core checkout is the current AWS runtime.

## Where the source is

- `worktree/`: all 28 changed original files, under their original relative paths.
- `head-preimages/`: 24 original committed preimages. Four other exact preimages already exist in this repository and are referenced by immutable commit, path and Git blob ID in `source-state.json`.
- `source-state.json`: all 56 original byte lengths and SHA-256 values, stored-file hashes, references and reversible template substitutions.
- `dependencies.json`: the 48 direct dependency declarations with their exact original locked versions and integrity metadata. This Core lock is distinct from the shared web dependency set.
- `restore_source.py`: an offline helper for restoring and checking either recorded source slice. It does not start the application.

Two identity repository files are templates. Thirteen development-seed identity fields remain protected pending a public-demo classification; all program logic is retained. The exact original files and preimages have a separately protected, version-read-back backup. The example binding file contains placeholders, not usable original values. Existing public occurrences do not establish permission to republish those values.

## Restore one recorded slice

Use a full clone containing the immutable referenced commits. Supply the protected binding JSON separately and choose a fresh output directory:

```sh
python3 apps/web/compositions/native-core-worktree-20261109/restore_source.py \
  --repository-root /path/to/crays-platform \
  --state worktree \
  --bindings /protected/core-native-bindings.json \
  --output /fresh/core-native-source-slice
```

Choose `--state head-preimages` for the 28 original committed preimages. Every source body is checked against its original SHA-256 before anything is written. Restoration refuses existing destinations, wrong bindings, damaged source and unsafe paths. The result is a 28-file slice; a complete Core checkout is still required to build the application.

## Source and runtime boundaries

The known Gym ancestor is `0dd822d7578dfffd55ff76eb8f37ae4c5f6f99ed`. The Core head adds 453 commits and changes 2,716 paths relative to that ancestor. That complete history is not preserved by this slice. Its additional objects include approximately 709 MB of uncompressed blob bodies, including extensive historical architecture evidence, and require a separate confidentiality review.

Ordinary status reported 595 entries, while expanding untracked directories reported 5,202 file entries: 28 tracked modifications plus 5,174 untracked files. These are different status granularities. The untracked set includes dependency fixtures and working artifacts; it is not a list of 5,174 unpublished product source files.

Later Core handoffs and selected runtime sources must still be reconciled. No product source was edited or executed, and no build, test, Apple workflow or deployment was started for this capture.

## Licenses and remaining recovery work

No original root LICENSE/NOTICE file was present in the recorded source root or its `crays-platform` root. This capture does not invent a license grant or apply a blanket license to third-party work. Existing version-specific notices are indexed in [the shared source notice catalog](../../third-party/README.md); that catalog is not evidence that this distinct 48-package Core set is complete.

The remaining direct-package notice question, all transitive and runtime sources, applicable corresponding-source obligations, asset rights, the 453-commit history, required untracked source and full recovery remain open. Public source availability alone does not establish legal compliance.

## Version-specific direct dependency notices

The [Core dependency record](dependencies.json) now preserves all 48 exact original installed package manifests and 41 original root notice files for 39 packages. Forty-two manifests and 39 notice bodies match existing public files byte-for-byte and are referenced at immutable commits; six original manifests and two original notice bodies are added without altering their text. The installed versions all match the original Core worktree lock.

Version-matched upstream records supply root texts for eight additional packages. For the three GraphQL Armor packages, the exact npm release integrities match the original Core lock; their publisher gitHead commits contain byte-identical package manifests with the exact names, versions and MIT declarations. Both source commits contain the same original root license and copyright, with no applicable nested notice in the inspected paths. One unchanged original license body is preserved and the three version relationships are recorded in [armor-notice-provenance.json](armor-notice-provenance.json). Original root texts are therefore located for 47 of 48 direct packages. One direct notice question remains: drizzle-kit 0.31.10. For drizzle-kit, MIT package metadata and the upstream Apache-2.0 root remain an unresolved package-specific discrepancy. Package metadata is not a substitute for an original notice or complete license compliance. Full transitive, bundled, runtime and corresponding-source obligations remain open.

## Additional original implementation inputs

[Additional source](UNTRACKED_SOURCE.md) preserves 34 original GraphQL operation documents and 60 targeted compiler configurations. [Generator and rollback sources](UNTRACKED_GENERATOR_AND_ROLLBACKS.md) retain eight original rollback programs, the isolated GraphQL generator and its exact dependency lock, plus schema metadata. All 107 original files retain their byte hashes and original relative paths. No generator, compiler check or SQL program was executed. These inputs supplement this source slice; they do not close the remaining untracked code, historical commits, dependency notices or runtime recovery.
