# License and provenance

This record separates the original application source, the CRAYS AWS build description and the runtime distribution. It is an evidence record. The explicit CRAYS AG grants for the listed Qlo/BFF source revisions are documented separately in the [component license map](../LICENSING.md).

| Material | Established provenance | License evidence and remaining work |
| --- | --- | --- |
| Four Qlo gateway application files | Exact original application capture19; all supplied file hashes match | No standalone application LICENSE/NOTICE/COPYING was found in the specifically examined original component directories and roots. The original package metadata has no license field. The nine identified CRAYS-owned integration/build/test revisions now have an explicit [AGPL-3.0-only grant](../services/qlo-gateway/LICENSING.md) from CRAYS AG; original package bytes are unchanged. |
| AWS Dockerfile | Exact image30 build-context file; SHA-256 recorded in the source index | CRAYS-specific deployment source, retained unchanged and included in the exact Qlo AGPL-3.0-only grant. |
| Node/Alpine runtime and bundled components | Exact base reference in the original Dockerfile; existing Node version qualification | Full version-specific license/NOTICE texts and the complete source/provenance relationship of the exact runtime image still require capture and verification. A base-image name alone does not close this work. |
| Test sources referenced by package metadata | Names preserved in the original package test command | All four original test files and the original component README have now been recovered and preserved unchanged with exact hashes. The four identified original test files are included in the explicit Qlo AGPL-3.0-only grant; consolidated README text remains outside that initial file-specific scope. |

The original application capture and AWS Dockerfile were supplied by the Business migration workstream. Application SHA pins and the existing image30 build receipt establish the recorded relationship; a new reproducible build from Git has not been performed.

## Rules for further imports

Keep original license and copyright texts intact. Read the actual version-specific license before describing its permissions or source requirements. Preserve relevant NOTICE files, upstream commit references and modification history. A dependency license does not automatically license the surrounding application.

For each component, record whether corresponding source or another source offer is required and how the intended recipients can actually obtain it. The exact source must be accessible to those recipients; repository visibility alone does not establish source completeness.

No customer data, provider keys, consumer tokens, private bindings, database dumps or import receipts were included in this source snapshot. No upstream software is being relicensed by this documentation.

## Open acceptance points

The initial source capture is usable for precise repository/commit identification. The explicit Qlo/BFF grants resolve the license designation for their listed CRAYS-owned revisions. Other application authorship/license questions, exact runtime license closure, test execution evidence and applicable source-offer obligations remain open. They must not be reported as legally complete or release-approved.

## Operations source

The reviewed Qlo account2 revision03 and unchanged storage guard are preserved with their source packet/review identities under [operations](../operations/README.md). This import supplies no new license grant and does not authorize execution. Their original ownership and license evidence remain an explicit open item.

## Clubs Commerce BFF

The nine original component files are preserved unchanged with their [source record](../services/clubs-commerce-bff/source-index.json). All fourteen locked npm package archives were checked against their original SHA-512 lock integrity. Twelve standalone license files and two complete original READMEs containing license text are retained under its third-party directory; their copyright and permissions are not replaced with a generic license. The six identified CRAYS-owned integration/build/test revisions now have an explicit [AGPL-3.0-only grant](../services/clubs-commerce-bff/LICENSING.md). Dependency notices retain their original terms; exact runtime/base-image notices and AWS deployment parity remain open.

## Shared Next.js application

The [qualified shared web capture](../apps/web/README.md) retains 2,045 selected original inputs in baseline and prepared source views. Its [direct-package index](../apps/web/third-party/index.json) preserves the observed package metadata and original root notice texts located for 45 of 47 direct packages. The server-only and drizzle-kit notice questions, application rights, transitive/bundled/runtime notices and source-availability obligations remain open. The [recovery record](../apps/web/docs/recovery.md) identifies missing operational helpers, the unqualified project lockfile and remaining media/runtime inputs. No application test, build, database program or deployment was executed by this import.

## Qlo/Work family operating and runtime sources

The [operating-source archive](../operations/qlo-work-family/README.md) preserves fourteen exact original program/patch files across their recorded revisions, with an existing byte-identical storage guard linked separately. The [Work runtime component](../services/work-qlo-runtime/README.md) retains the original bootstrap and four local CommonJS modules.

Recorded source pins, AST parsing and the source/dependency secret scan do not establish execution success, application ownership/license clearance, a complete original underlying Next application/dependency/asset source set, runtime/image notices or applicable corresponding-source closure. Protected review/environment/custody records remain outside Git. No original program or product runtime was executed by this import.

## Club/Member browser module and origin35

The [browser module](../modules/club-member/README.md) preserves both exact 133-file input views, including nine protected test-account templates, and the source/build relationship for all 129 application source files. Its separate dependency observation has 29 package roots and 28 versions, including nested duplicate picomatch. Twenty-eight original license/attribution files are preserved; the native Rolldown binding notice question remains open. Dependency package/lock metadata does not become an invented module project manifest.

The existing TypeScript 5.9.3 ThirdPartyNoticeText.txt was already present and indexed in the shared web catalog. The new intake explicitly covers third-party/author filenames and retains the exact matching text for this component. No duplicate correction to the existing catalog was needed.

Original capture/build/stage/adoption source is preserved under [operations/member-origin35](../operations/member-origin35/README.md). Protected inputs, actual Common-shell/backend/image adoption, complete underlying media/runtime/dependency source and notices, application rights and applicable source offers remain separate. No preserved original program or product build was executed by this import.
