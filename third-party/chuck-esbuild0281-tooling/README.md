# Chuck build tooling: installed esbuild 0.28.1 text sources

This snapshot preserves **eight unchanged installed text files, 138,116 bytes**. It makes the JavaScript API, declarations, installer and package notices used by the recorded Chuck build toolchain readable. [The capture map](source-capture.json) records original paths and exact hashes.

The `source/node_modules/esbuild` layout contains its original package manifest, `lib/main.js` API implementation, `lib/main.d.ts` declarations, `install.js`, license and README. The selected Linux x64 package contributes only its manifest and README under `source/node_modules/@esbuild/linux-x64`. **Both executable binary paths are excluded** and remain in protected custody. This text-only snapshot is not a runnable compiler installation.

The unchanged [MIT license](source/node_modules/esbuild/LICENSE.md) retains Evan Wallace's copyright, permission and warranty terms. [NOTICE.md](NOTICE.md) explains the package boundaries. No CRAYS-owned AGPL grant is applied to these upstream texts.

These are exact installed files, not a claim of pristine upstream archive identity. Generated module comments reference upstream source names; they do not mean the complete preferred TypeScript/Go compiler source is included. The [official esbuild project](https://github.com/evanw/esbuild) is a reference, not proof of exact registry/source equivalence.

The installer contains executable installation, fetch, platform-selection and integrity-check logic as inert source. Publication does not run it. No compiler, installer, JavaScript API, postinstall or type compilation was executed by this preservation task. This scope does not establish complete Node/SDK/dependency coverage, reproducible builds, current runtime adoption or customer acceptance.

Authorized repository readers can use the [private selected installed-package recovery snapshot](https://github.com/CraysWorld/crays-gym/blob/c88fe99e05fde6da3f8221e218215f73376110eb/protected-source-archives/chuck-esbuild0281-toolchain/README.md) and its [exact restore map](https://github.com/CraysWorld/crays-gym/blob/c88fe99e05fde6da3f8221e218215f73376110eb/protected-source-archives/chuck-esbuild0281-toolchain/source-capture.json), including the two excluded binary paths. These links require private repository access; they do not make binaries part of this public text snapshot.
