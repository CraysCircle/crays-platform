# Original messaging and Nostr transport, source 50

This original listener candidate narrows forwarded-header handling for admitted original messaging and Nostr transport requests. It removes only four standard x-forwarded transport headers after the existing exact method/path/query and finite Origin requirements. The outer peer/host admission, authorization, cookie and account-context boundaries remain in the original implementation.

The Nostr relay Upgrade still requires the exact 64-hex relay form and its existing WebSocket version, key and head bounds. Unknown forwarded headers and the original admission guards remain preserved; Team/Chuck routes and request/upgrade lifecycle are unchanged according to the independent source review. This is transport-source preservation, not new signer/relay permission or messaging capability acceptance.

[Source capture](source-capture.json) pins the 8,688-byte original and its change from the already preserved Chuck48 listener. The 167 existing pure checks are owner evidence reused without rerunning them. No human/provider call, browser, deployment, database action or runtime acceptance was performed by this publication.

Node built-ins and the existing local application module are dependency boundaries, not bundled complete application source. Original source/component notices remain authoritative; this packet adds no license grant or license change. Private launch inputs, request/customer payloads and runtime state are excluded. Separate build and lifecycle controls are outside this snapshot.

Continue with the [Chuck48 predecessor guide](../chuck-original-transport48/README.md), [network and native guide](../../docs/services/network.md), or [repository entry point](../../README.md).
