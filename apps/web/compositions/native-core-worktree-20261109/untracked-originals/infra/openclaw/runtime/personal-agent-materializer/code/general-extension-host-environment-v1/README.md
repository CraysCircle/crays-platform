# General extension SDK child environment — inactive source increment

`prepare-dependencies.mjs` is byte-identical to the peer's v0.1.0 helper. It invokes the existing original dependency custody verifier; it does not execute OCR.

`prepareSdkHostEnvironment` captures the trusted server's existing data-only environment before asynchronous custody IO, obtains the verified original OCR bin and returns a frozen environment with that directory first in PATH. It neither changes process.env nor writes configuration. The environment can contain the host's existing private values: never log, persist, return through HTTP or hand it to model tools.

The fixed admitted SDK child must receive this environment at launch so both original loader eligibility and original prompt construction see the same PATH. The currently pinned server-materializer/host composition is unchanged and does not call this source yet. No default39/47 selection, runtime start, eight-plugin release approval, actor/effect/model/provider authority or live/new-user acceptance is supplied here. The pure composition export does not verify filesystem custody; only the async preparation composes the original verifier.

Seven actual environment component cases passed. They do not start an SDK child, execute original dependency verification, OCR, Core or a real new-user flow. Run with Node's built-in test runner on prepare-host-environment.test.mjs. Full original SDK/Core/native/new-user qualification remains required under normal resource admission.
