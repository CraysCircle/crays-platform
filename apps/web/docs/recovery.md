# Recovery prerequisites

The source captures preserve the selected application inputs. Complete recovery requires the following additional relationships to be closed.

| Input | Current state |
| --- | --- |
| Application/configuration sources | All 2,045 selected original files are captured, with baseline and prepared views. |
| Original integration source | Five original files are retained under their runtime-integration paths. |
| Direct dependency versions | All 47 observed installed versions are recorded for the specified prepared borrowed dependency tree. |
| Project lockfile | A qualified application-root lockfile is still missing. The borrowed main lock differs for six direct packages; the installed-tree lock records the observed versions. Both original files are retained as provenance. |
| Operational helpers | The original package references 94 distinct helper paths outside this selection. Their actual current source/version recovery remains open. |
| Public assets and links | The original public tree, ten nested readonly asset views and 27 recorded symlinks require separate recovery and rights reconciliation. No replacement images or assets were generated for this import. |
| Node/container/runtime | Exact runtime version and complete version-specific notices/source relationships remain open. |
| Protected configuration and data | Restore through the responsible runtime owner from protected backups; these values and data exports are outside Git. |
| Original product history and other WIP | Preserve the remaining mixed history, current Member/native/Core variants and coding documents alongside their exact version bindings. |

The captured package build entry is next build --webpack. Its presence does not prove that the source capture builds in a fresh environment. The qualified recorded build setup used borrowed dependencies and original public views that are not bundled here.

The environment example is derived from direct process.env references. It contains names and empty values; it does not establish the complete required/optional configuration policy.

Choose the exact source tag and qualified inputs from the component/artifact index. Source preservation, dependency recovery, a successful new build, runtime adoption and customer/rights acceptance are separate checks.

## Exact source checkout

The original capture includes its existing line endings. For the immutable capture tags, disable automatic line-ending conversion when cloning and switching to the tag:

    git -c core.autocrlf=false clone https://github.com/CraysCircle/crays-platform.git
    git -C crays-platform -c core.autocrlf=false switch --detach shared-web-source-state24-20261108

The application directory also carries a byte-preserving attributes rule on the current branch. Compare captured source blobs against source-capture.json. The [anonymous GitHub readback record](../provenance/github-readback.json) identifies the already verified source revisions.
