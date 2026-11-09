# CRAYS Platform

### Software connecting CRAYS members, guests and venue operators.

CRAYS connects community and hospitality projects with the digital tools behind them: member access, personal experiences, venue services and operator workflows. This repository contains the CRAYS web applications, integration contracts and services connecting those experiences to files, finance, projects, hospitality and commerce.

We want developers to understand both sides of that work: the experience for a member or guest, and the systems an operator needs to run it.

**[Explore services](docs/services/README.md) · [Architecture](docs/architecture.md) · [Start contributing](CONTRIBUTING.md) · [All CRAYS projects](https://github.com/CraysCircle/.github/blob/main/docs/repositories.md)**

## What we are building

**Personal** brings together the individual's frontend experiences. **Member** handles membership, account boundaries and provider-backed activities. **Work** connects operational workflows to established business systems. They have distinct responsibilities and source views; Work runtime version numbers are not additional products.

We develop the CRAYS-specific applications and connections while retaining the identities and original licenses of the systems they connect to.

## Find a component

| Area | Purpose and developer entry point |
| --- | --- |
| Files and collaboration | [Nextcloud](docs/services/nextcloud.md): member documents, access boundaries and collaboration reconciliation. |
| Finance and ERP | [Frappe / ERPNext](docs/services/frappe.md): commerce-to-ERP mapping and company-scoped workflows. |
| Projects | [Plane](docs/services/plane.md): the canonical project/work-item integration within Work. |
| Hospitality | [Qlo](docs/services/qlo.md): gateway contracts and accommodation-operation integrations. |
| Commerce, identity and more | [All platform service areas](docs/services/README.md): Vendure, account contracts, Personal/Chuck, Gym, Nostr and delivery tooling. |
| Shared web experience | [apps/web](apps/web/README.md): Next.js application and named Club/Member source compositions. |
| Personal frontend | [apps/personal](apps/personal/README.md): React/Vite source and captured Personal views. |
| Browser module | [modules/club-member](modules/club-member/README.md): separately built Club/Member client. |

The service guides explain user purpose, upstream responsibilities, CRAYS implementation, code entry points and concrete ways to contribute. Their status sections distinguish available source from integrations still being completed.

## How the pieces connect

Applications call CRAYS account, permission and provider contracts. Adapters connect those contracts to the appropriate service; provider credentials, document ownership, company scopes and webhook authority remain separate.

The [architecture guide](docs/architecture.md) includes a component diagram and the source responsibilities behind these connections.

## Build with us

We welcome focused improvements to integration behavior, accessible interfaces, tests and developer documentation. Useful starting areas include document access, company-scope handling, project webhooks, hospitality request validation and synthetic account-boundary tests.

Read [Contributing](CONTRIBUTING.md) to choose a component, find its real setup requirements and propose a reviewable change. There is no single install/start command for every application and provider in this repository.

## Repository guide

| Path | Contents |
| --- | --- |
| [apps/](apps) | Web and Personal application sources. |
| [modules/](modules) | Independently built browser modules. |
| [services/](services) | Gateway, BFF and runtime implementations. |
| [docs/services/](docs/services/README.md) | Canonical service hub and integration guides. |
| [operations/](operations/README.md) | Original build, migration and operating-program source. |
| [docs/source-index.json](docs/source-index.json) | Source captures, immutable references and exact version records. |

Independent websites and native apps remain in their own repositories. Twenty and OpenProject are retained historical projects, outside the current active-service navigation; see [the legacy map](https://github.com/CraysCircle/.github/blob/main/docs/legacy-projects.md).

## Versions, licenses and development status

Source consolidation and integration are in progress. Select the component and source view you need before building; an archived controller is not a general installation command. Original licenses, copyright and NOTICE terms apply per component.

[Source and version catalog](docs/source-index.json) · [License and provenance](docs/license-and-provenance.md) · [Development and releases](docs/development-and-releases.md) · [Organization coverage status](https://github.com/CraysCircle/.github/blob/main/docs/source-and-license-status.md)
