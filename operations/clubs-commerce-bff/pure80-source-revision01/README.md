# Clubs Commerce BFF — Pure80 build and probe source

This folder preserves two exact original operation programs (42,474 bytes): an image-build controller and its finite original-source syntax/import probe. They are source-only records, not a claim that a build, probe, service activation, database operation or customer checkout occurred during preservation.

- [build80.controller.rev02.py](build80.controller.rev02.py) pins the original five-file BFF build context and Node base, requires separate Root admission, and contains owned resource/fence/physical-return handling for a once-only image build.
- [pure-original-probe80.py](pure-original-probe80.py) pins that controller and the original BFF files. Its embedded JavaScript performs finite syntax/import and public-byte checks in a separately admitted isolated container; it does not instantiate a database pool, import the HTTP server or establish functional acceptance.

## Existing application source and embedded JavaScript

The original BFF application is already preserved under [services/clubs-commerce-bff](../../../services/clubs-commerce-bff/README.md). All five controller file pins match that component's [source index](../../../services/clubs-commerce-bff/source-index.json): Dockerfile, package.json, package-lock.json, server.mjs and lib.mjs. The probe uses the same four package/lock/server/library pins.

The 2,723-byte JavaScript string remains exactly once inside the original Python probe. It imports Node built-ins, the existing application library and external pg; it does not inline those implementations. No extracted duplicate JavaScript file, application source copy or pg source bundle is added here. Existing application and dependency notices remain separate.

## Provenance and exact recovery

[source-capture.json](source-capture.json) records each immutable private source-envelope key/version/hash, selected JSON field path, exact source bytes and SHA256. Recover the selected source byte stream using that map. Do not reconstruct or export other original envelope fields, private admissions or bindings. The controller's original referenced filesystem location is preserved as source code; an unprovided original probe filesystem path has not been invented.

Root's selected relay metadata records a prior source-only review at an exact immutable locator and SHA256. That small original review record was not fetched or read by this reviewer; its recorded status is not a new source review or execution admission. The two current source bodies were independently read in full for this preservation review.

## License, privacy and execution limits

The CRAYS-owned code in the two exact Pure80 revisions, including the embedded 2,723-byte test string, is licensed under **AGPL-3.0-only**, copyright **CRAYS AG**. Read [LICENSING.md](LICENSING.md), the [exact file and embedded-code scope](license-scope.json), and the full [GNU AGPL version 3 text](LICENSE). A targeted actual source-author readback relayed by Root confirms these as CRAYS-specific migration programs. Recipient rights to run, modify and redistribute covered code and derivatives remain intact.

Original source bytes, comments and applicable third-party terms are unchanged. The [source capture](source-capture.json) remains the initial source-only publication record; this separately dated license addition supersedes the earlier pending-authority position. Existing [BFF license scope](../../../services/clubs-commerce-bff/LICENSING.md), imported dependency implementations and private runtime inputs remain separate.

No fixed credential, private principal, captured login/session or customer database record was identified in these two selected bodies. References to private paths, runtime admission and protected files are code dependencies; those contents are absent.

No source code, Docker build, embedded JavaScript, image probe, database or runtime was executed to prepare this folder. The program's possible syntax/import success message is preserved source, not a result reported by this archive. Native-original image byte parity, dependency/image corresponding-source closure, functional acceptance and customer acceptance remain separate.
