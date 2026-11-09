# Member messaging module50: installation revision04

These are the exact operation sources for staging and adopting the original Member messaging transport and its Club module registry. Read the [Member transport](../../../services/member-club/source50/README.md) and [original messaging/Nostr transport](../../original-messaging-nostr-transport50/README.md) for the application boundary; this directory explains the corresponding staging, generation and ingress programs.

## Source roles

| Source | Purpose |
| --- | --- |
| [stage_immutable_module50.rev04.candidate.py](stage_immutable_module50.rev04.candidate.py) | Stages the exact immutable source inputs and retained48 history assets in a separate history copy, preserving original filenames and hashes. |
| [install_exact_current_module50.rev04.candidate.py](install_exact_current_module50.rev04.candidate.py) | Binds the staged receipt and generation guards before the narrowly scoped container transition. Revision04 accounts for the retained history directory as an additional read-only mount. |
| [project_exact_club_registry50.rev02.candidate.py](project_exact_club_registry50.rev02.candidate.py) | Projects the original Club registry entry while retaining other registry rows. |
| [finish_module50_current_generation.candidate.py](finish_module50_current_generation.candidate.py) | Performs the finite generation/currentness and physical-return checks around the original lifecycle sequence. |
| [module50_current39_ingress.candidate.py](module50_current39_ingress.candidate.py) | Applies the original finite ingress projection and associated return checks. |
| [classify_exact_member50_runtime_addons.candidate.py](classify_exact_member50_runtime_addons.candidate.py) | Classifies the exact33 retained source/package entries into the expected witness and policy sets. This is the module50 classifier, distinct from the retained module46 classifier. |

All six programs are unchanged originals. [source-capture.json](source-capture.json) records their byte sizes, SHA256 hashes, exact source-version authority and independent source-review receipt hashes. The final revision04 delta review covers stage/install changes and reuses the unchanged revision03 review for the projector, finisher, ingress and classifier. The review reports preserved64/62 witness/policy bounds; those source-review statements are not a fresh runtime test result.

## Read or recover the source

Use the six files here together with the exact existing helper references and basename restoration map in [source-capture.json](source-capture.json). Six inherited helper bodies were independently matched to immutable public originals. The ingress helper is deliberately restored under its required module50 basename by an unchanged byte copy; a filename similarity is not evidence of byte equality.

The recovery-payload helper is bound to its exact previously published recovery-revision03 original; the differently hashed successor-payload program is not substituted. The source also depends on its original qualified helper context, descriptors, built assets and runtime inputs. These are operation sources for inspection and controlled recovery, rather than a standalone installation recipe.

Do not run these programs against a live system merely because they are published. Private approval and bound-input JSON, credentials and live runtime inputs are excluded. Earlier stage/install revisions are not substituted for revision04, and the already-published application transport sources are retained separately.

## Contribution and license boundaries

Review the history-copy and read-only mount invariants, registry projection, finite ownership and physical-return behavior against the original source and recorded hashes. Use the [contribution guide](../../../CONTRIBUTING.md) for changes and the [Member service guide](../../../docs/services/README.md) to find the application/service context.

This publication preserves source and review lineage. It does not grant deployment authorization, certify customer acceptance or declare complete runtime recovery. Existing component licenses and file-specific grants remain authoritative; this directory adds no blanket license and includes no private approval inputs.
