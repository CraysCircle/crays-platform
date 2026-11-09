# Delivery and social publishing

The publishing area includes CRAYS creator interfaces and a separate Postiz delivery service family. Developer documentation needs to explain both the application-facing interaction and the backend/workflow services involved in an actual publication.

## Follow the implementation

- [Personal creator studio](https://github.com/CraysWorld/crays-platform/blob/main/apps/personal/source/src/WebCreatorStudio.tsx) is a concrete captured frontend entry point.
- [Publishing application source](https://github.com/CraysWorld/crays-platform/blob/main/apps/personal/source/src/publishing.ts) belongs to that frontend capture.
- [Postiz operating-source guide](https://github.com/CraysWorld/crays-platform/blob/16e0a635282d5f5358c3e040257c9598a965655a/operations/delivery/postiz/README.md) links the original frontend qualifier and separate physical-readback helper.
- [Personal source guide](https://github.com/CraysWorld/crays-platform/blob/main/apps/personal/README.md) describes the frontend's original source and recovery boundaries.

The preserved Postiz family includes frontend/proxy/API, Temporal workflows, PostgreSQL, Elasticsearch and Redis. A Postiz API health response is not evidence that publishing workers, browser API targeting and all external delivery integrations are ready. A creator-interface file and a Postiz service record also do not by themselves prove a direct accepted integration between those two particular paths.

## Work on this area

Start with the frontend interaction or the Postiz operating-source guide, according to the layer being changed. Useful work includes documenting the actual handoff contract, worker ownership and retry semantics, and tests that distinguish draft/review states from a real publication.

Use synthetic drafts and dedicated development provider bindings. Review package scripts and the selected service graph before running any workflow; the preserved migration helpers retain their original environment assumptions and are not generic publishing commands.

## Integration status

The original delivery index identifies exact application/image digests and operating-source revisions; this page does not guess a current semantic Postiz version. Published CRAYS helpers are available, while complete current Postiz/frontend/upstream source mapping, notices and end-to-end publishing acceptance remain separate. External account credentials and private uploads remain outside public source.

[Back to services](README.md)
