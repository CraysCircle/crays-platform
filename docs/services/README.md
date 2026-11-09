# CRAYS services

CRAYS is building software for members, guests and venue operators across community and hospitality projects. Personal workspaces, member experiences and business operations meet in connected applications. The platform code links identity, cloud documents, commerce, hospitality, finance and project work while keeping each provider's responsibilities explicit.

This guide is for developers who want to understand the system, inspect an integration or contribute to a specific part. Start with the experience you care about, then follow the implementation and contribution route below.

## The experiences we connect

**Club and Member** combine public discovery, account access, member views and commerce workflows. The [shared Next.js application](../../apps/web/README.md) contains multilingual pages, API/GraphQL routes, database adapters and business contracts. The [separate Club/Member browser module](../../modules/club-member/README.md) is built independently for its host shell.

**Personal and Gym** bring personal workspaces, training views, social/Nostr interfaces and an embedded Member integration into a separate [React/Vite frontend](../../apps/personal/README.md). The [Personal and Chuck guide](personal-and-chuck.md) distinguishes frontend actions from agent, broker and tool/workflow layers. Its captured source is a useful contribution starting point; the complete current Gym and native Core systems have additional source authorities.

**Work and partner operations** connect commerce and hospitality events to finance, collaboration and project tasks. The CRAYS integration layer expresses tenant boundaries, provider commands, acknowledgements and reconciliation. The provider remains responsible for its own domain.

## Business services

| Service | Role in CRAYS | Inspect the integration |
| --- | --- | --- |
| [Frappe / ERPNext](frappe.md) | Finance and accounting consequences of commerce events, scoped to the correct tenant and company | [Commerce-to-ERP adapter](../../apps/web/src/lib/member-commerce/frappe-commerce-adapter.ts) and [transactional delivery contract](../../apps/web/src/lib/member-commerce/commerce-erp-transactional-delivery-contract.ts) |
| [Nextcloud](nextcloud.md) | Member documents and scoped collaboration access | [Document provider](../../apps/web/src/lib/clubs/member-nextcloud-document-provider.ts) and [collaboration access adapter](../../apps/web/src/lib/nextcloud-collaboration-access-adapter.ts) |
| [Plane](plane.md) | Project work items and operational exception follow-up | [Work-item adapter](../../apps/web/src/lib/member-commerce/plane-work-item-adapter.ts), [webhook receiver](../../apps/web/src/lib/member-commerce/plane-webhook-receiver.ts) and reconciliation contracts |
| [Qlo hospitality](qlo.md) | Hotel content, room/property-service projections and the Core-to-provider session boundary | [Gateway](../../services/qlo-gateway/README.md) and [provider read client](../../apps/web/src/lib/clubs/qlo-provider-read-client.ts) |
| [Vendure and Club commerce](commerce.md) | Commerce sessions, hold/cart/order commands and safe browser responses | [Clubs Commerce BFF](../../services/clubs-commerce-bff/README.md), [Vendure adapter](../../apps/web/src/lib/member-commerce/vendure-http-adapter.ts) and [order contract](../../apps/web/src/lib/member-commerce/vendure-order-command.ts) |
| Payment and finance lifecycle contracts | Source contracts for payment/refund correlation and booking finance consequences; this is not a payment-readiness claim | [Finance lifecycle](../../apps/web/src/lib/member-commerce/booking-finance-lifecycle.ts), [refund saga](../../apps/web/src/lib/member-commerce/hotel-booking-stripe-refund-saga-repository.ts) and [split contract](../../apps/web/src/lib/member-commerce/stripe-automatic-booking-split-contract.ts) |

Plane has one home in this service guide. It is part of the platform's project-work integration.

## Identity, social and delivery

| Area | What the source covers | Developer entry |
| --- | --- | --- |
| [Identity and member access](identity.md) | Auth0 integration, session mapping and member access contracts | [Auth/session mapping](../../apps/web/src/lib/auth-session-mapping.ts), [member auth contract](../../apps/web/src/lib/clubs/member-auth-contract.ts) |
| [Nostr identity and browser sessions](network.md) | Nostr identity, signature and browser-session boundaries | [Identity](../../apps/web/src/lib/nostr-identity.ts), [signatures](../../apps/web/src/lib/nostr-signature.ts), [browser session](../../apps/web/src/lib/nostr-browser-session.ts) |
| Native applications | Separate native iOS, Android and BLE projects, with their own source and integration histories | [Mobile project guide](https://github.com/CraysWorld/.github/blob/main/docs/repositories.md#mobile-applications) and [native version map](https://github.com/CraysWorld/.github/blob/main/docs/native-source-map.md) |
| [Social publishing and delivery](delivery-and-social.md) | Captured Postiz frontend qualification and delivery operating programs | [Postiz source guide](../../operations/delivery/postiz/README.md); the full provider application is a separate source scope |

## How the pieces work together

The browser talks to a CRAYS application boundary rather than directly owning provider authority. CRAYS contracts validate scope, describe commands and retain correlation between the originating business event and the provider's response.

For Club commerce, the preserved BFF records a concrete separation: Vendure owns commerce order/payment state; Booking Core owns holds, bookings and capacity; ERPNext receives accounting consequences. Plane can receive follow-up work. Nextcloud provides document and collaboration capabilities through its own access boundaries. Qlo supplies hospitality content through its gateway.

A provider accepting a command is not always the final business outcome. The Plane adapter, for example, records acceptance pending a signed webhook. Finance delivery and other adapters also preserve unknown and reconciliation states. This is a useful place to contribute: make those states understandable, testable and safe under retries or timeouts.

## Runtime and engineering

Application code, provider integrations and operating programs have different entry points:

- [Shared web application](../../apps/web/README.md): routes, business contracts, GraphQL and database/Core adapters.
- [Personal frontend](../../apps/personal/README.md): React/Vite views, source compositions and build relationships.
- [Work runtime](../../services/work-qlo-runtime/README.md): bootstrap and local runtime modules.
- [Club runtime](../../services/club-next-runtime/README.md): listener, bootstrap and origin configuration.
- [Operations](../../operations/README.md): reviewed build, delivery, migration and recovery programs, including [Neon → RDS](../../operations/neon-rds/README.md).

Standalone Coffee, Shop, Pro and other website projects remain in their [matching repositories](https://github.com/CraysWorld/.github/blob/main/docs/repositories.md). A public website and its deeper business integrations can have different source/version records.

## Contribute where you can make a difference

Choose a component and read its README, original package/lock and relevant contracts. Describe the intended change in an issue or pull request in the responsible repository, including the behavior you observed and the result you expect.

Useful starting points include synthetic adapter tests, accessibility and localization, clear error/reconciliation states, API contract examples and portable development instructions. The component guides linked above name more focused tasks. Use synthetic identities and provider responses; do not place credentials or customer data in examples.

There is no single root command that installs or starts every CRAYS service. Follow the component's development instructions and identify its required provider dependencies first. Review the [development/release process](../development-and-releases.md) before proposing runtime or deployment changes.

## Source and release notes

These pages describe inspected source responsibilities. They do not assert that every feature is enabled in a current public deployment. Original component licenses and notices apply; a readable repository does not create a blanket license over the combined system.

The [source index](../source-index.json), [license/provenance record](../license-and-provenance.md) and [current coverage status](https://github.com/CraysWorld/.github/blob/main/docs/source-and-license-status.md) retain exact versions and outstanding source, dependency and rights work. Retained upstream forks are documented separately in the organization guide; their existence does not make them current CRAYS services.

## More developer guides

[Commerce](commerce.md) · [Identity](identity.md) · [Personal and Chuck](personal-and-chuck.md) · [Delivery and social](delivery-and-social.md) · [Network and native connectivity](network.md) · [Contributing](../../CONTRIBUTING.md)

## Member routing and original messaging transport

The [Member GraphQL origin guide](../../services/member-club/source50/README.md) explains how the browser transport selects the Member GraphQL alias for the exact Member origin. The [original messaging and Nostr transport guide](../../operations/original-messaging-nostr-transport50/README.md) records the listener boundaries for admitted messaging and relay requests. Both link to exact source versions and existing owner review evidence; build, lifecycle and authenticated customer acceptance remain separate records.
