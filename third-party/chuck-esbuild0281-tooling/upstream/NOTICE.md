# Original upstream notices

All 349 original files are retained byte for byte at the pinned esbuild commit. Original license files and source comments remain part of this capture.

- [Root license](source/LICENSE.md), [npm license](source/npm/esbuild/LICENSE.md) and [WebAssembly package license](source/npm/esbuild-wasm/LICENSE.md): original MIT terms, copyright Evan Wallace.
- [Nested xxhash license](source/internal/xxhash/LICENSE.txt): original MIT terms, copyright Caleb Spare.
- [Go-derived filepath implementation](source/internal/fs/filepath.go): complete original inline Go Authors BSD notice, lines 1–33.
- [Terser test harness](source/scripts/terser-tests.js) and [Uglify test harness](source/scripts/uglify-tests.js): complete original inline Mihai Bazon BSD notices, respectively lines 173–204 and 301–332.

[Source-map test script](source/scripts/verify-source-map.js), lines 499–555, contains an upstream generated shadow-cljs source-map test fixture with the original “Copyright The Closure Library Authors.” and “SPDX-License-Identifier: Apache-2.0” attribution. Those original bytes remain unchanged; [LICENSE-APACHE-2.0.txt](LICENSE-APACHE-2.0.txt) supplies the Apache License 2.0 for that marked fixture. This supplement does not relicense the rest of esbuild. Its text is the unmodified [official Apache license](https://www.apache.org/licenses/LICENSE-2.0.txt).

These references do not replace original file-level terms. No CRAYS AGPL grant is applied to upstream source or assets. The separate installed capture and privately retained compiler binaries retain their own provenance; this source tree alone establishes neither binary correspondence nor build reproducibility. A quoted Microsoft license example in the changelog is explanatory text, not preservation of a bundled Microsoft compiler.
