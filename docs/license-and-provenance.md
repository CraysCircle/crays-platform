# License and provenance

This record separates the original application source, the CRAYS AWS build description and the runtime distribution. It is an evidence record. The explicit CRAYS AG grants for the listed CRAYS-owned source revisions are documented separately in the [component license map](../LICENSING.md).

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

The initial source capture is usable for precise repository/commit identification. The file-scoped CRAYS grants resolve the license designation for their listed owned revisions. Other application authorship/license questions, exact runtime license closure, test execution evidence and applicable source-offer obligations remain open. They must not be reported as legally complete or release-approved.

## Operations source

The reviewed Qlo account2 revision03 and unchanged storage guard are preserved with their source packet/review identities under [operations](../operations/README.md). This import supplies no new license grant and does not authorize execution. Their original ownership and license evidence remain an explicit open item.

The [Vendure provider operating-source packet](../operations/vendure-native-provider-integration/README.md) now preserves ten exact original operating and verifier programs (215,470 bytes). Their exact CRAYS-owned revisions and fourteen mapped nested own-code regions have an explicit [AGPL-3.0-only grant from CRAYS AG](../operations/vendure-native-provider-integration/LICENSING.md); this does not relicense the Vendure/framework implementations. The [Chuck48 listener](../operations/chuck-original-transport48/README.md) and [Common49/revision03 operational source](../operations/chuck-original-transport48/install-revision03/README.md) are also public with exact original hashes and existing-helper restoration references. Anonymous readback verified the published source packets. Source/lifecycle peer checks and publication do not establish the complete provider/image/dependency source, applicable notices, authenticated customer acceptance or current runtime adoption. These additions introduce no blanket license grant and include no private launch, approval or environment-input bodies.

The [preferred Vendure TypeScript input](../operations/vendure-native-provider-integration/preferred-source07-rev04/README.md) is now preserved separately: one unchanged 3,574-byte source field with its own [AGPL-3.0-only scope](../operations/vendure-native-provider-integration/preferred-source07-rev04/LICENSING.md). Its exact immutable compiler-input hash/version is recorded; the original filesystem filename is unknown and no compiler was rerun. The preceding ten-program grant and upstream implementation terms are unchanged.

The [TLS19 DNS01 bootstrap archive](../operations/tls19-dns01-bootstrap/README.md) preserves three exact original programs (15,367 bytes) with their own [AGPL-3.0-only scope](../operations/tls19-dns01-bootstrap/LICENSING.md). External package/system-tool implementations retain their upstream terms. Private keys and execution inputs remain excluded; source and license publication do not establish certificate issuance, installation, renewal or ingress adoption.

The Member document-provider [build revision02](../operations/member-document-provider51/build-revision02/README.md) preserves two original programs (14,954 bytes) with a [two-program AGPL scope](../operations/member-document-provider51/build-revision02/LICENSING.md); [lifecycle revision01](../operations/member-document-provider51/lifecycle-revision01/README.md) preserves five originals (84,208 bytes) with a [separate five-program scope](../operations/member-document-provider51/lifecycle-revision01/LICENSING.md). Exact helper references and the separately preserved selector remain outside these additional grants. Source preservation does not establish a produced bundle, runtime adoption or genuine customer document delivery.

The later [Forward02 and ingress sources](../operations/member-document-provider51/forward-revision02/README.md) preserve four exact programs (75,294 bytes); the [historical revisions01–03](../operations/member-document-provider51/historical-revisions01-03/README.md) separately preserve five earlier programs (75,186 bytes). Both have their own exact CRAYS AG AGPL-3.0-only scopes, [current](../operations/member-document-provider51/forward-revision02/LICENSING.md) and [historical](../operations/member-document-provider51/historical-revisions01-03/LICENSING.md), plus original-path restoration maps ([current](../operations/member-document-provider51/forward-revision02/source-capture.json), [historical](../operations/member-document-provider51/historical-revisions01-03/source-capture.json)). The original build/lifecycle groups and selector remain separate. Anonymous readback verified these nine published originals; source publication and file-scoped grants do not establish customer acceptance, complete runtime/dependency source or full recovery.

## Clubs Commerce BFF

The nine original component files are preserved unchanged with their [source record](../services/clubs-commerce-bff/source-index.json). All fourteen locked npm package archives were checked against their original SHA-512 lock integrity. Twelve standalone license files and two complete original READMEs containing license text are retained under its third-party directory; their copyright and permissions are not replaced with a generic license. The six identified CRAYS-owned integration/build/test revisions now have an explicit [AGPL-3.0-only grant](../services/clubs-commerce-bff/LICENSING.md). Dependency notices retain their original terms; exact runtime/base-image notices and AWS deployment parity remain open.

The separate [Pure80 build/probe archive](../operations/clubs-commerce-bff/pure80-source-revision01/README.md) preserves two original programs (42,474 bytes), including their finite embedded JavaScript probe. Their exact CRAYS-owned revisions now have a separate [AGPL-3.0-only grant from CRAYS AG](../operations/clubs-commerce-bff/pure80-source-revision01/LICENSING.md), bound to the actual source-author confirmation. Original source bytes and the initial source-capture record are unchanged. The BFF application grant and imported implementation terms remain separate. No image parity, executed probe, build or functional/customer acceptance is inferred.

## Shared Next.js application

The [qualified shared web capture](../apps/web/README.md) retains 2,045 selected original inputs in baseline and prepared source views. Its [direct-package index](../apps/web/third-party/index.json) preserves the observed package metadata and original root notice texts located for 45 of 47 direct packages. The server-only and drizzle-kit notice questions, application rights, transitive/bundled/runtime notices and source-availability obligations remain open. The [recovery record](../apps/web/docs/recovery.md) identifies missing operational helpers, the unqualified project lockfile and remaining media/runtime inputs. No application test, build, database program or deployment was executed by this import.

Four previously held operational helpers now have [protected source views](../source-archives/shared-web/four-protected-operational-helpers-20261109/README.md), with exact private GitHub recovery references and a checked in-memory restorer. The public views retain 64,186 original bytes while protecting selected contact and directly linked case literals. Their raw origin question remains open; these are source templates, not approved runnable inputs. Only the newly authored restoration helper has its own AGPL-3.0-only grant; no new license is inferred for the four original/template programs.

The separate [Spot and Personal / Chuck working-source snapshot](../source-archives/spot-and-personal-web-working-source15-20261109/README.md) now preserves all seventeen selected originals (3,729,870 bytes), including two distinct complete Prototype.tsx files alongside the fifteen smaller source/evidence files. Their original working paths and restoration hashes remain separate from the canonical application compositions. This adds no license grant, complete imported module/asset graph or current runtime acceptance.

## Qlo/Work family operating and runtime sources

The [operating-source archive](../operations/qlo-work-family/README.md) preserves fourteen exact original program/patch files across their recorded revisions, with an existing byte-identical storage guard linked separately. The [Work runtime component](../services/work-qlo-runtime/README.md) retains the original bootstrap and four local CommonJS modules.

Recorded source pins, AST parsing and the source/dependency secret scan do not establish execution success, application ownership/license clearance, a complete original underlying Next application/dependency/asset source set, runtime/image notices or applicable corresponding-source closure. Protected review/environment/custody records remain outside Git. No original program or product runtime was executed by this import.

## Club/Member browser module and origin35

The [browser module](../modules/club-member/README.md) preserves both exact 133-file input views, including nine protected test-account templates, and the source/build relationship for all 129 application source files. Its separate dependency observation has 29 package roots and 28 versions, including nested duplicate picomatch. Twenty-eight original license/attribution files are preserved; the native Rolldown binding notice question remains open. Dependency package/lock metadata does not become an invented module project manifest.

The existing TypeScript 5.9.3 ThirdPartyNoticeText.txt was already present and indexed in the shared web catalog. The new intake explicitly covers third-party/author filenames and retains the exact matching text for this component. No duplicate correction to the existing catalog was needed.

Original capture/build/stage/adoption source is preserved under [operations/member-origin35](../operations/member-origin35/README.md). Protected inputs, actual Common-shell/backend/image adoption, complete underlying media/runtime/dependency source and notices, application rights and applicable source offers remain separate. No preserved original program or product build was executed by this import.
