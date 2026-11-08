# License and provenance

This record separates the original application source, the CRAYS AWS build description and the runtime distribution. It is an evidence record, not a new license grant.

| Material | Established provenance | License evidence and remaining work |
| --- | --- | --- |
| Four Qlo gateway application files | Exact original application capture19; all supplied file hashes match | No standalone application LICENSE/NOTICE/COPYING was found in the specifically examined original component directories and roots. The original package metadata has no license field. No MIT, GPL, AGPL or other application license has been assigned by inference. |
| AWS Dockerfile | Exact image30 build-context file; SHA-256 recorded in the source index | CRAYS-specific deployment source, retained unchanged. No separate license or copyright ownership is invented for it. |
| Node/Alpine runtime and bundled components | Exact base reference in the original Dockerfile; existing Node version qualification | Full version-specific license/NOTICE texts and the complete source/provenance relationship of the exact runtime image still require capture and verification. A base-image name alone does not close this work. |
| Test sources referenced by package metadata | Names preserved in the original package test command | All four original test files and the original component README have now been recovered and preserved unchanged with exact hashes. No separate license grant has been inferred. |

The original application capture and AWS Dockerfile were supplied by the Business migration workstream. Application SHA pins and the existing image30 build receipt establish the recorded relationship; a new reproducible build from Git has not been performed.

## Rules for further imports

Keep original license and copyright texts intact. Read the actual version-specific license before describing its permissions or source requirements. Preserve relevant NOTICE files, upstream commit references and modification history. A dependency license does not automatically license the surrounding application.

For each component, record whether corresponding source or another source offer is required and how the intended recipients can actually obtain it. The exact source must be accessible to those recipients; repository visibility alone does not establish source completeness.

No customer data, provider keys, consumer tokens, private bindings, database dumps or import receipts were included in this source snapshot. No upstream software is being relicensed by this documentation.

## Open acceptance points

The initial source capture is usable for precise repository/commit identification. Complete application authorship/license provenance, exact runtime license closure, test execution evidence and any applicable source-offer obligations remain open. They must not be reported as legally complete or release-approved.

## Operations source

The reviewed Qlo account2 revision03 and unchanged storage guard are preserved with their source packet/review identities under [operations](../operations/README.md). This import supplies no new license grant and does not authorize execution. Their original ownership and license evidence remain an explicit open item.
