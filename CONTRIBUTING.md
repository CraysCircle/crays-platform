# Contributing to CRAYS

Help us make the connections between personal experiences, communities and business systems easier to use, understand and maintain.

This repository contains several applications and services with different build and provider assumptions. Choose a component first; there is no single command that safely starts the entire CRAYS ecosystem.

## Find a place to contribute

| Interest | Starting point | A useful contribution |
| --- | --- | --- |
| Files and collaboration | [Nextcloud integration](docs/services/nextcloud.md) | Synthetic WebDAV access cases, collaboration membership reconciliation and clearer ownership errors. |
| Finance and business workflows | [Frappe / ERPNext](docs/services/frappe.md) | Company-scope tests, commerce-event mapping and retry/outcome documentation. |
| Projects and team workflows | [Plane integration](docs/services/plane.md) | Webhook validation, duplicate delivery and uncertain-result reconciliation tests. |
| Hospitality | [Qlo integration](docs/services/qlo.md) | Gateway contract tests, request validation and documentation of provider responses. |
| Shared application and membership | [Shared web application](apps/web/README.md) | Account/session boundaries, accessible interfaces and provider error states. |
| Personal experiences | [Personal frontend](apps/personal/README.md) | Focused UI improvements, accessibility and documentation tied to the correct source view. |
| Browser integration | [Club/Member module](modules/club-member/README.md) | Module/backend contract documentation and synthetic integration cases. |
| Documentation | [Architecture](docs/architecture.md) and [service hub](docs/services/README.md) | Clear examples, checked links, accurate setup requirements and explanations of component responsibilities. |

These are contribution directions, not invented issue assignments or promises of a finished integration.

## Get oriented locally

```sh
git clone https://github.com/CraysCircle/crays-platform.git
cd crays-platform
```

Then:

1. Read [the architecture](docs/architecture.md) and the selected component's README.
2. Identify its source view, dependency manifest and original notices. Named source compositions and original/preimage captures are not interchangeable.
3. Follow that component's actual installation or restoration instructions. Read the real package scripts or test entry points before running commands.
4. Use local substitutes and synthetic records for provider tests. Obtain any necessary protected development configuration through the project maintainers; never put it in an issue or commit.

Some preserved views require separate protected bindings or original assets. Their READMEs explain these prerequisites. Do not treat a successful dependency install as evidence that a complete service is configured.

## A small first test

The [Qlo projection-test walkthrough](docs/services/qlo.md#first-local-check-the-two-projection-tests) is a focused entry point that requires a local Node.js installation and the checked-out sources. Its two original assertion scripts use in-memory synthetic fixtures and pure local projection modules, without an npm install, provider credentials or network services. The guide states the recorded Node baseline and expected console behavior.

A concrete first exercise is an invalid property-receipt case in [the room-inventory test](services/qlo-gateway/test-provider-room-inventory.mjs):

1. Clone the existing in-memory import receipt and set one admitted property's `hotelId` to a non-numeric string. Keep the original fixture unchanged.
2. Add an assertion that `projectProviderPropertyRoomInventory` refuses that receipt with `qlo_room_inventory_receipt_invalid`. The [projection source](services/qlo-gateway/provider-room-inventory.mjs) already defines this boundary; this exercise adds coverage for malformed input, not a new booking capability.
3. From the repository root, run the focused original script:

```sh
node services/qlo-gateway/test-provider-room-inventory.mjs
```

Describe the fixture, expected rejection and actual result in your pull request. This is a suggested contribution exercise, not an assigned issue or a freshly reported test pass.

## Propose a focused change

Use [a platform issue](https://github.com/CraysCircle/crays-platform/issues) to describe the user or developer problem, affected component and expected result. Include reproducible steps with synthetic inputs. For an independent website, mobile app or upstream project, use that project's own repository and contribution rules.

A useful proposal explains who benefits and what success looks like. For example: a Plane duplicate-webhook test should demonstrate the expected idempotent result; a Nextcloud access test should distinguish the requested member's files from another user's files.

## Validate and submit

Keep changes small enough to review as one coherent behavior. Use the component's existing checks and add tests for meaningful new behavior. Do not run historical migration, production-controller or data-changing programs merely because their source is archived here.

A pull request should state:

- The concrete problem and resulting behavior.
- The source view and component changed.
- Checks actually run, their result and any required setup.
- Relevant dependency, configuration or original-notice changes.

Separate a review/build result from a production release. Follow [the development and release process](docs/development-and-releases.md) for release-specific requirements.

## Working with upstream projects

Use upstream contribution rules when changing upstream implementation. Keep original authorship, license texts and NOTICE files with the corresponding source. Describe CRAYS changes separately; do not relabel third-party code as CRAYS-owned.

License terms vary by component. Identify the applicable original license before reusing or contributing code; if a source area has no established license grant, ask for that scope to be clarified in an issue. This organization does not impose a new blanket license or contributor agreement through this guide.

## Report problems responsibly

Public issues should contain reproducible, non-sensitive information. Keep credentials, private keys, customer records, database exports and private account identifiers out of reports. For a sensitive issue, ask maintainers for a private reporting route without posting the sensitive details publicly.
