# Projects and operational work with Plane

CRAYS uses a Plane integration to turn application and partner-operation work into scoped project work items. A task remains connected to its originating business record so that delivery, provider acceptance and later status can be reconciled.

Plane is the provider integration documented for the **Project area within Work**, covering project work and operational follow-up. The published [Work module registry](../../apps/web/src/lib/modules.ts#L104) declares the canonical module key `project`, label `Project` and route `/project`. This source declaration identifies the application area; it does not establish that a production route or complete workflow has been accepted. Plane is not a second project feature beside that area.

## Upstream platform and CRAYS code

[Plane](https://github.com/makeplane/plane) supplies the project/work-item application. CRAYS supplies command contracts, dispatch and signed-webhook reconciliation:

| Source | Responsibility |
| --- | --- |
| [Work-item delivery contract](../../apps/web/src/lib/member-commerce/partner-plane-work-item-delivery-contract.ts) | Prepares the intended work-item delivery |
| [Plane work-item adapter](../../apps/web/src/lib/member-commerce/plane-work-item-adapter.ts) | Sends scoped work items with correlation and idempotency |
| [Webhook receiver](../../apps/web/src/lib/member-commerce/plane-webhook-receiver.ts) | Receives provider webhook input |
| [Signed-webhook projection contract](../../apps/web/src/lib/member-commerce/plane-signed-webhook-projection-contract.ts) | Describes verified webhook projection |
| [Hotel exception planner](../../apps/web/src/lib/member-commerce/hotel-plane-exception-work-delivery-reconciliation-planner.ts) | Connects hospitality exception work with delivery reconciliation |

The adapter addresses a specific workspace and project. It validates HTTPS endpoints, resolves an external API-key reference, bounds timeout/response size and sends an external correlation identifier.

When a provider accepts a work item, the source records `PROVIDER_ACCEPTED_PENDING_SIGNED_WEBHOOK`. That state deliberately differs from final reconciled business completion.

## Understand the workflow

Start at the delivery contract and follow the work-item command into the adapter. Then read the webhook projection and reconciliation path. The same originating record should remain identifiable through the command, returned provider item and verified follow-up event.

Network timeouts are recorded as unknown outcomes pending reconciliation. Contributors should preserve this distinction so that an uncertain response does not silently create duplicate work.

## Development and contributions

Use the [shared web guide](../../apps/web/README.md) to select the appropriate composition and dependency context. The adapter accepts an injected fetch implementation and secret resolver, which allows focused tests with synthetic project and work-item data.

Useful contributions include:

- Tests for workspace/project boundaries and malformed provider responses.
- Timeout, retryable/permanent failure and duplicate-delivery scenarios.
- Signed-webhook verification and reconciliation examples.
- Clear user-facing states for submitted, accepted and reconciled work.
- Documentation connecting a source business event to its resulting work item.

Do not include live API keys, private project contents or customer incident data in examples.

## Version and source status

The published CRAYS integration is part of the shared Next.js application. Its [source manifest](../../apps/web/source-capture.json) and [platform source index](../source-index.json) identify the captured scope.

The complete deployed Plane application, required upstream source/notices and exact runtime acceptance remain separately qualified. The presence of adapter code is not a claim that every current project workflow has been accepted end to end. See [license/provenance](../license-and-provenance.md) and the [current coverage status](https://github.com/CraysWorld/.github/blob/main/docs/source-and-license-status.md).
