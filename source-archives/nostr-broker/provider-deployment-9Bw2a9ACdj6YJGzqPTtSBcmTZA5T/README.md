# Historical Nostr broker: original deployment configuration

This capture preserves four complete configuration files returned from the source of the original Vercel deployment `dpl_9Bw2a9ACdj6YJGzqPTtSBcmTZA5T`. It helps recover the tooling and broker-specific build settings of that historical source version. It is a four-file source record, not the complete application or a claim about the current AWS runtime.

| Original provider path | Purpose |
| --- | --- |
| `src/.vercelignore` | Retains the original deployment exclusion patterns. |
| `src/next.config.ts` | Next.js configuration, including the optional isolated output directory and broker-only URL handling flags. |
| `src/eslint.config.mjs` | Next.js ESLint configuration and the original generated/build-output exclusions. |
| `src/.crays-nostr-broker-staging.json` | Development-workspace marker; it is not a live provider connection or runtime acceptance receipt. |

[source-capture.json](source-capture.json) records each provider path, byte length, SHA-256 and provider file ID. The file IDs are raw-content SHA-1 values; they are not Git object IDs. All returned bodies were decoded in full and compared with both hashes before preservation. No absolute local source root is inferred from the provider paths.

The original file bytes and relative provider paths are retained. These files are not executed by the preservation work. The other historical source files, exact dependency composition and recovery instructions remain separate requirements.

## Licensing and notices

These four returned files contain no copyright or license headers. This capture supplies no new license grant for the application, templates or dependencies. Original component terms and notices remain applicable under the [platform licensing record](../../../LICENSING.md); no original header or notice has been removed or replaced. Complete provenance and dependency-license closure are not established by this small capture.
