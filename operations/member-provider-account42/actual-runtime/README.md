# Member42: exact runtime boot and currentness sources

This directory preserves the two original operations sources from the recorded Member42 release. They connect the Member runtime boot and currentness witness to that release; they are separate from the application provider-account fix preserved at platform commit c6122b268ccd499e20eb3ec186e05fdcb5a65ea6.

| Original file | Bytes | SHA-256 |
| --- | --- | --- |
| [member_rds_runtime_boot.cjs](member_rds_runtime_boot.cjs) | 1364 | 76f74910dc11bc9ca9c00c3599bbee0073b0298c4bbd1e0d2b9f242f3bc8e2e1 |
| [serve_exact_member42_common_currentness.py](serve_exact_member42_common_currentness.py) | 8950 | 95b381ef86afec2efe4ab785cfd4cbc25008089aaadf918057147d7a5e3312cf |

[source-capture.json](source-capture.json) records the original source paths, hashes and pinned Root adoption receipt. Both bodies are preserved unchanged. The Python source was parsed as syntax; neither original program was executed during capture.

Root identifies these as its own public derivatives of earlier Member26 operations code: the boot binding changes BUILD_ID 26 to 42, and the currentness witness changes the Member CID and ExecStart path to actual 42 while retaining validators. That modification description is a Root statement. This capture did not independently locate a pinned public Member26 preimage, so it does not present an independently computed complete26-to 42 diff.

These are operations sources, not a standalone application setup or permission to start a second stack. Private environment files, principal/runtime-policy inputs, cookies, customer records and authentication values are outside the capture. No runtime, identity provider, database, ingress, domain or deployment was changed for this preservation.

The originals contain no inline license/copyright notice. This capture introduces no new license text and makes no blanket rights or legal-compliance claim; existing component and third-party rights remain separate. Root declared the two bodies to be its own public derivatives. Exact original26 source/notice relationships remain a clearly recorded provenance limit, without replacing or inventing a license.
