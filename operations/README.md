# Operations source

This directory preserves reviewed migration and recovery programs separately from application services. It is source custody, not an instruction or permission to run these programs.

- [Qlo account2 correction](qlo/README.md): reviewed revision03 and restore-preservation requirements.
- Storage guard: unchanged original helper under `storage/persistent_storage_guards.py`.

Programs retain their original environment assumptions, absolute paths and helper imports. Their directory placement does not make them standalone commands. An authorized runtime owner must review the execution wrapper, dependency locations, protected configuration and current state before any execution. No runtime execution, account mutation, key generation or restore was performed by this import.

See [provenance](source-index.json) for exact source hashes. No application license is inferred from publication.
