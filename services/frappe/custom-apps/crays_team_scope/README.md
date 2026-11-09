# CRAYS Team Scope for Frappe

This original extension adds a request-scope guard for dedicated CRAYS Team **test service principals**. It restricts the document types, fields, filters and exact fixture writes those principals may request. Native Frappe permissions continue to apply after the guard.

This is a focused contribution entry point for understanding request contracts and tenant-boundary tests. It is not a general-purpose authorization system for every CRAYS user or evidence that all Frappe business workflows are accepted.

## Read the implementation

| Original package file | Responsibility |
| --- | --- |
| [hooks.py](crays_team_scope/hooks.py) | Registers `crays_team_scope.guard.enforce` as an authentication hook and retains original application metadata. |
| [guard.py](crays_team_scope/guard.py) | Loads a protected site-local binding, checks request/configuration shape and delegates the decision to the policy. |
| [policy.py](crays_team_scope/policy.py) | Defines the dedicated test-identity pattern, allowed document fields, scoped reads and time-limited exact fixture writes. |
| [__init__.py](crays_team_scope/__init__.py) | Declares original version `0.1.0`. |
| [modules.txt](crays_team_scope/modules.txt) | Preserves the original empty module-registration file. |

The policy applies only to identities matching its dedicated synthetic prefix and reserved `example.invalid` suffix. It retains explicit TEST-company and two property-label constraints. Those labels are qualification inputs in the code, not captured customer records or proof of general production tenancy.

Reads require bounded field selections, pagination, filters and configured resource scopes. Most full-document reads are refused; the code explicitly treats native Employee documents as containing private fields. Fixture writes are limited to three named document types, an exact configured allowlist and an unexpired write lease. The binding itself is an external protected input and is not supplied here.

## Develop a focused contribution

Start with the pure `check` policy function and its declared request/binding contract. Useful proposed tests include duplicate query parameters, cross-company scope, fields outside the allowlist, disallowed full-document reads and expired fixture-write leases. Use invented principals, resource scopes and write payloads.

Read the Frappe hook in context before changing request behavior: `guard.py` depends on the external `frappe` package, authenticated session/request objects and a private site-local configuration. The remaining imports are Python standard-library modules. No dependency installation, original program, hook or test was executed for this publication review.

This capture contains the original Python package, not a complete standalone bench/app installation. It has no captured packaging manifest, dependency lock or original test harness. No install command or fresh test result is claimed. The [Frappe service guide](../../../../docs/services/frappe.md) explains the wider provider/integration boundaries; follow the [contributor guide](../../../../CONTRIBUTING.md) before proposing runtime changes.

## Source, version and notices

[source-capture.json](source-capture.json) records every original archive member and exact hash. The existing preservation receipt binds the archive to `crays-main-frappe-web-v1` on 4 November 2026. The installed-app snapshot lists `crays_team_scope 0.1.0` with Frappe `16.25.0` and ERPNext `16.26.1`. These are preserved snapshot identities, not a fresh current-AWS query or a complete per-app upstream source/image correspondence.

All five text files (7,008 bytes) are unchanged originals. The same private source archive also preserves four compiled Python-cache files (15,362 bytes); these are accounted for in the source record and are not published as source here. A local archive hash does not establish an independently verified off-host backup.

The original `hooks.py` declares publisher `CRAYS` and `app_license = "MIT"`. That metadata is preserved as original evidence. No standalone LICENSE, NOTICE or copyright-grant text occurs in this exact archive. This capture adds no license grant and does not replace the original declaration with an inferred AGPL grant. File-specific rights and the required license text remain to be reconciled with the author/rights holder. External Frappe and other dependencies retain their own terms.

This small extension does not close source, notices, writable deltas, dependencies or recovery for the other installed Frappe applications.
