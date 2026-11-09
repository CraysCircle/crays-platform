# Materializer source with protected literal bindings

This slice publishes the implementation of 35 original source/test programs with phone, email, record-identifier, person-label or credential-shaped literal bindings replaced by explicit placeholders. The original values are not assumed synthetic or approved for public disclosure from their appearance. Original source hashes and template hashes are recorded in untracked-materializer-protected-source.json. Compiled upstream overlays remain excluded.

Exact original source bytes are recoverable with the previously preserved private 848-source custody archive whose complete hash and size are pinned in the manifest. The standard-library helper restore-materializer-protected-source.py validates the archive, templates and each original body, restores into a new private destination and runs no archived product code. Both the public template slice and the private custody archive are required; this is not a claim that the originals are self-contained on public GitHub.

Example: python3 restore-materializer-protected-source.py --public-root . --private-archive /secure/original-untracked-known-source-candidates.private.tar.gz --destination /secure/new-restored-source

No original source, test, materializer, provider or runtime process was executed. Exact dependency notices, upstream implementation/source relationships and present runtime acceptance remain separate requirements. Existing notices continue to apply and no new blanket license is introduced.
