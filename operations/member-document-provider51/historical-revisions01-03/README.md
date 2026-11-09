# Member51 historical recovery source revisions 01–03

These five exact Python sources preserve the historical recovery implementation leading to [Forward02 and its namespace-lifetime fix](../forward-revision02/README.md). They are retained for source history and private recovery traceability. They are not a deployment recipe, approved current inputs or a request to replay an earlier attempt.

## Preserved files

- [Initial recovery controller](recover_same_created_member51_family.candidate.py)
- [Recovery revision02](recover_same_created_member51_family.rev02.candidate.py)
- [Recovery revision03](recover_same_created_member51_family.rev03.candidate.py)
- [Generation finisher revision03](finish_current_member51_generation.rev03.candidate.py)
- [Earlier destroyed-namespace verifier](verify_destroyed_member51_namespace.candidate.py)

The initial/revision02 delta includes the alias-variable scope correction. Revision03 introduces the documented create-time Docker default/hostname normalization. The current successor separately changes namespace-lifetime verification and the appropriate prior/own recovery receipt paths. These historical bytes remain unchanged, including superseded guards and helper references.

[The capture map](source-capture.json) gives each original restore path, full hash and size. The five paths were explicitly selected by Root; the recorded full hashes were computed from those files and matched the Root-reported prefixes. They are separate historical source evidence, not extra rows invented in the current three-file Forward02 manifest.

The [initial lifecycle sources](../lifecycle-revision01/README.md), [build sources](../build-revision02/README.md) and current Forward02 files retain their separate versions and licenses. Referenced external/helper implementations, private inputs, controls, captures, registry data, environment files and credentials are absent. This archive does not establish that any historical file was executed or accepted, and the preservation work executed none of them.

These exact five Root-authored Python programs are licensed by CRAYS AG under **AGPL-3.0-only**. Read [LICENSE](LICENSE), [LICENSING.md](LICENSING.md) and [license-scope.json](license-scope.json). Unlisted application, selector, upstream and imported implementations retain their original terms. License rights to run, modify and redistribute do not authorize access to CRAYS infrastructure or private credentials.
