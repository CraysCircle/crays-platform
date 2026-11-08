# CRAYS platform sources

Shared CRAYS services, website-hosting wrappers and reviewed migration operations source, with exact provenance and version records. Website implementations and retained upstream forks remain in their own project repositories.

## Find a component

| Component | Source and documentation |
| --- | --- |
| Qlo gateway | [Service, original tests and configuration](services/qlo-gateway/README.md) |
| Clubs Commerce BFF | [Original service, build/test inputs and dependency notices](services/clubs-commerce-bff/README.md) |
| Net hosting | [Unchanged static-hosting wrapper and exact application reference](hosting/net/README.md) |
| Qlo operations | [Account2 correction](operations/qlo/README.md) and [runtime44 source versions](operations/qlo/gateway-runtime44/README.md) |
| Delivery/Postiz operations | [Original-frontend qualifier and separate physical-return helper](operations/delivery/postiz/README.md) |
| Neon → RDS operations | [Source export, original checksums and protected reconstruction](operations/neon-rds/README.md) |
| Persistent storage guard | [Original source and operations index](operations/README.md) |

## Repository layout

    services/
      qlo-gateway/
      clubs-commerce-bff/
    hosting/
      net/
    operations/
      qlo/
      storage/
      delivery/postiz/
      neon-rds/
    docs/
      source-index.json
      license-and-provenance.md
      development-and-releases.md

[Source/artifact index](docs/source-index.json) links each preserved component's exact file and version records. [License/provenance](docs/license-and-provenance.md) distinguishes established notices from missing evidence. [Development/releases](docs/development-and-releases.md) describes the required review and release sequence.

The broader platform/app source reconciliation remains in progress. This repository does not yet claim to contain every CRAYS service, native/Core WIP, dependency source or runtime notice.

## Source and execution boundaries

Original component files are retained unchanged unless a record explicitly identifies a later revision. Historical test output, source review, fresh tests/builds, actual runtime execution and customer/rights acceptance remain distinct evidence.

Operations programs retain original runtime assumptions and protected-input dependencies. Publication is source custody, not a standalone instruction or authorization to execute them. No product deployment workflow is included; GitHub Actions remains disabled during consolidation.

Credentials, private keys, customer data, database exports and private runtime/custody records remain outside Git. Original license/copyright/NOTICE terms apply per component; public readability does not create a new blanket license grant.
