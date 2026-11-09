# esbuild 0.28.1 upstream source

This is the exact official esbuild tree at [v0.28.1, commit bb9db84c02433fbe37b3509f53f9f3e3cc48725e](https://github.com/evanw/esbuild/tree/bb9db84c02433fbe37b3509f53f9f3e3cc48725e). It preserves 349 original blob paths and 9,444,544 bytes beneath [source/](source/), including original Go and TypeScript source, build helpers, tests, package files, notices and assets. Source is retained as data; no captured program was run during preservation.

The [installed-text snapshot](../README.md) records the separate package files actually observed in the CRAYS toolchain. Upstream supplies the pinned project source; installed capture records observed generated/package files. Exact overlapping blobs are listed in [source-capture.json](source-capture.json). Matching a few blobs does not establish that an installed binary was built from this tree.

## Recover the selected tree

Use the original relative names and Git modes in [source-capture.json](source-capture.json). Each original has its byte length, SHA-256 and Git blob ID. These pins identify the selected version; original licenses govern use and modification.

The path source/scripts/browser/esbuild.wasm.bagel has Git mode 120000: its 35 bytes are a symbolic-link payload. Preparation stores it as an inert regular file and never follows the target. Publication must retain Git mode 120000 instead of 100644. A conventional Git checkout may create the link; inert recovery should retain the exact payload as a regular file until link creation is explicitly intended. Executable originals retain Git mode 100755 in the manifest although staging files are non-executable.

Original .github files are nested under this component's source/; they are not repository-root workflows and do not enable automation here.

## Terms and limits

Read [NOTICE.md](NOTICE.md) and the original [root MIT license](source/LICENSE.md), [npm license](source/npm/esbuild/LICENSE.md), [WebAssembly package license](source/npm/esbuild-wasm/LICENSE.md) and [xxhash license](source/internal/xxhash/LICENSE.txt). File-level terms also matter: retained Go-derived and UglifyJS-derived code carries BSD notices; a source-map fixture carries a Closure/Apache context with the [full Apache 2.0 license](LICENSE-APACHE-2.0.txt) supplied alongside it. All original comments and notice bytes remain intact. CRAYS does not apply its own AGPL policy to these upstream files or assign universal terms to their assets.

This capture does not claim installed-binary equivalence, a reproduced build, a complete Node/SDK environment, all dependency source or completion of a broader source offer. It adds one exact upstream source version without replacing the installed snapshot.
