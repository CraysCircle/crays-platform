# Licensing of CRAYS integration code

Copyright (c) CRAYS AG.

CRAYS AG licenses its own integration code in the exact file revisions listed below under the GNU Affero General Public License, version 3 only (SPDX: **AGPL-3.0-only**). No option to use a later version is granted by this notice. This grant is dated 9 November 2026.

The complete, unchanged GNU license text is in [LICENSE](LICENSE). Its appendix contains examples for applying the license; those examples do not replace this version-3-only grant. The machine-readable scope is in [license-scope.json](license-scope.json).

## Covered source revisions

These are the original CRAYS integration, build and test files at platform commit [c6122b268ccd499e20eb3ec186e05fdcb5a65ea6](https://github.com/CraysCircle/crays-platform/tree/c6122b268ccd499e20eb3ec186e05fdcb5a65ea6/services/clubs-commerce-bff). The SHA-256 values identify the precise source bytes covered by this grant. These source files and their package metadata have been preserved unchanged.

| File relative to this directory | SHA-256 |
| --- | --- |
| .dockerignore | ff36cd8317268e8b7f0fa88fc14c7561fb3bc2912c9750965646e42ec40c6a21 |
| Dockerfile | 01062ffdf49886d0b65bb9c1334702ebc779d28647d21b7de9086eafae29b9da |
| lib.mjs | aa171859f5569f4ae52412f4b1ce872d62e55e16c0b4a9ebee6359af343960be |
| package.json | 78c6b9b0c5a7ed424fba9cb5c81f8b278ea8d8553b58c52b1f41b80de73a2172 |
| server.mjs | 6d14df24cbb8471bf36270546461ef8c398bdd8ee9e62d880368661d813e04a9 |
| test.mjs | 807c9ee2525d8a9ecb4ebe14f3a84988707062a87a5c131feb3eefec196730ea |

## Boundaries and third-party material

This notice applies only to the listed CRAYS-owned file revisions. The hashes identify the CRAYS-authored revisions covered by this initial grant; they do not restrict recipients' rights to modify or redistribute covered code under AGPL version 3. Independent files outside this list are not licensed by this notice. This is not a blanket license for the entire directory or repository. Source-capture records establish the preserved file versions, while the rights-holder confirmation establishes the grant for these CRAYS-owned portions.

This BFF is CRAYS integration code coordinating commerce and booking providers. It does not relicense Vendure, BookingCore, ERPNext, Qlo, Node.js, PostgreSQL client packages or other external components. Existing dependency texts remain in [third-party/](third-party/).

Dependency lockfiles, original capture manifests and source indexes, historical test output, consolidated README text and configuration examples are outside this initial file-specific grant. All existing third-party licenses, copyright notices and provenance records remain unchanged. An import or API call does not transfer ownership of the external implementation to CRAYS AG.

This grant resolves the license designation for these listed CRAYS-owned portions. Corresponding-source availability, third-party dependency and image notices, and any deployment-specific obligations remain subject to their separate source and license records. Source publication is not evidence of a production deployment or acceptance.
