# Vendure native asset delivery and provider integration

This folder preserves seven source-only operations programs for the existing Vendure service. The files are versioned implementation references. Their publication does not launch a controller, change a container, grant an execution window, or establish successful runtime adoption.

| File | Responsibility |
| --- | --- |
| `original-asset-delivery-controller.compiled07.rev02.cjs` | Compiled CommonJS asset-delivery controller integrating with NestJS and Vendure. |
| `vendure-native-provider-wrapper.rev01.cjs` | Loads the existing Vendure configuration and asset controller, then delegates to the existing service entry point. |
| `vendure-same-cid-release01.rev03.py` | Applies or reconciles a qualified integration in the existing container identity, with generation and admission checks. |
| `vendure-root-slot-dispatcher.rev01.py` | Dispatches the qualified operation under the Root execution-slot and physical-return checks. |
| `vendure-native-verify-format-outcome.rev01.cjs` | Native Node verifier source with bounded checks, explicit closed outcomes and format handling. |
| `vendure-native-verify-closed-runner.rev01.py` | Python helper fragment that captures the native verifier's finite outcome using context supplied by the paired controller. |
| `vendure-native-verifier02-fresh-lease.rev01.py` | Python control source for the verifier under its separately admitted fresh lease and physical-return checks. |

Read [source provenance](source-provenance.json) for exact original source hashes and immutable source-only artifact versions. All seven program bodies are preserved byte for byte; source envelopes, admission/request templates, private launch inputs, credentials and environment contents are outside this public packet.

The controller imports `@nestjs/common` and `@vendure/core`; the wrapper delegates to existing application modules. These imports do not include the framework implementation or its complete dependency source. Original third-party licenses and notices continue to apply. This folder adds no blanket license grant to Vendure, NestJS, existing application modules, or other dependencies; the original selected program bodies contain no license headers to replace.

The independent source/lifecycle review is bound to these exact four versions. Its source-only qualification is separate from execution admission and from runtime evidence. No preserved program was executed while preparing this publication.

The three additional native-verifier programs are the exact nodeSource, closedRunnerSource and source fields from two pinned source-only artifacts. Their two independently versioned Root reviews are recorded in the provenance map. The closed runner is a helper fragment, not a standalone entry point: the verifier02 control source supplies its context and embeds the exact selected Node and runner bodies with its shared/physical guards. These preserved sources are not standalone setup commands. Only those code fields are published: all other source-envelope fields and all approval/request templates and private inputs remain excluded. The source reviews do not approve execution, prove native Node absence, or establish verifier success, real-owner authentication, customer acceptance or current runtime adoption.

Return to the [repository entry point](../../README.md).
