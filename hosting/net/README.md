# Net website hosting and source composition

The Net website uses the retained Primal-derived application in [CraysCircle/crays-web-codex at the exact recorded commit](https://github.com/CraysCircle/crays-web-codex/tree/2b81461e8e8b5ee6fbdb59e36215c4b574d235bf). This directory preserves the additional AWS static-hosting wrapper unchanged. Application source stays in its existing product repository; shared hosting source stays here.

## Exact source relationship

The recorded application commit is 2b81461e8e8b5ee6fbdb59e36215c4b574d235bf and its Git tree is 10a0524334869373c3f711bbae49398960cbc411. All 982 tracked file objects were verified by comparing the complete recursive remote tree with the exact original tree identity. The tree is untruncated, has no submodule entries, and the repository's default branch still points to that same commit at verification.

The original root MIT license was read back from that commit and compared byte for byte with the qualified original/runtime copy. [original-application.LICENSE](original-application.LICENSE) retains the unchanged copyright and license text. This application notice does not automatically assign a license to the later hosting wrapper.

[The composition index](source-composition.json) binds that application source, the exact 2450-byte wrapper, the previously recorded release archive/manifest and observed AWS image ID. This is a source composition across two existing repositories, with one index identifying every reference. No duplicate application repository was created.

## Wrapper behavior and configuration

server.mjs serves a sibling public directory through Node built-in HTTP/filesystem modules. It admits GET/HEAD, rejects invalid or escaping paths, preserves the original single-page fallback to index.html, emits the recorded MIME/cache headers, and retains the image-cache worker's original service-worker scope.

The original wrapper reads PORT (default 8080) and HOST (default 0.0.0.0). It does not load an environment file and has no npm dependencies of its own. No secret or customer-data binding is needed in this source file.

## Build inputs and recovery

The original application repository includes package.json, package-lock.json, tsconfig.json, vite.config.ts, vercel.json and its original contribution/development documentation. Use the exact recorded commit when inspecting its build inputs; a different upstream Primal repository or current upstream release is not a substitute.

To recover the recorded hosting composition, obtain the recorded unchanged published-build artifact through the responsible backup/runtime owner, verify its release manifest, and place the original public tree beside this unchanged wrapper. The original source can be checked out independently from its exact application commit. A new build from that source has not been demonstrated to reproduce the recovered published bytes.

No runtime process, container, build, domain or deployment was changed by this import. The recorded AWS image ID is not a registry manifest digest, and its exact Node version is still unqualified. A contemporary source capture must not be mistaken for proof that the migration historically had this wrapper in GitHub at deployment time.

## Remaining verification

Exact dependency/runtime notices, later wrapper authorship/license evidence, rebuild reproducibility and any later AWS release revisions remain open. The 982-file tree comparison proves retained application Git content; it is not a complete privacy/license audit or customer acceptance result.
