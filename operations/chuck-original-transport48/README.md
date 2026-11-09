# Chuck forwarded-header boundary, revision 48

This folder preserves the exact reviewed listener source for a narrow Chuck transport correction. It is a source archive; publication does not install or restart the listener.

After the existing fixed private-edge peer and host checks, the listener removes four standard forwarded headers only for the two exact Chuck request paths on `member.crays.world`: `/api/crays/personal/chuck` and `/api/crays/personal/chuck/original`. Requests with other paths, including query variants, retain the previous behavior. The Team HTTP/WebSocket routing and the existing Origin, Cookie, account, authorization and other request-boundary checks remain part of the preserved implementation.

[Source provenance](source-provenance.json) pins this 5,366-byte original, its one-hunk change from the previous listener, and the independent source review. That review reports 13 prior regression checks; preservation did not rerun them. Human Chuck authentication, tools and data acceptance, deployment admission and actual runtime adoption remain separate evidence.

The original program body is unchanged. Existing source and dependency license terms continue to apply; this archive adds no blanket grant or replacement license. Private launch inputs, configuration contents, environment values, request payloads and runtime state are outside this packet.

Return to the [repository entry point](../../README.md).
