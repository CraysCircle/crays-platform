# Native Member identity reader

This small browser-side adapter reads the original Member session endpoint and returns the account identity only when the existing response reports a mapped Auth0 session. It is intended for a caller that already owns the genuine Member browser page and context.

The original implementation is retained as [read_genuine_original_member_identity.candidate.cjs](read_genuine_original_member_identity.candidate.cjs). Its version40 source record is [source-capture.json](source-capture.json); the semantic directory stays stable across later source revisions.

## Contract and behavior

The exported `readNativeIdentity({ page, context })` requires the supplied page to belong to the supplied context and to have the origin `https://member.crays.world`. It performs a GET to the original relative `/api/crays/clubs/member/session` endpoint from that page, using only that browser's same-origin credentials.

The implementation:

- Rejects redirects, disables the request cache and aborts after eight seconds.
- Accepts JSON responses up to 262,144 bytes.
- Requires the original response to report `status: ready`, authenticated and mapped account flags, Auth0 session mode and an Auth0 account provider.
- Bounds the returned account ID and email lengths.
- Rechecks the browser context, origin and unchanged page URL after the read.

A 401 response returns unmapped/unauthenticated flags. Other rejected or unavailable response conditions return `null`. A valid mapped result includes the original account ID, email and verified-email flag; no replacement account or identity is fabricated.

## Caller responsibilities

This module neither launches a browser nor creates a session, account, credential or grant. It uses the existing authenticated browser. The caller must supply an authorized page/context and keep returned identity data within the appropriate account and privacy boundary.

The source contains no fixed person/account identity, credential or session value. Runtime account IDs and emails are sensitive result data: do not commit or log them in source examples.

For the surrounding application, see the [shared web application](../../../apps/web/README.md) and [identity service guide](../../../docs/services/identity.md). This is a reader adapter, not a complete login implementation or a standalone deployment command.

## Source and verification

The captured source is exactly 2,200 bytes with SHA-256 `1051c3caa8f5ceeecf22c10ac5f50ff899f0625de265b817a4167b892bb834bf`. Its original filename and bytes are unchanged.

The responsible source owner already recorded a successful Node syntax check for this exact hash. This source publication reuses that result; it does not rerun the module, browser, endpoint or login flow. Static review confirms the request and response gates above. Current runtime installation, live account acceptance and full dependency/version relationships require their own records.

Original component licenses and notices remain applicable. This capture introduces no blanket license grant; see the [platform provenance guide](../../../docs/license-and-provenance.md).
