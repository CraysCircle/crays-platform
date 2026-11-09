# Document provider51 — build source, revision02

These two original Root-authored Python programs preserve the finite build procedure for the Member document-provider selector. They prepare a new build tree from the existing successful Member46 source and existing qualified toolchain. This folder preserves source code; it does not claim a successful build, deployment, live document retrieval or customer acceptance.

## Source and relationship

- [build_member_document_provider51.rev02.candidate.py](build_member_document_provider51.rev02.candidate.py) checks the pinned source/toolchain and overlays only the reviewed selector in a newly copied build tree. It preserves all 28 original transport hashes and the other 27 copied transport adapters.
- [run_root_build51_window.rev02.candidate.py](run_root_build51_window.rev02.candidate.py) is the Root build-window wrapper. It binds the original controller, resource limits, exclusive lock/fence and physical unit/cgroup return.

The selector itself is already preserved separately: [exact TypeScript source at commit2fc2b289](https://github.com/CraysWorld/crays-platform/blob/2fc2b2899e15e2d835781739042215998d0224b0/services/member-club/source51/member073-native-provider-binding.ts), SHA256 2f03b4fa91e784230772849baba55fe3765e3d56e0a0ca848e8cdd4c3c7ede51. Its original restoration target is src/lib/clubs/member073-native-provider-binding.ts. The build-source pair does not include the selector again.

The original wrapper docstring still mentions Member42 because this procedure retains that earlier build pattern. The revision02 source and pinned derivative review bind the actual successful Member46 base and the provider51 selector.

## Preserve and restore

[source-capture.json](source-capture.json) records the exact original Root paths, filenames, byte counts, hashes and independent source-review pin. The two Python files are unchanged originals, not renamed runnable replacements. Restoring them to those recorded targets recovers this source pair only. Their other source/toolchain/guard/proposal/admission dependencies must be preserved and qualified separately; private admissions and build logs are deliberately absent.

This folder provides no run command or fresh Root admission. The programs themselves contain privileged build, lock and fence operations; their publication does not authorize running them on CRAYS infrastructure. In this preservation task they were neither imported nor executed. The independent peer review is a source-only derivative review, not proof of an actual build or runtime result.

## License and privacy boundary

[LICENSING.md](LICENSING.md) and [license-scope.json](license-scope.json) define the exact two CRAYS AG program revisions licensed AGPL-3.0-only; [LICENSE](LICENSE) contains the original GNU text. Recipients' license rights to run, modify and redistribute those sources remain intact. The grant does not assign rights over Next.js, Node.js, application sources, toolchains or private inputs referenced by these programs.

All original comments and source bytes remain unchanged. Fixed infrastructure paths, hashes and unit identifiers are source bindings. No private principal, credential, environment file, admission, captured payload or protected build log is included. No new dependency install, source build or runtime operation was performed to prepare this archive.
