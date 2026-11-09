# Fixed first-party translation/video instruction batch — source only

Runtime files: `compose-translation-video-batch.mjs`, `TRANSLATION_VIDEO_BINDINGS.json`, `baseline/V53_WEATHER_BINDINGS.json`. The baseline composer copy is provenance only, not imported. Do not deploy tests, README, source/proof inventories.

`composeTranslationVideoBatch(base,{assertInvocationCurrent})` is the exact current V53 owner adapter. `composePersonalTranslationVideoInstructions(base,{agentId,baselineInstructionNames,assertInvocationCurrent})` is the channel-independent fixed-two-guide function; its host-selected baseline is not proof of account/role authority. Both require a synchronous assertion returning undefined; promises/async callbacks/thenables are denied. `assertTranslationVideoBatchProfile(config,options?)` is a pure structure assertion, no currentness or authority claim. Default profile options describe this V53 owner; generic callers pass explicit agentId and ordered 30-name baseline.

Only the chosen agent skills, skills entries and extraDirs change. All unrelated references, including other agents, tools, plugins, credentials, routes, TTS, records, Cron and defaults are preserved. There are no stores/providers/CLIs or new grants. The 32-profile is all-or-none and revalidated for idempotence.

Two artifacts contain exact V2 SKILL bytes. Their proposed Root suffix is SHA256 of SKILL.md, expressly not the manifest SHA. Manifest has a separate bytes/hash pin. No Root publication exists or is implied by these paths. Live Memory/Weather code is unchanged. Original 026/029/036 activation counts do not change.

32 focused pure tests passed; this is not original loader, native full-gateway, provisioning or delivery qualification. Actual downstream shared-guard/gateway integration is a separate source review.
