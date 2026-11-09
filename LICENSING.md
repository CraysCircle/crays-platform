# Component licenses

CRAYS Platform contains separate applications, integration code and retained upstream sources. Use the license and scope record for the component you want to reuse or improve.

## Confirmed CRAYS integration code

CRAYS AG grants **AGPL-3.0-only** for the following original CRAYS-owned source revisions, effective 9 November 2026:

| Component | Covered original files | Terms and exact source scope |
| --- | --- | --- |
| Qlo gateway | 9 integration, build and test files | [License terms](services/qlo-gateway/LICENSING.md), [GNU license](services/qlo-gateway/LICENSE), [file hashes](services/qlo-gateway/license-scope.json) |
| Clubs Commerce BFF | 6 integration, build and test files | [License terms](services/clubs-commerce-bff/LICENSING.md), [GNU license](services/clubs-commerce-bff/LICENSE), [file hashes](services/clubs-commerce-bff/license-scope.json) |
| Shared account entry | Four exact shared-account integration files, also retained in the Org source archive | [Dated grant and exclusions](https://github.com/CraysCircle/crays-org/blob/org-web-own-code-agpl3-account4-20261109/source-archives/org-web/org05-20261107/LICENSING.md), [exact source hashes and original Platform paths](https://github.com/CraysCircle/crays-org/blob/org-web-own-code-agpl3-account4-20261109/source-archives/org-web/org05-20261107/license-scope.json) |
| Member42 runtime wrappers | Two exact CRAYS-owned runtime derivatives; 10,314 source bytes | [AGPL-3.0-only grant, scope and exclusions](operations/member-provider-account42/actual-runtime/LICENSING.md), [exact original source hashes](operations/member-provider-account42/actual-runtime/license-scope.json) |

The hashes identify the original covered source. Recipients may modify and redistribute that code under AGPL version 3; the scope records do not require downstream copies to keep the original hashes. These grants do not offer a later-version option.

## Upstream components and other material

Qlo, Vendure, Frappe, Nextcloud, Plane, Nostr libraries, Node.js and other external implementations retain their original licenses and authorship. Their original notices and exact source/version records remain applicable. A CRAYS integration calling a provider does not relicense that provider.

Follow the relevant component's terms before reusing other code. The grants above cover the listed CRAYS-owned file revisions; lockfiles, capture/evidence records, consolidated documentation, configuration examples, images, videos, fonts, other source areas and unconfirmed future independent revisions require their own applicable terms. This map applies no repository-wide license.

## Contributing and distributing

Use [CONTRIBUTING.md](CONTRIBUTING.md) to choose a component and propose a focused change. Preserve original author, copyright and license notices with code and check the terms for all material you add.

The [source and provenance record](docs/license-and-provenance.md) tracks dependencies, runtime images, source availability and remaining rights/recovery work. A source-code license grant does not by itself demonstrate complete build inputs, runtime notices or fulfillment of every deployment-specific obligation.

The four shared-account source revisions match the original Platform paths recorded in the linked scope manifest, including their exact file hashes. The current Platform copies were compared byte for byte before this map update. Other Member/account variants and referenced font binaries retain their separate terms; this row grants no license for the complete shared web application.

## Frappe Team Scope original package metadata

The preserved [crays_team_scope 0.1.0 source](services/frappe/custom-apps/crays_team_scope/README.md) declares publisher CRAYS and app_license = "MIT" in its unchanged original hook. No standalone LICENSE, NOTICE or copyright-grant file occurs in the exact nine-member source archive. This publication preserves that evidence and adds no replacement grant; it does not apply the AGPL grants for other CRAYS files to this package. The original notice text and the complete external Frappe/dependency obligations remain to be reconciled.

## Member/Main and Common Source46 candidate

The [Source46 provenance and licensing notes](services/member-identity/provider-account/source46/README.md#licensing-and-provenance) identify the fourteen selected application, Common, test and patch revisions, including two exact-recovery templates protecting internal account bindings. The original Source42 sources remain retained. The separately scoped Source42 operating-wrapper grant does not license this complete application or Common host; no blanket grant or new right over imported dependencies is added by this archive. Applicable original component notices and file-specific grants remain authoritative, and complete dependency/runtime and rights reconciliation remains open.

## Source46 operating source provenance

The [Source46 operating-source notes](operations/member-original-context46/README.md#licensing-and-notices) preserve fifteen original build/install/proposal/guard files and the exact Source42 reuse relationships. Original inline notices are retained; public provider endpoints, dependency names and protected-input path references are source context rather than copies of those private inputs. No blanket grant over the operating programs, applications, imports or frameworks is added. The separate Source42 grants remain file-specific, and full dependency/runtime and rights reconciliation remains open.
