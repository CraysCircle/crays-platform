# Postiz delivery operations source

These files preserve the Delivery workstream's reviewed original-frontend qualifier revision04, its explicitly public binding.json, and the separately reviewed read-only physical-return program revision02.

They are operations helpers. They do not replace Postiz product source, an upstream source offer or version-specific product/runtime license notices. The original product image is retained by the migration process; no dependency or product upgrade is performed by this source capture.

## Preserved files

| Location | Role |
| --- | --- |
| frontend-isolated01/qualify_original_frontend.candidate.py | Reviewed bounded qualifier for the original frontend |
| frontend-isolated01/binding.json | Original explicitly public source/runtime binding supplied with revision04 |
| physical-readback01/read_physical_return.rev02.py | Separately reviewed read-only return evidence program; the source packet requires the frontend native command to be terminal first |

The [operations source index](../../source-index.json) supplies exact hashes and immutable source-packet versions. The helpers retain their original absolute paths, protected-input assumptions and resource rules. The repository layout is source custody, not a standalone execution wrapper.

No helper was executed or imported during this capture. A source review or publication is not proof of an actual frontend start, successful physical return or customer acceptance. Runtime execution and any shared resource window remain with the AWS migration owner.

## Privacy and original metadata

Only the three specifically handed-off public source files are included. Original effective launch/environment/custody archives and private diagnostic logs are not included, nor are credentials, keys, customer data or database dumps. Raw packet metadata containing private custody references is not copied into this directory.

The handoff records installed original @sentry/nextjs 10.45.0, rather than merely its declared range, and dotenv-cli 8.0.0 with bin ./cli.js. These are version observations with original package hashes, not complete license evidence. Their actual product source, original notices, deployed-image relationship and any applicable source offer still need reconciliation.

No license for these CRAYS operations helpers is invented from repository visibility or from Postiz's component licenses.
