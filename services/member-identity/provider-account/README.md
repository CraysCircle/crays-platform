# Original Member provider-account route

The Member account entry uses the provider-account endpoint. This source revision connects its Club/Member identity lookup to the same restricted Member RDS RPC used by the original session endpoint, using the SDK-validated issuer, subject and server-selected client.

The original route, candidate, exact patch and original regression-test source are retained alongside their manifests. They form a source-only revision, not an installed service or a production release.

## Preserved behavior

The candidate keeps the existing response/session mapping, other-application lookup, registered Google repair boundary and original POST role/CSRF/provisioning guards. It grants no new role, creates no account merely from a contact address and does not infer identity from browser-supplied account data.

## Read and verify the source

- provider-account.route.original.ts: exact original route from the recorded Member release.
- provider-account.route.candidate.ts: complete proposed route with the restricted RDS connection.
- provider-account.patch: original two-version patch.
- provider-account.regression.candidate.cjs: original isolated regression harness with synthetic fixtures.
- SOURCE_MANIFEST.json: original source paths/hashes and capture-time boundaries.
- UNIT_REGRESSION_ACTUAL.json: the AWS owner's existing isolated test result, not a new test run by the archive maintainer.

The recorded owner test reproduces the original missing legacy-Core configuration and checks eight candidate cases: mapped member, signed-out state, wrong identity provenance, RPC failure, unmapped identity, registered Google repair, another application and SDK failure. It records a byte-identical POST body. This test calls no actual auth or database service and is not browser acceptance.

The route depends on the exact original Member SDK/session, RDS pool/RPC, identity parsing and mapping modules. Those dependencies must be reconciled against their own source records before a complete build or runtime claim. No installer, route, original test, browser, SQL or provider program was executed by this source-publication step. Original application/dependency license and full recovery obligations remain separate; no blanket license is added.
