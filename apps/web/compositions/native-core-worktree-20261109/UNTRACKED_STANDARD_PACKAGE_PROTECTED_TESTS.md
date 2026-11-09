# Original standard-package tests with protected identity labels

This slice publishes19original standard-package test implementations with fixed person/account identifier literals replaced by explicit placeholders. Their appearance in a test does not itself establish public identity authority, so their raw values remain private. Original source hashes, template hashes and exact recovery bindings are recorded in untracked-standard-package-protected-source.json.

The standard-library helper restore-standard-package-protected-source.py restores the exact original bytes using the already preserved private848-source custody archive, whose full hash and byte size are pinned. The public templates and that private archive are both required. This does not assert the complete original source is self-contained on public GitHub.

Example: python3 restore-standard-package-protected-source.py --public-root . --private-archive /secure/original-untracked-known-source-candidates.private.tar.gz --destination /secure/new-restored-tests

No original tests, standard-package factories, materializers or runtime programs were executed during preservation. Exact dependencies, original notices and current runtime acceptance remain separate requirements. Existing notices continue to apply and no new blanket license is granted.
