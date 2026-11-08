# Clubs Commerce BFF

This backend-for-frontend implements the original CRAYS Club commerce boundary: browser request validation, trusted B2C assertions, hold/cart and order-command coordination, safe public responses and server-side Vendure session handling. Its source records keep Vendure responsible for commerce order/payment state, Booking Core for holds/bookings/capacity, and ERPNext for accounting consequences.

The original CCLUB-068 manifest labels inventory evidence as test-only and live money as disallowed. The Qlo channel-manager cutover remains a separate final gate. Source publication does not establish a live booking/payment flow or approve runtime use.

## Source layout

| File | Responsibility |
| --- | --- |
| server.mjs | HTTP service, protected configuration loading, database pool and provider integration |
| lib.mjs | Request contracts, trusted assertions, hold/cart/order coordination and safe responses |
| package.json and package-lock.json | Original package identity and exact dependency resolution |
| Dockerfile and .dockerignore | Original container build inputs and build-context exclusions |
| test.mjs | Original test source |
| CCLUB-068_SOURCE_MANIFEST.json | Original component source pins and authority boundaries |
| CCLUB-067_BFF_TESTS_2026_09_01.txt | Historical seven-test output for the earlier 1.2.0-cclub067 package |
| third-party/ | Original notices from the fourteen exact locked dependency packages |

All nine original files are preserved unchanged. [The source index](source-index.json) records their exact bytes and source-packet identity. The source was originally outside the older retained Git commit; that old commit alone did not preserve these files.

## Development and configuration

The original package requires Node >=22 and defines start and test commands. For an authorized development environment, dependency installation is described by `npm ci --ignore-scripts`; the original test command is `npm test`. These commands were not run during this source capture.

[.env.example](.env.example) documents variable names and deliberately absent protected files. The service reads process.env and requires secrets through external files. It also requires an explicit JSON list of allowed HTTPS origins. The original code enforces the two specific internal Vendure URLs shown in the example; preserving them is part of the source contract, not evidence that those providers are running.

Keep actual database URLs, provider/channel credentials, HMAC secrets and encryption keys outside Git. The runtime owner must supply the original protected bindings and separately qualify the complete provider/database dependencies.

The original Dockerfile pins a base image by digest and runs npm ci with scripts disabled. It copies only server.mjs and lib.mjs as application runtime source, runs as the node user and exposes port 8080. The package's Node range is not evidence of the exact Node version inside that image.

## Validation and versions

This capture verifies original file hashes, the original CCLUB-068 manifest pins and each locked dependency tarball's SHA-512 integrity. The original test source contains synthetic idempotency keys; these are request identifiers, not credentials.

The historical seven-test output belongs to version 1.2.0-cclub067. The preserved package is version 1.3.0-cclub068, so that output is not a new test pass for this snapshot. No source test, build, container, provider request or database mutation was executed by the import.

Exact AWS artifact/deployment parity and recovery of protected runtime dependencies remain open. Do not treat the Dockerfile, its historical labels or this commit as proof that this BFF is deployed on AWS.

## Licenses and recovery

The [dependency source/license index](third-party/source-and-license-index.json) binds fourteen exact locked packages to their tarball integrity and original notices. Twelve packages provide standalone notice files; pg-types 2.2.0 and pgpass 1.0.5 contain their full license text in their original README, which is preserved in full.

No application LICENSE was found among the scoped original component files; no application license has been assigned by inference. The Node/base-image and other runtime-component notices remain a separate open review.

To recover the technical component, restore this source commit and lockfile, use the recorded compatible build inputs, and have the responsible runtime owner restore the separately protected configuration and database/provider state. A source checkout alone does not reconstruct live business data.
