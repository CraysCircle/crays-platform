# Personal web application

This is the shared CRAYS Personal browser application, built with React and Vite. Its views include Personal workspaces, Gym and training, social/Nostr features and an embedded Member integration. The original package is named `crays-unified-web-personal`.

It is a separate application from [the shared Next.js application](../web/) and [the standalone Club/Member module](../../modules/club-member/). Source membership follows the captured files and manifests; a feature name does not make this the entire source of that product.

## Source layout

- `source/`: 1,435 current text inputs with original formatting; nine files use protected test-account templates.
- `preimages/`: the ten changed original files. Three additional current files did not exist in the baseline.
- `source-baseline.json` and `source-candidate.json`: complete 1,486-file and 1,489-file source compositions, including SHA-256 and size for every file.
- `third-party/`: exact metadata for all 30 direct declared packages and 31 original root license/notice files from the captured dependency tree.
- `build-binding.json`: relationship to the recorded AWS Build02 artifact, without claiming runtime adoption.

Eleven original generated image inputs are now preserved: four food illustrations and seven further project illustrations. The [complete image source map](provenance/images/README.md) records every original path, body hash, provenance observation and current availability. The other 43 image input paths remain separately pinned while their source, privacy and publication rights are reviewed. All application text, original build inputs and ten original changed text files are retained here, with the protected account constant represented by a recoverable marker.

## Restore the exact inputs

Use Python 3.9 or newer. Select a new destination outside Git and this archive:

```sh
python3 restore_source.py --version candidate --destination /outside-git/personal-candidate --bindings-file /protected/source-bindings.json --asset-root /protected/original-personal-assets
```

Use `--version baseline` for the pre-overlay composition. The owner asset root must contain the exact original relative image paths. The source-binding JSON accepts `MEMBER_TEST_ACCOUNT_ID` and `MEMBER_TEST_SUBJECT_SHA256`; this application requires the account input. Keep that JSON outside Git. Missing or incorrect owner inputs are refused before destination files are written.

The restorer checks the entire source composition against original hashes before writing files. Restoration executes no original application or build code. Public GitHub alone does not currently contain the remaining 43 image input paths or the protected constant.

## Development and build

The unchanged original package declares `npm run dev` and `npm run build` (`tsc && vite build`). These declarations are retained as source, not instructions to deploy or run privileged migration programs.

This is not yet a self-contained install recipe. The original Vite configuration has an absolute PDF dependency alias, preserves symlinks and externalizes React to the recorded shared runtime import map. The captured AWS build additionally depends on qualified fallback packages and a separately recorded Recharts closure. Its two [original AWS Build02 configuration files](aws-build02/) and the [three controller revisions and helper programs](../../operations/personal-build/) are now preserved separately. Original files are preserved without silently rewriting these relationships. No dependency install, typecheck, build, server start or deployment was repeated to publish this source.

## Original notices and remaining work

The vendored HLS implementation retains its original `source/src/live-nostr/vendor/hls/LICENSE`. Direct dependency metadata and located original notices are indexed separately. An original root notice for `@pdf-lib/fontkit@1.1.1` was not located in the captured package; this remains open. The Roboto notice applies to its original package and is not a license for unrelated fonts or images.

There is no new blanket license grant over these combined sources. Original copyright, provenance, component licenses and modification history continue to apply. Full transitive/native dependency implementation, all original notices, image/font rights, required corresponding-source offers, runtime images, current adoption and complete server-loss recovery remain under reconciliation.

See the [organization source and license status](https://github.com/CraysCircle/.github/blob/main/docs/source-and-license-status.md) for the broader migration.
