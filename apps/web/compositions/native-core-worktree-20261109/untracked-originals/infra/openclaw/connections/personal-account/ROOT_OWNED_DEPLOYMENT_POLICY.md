# Personal-account deployment policy

`crays-platform/src/lib/personal-account-deployment.ts` now reads a non-secret host policy through `root-owned-deployment-policy.mjs`. This replaces the unconditional `null` source stub. It does not configure any existing service or grant provider access.

The owning server may set `CRAYS_PERSONAL_ACCOUNT_DEPLOYMENT_POLICY_PATH` to an actual admitted absolute policy file. No path, origin, service, registration, app, key or permission is selected by default. The file and every directory component must be root-owned, not group/world writable, with no symlinks. The file must be a single-link regular file of at most 64 KiB.

The JSON envelope has exactly `schema: "crays.personal-account-deployment.v1"` and `deployment`. The deployment uses the existing `PersonalAccountDeployment` type: `appOrigin`, OS `custody`, configured `apps` and optional `slack`. Additional fields such as copied `clientSecret` are rejected. App secret and encryption-key values stay in the existing exact systemd credential mount; this file contains only their fixed reference-to-basename mapping. There is no environment fallback for secret material.

A valid unchanged policy returns the same deeply frozen object. Atomic replacement, modification, removal, unsafe permissions or invalid input invalidate the captured object on the next existing host currentness check. Invalid input never returns the last good cached policy. Ordinary sibling creation does not alter authority over this path.

Qualified scope: 16 bounded actual root-file tests, including the actual TypeScript getter with the original `server-only` marker. The first loader attempt failed because the fixture resolved that marker from a nonstandard dependency-directory name; resolving its actual package self-reference fixed the fixture. A full Next/Auth0/Core/OS-credential/provider route qualification remains separate. No live policy, credentials, service restart, database migration, customer connection or provider selection is established by these tests.

Before productive use, the owning App/server task must review and adopt the exact files, prove actual provider registration and callback origin, admitted Core schema/grants and custody delivery, install its real policy, and qualify its current request/assignment/provider-selection chain. Never select the first listed customer connection automatically. The selector/source programme and all existing release gates remain authoritative.

Fixture: `.task-work/personal-account-root-policy-v1/inspect.mjs`. A dedicated temporary root-owned directory under `/run` is removed in `finally`; no system unit or provider endpoint is used. This small file-boundary test does not replace the separately serialized SDK/Core qualifications.
