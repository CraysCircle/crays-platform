# Original Member provider-account route

The Member account entry uses the provider-account endpoint. This source revision connects its Club/Member identity lookup to the same restricted Member RDS RPC used by the original session endpoint, using the SDK-validated issuer, subject and server-selected client.

The original route, candidate, exact patch and original regression-test source are retained alongside their manifests. These files preserve the original source-only review revision. The AWS migration owner subsequently reported this route adopted in Member42; that later adoption is recorded below.

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

## Member42 adoption and operations source

The AWS migration owner reports this route from commit
`c6122b268ccd499e20eb3ec186e05fdcb5a65ea6` adopted in Member42.
The reported build is `9P8oRXhXtamVob92nSls-`; the compiled guest-route
SHA-256 is `307ea400b57a4166ba8791d041db609e4f8de38e5cd1b0b33b8d14d9e18e1671`.
The owner acceptance receipt has SHA-256
`813a9a412fcf552afbd0f1152b1e7b8a354af65bb9a216a6fdb0126fb61bd5c5`.

Read the [actual runtime wrappers](../../../operations/member-provider-account42/actual-runtime/README.md)
and [installation, ingress and historical source versions](../../../operations/member-provider-account42/source-cases/README.md)
for the preserved operational programs and their exact file hashes.
These records distinguish the two actual runtime derivatives from installation
candidates, earlier versions and the separately reviewed probe. The archive
maintainer has checked the source bodies; the adoption statement comes from
the AWS migration owner. This publication does not execute those programs or
independently certify the live environment, all dependencies or complete license compliance.
