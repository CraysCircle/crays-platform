# Personal build and adoption operations source

These are original programs and configuration records used to prepare and qualify the captured Personal frontend for AWS. The application source, original build configuration and baseline/overlay restoration remain under [apps/personal](../../apps/personal/).

## Preserved versions

| Location | Original role |
| --- | --- |
| runner-rev01/run_build_lifecycle.py | First bounded AWS build-lifecycle derivative, originally targeting build entry 01. |
| runner-rev02/run_build_lifecycle.py | Subsequent lifecycle revision retaining a separate pre-start deadline check. |
| runner-rev03/run_build_lifecycle.py | Later revision targeting build entry 02. |
| lease-control/own_lease.py | Original AWS-specific lease adapter imported by an owner-supplied module path; not a global resource allocator. |
| artifact-digest/OUTPUT_DIGEST_CODE.py | Original regular-file artifact hashing and literal-reference inspection program. |
| adoption-plan/UNION_PLAN_CODE.py | Original composition/union preparation program; its presence does not establish an executed adoption. |

[Exact capture records](source-capture.json) preserve all eight source file hashes, including the two [AWS Build02 configuration files](../../apps/personal/aws-build02/). The current configuration bodies match the hashes in the original Build02 entry. Historical controller revisions are retained separately; the current configuration is not claimed to reconstruct the earlier Build01 configuration.

The application input and compiled artifact are different records. The captured application source has 1,489 current inputs. The recorded Build02 output has 513 files with digest `2cdcf48ed1d3b1d99880969a5683b3c0a79b9431a91c300911097506cae1b088`. This source import repeats neither the build nor runtime adoption.

## Execution and recovery prerequisites

These programs retain original absolute paths, runtime assumptions and version-specific owner records. They can create/start/clean up containers, transition lease state or prepare runtime records when executed. This archive is source custody and review material; publication does not authorize running them.

The controllers require an independently bound Root window, an exact lease module and hash, a lease registry, a unit identity and original build-entry records. Live window/registry records, worker output, compiled payloads and protected operating inputs are not included here. The adoption planner's large runtime registries are deliberately separate from its source program.

The original AWS-specific configuration uses the qualified dependency/fallback environment. Exact dependency implementation, custom source/WASM, Recharts and PDF fallbacks, external React runtime, image/font provenance, other runtime programs and complete notices/source offers still require reconciliation. Original source files are preserved without rewriting those relationships.

Six Python programs were syntax-parsed and their bytes verified during intake. No original program was imported/executed; no build, container, registry, lease or deployment was changed by this source publication. Original copyright, license and NOTICE terms remain component-specific; no new blanket grant is introduced.
