# Hospitality with Qlo

CRAYS connects hospitality content and provider sessions through a dedicated Qlo gateway and application read contracts. Developers can inspect how hotel content, room descriptions, property services and provider media become CRAYS-facing data.

The service keeps content discovery separate from room availability, booking and payment readiness.

## Provider and CRAYS code

The native Qlo application supplies hospitality data; CRAYS supplies the Core/session boundary and the projections consumed by the application:

| Source | Responsibility |
| --- | --- |
| [Gateway guide](../../services/qlo-gateway/README.md) | Architecture, configuration, original tests and build context |
| [Gateway server](../../services/qlo-gateway/server.mjs) | HTTP routing, session exchange/redemption, provider reads and image handling |
| [Room-inventory projection](../../services/qlo-gateway/provider-room-inventory.mjs) | Projects supplied property/room inventory evidence |
| [Property-service projection](../../services/qlo-gateway/provider-property-services.mjs) | Projects provider property-service data |
| [Application provider-read client](../../apps/web/src/lib/clubs/qlo-provider-read-client.ts) | Defines the hotel, room and media contracts consumed by CRAYS |

The read contract includes content authority and media provenance fields. Its captured room type explicitly declares `bookable: false`, no rate/availability and pending channel-manager/payment setup states. Those are part of the current documented source behavior.

## Understand the workflow

Start with the gateway README, then follow server routes into the two projection modules. On the application side, read the provider client to see which hotel/room/media fields are exposed and which states remain pending.

For commerce relationships, continue to the [Clubs Commerce BFF](../../services/clubs-commerce-bff/README.md). The gateway's content/session role does not give it authority to invent available inventory or approve a payment.

The [Work runtime](../../services/work-qlo-runtime/README.md) is a separate runtime integration. Its existence does not replace the Qlo provider or the gateway.

## Development and contributions

The gateway is a small Node.js service using built-in modules and two local projections. Its [component guide](../../services/qlo-gateway/README.md#development-and-build) documents the original Node/build context. Read its original package commands before running tests in an authorized local environment.

Four original tests are retained beside the implementation, including [gateway tests](../../services/qlo-gateway/test-gateway.mjs) and [room projection tests](../../services/qlo-gateway/test-provider-room-inventory.mjs). They provide concrete entry points for synthetic fixtures and local mock-provider work.

Useful contributions include:

- Projection tests for absent, malformed or pending inventory/service imports.
- Session-boundary and safe provider-response tests.
- Accessible hotel/room UI that accurately presents unavailable or pending states.
- Media provenance, dependency notice and exact provider-version documentation.

Production provider credentials, business import receipts and customer booking data remain outside Git.

## First local check: the two projection tests

A small starting point is the pair of projection tests at the beginning of the [original package test script](../../services/qlo-gateway/package.json). They exercise the two local projection modules with in-memory fixtures: no npm dependencies, Docker, protected configuration, real provider credentials or provider calls are required.

Use a local Node.js installation. The recorded gateway build used **Node.js 22.23.1**; use that version when matching the recorded baseline.

From the repository root:

```sh
node --version
cd services/qlo-gateway
node test-provider-room-inventory.mjs
node test-provider-property-services.mjs
```

The room test checks property scoping, pending physical inventory and removal of internal room/provider details. The service test checks pending catalog imports, admitted services and the explicitly non-bookable projection.

When their assertions succeed, these Node assertion scripts print lines beginning `CCLUB120_QLO_PROVIDER_ROOM_INVENTORY_PASS` and `CCLUB120_QLO_PROVIDER_PROPERTY_SERVICES_PASS`; a failed assertion produces a nonzero exit.

For a first change, add a synthetic malformed or cross-property fixture, state the expected safe projection and run the relevant script. Keep any new fixture entirely artificial.

The package's full `npm test` command runs these two scripts followed by two gateway integration scripts. Those additional tests create loopback mock servers, temporary fixture files and a gateway child process. Inspect their setup and cleanup before expanding to that suite. The narrow commands above exercise only the pure projections; they do not start a gateway or test a live booking flow.

## Version and source status

The original gateway application, tests and Dockerfile have exact source records in the [platform index](../source-index.json). Recorded Docker image IDs and registry manifest digests identify different objects; use the component's artifact notes.

Full provider application source, dependency/runtime notices, channel-manager completion, booking/payment readiness and current customer acceptance are broader work than this gateway capture. See [license/provenance](../license-and-provenance.md) and [current coverage](https://github.com/CraysWorld/.github/blob/main/docs/source-and-license-status.md).
