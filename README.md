# CRAYS platform sources

Shared CRAYS application/service sources, website-hosting wrappers and migration operations source, with exact provenance and version records. The shared Next.js composition is under apps/web; independent website implementations and retained upstream forks remain in their project repositories.

## Find a component

| Component | Source and documentation |
| --- | --- |
| Shared Next.js application | [Qualified Club/Member/SaaS source views, recovery prerequisites and original notices](apps/web/README.md) |
| Personal web application | [Original and 13-overlay React/Vite source, recovery inputs and exact notices](apps/personal/README.md) |
| Club/Member browser module | [Original and origin35 input views, recorded build and original notices](modules/club-member/README.md) |
| Personal build operations | [Original build controllers, lease adapter, artifact inspection and adoption-plan source](operations/personal-build/README.md) |
| Qlo gateway | [Service, original tests and configuration](services/qlo-gateway/README.md) |
| Clubs Commerce BFF | [Original service, build/test inputs and dependency notices](services/clubs-commerce-bff/README.md) |
| Work/Qlo runtime | [Original bootstrap and four local runtime modules](services/work-qlo-runtime/README.md) |
| Qlo/Work family operations | [Original continuation revisions, source patches and binding checks](operations/qlo-work-family/README.md) |
| Net hosting | [Unchanged static-hosting wrapper and exact application reference](hosting/net/README.md) |
| Qlo operations | [Account2 correction](operations/qlo/README.md) and [runtime44 source versions](operations/qlo/gateway-runtime44/README.md) |
| Delivery/Postiz operations | [Original-frontend qualifier and separate physical-return helper](operations/delivery/postiz/README.md) |
| Neon → RDS operations | [Source export, original checksums and protected reconstruction](operations/neon-rds/README.md) |
| Persistent storage guard | [Original source and operations index](operations/README.md) |

## Repository layout

    apps/
      web/
      personal/
    modules/
      club-member/
    services/
      qlo-gateway/
      clubs-commerce-bff/
      work-qlo-runtime/
    hosting/
      net/
    operations/
      qlo/
      qlo-work-family/
      member-origin35/
      personal-build/
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
