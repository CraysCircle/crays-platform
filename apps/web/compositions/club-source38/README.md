# Club Build38: exact source input

This composition identifies the exact 2,045 source inputs for the original Club adapter with its qualified RDS branch. It adds one original adapter body while reusing 2,044 byte-identical files already preserved in this repository. It does not replace the prepared shared application tree or claim a new deployment.

| Evidence | Recorded value |
| --- | --- |
| Original source-tree manifest SHA-256 | `1634e5479d6438babb86573755de354cf0ead8eaba07b022214017bc052254a4` |
| Original compiled manifest SHA-256 | `fb2a5cbe1d46cdcda8162ce23194237fac1972771c34cbc351be8db3294f52a5` |
| Framework build ID | `oBGvsXCd08tp4gsMwOOo5` |
| Effective source input | 2,045 files, 19,323,567 bytes |
| Original RDS adapter SHA-256 | `5490f6a92c466227589a3977c794c45b688893d92a9b3d8f6fd715b9be240b69` |
| Original build controller SHA-256 | `5077aa1f067450a5d79fd7bfe108fa3092fc7c33697c4bd21fa9659b1651723b` |

The framework ID is not an OCI image digest. The original compiled manifest records 3,554 output-file pins and a successful build that was not yet installed or accepted. This archive preserves those pins separately; it does not claim to have independently rehashed the current compiled output bodies or verified runtime adoption.

## Source layout and exact restoration

- `source-inputs.json` lists every effective input, original SHA-256/size, immutable source reference and the one retained override.
- `overrides/` contains the unchanged original RDS adapter.
- `compiled-files.json` retains the original 3,554 output hash/size rows without copying generated output bodies.
- `build-binding.json` distinguishes original build evidence, source custody and remaining runtime/recovery work.
- [Original build-controller source](../../../../operations/club-next-runtime/build38/README.md) retains the execution program separately from product code.

From a full repository clone, restore to a fresh directory:

```sh
python3 apps/web/compositions/club-source38/restore_source.py \
  --repository-root /path/to/crays-platform \
  --output /fresh/club-build38-source
```

The helper checks all 2,045 source bodies before writing. It uses byte-matching files in the clone, with immutable Git references as a fallback. It refuses damaged source, unsafe paths and existing output directories. It does not install dependencies, run a build or execute any application/operations program.

## Declared source adjustments

The original source manifest retains the baseline pin for `src/db/clubs-production-public-pool.ts` and separately declares its existing one-line prepared overlay. The effective input uses the already-preserved 6,123-byte overlay, SHA-256 `bd93fafc12ff3aa159e54909a997903f2011bf3fb8fc2f94f7f44f1eabec3e79`. Its 6,042-byte preimage, SHA-256 `5459898eb3e460e69ad76f8d7abfd377a1b205df7c6a767eda04f49b25e803d5`, remains referenced at the original baseline commit. Both representations are retained explicitly; a baseline row alone is not the effective build input.

The separately changed original HTTP/Core pool is `runtime-integration/member-original-read-api-source002/src/db/core-identity-runtime-pool.ts`. Its earlier original body is also retained at an immutable repository reference. The qualified delta preserves the original HTTP adapter and adds the reviewed RDS branch.

## Dependencies, rights and remaining recovery

Build38 borrows the original read-only public assets and dependency mounts recorded by its owner. Those complete asset and dependency bodies are not supplied by this source-only composition. Use the [shared source/dependency catalog](../../README.md) and its original notices; the separate native Core48-package set is a different source scope.

Original source, original license/copyright/NOTICE text and exact package-version relationships remain applicable. This record introduces no blanket license grant. Full transitive/runtime notices, asset rights, required corresponding-source offers, protected configuration, complete recovery and current runtime acceptance remain open.

No product source, runtime, database, DNS, build or deployment was changed or executed by the GitHub capture.
