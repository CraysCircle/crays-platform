# Work/Qlo runtime bootstrap and modules

This component preserves the observed Work runtime bootstrap and its four local CommonJS modules, separately from the Qlo gateway and Clubs Commerce BFF. It is linked by the [Qlo/Work operating-source archive](../../operations/qlo-work-family/README.md).

| Original file | Source role |
| --- | --- |
| code/bootstrap.cjs | Bootstrap referenced by the captured binding check. Its exact source hash matches the literal pin in that preflight source. |
| runtime/work/user-runtime.cjs | Runtime entry that loads the three local modules below and the original application environment. |
| runtime/work/pool-wait-observer.cjs | Preserved local observer module. |
| runtime/work/prepare-next-readiness.cjs | Preserved original readiness preparation. |
| runtime/work/static-representation.cjs | Preserved original static-response representation module. |

The [source manifest](source-capture.json) records every original path, byte count, SHA-256 and statically observed require reference. All five files retain their exact original bytes. Relative module dependencies shown by the captured runtime entry are included; dynamic application/runtime dependencies remain separate.

## Configuration, dependencies and recovery

The bootstrap retains its original absolute release path. Relocating files in a recovery environment requires the source owner's reviewed path and runtime plan; this source archive does not change program behavior.

Protected environment/custody/control inputs, the original Next application and its complete dependencies, the existing client-asset continuity record and actual public assets, and exact image/runtime/source bindings are not supplied by these five source files. This capture does not claim a complete Work application backup or current runtime acceptance.

The statically observed imports include Node built-ins. Full original application and dependency source, Node/container/runtime notices, asset rights and any corresponding-source obligations remain open. No blanket component license is invented; original file contents and any existing notices are preserved.

No Node application, operating program, container, build, probe or live service was executed by this source capture. See the [platform license/provenance record](../../docs/license-and-provenance.md) and [repository source status](https://github.com/CraysCircle/.github/blob/main/docs/source-and-license-status.md).
