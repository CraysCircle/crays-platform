# Vendure native asset delivery and provider integration

This folder preserves four source-only operations programs for the existing Vendure service. The files are versioned implementation references. Their publication does not launch a controller, change a container, grant an execution window, or establish successful runtime adoption.

| File | Responsibility |
| --- | --- |
| `original-asset-delivery-controller.compiled07.rev02.cjs` | Compiled CommonJS asset-delivery controller integrating with NestJS and Vendure. |
| `vendure-native-provider-wrapper.rev01.cjs` | Loads the existing Vendure configuration and asset controller, then delegates to the existing service entry point. |
| `vendure-same-cid-release01.rev03.py` | Applies or reconciles a qualified integration in the existing container identity, with generation and admission checks. |
| `vendure-root-slot-dispatcher.rev01.py` | Dispatches the qualified operation under the Root execution-slot and physical-return checks. |

Read [source provenance](source-provenance.json) for exact original source hashes and immutable source-only artifact versions. The four program bodies are preserved byte for byte; source envelopes, admission/request templates, private launch inputs, credentials and environment contents are outside this public packet.

The controller imports `@nestjs/common` and `@vendure/core`; the wrapper delegates to existing application modules. These imports do not include the framework implementation or its complete dependency source. Original third-party licenses and notices continue to apply. This folder adds no blanket license grant to Vendure, NestJS, existing application modules, or other dependencies; the original selected program bodies contain no license headers to replace.

The independent source/lifecycle review is bound to these exact four versions. Its source-only qualification is separate from execution admission and from runtime evidence. No preserved program was executed while preparing this publication.

Return to the [repository entry point](../../README.md).
