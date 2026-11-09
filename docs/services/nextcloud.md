# Cloud documents and collaboration with Nextcloud

CRAYS connects member documents and organizational collaboration to Nextcloud through explicit access and provider boundaries. The published integration source covers both document transport and scoped collaboration groups.

These are distinct paths: a successful provider write or membership acknowledgement must still be related to the correct CRAYS account and authority record.

## Upstream platform and CRAYS code

[Nextcloud Server](https://github.com/nextcloud/server) provides the cloud-file and collaboration platform. CRAYS supplies the application-facing authorization, document contracts and reconciliation:

| Source | Responsibility |
| --- | --- |
| [Member document provider](../../apps/web/src/lib/clubs/member-nextcloud-document-provider.ts) | WebDAV create/read transport, original-byte hashes and provider version/readback information |
| [Collaboration access adapter](../../apps/web/src/lib/nextcloud-collaboration-access-adapter.ts) | Scoped group creation and membership changes with explicit acknowledgement/observation states |
| [Sandbox reconciliation adapter](../../apps/web/src/lib/member-commerce/nextcloud-clubs-sandbox-reconciliation-adapter.ts) | CRAYS collaboration reconciliation source |
| [Member document contract](../../apps/web/src/lib/clubs/member-document-contract.ts) | Application-level document relationships |

The captured member document provider is explicitly a **private, member-owned test-document path**. Its source requires test authority, validates supported file signatures and hashes, and reads back the original provider bytes. It is not presented as an unrestricted public upload service.

The collaboration adapter records group creation, membership addition/removal and provider observations. Its acknowledgements state that they do not mutate CRAYS authority; provider membership and CRAYS authorization are reconciled deliberately.

## Understand the workflow

For documents, begin with the member document contract and follow the provider's authority guard before examining upload/readback. The provider uses WebDAV and retains content hashes and provider references so that the application can distinguish an intended document from an unverified write.

For collaboration, begin with the exact provider/organization scope and the adapter's acknowledgement types. A provider response is evidence about that provider operation, not a shortcut around CRAYS authorization.

See the [service guide](README.md) for how identity, documents and business workflows connect.

## Development and contributions

Read the [shared web development guide](../../apps/web/README.md) and identify the relevant source composition first. The transport and provider boundaries can be exercised with injected synthetic responses; no customer documents or live credentials are needed in test fixtures.

Useful contributions include:

- WebDAV readback tests for byte/hash mismatches and unexpected MIME types.
- Clear handling of timeouts and unknown write outcomes.
- Group/membership scope and acknowledgement-reconciliation tests.
- Accessible document-state UI and concise API examples.
- Version-specific mapping of required Nextcloud apps, CRAYS changes and original notices.

Keep protected principal credentials and real document content outside issues, pull requests and source fixtures.

## Version and source status

The CRAYS adapters are linked above. The complete Nextcloud server, required apps and current deployment configuration are a broader source scope than these files. Their exact versions, own changes and original license/source-availability relationships remain part of the [current reconciliation](https://github.com/CraysCircle/.github/blob/main/docs/source-and-license-status.md).

Use the [platform source index](../source-index.json) and [license/provenance record](../license-and-provenance.md) for the published capture boundaries.
