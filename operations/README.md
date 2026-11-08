# Operations source

This directory preserves reviewed migration and recovery programs separately from application services. It is source custody, not an instruction or permission to run these programs.

- [Qlo account2 correction](qlo/README.md): reviewed revision03 and restore-preservation requirements.
- Storage guard: unchanged original helper under `storage/persistent_storage_guards.py`.

Programs retain their original environment assumptions, absolute paths and helper imports. Their directory placement does not make them standalone commands. An authorized runtime owner must review the execution wrapper, dependency locations, protected configuration and current state before any execution. No runtime execution, account mutation, key generation or restore was performed by this import.

See [provenance](source-index.json) for exact source hashes. No application license is inferred from publication.

- [Gateway runtime44](qlo/gateway-runtime44/README.md): exact source39/source44 and current revision02 wrapper, with the earlier wrapper retained as history.

- [Postiz delivery helpers](delivery/postiz/README.md): exact qualifier revision04, public binding and separately reviewed physical-readback revision02.

- [Neon → RDS migration sources](neon-rds/README.md): twelve original programs, six unchanged files and six protected-binding templates, with byte-verified reconstruction and explicit dependency/license gaps.
