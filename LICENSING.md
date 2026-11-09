# Component licenses

CRAYS Platform contains separate applications, integration code and retained upstream sources. Use the license and scope record for the component you want to reuse or improve.

## Confirmed CRAYS integration code

CRAYS AG grants **AGPL-3.0-only** for the following original CRAYS-owned source revisions, effective 9 November 2026:

| Component | Covered original files | Terms and exact source scope |
| --- | --- | --- |
| Qlo gateway | 9 integration, build and test files | [License terms](services/qlo-gateway/LICENSING.md), [GNU license](services/qlo-gateway/LICENSE), [file hashes](services/qlo-gateway/license-scope.json) |
| Clubs Commerce BFF | 6 integration, build and test files | [License terms](services/clubs-commerce-bff/LICENSING.md), [GNU license](services/clubs-commerce-bff/LICENSE), [file hashes](services/clubs-commerce-bff/license-scope.json) |

The hashes identify the original covered source. Recipients may modify and redistribute that code under AGPL version 3; the scope records do not require downstream copies to keep the original hashes. These grants do not offer a later-version option.

## Upstream components and other material

Qlo, Vendure, Frappe, Nextcloud, Plane, Nostr libraries, Node.js and other external implementations retain their original licenses and authorship. Their original notices and exact source/version records remain applicable. A CRAYS integration calling a provider does not relicense that provider.

Follow the relevant component's terms before reusing other code. The grants above cover the listed CRAYS-owned file revisions; lockfiles, capture/evidence records, consolidated documentation, configuration examples, images, videos, fonts, other source areas and unconfirmed future independent revisions require their own applicable terms. This map applies no repository-wide license.

## Contributing and distributing

Use [CONTRIBUTING.md](CONTRIBUTING.md) to choose a component and propose a focused change. Preserve original author, copyright and license notices with code and check the terms for all material you add.

The [source and provenance record](docs/license-and-provenance.md) tracks dependencies, runtime images, source availability and remaining rights/recovery work. A source-code license grant does not by itself demonstrate complete build inputs, runtime notices or fulfillment of every deployment-specific obligation.
