# Network and decentralized communication

CRAYS has both a Net web application and a decentralized communication layer. These are different developer entry points: the website's hosting wrapper is not the implementation of the relay and blob services used by Personal/native communication.

## Follow the implementation

- [Net hosting composition](https://github.com/CraysWorld/crays-platform/blob/8704e6685a333ad14d75ddc931599863506a1b7d/hosting/net/README.md) links the retained application and its exact hosting relationship.
- [Original Net hosting wrapper](https://github.com/CraysWorld/crays-platform/blob/8704e6685a333ad14d75ddc931599863506a1b7d/hosting/net/server.mjs) is the CRAYS platform-side source.
- [Retained Net application source](https://github.com/CraysWorld/crays-web-codex/tree/2b81461e8e8b5ee6fbdb59e36215c4b574d235bf) remains in its existing repository.
- [Personal Nostr interaction receipts](https://github.com/CraysWorld/crays-platform/blob/main/apps/personal/source/src/NostrInteractionReceipts.tsx) is a captured application-side entry point.
- [Personal source guide](https://github.com/CraysWorld/crays-platform/blob/main/apps/personal/README.md) explains the scope of that frontend capture.

Existing original-source records substantiate Go relay and private Blossom services, with CRAYS group/fleet, policy/store, profile and private-history sources/tests. Nostr event transport, relay behavior, blob storage and application policies should be documented individually.

## Work on this area

For Net website work, start with the application repository and hosting-composition guide. For communication work, start with the relevant frontend interaction and its actual protocol/provider boundary. Useful contributions include protocol contract documentation, synthetic group/access tests and exact source-to-executable records.

Keep public application configuration distinct from private keys, owner state and encrypted user content. A development relay/blob setup needs its own reviewed identities and storage; preserved production executable hashes do not supply that setup.

## Integration status

The Net application tree and wrapper have concrete GitHub source records. Relay/Blossom source and executable preservation is separately documented, and the current private-Blossom source differs from the earlier build334 source. Complete latest relay/broker publication, dependency notices and source-to-running-binary equality are therefore separate claims; neither the Net website nor the Personal frontend proves them on its own.

[Back to services](README.md)
