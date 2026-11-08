# Qlo account2 correction source

The preserved revision03 corrects the protected original account2 provider key through the separately authorized AWS migration process. The accompanying persistent-storage guard is preserved unchanged under `../storage/`. This source capture contains no generated provider key or protected runtime binding.

## Source and execution status

The Business workstream supplied the source-only revision03 candidate and its independent review. The exact packet and program hashes are recorded in [the operations source index](../source-index.json). The candidate was reviewed for source custody; its runtime apply wrapper requires separate review. Neither program was executed or imported during this preservation step. Syntax inspection is not operational acceptance.

The original programs retain runtime-specific paths and imports. Do not execute the repository copy directly or substitute its paths into an existing deployment without the responsible owner's reviewed wrapper.

## Restore preservation condition

Original backups and gateway-original captures remain unchanged. A later Qlo final-delta import or restore must not reactivate the exposed original key. Before releasing the gateway after a restore, the responsible runtime owner must requalify the protected AWS key, preserve the original ACL and verify old-key denial plus a bounded read-only proof using the new key.

This record does not introduce an automatic restore trigger, overlay, source mutation or cleanup. Protected credentials and runtime evidence remain outside this repository.
