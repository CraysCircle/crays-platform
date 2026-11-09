# Licensing of CRAYS integration code

Copyright (c) CRAYS AG.

CRAYS AG licenses its own integration code in the exact file revisions listed below under the GNU Affero General Public License, version 3 only (SPDX: **AGPL-3.0-only**). No option to use a later version is granted by this notice. This grant is dated 9 November 2026.

The complete, unchanged GNU license text is in [LICENSE](LICENSE). Its appendix contains examples for applying the license; those examples do not replace this version-3-only grant. The machine-readable scope is in [license-scope.json](license-scope.json).

## Covered source revisions

These are the original CRAYS integration, build and test files at platform commit [c6122b268ccd499e20eb3ec186e05fdcb5a65ea6](https://github.com/CraysCircle/crays-platform/tree/c6122b268ccd499e20eb3ec186e05fdcb5a65ea6/services/qlo-gateway). The SHA-256 values identify the precise source bytes covered by this grant. These source files and their package metadata have been preserved unchanged.

| File relative to this directory | SHA-256 |
| --- | --- |
| Dockerfile | 3f4453f6c801cee5db1b63b5ae21584d84b370f216219b53b429c1c4fb1cf8cf |
| package.json | ff14f766142763e4799a197cd4b1e2b471e9bdd04708120809ed57e75dbff46b |
| provider-property-services.mjs | 8430d78393d58326e8b602f770dfa3a6a7161bb202ab82959522de7b5da9ba75 |
| provider-room-inventory.mjs | 24cb98700f736780e583599dbd8e2bd82c969e0838119a5215221601a9291167 |
| server.mjs | 642e68a03e6d3331ad4e29c036d41f0797c11a165725fbb2b82d304c2e7adb57 |
| test-gateway.mjs | 729e80e7a4afedb476d8f6c450ab52f00453e7425ec6b6ce09bf3fcb5e7e87ad |
| test-provider-property-services.mjs | 50f5b3210226f06978b2ee1f62fa4e74c64996f4415e11f91f2284dcc114ca43 |
| test-provider-room-inventory.mjs | 37faae73f6d26bf624e09e41beaec8531f2b08a75d0fa97f6c6d7212fd45969e |
| test-server-room-inventory.mjs | 0290b713bff20b46e75ce724ea46b97af2d7bf59b27171d7cc624a306d478b10 |

## Boundaries and third-party material

This notice applies only to the listed CRAYS-owned file revisions. The hashes identify the CRAYS-authored revisions covered by this initial grant; they do not restrict recipients' rights to modify or redistribute covered code under AGPL version 3. Independent files outside this list are not licensed by this notice. This is not a blanket license for the entire directory or repository. Source-capture records establish the preserved file versions, while the rights-holder confirmation establishes the grant for these CRAYS-owned portions.

This gateway is CRAYS integration code around Qlo; it does not relicense the upstream Qlo application or its dependencies. Its Node.js container base and runtime retain their own licenses.

Dependency lockfiles, original capture manifests and source indexes, historical test output, consolidated README text and configuration examples are outside this initial file-specific grant. All existing third-party licenses, copyright notices and provenance records remain unchanged. An import or API call does not transfer ownership of the external implementation to CRAYS AG.

This grant resolves the license designation for these listed CRAYS-owned portions. Corresponding-source availability, third-party dependency and image notices, and any deployment-specific obligations remain subject to their separate source and license records. Source publication is not evidence of a production deployment or acceptance.
