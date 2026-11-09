# Personal browser-title Source47

This is a source-only Common candidate for the title **Crays Membership**. It is not a live release or a claim of browser/customer acceptance. The existing [Common46 archive](../source46/README.md) is preserved unchanged.

The candidate adds a guarded renderer for exactly the recorded Personal artifact root and `index.html`. It verifies the original registry/input hash, replaces exactly one recorded title, and checks the resulting HTML hash. Other files and roots retain their original bytes. GET reports the rendered body length; HEAD reports the same length without a body.

## Preserved files

- `common-host.membership-title47.candidate.cjs`: exact complete supplied Common candidate.
- `COMMON46_TO_TITLE47_EXACT.patch`: exact delta from the preserved Common46 body.
- `TITLE47_RENDER_DERIVATION.json`: original input/output hashes and title derivation.
- `title47.regression.cjs`: original regression source, retained without execution here.
- `TITLE47_UNIT_ACTUAL.json`: existing twelve-check pure-function regression receipt.

The [source map](source-capture.json) records every original path, byte length and SHA-256. The renderer's input and output HTML are identified by the original derivation record; this small source archive does not copy the complete Personal artifact or add a generated HTML output.

## Lineage and verification

The original Common46 body is [preserved at ef3a04f](https://github.com/CraysWorld/crays-platform/blob/ef3a04f101ba675028e97d5fcf95848e3883ad4b/services/member-identity/provider-account/source46/common/common-host.main-context46.candidate.cjs), SHA-256 `0fded17840166bb8b992bb3e1708a4c566cb56f182cd239d44f2327f874c8e7c`. Applying the captured patch as text reconstructs the exact candidate SHA-256 `822fab2fc20aba7cd6cd45e50089efaf8756425a5695db215eca2311b4ddb1d4`.

The existing regression receipt reports twelve pure-function checks and zero actual browser, HTTP or SQL calls. It was reused without rerunning the test during preservation. The [qualification record](qualification.json) pins the independent source review and limits these statements to the captured revision.

Original routing, account/Work admission and Main projection code remain in the captured Common lineage. Original host contracts, registry, Qlo boundary and other imported modules are separate prerequisites. This is not a standalone server installation recipe.

## Source and licensing boundary

No original application, test, runtime or database program was executed by this import. No private environment, credential, session, policy or customer-data body was read or included. Publication does not authorize deployment or private adoption.

Original component/source terms and notices remain applicable. This archive removes no original notice and creates no blanket license over the combined Common host or its dependencies. The separate [Source46 operating archive](../../../../operations/member-original-context46/README.md) retains its own source/execution boundary.
