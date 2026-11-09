# Member42 installation, coordination and ingress source versions

This archive keeps the exact source versions explicitly bound by the Member42 installation, family-coordination and ingress source manifests. It adds 12 named operations programs and one historical projector preimage to the separately captured runtime boot/currentness sources. Reading this archive does not run those programs or authorize a runtime change.

## Find the right version

- install/: the captured named installation and coordination sources.
- ingress/: the captured controlled-ingress sources.
- preimages/: explicitly bound earlier source versions, preserved separately from the later named files.

| Source relative to this archive | Bytes | SHA-256 | Version role |
| --- | --- | --- | --- |
| [install/project_exact_member42_successor_payloads.candidate.py](install/project_exact_member42_successor_payloads.candidate.py) | 4916 | f883e97858e8e211c7824698f85179af0761136fe845ce237456529b07f0f185 | captured named case source |
| [preimages/install/stage_exact_completed_member42_release.before-common-mode-fix.py](preimages/install/stage_exact_completed_member42_release.before-common-mode-fix.py) | 9528 | f55ef9c2d68d02c89334175b45f905f12052a14ad972f1643254b6a16e081cba | historical preimage |
| [install/stage_exact_completed_member42_release.candidate.py](install/stage_exact_completed_member42_release.candidate.py) | 9551 | 4737775eb9e79e9cf4bd9a56c9f414e4a4f60cff5dedf0cb1d7bb74d0cfc6bfe | captured named case source |
| [install/classify_exact_member26_runtime_addons.candidate.py](install/classify_exact_member26_runtime_addons.candidate.py) | 1679 | fd6d3a5f28138a395f429e60367480c2bacbeec689d97b747fb125e840928938 | captured named case source |
| [install/classify_exact_member42_runtime_addons.candidate.py](install/classify_exact_member42_runtime_addons.candidate.py) | 1679 | 9278909c2759f014a0b897f0823ec8963a21db497b3e366d826cfa65ea728039 | captured named case source |
| [install/derive_exact_member42_anchor_generation.candidate.py](install/derive_exact_member42_anchor_generation.candidate.py) | 6363 | 6b1f876a93b6bcd1dc30402fa707689054f22ede413aa51222fad79d7a4a99b5 | captured named case source |
| [install/finish_current_member42_generation.candidate.py](install/finish_current_member42_generation.candidate.py) | 31671 | 99e17147d347b23d4e8e16c88e2fd42653567e029b68fef203b53c77dbd88995 | captured named case source |
| [install/listener.nostr18-machine57-team33.candidate.mjs](install/listener.nostr18-machine57-team33.candidate.mjs) | 5011 | 7e8b668caf10118d84082f8fd68a63e390a3ee36a2e0da7b022a06d7203fa5bb | captured named case source |
| [install/member42_lifecycle.candidate.py](install/member42_lifecycle.candidate.py) | 30629 | 7cf279f08cdbd710d95074bf9d454b038e26b3a8966a3e2d446aab63da15eabf | captured named case source |
| [ingress/member42_current39_ingress.candidate.py](ingress/member42_current39_ingress.candidate.py) | 20078 | 4535e4cff0e497671784f52635f9569c8cfe53cf708f80b40e236766299918a4 | captured named case source |
| [ingress/project_exact_seven_member42_ingress.candidate.py](ingress/project_exact_seven_member42_ingress.candidate.py) | 2202 | 78c4b4a55c53c743b4db880a7d1bac46b7bfa75588242aaba876152875ccdb94 | captured named case source |
| [ingress/qualified_container_physical.py](ingress/qualified_container_physical.py) | 23361 | 63b137e94a98cebdfc456a83efabd907f64b4e34ac39fe59fbf364553f3b0bdb | captured named case source |
| [preimages/install/project_exact_member42_successor_payloads.before-sdk-mirror.py](preimages/install/project_exact_member42_successor_payloads.before-sdk-mirror.py) | 4857 | 505a9bf272fd5f801318e8809a558759f0ef6ae29de9797380aaee1d70241beb | historical preimage |

[source-versions.json](source-versions.json) maps each body to its exact original source-case path and matching manifest pin. The older install manifest binds projector SHA505a9bf…; its exact body is the retained before-sdk-mirror preimage. The coordinator binds the distinct later named projector SHAf883e978…. Both versions are preserved; neither historical label is treated as proof of actual runtime execution.

The earlier 13-version subpacket kept the anonymous Auth0 probe separate pending source review. That review is now complete: the exact original is available in the [probe source addendum](probe/README.md), with its hash and coordinator binding in [probe/source-capture.json](probe/source-capture.json). No current privacy redaction hold was identified in the probe body. A public provider-endpoint literal and protected input pathnames are source references, not embedded private credentials or customer records. Environment, principal, runtime-policy, cookies, customer and other protected input bodies were not included or read. No probe, installer, coordinator, ingress helper or original test was executed during capture or review.

No inline copyright or license notice was located in these exact bodies. Import metadata identifies standard-library use and a reference to a historical own helper; it is not proof that all external runtime/source dependencies have been preserved. No new or blanket license is assigned by this source capture. Third-party implementations, private operational inputs, source custody and any later file-specific CRAYS-owned license grant require their own exact scope.

This is a source-version archive. It does not declare all Member42 operations, historical helpers or actual deployment relationships complete. Any later use starts with the matching Root source manifest and current operational review, rather than running an archived candidate.
