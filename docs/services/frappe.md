# Finance and ERP with Frappe / ERPNext

CRAYS uses its finance integration to connect commerce activity with accounting consequences in the appropriate business context. A commerce event carries tenant, legal-entity, store, ERP site and company scope so that an accounting action is attributed to the intended organization.

The integration is designed around explicit delivery and reconciliation. An originating commerce command, a queued consequence and a provider response remain separate records.

The preserved finance-provider evidence identifies **ERPNext 16.26.1** on **Frappe 16.25.0**. Original installed-app metadata also lists **Frappe CRM 1.76.0**. An installed CRM app does not, by itself, establish that it is the active CRAYS CRM provider or that its workflows have been accepted. These versions describe that recorded provider snapshot, not every current AWS container.

## Upstream platform and CRAYS code

[Frappe](https://github.com/frappe/frappe) and [ERPNext](https://github.com/frappe/erpnext) provide the ERP application domain. CRAYS code translates its commerce events and controls delivery across the application boundary:

| Source | Responsibility |
| --- | --- |
| [Projection contract](../../apps/web/src/lib/member-commerce/vendure-erp-projection-contract.ts) | Describes commerce-to-ERP consequences |
| [Transactional delivery contract](../../apps/web/src/lib/member-commerce/commerce-erp-transactional-delivery-contract.ts) | Prepares delivery and tracks its relationship to the originating event |
| [Frappe commerce adapter](../../apps/web/src/lib/member-commerce/frappe-commerce-adapter.ts) | Resolves protected credentials, validates the HTTPS endpoint and dispatches the scoped consequence |
| [Actual-commerce adapter](../../apps/web/src/lib/member-commerce/frappe-commerce-actual-adapter.ts) | Additional original provider integration source |
| [Finance lifecycle](../../apps/web/src/lib/member-commerce/booking-finance-lifecycle.ts) | Connects booking and finance lifecycle records |

The dispatch adapter targets the CRAYS method `crays.erp.apply_commerce_consequence`. It checks site identity, bounds timeout/response size, denies implicit redirect handling and carries an idempotency key. API keys and secrets are resolved through references rather than embedded values.

These files are the CRAYS integration. They are not a replacement for the Frappe/ERPNext application or a claim to own upstream code. Existing migration evidence also identifies the custom `crays_team_scope` app; its complete version-bound public source and notices require their own source record.

## Understand the workflow

Read the projection contract first to see which consequence is intended. Follow the delivery contract into the adapter, then inspect how provider results are normalized and reconciled. Keep Vendure's commerce state distinct from ERP accounting state; a local queued consequence does not prove that an ERP document was created.

For a wider picture, see the [Clubs Commerce BFF](../../services/clubs-commerce-bff/README.md) and [service architecture](README.md#how-the-pieces-work-together).

## Development and contributions

Use the [shared web application guide](../../apps/web/README.md) to select the source composition and dependency context. The adapter accepts injected fetch and secret resolvers, making synthetic provider responses a useful test boundary. Development requires a deliberately configured provider environment; do not reuse customer ERP records or production credentials.

Focused contributions include:

- Tests for tenant/site/company mismatches and event-to-accounting mappings.
- Idempotency, retry, timeout and unknown-outcome examples.
- Clear documentation of provider acknowledgements versus reconciled ERP results.
- Exact custom-app provenance and version-specific upstream notices.

Include the expected scope and accounting outcome in a proposed change. Runtime use and real accounting mutations belong to the responsible service owner.

## Version and source status

The integration is preserved inside the shared application source; start with its [source manifest](../../apps/web/source-capture.json) and [platform index](../source-index.json). Full Frappe application/custom-app source, dependency notices, current runtime bindings and end-to-end acceptance remain separate reconciliation work. See [license and provenance](../license-and-provenance.md).
