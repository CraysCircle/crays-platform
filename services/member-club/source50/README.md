# Member GraphQL origin selection, source 50

This original TypeScript transport candidate adds the exact browser origin https://member.crays.world to the existing Member route-alias selection. It selects /api/club-member/graphql for that origin while preserving the existing localhost8990 behavior. Server-side rendering and all other origins continue to use /api/graphql, according to the independent source review.

The candidate derives from the exact original Frontend35 workspace source with SHA-256 6970649a571bcef6c8d3eb0e460a9e6bcc000a781305ae237239753c3e0a5acf, rather than the separate Member46 server copy. The review reports only the origin-predicate addition: APQ/body registry, variables, credentials, idempotency, validation/error behavior and account/tenant/provider guards remain unchanged. Work source and routes are unchanged.

[Source capture](source-capture.json) pins this unchanged 7,459-byte original and the independent review. The 19 existing regression checks are owner evidence reused without rerunning them. Publication does not build or deploy the frontend or prove authenticated GraphQL/customer behavior. A separate finite build/lifecycle packet and actual release acceptance are outside this source snapshot.

The original Zod type import and applicable source/dependency terms remain intact; this file does not bundle the dependency implementation or add a new blanket license. No private runtime inputs or customer payloads are supplied.

Continue with the [Club/Member source guide](../../../modules/club-member/README.md), [Member identity guide](../../../docs/services/identity.md), or [repository entry point](../../../README.md).
