# Four protected Shared-web operational source templates

These four historical source templates make the operational implementation inspectable while withholding selected fixed person/contact bindings and directly linked sensitive case values. They are **SOURCE_TEMPLATE_NOT_RUNNABLE_INPUT**, not production configuration or invented customer test data. The optional origin question concerns later disclosure of the raw values; it does not prevent publication of this protected version.

## Browse the implementation

- [Dataset migration](source/scripts/migrate-golden-operating-dataset-v1.mjs.template)
- [Golden-data repair](source/scripts/repair-core-golden-test-data.mjs.template)
- [CRM source records](source/scripts/seed-crm-golden-source-records.mjs.template)
- [ERP finance workflow slice](source/scripts/seed-erp-finance-workflow-source-slice.mjs.template)

The templates retain control flow, functions, schemas, field names, apply/confirmation gates and SQL operation structure. Exactly 64,186 of 69,610 original bytes remain unchanged outside 244 selected ranges. City/company labels and ordinary business logic are retained. The repair helper retains its general 35-market mapping and service-account identity/role code; its contact address is protected. Empty avatar fields remain empty.

Text markers retain their original quoting. Numeric substitutions use explicit zero/comment markers only to preserve readable expressions. These placeholders are not approved operational inputs. Original algorithm code outside the selected literal ranges is unchanged.

## Recover the exact originals privately

[The source map](source-template-map.json) identifies each original size/SHA256, template hash, opaque marker occurrence counts and exact original Git recovery path. All four originals remain unchanged in private **CraysWorld/crays-gym**, repository ID 1280582408, commit **0dd822d7578dfffd55ff76eb8f37ae4c5f6f99ed**, below its original crays-platform/scripts paths. Access to those links requires repository authorization.

The private restoration patch and its values are deliberately absent. The public map contains no per-value hashes. [restore-in-memory.py](restore-in-memory.py) accepts externally verified manifest/template/private-patch bytes and hashes, validates exact file/group sets, marker counts and every original full-file hash, then returns all four original byte streams in memory. It performs no filesystem writes, source imports, original program execution, network requests or logging. Callers must keep returned originals in protected storage.

Existing byte restoration checks reproduced all four originals; six malformed/hash/path cases were refused. Those checks executed only the newly authored helper, never the original MJS, SQL or business operations. The helper body remains unchanged apart from its license comments.

## Origin and license boundaries

No fictional-origin claim is made for these four original datasets. The separate 24-member test-data attestation applies to another source hash and is not reused. This archive adds four protected source views; it does not claim all 94 operational originals are publicly disclosed or that the whole application is legally cleared.

Only **restore-in-memory.py**, newly authored for this recovery task, is licensed by **CRAYS AG under AGPL-3.0-only**. Read the [full unchanged GNU license](../../../services/clubs-commerce-bff/LICENSE). The source map records this narrow scope. Recipients may run, modify, redistribute and create derivatives under that license; hash checks identify original recovery bytes and do not restrict these rights.

No new license grant is asserted for the four original/template programs, the application, vendor code or other repository files. Existing original terms and notices remain applicable. This source archive does not authorize access to CRAYS private systems or credentials and records no deployment or runtime adoption.
