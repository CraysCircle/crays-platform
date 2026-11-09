# Original30 ACL-grantee preparation sources

These four CRAYS-authored sources preserve a narrowly scoped role-preparation proposal for the native Core database restore. The SQL describes thirty missing original ACL-grantee names as **NOLOGIN** roles. The Python programs coordinate guest/session execution and operation receipts; publishing their source performs none of those operations.

| Source | Responsibility |
| --- | --- |
| [Preparation SQL](PREPARE_ORIGINAL30_GRANTEES.candidate.sql) | Exact thirty-role proposal with role/membership preimage guards |
| [Guest runner, revision 02](run_original30_role_preparation_on_guest.rev02.candidate.py) | Guest-side preparation orchestration |
| [Operations, revision 02](original30_role_preparation_operations.rev02.candidate.py) | Bounded operations and receipt coordination |
| [Secure session](secure_original30_role_preparation_session.candidate.py) | Dedicated session and private-input boundary |

All four files are unchanged originals, totaling 52,167 bytes. [The capture map](source-capture.json) records their source names, whole-file hashes, review references and restoration boundary. Independent full-source privacy/notices review identified no protected spans: the role labels are technical ACL roles, and Docker owner-thread identifiers are technical custody bindings rather than account identities. Credential, CA, expected-role and postprojection inputs are dynamically supplied; their contents are not in this source package.

**Actual execution remains open in this source snapshot.** The source-only SQL review does not authorize a transport, Root delegation or database action. Thirty NOLOGIN placeholders do not establish original LOGIN/authentication parity, ordinary consumer access, original memberships or restore acceptance. No SQL, Python program, build, heavy job or runtime action was executed while preparing this package. A future authorized operation still needs its independent exact admission, private inputs, resource and transaction/commit evidence; source publication supplies none.

Restore the exact source files using their mapped names and hashes. Standard-library, boto3, PostgreSQL CLI, system/runtime dependencies and private operational inputs remain separate; this is not a complete executable restore package. Existing revisions and other database/application sources are outside this snapshot.

The trusted Root source-author attestation and the user's existing CRAYS-owned-code instruction establish the narrow AGPL-3.0-only scope. Database permission reviews are separate evidence. See [LICENSING.md](LICENSING.md), [license-scope.json](license-scope.json) and [LICENSE](LICENSE).
