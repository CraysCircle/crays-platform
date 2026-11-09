# Member and Common Source46

This source-only snapshot preserves the final Member/Main session-envelope candidate and its matching Common host revision. **It is a candidate, not a live release or proof of customer acceptance.** The existing Source42 archive is retained separately and unchanged.

The application distinguishes the original Main global account representation from the native Club account representation. Only the exact Personal/Club session request selects the combined envelope. Other session callers retain their established representation. The Common candidate consumes the original Main projection for its internal access and Work-admission checks while preserving the existing Work account, role and tenant predicates.

## Source layout

- `app/src/`: eight original application source revisions.
- `app/CURRENT42_TO_CANDIDATE46.patch`: original application delta.
- `common/`: Common candidate, original projection reference, original delta and regression source.
- `tests/`: original application regression source.
- `source-capture.json`: exact original and exported file hashes, sizes and recovery slots.
- `qualification.json`: final source-review and existing synthetic-test evidence.

Twelve files are unchanged original bytes. Two files are recoverable templates protecting a coupled operator/account binding and its correlated test literals; nine literal occurrences use five protected slots. They are explicitly identified in the source map. The templates are not deployable replacements for their originals.

## Recover the exact selected sources

With Python 3.9 or newer, supply the separately protected slot document:

```sh
python3 restore_source.py --destination /outside-git/member-common-source46 --bindings-file /protected/source46-bindings.json
```

The destination must be new, outside Git and outside this archive, with no symlink ancestors. All fourteen original hashes must match before any source files are written. Restoration executes no application, test, database or runtime program. Public GitHub alone cannot recover the protected literals; the original private archive and its exact-version backup are separate owner recovery inputs.

This is an additive source archive, not a complete standalone application or dependency installation recipe. Original aliases, imports, absolute runtime paths and module relationships are preserved. The Common candidate still requires its original host contract, Qlo boundary, registry and other imported modules. The application still requires the corresponding shared-web source and dependencies. No deployment environment, credentials, cookies, database records or live authentication state is supplied.

## Evidence and limits

The final application manifest is `141b38984dcc42ac36c4ca0043ea9426cd8b6690ab679ac99ff34ac029f915ad`; its reviewed patch is `c492ac0acfaa7471103df3f6372c8c5fb05631cb67c3aea6e5aa4965275b1f11`. The Common manifest is `c2c1549148bd0078c2008d6ea525a546c283536630b7f67d819f7252ebb2eeb0`.

Existing source reviews and twelve-check synthetic regression receipts are retained as evidence. This archive did not rerun them, execute source programs, query providers or databases, build a product or modify a runtime. The separately preserved application regression revision was captured exactly; its inclusion does not create a new execution result.

Source publication does not authorize private installation. Root adoption, deployment composition, dependency/runtime notices and end-to-end authenticated Work/customer acceptance remain separate decisions and evidence.

## Licensing and provenance

These are CRAYS integration/source revisions with their original component and upstream relationships retained. Source42's grant for two operating wrappers does not license this complete application or Common host. Dependency imports do not imply copied dependency implementation or a new license over dependencies. No blanket license or whole-framework ownership is asserted by this archive; applicable original notices and file-specific grants remain authoritative.

Start with the [provider-account archive](../README.md), [identity guide](../../../../docs/services/identity.md) and [shared web source](../../../../apps/web/README.md).
