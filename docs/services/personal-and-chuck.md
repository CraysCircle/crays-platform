# Personal and Chuck

Personal is CRAYS's application workspace for personal tools and interactions. Chuck is the personal-intelligence integration spanning the application, agent, broker, tools and workflows. Reading these as separate layers makes it easier to contribute to one area without assuming that a frontend screen contains the entire agent system.

The original owner-consumer is the separate server-side bridge between Core and the existing SDK gateway. Its code checks the existing owner and conversation scope, reads pending text-message receipts from the Core outbox, creates durable attempts, and reconciles correlated gateway/history results into Core observations and canonical responses. The web bundle does not start this process. The consumer loads its gateway client from an external OpenClaw SDK; the [separately captured OpenClaw components](../../third-party/personal-agent-materializer/README.md) explain that upstream layer.

## Follow the implementation

- [Personal source guide](https://github.com/CraysWorld/crays-platform/blob/main/apps/personal/README.md) describes the original frontend and its thirteen-overlay source view.
- [Application connections](https://github.com/CraysWorld/crays-platform/blob/main/apps/personal/source/src/appConnections.ts) provides a concrete frontend integration entry point.
- [Chuck public starters](https://github.com/CraysWorld/crays-platform/blob/main/apps/personal/source/src/chuckPublicStarters.mjs) and [task review links](https://github.com/CraysWorld/crays-platform/blob/main/apps/personal/source/src/chuckTaskReviewLinks.mjs) are captured application-side sources.
- [Personal build sources](https://github.com/CraysWorld/crays-platform/blob/main/operations/personal-build/README.md) preserve the original build/configuration controllers separately from the application.
- [Original owner-consumer snapshot](https://github.com/CraysWorld/crays-gym/blob/95154886c03f2504bb48e297c0a25b0bca1117a0/protected-source-archives/chuck-original-owner-consumer54/README.md) and [source/version map](https://github.com/CraysWorld/crays-gym/blob/95154886c03f2504bb48e297c0a25b0bca1117a0/protected-source-archives/chuck-original-owner-consumer54/source-capture.json) require **private repository access**. They preserve six unchanged originals (415,148 bytes): the consumer bundle, build record, manifest, systemd unit, release gates and third-party notices.
- For the editable inputs behind that bundle, the [preferred-source snapshot](https://github.com/CraysWorld/crays-gym/blob/6d06d21265d49d3cd2526963689b13295995e3ed/protected-source-archives/chuck-build64-preferred-fifteen/README.md) and [source/restoration map](https://github.com/CraysWorld/crays-gym/blob/6d06d21265d49d3cd2526963689b13295995e3ed/protected-source-archives/chuck-build64-preferred-fifteen/source-capture.json) also require **private repository access**. They preserve fifteen original JavaScript/TypeScript files (114,701 bytes), including the unchanged source loader. Together with seven already-public inputs (70,376 bytes), the map identifies 22 application-code inputs (185,077 bytes); it does not replace the compiled snapshot or include every BUILD input.

The preserved frontend dependency record identifies React **19.2.7**. It is distinct from the shared Club/Member capture's React version. The later Personal-Intelligence reconciliation refers to **source1989** and **46 original CNR source packages**; that reference is a source-authority record, not an invented OpenClaw release number.

## Work on this area

Begin with the frontend source guide and trace the relevant interface to its actual application/provider boundary. Useful contributions include clearer tool and task contracts, explicit permission and account boundaries, meaningful synthetic-data tests, and documenting the path from application action to broker/workflow behavior.

Set up only the layer being developed with reviewed synthetic inputs. Original owner state, credentials and model accounts must remain separate from public examples. The complete agent/broker environment should not be inferred from a frontend package installation.

## Integration status

The six-file owner-consumer snapshot retains its original third-party notices: 15 package entries, with 14 dependency families represented as bundled modules. It makes no blanket own-code license grant. The fifteen preferred sources and seven public references close that defined application-code map, while the remaining BUILD inputs, dependency implementations, complete external SDK, protected binding/policy/credentials and runtime data remain separate. Reproducible-build and full source-offer closure are not claimed. Complete public coverage of the latest Chuck/broker/CNR sources and acceptance of the latest AWS/customer composition are not established by these snapshots.

[Back to services](README.md)

## Personal browser-title source revision

The [Source47 Common candidate](../../services/member-identity/provider-account/source47/README.md) preserves the narrow renderer change for the browser title Crays Membership. Its exact delta, input/output derivation, original regression source and existing twelve-check result are recorded alongside the unchanged Common46 reference. This source-only record does not establish private adoption or browser/customer acceptance.

## Admitted native GraphQL target and Chuck48 source

The [Common49 host](../../services/member-identity/provider-account/source49/common-host.native-graphql49.candidate.cjs) forwards the already admitted native member target to the proxy. Its paired Serve source and the [coordinated Chuck48 installation guide](../../operations/chuck-original-transport48/install-revision03/README.md) preserve the exact routing and installation source versions, including immutable references and filename restoration rules for existing helpers. The source records distinguish independent review from runtime execution and authenticated customer acceptance.

## Spot access and staged preference interfaces

The [Spot and Personal / Chuck working-source guide](../../source-archives/spot-and-personal-web-working-source15-20261109/README.md) connects the original navigation, community access, QR, arrival and payment-record interfaces with the staged matching-preference view and controller. Its seventeen originals include both complete, distinct Prototype.tsx working versions alongside the fifteen smaller source/evidence files. It keeps their exact working revisions and restoration paths separate from the canonical Personal and shared-web application compositions. Historical qualification records in that slice describe their own limits; they do not establish an accepted live customer flow.
