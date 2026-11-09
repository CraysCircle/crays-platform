# Spot access and Personal / Chuck: seventeen working-source originals

Use this snapshot to inspect the original Spot access interfaces and the staged Personal / Chuck preference integration. The files preserve selected working revisions from their original project paths; they do not replace the canonical [Personal application](../../apps/personal/README.md), [shared web application](../../apps/web/README.md) or [Personal / Chuck guide](../../docs/services/personal-and-chuck.md).

## Find the relevant source

| Area | Original source |
| --- | --- |
| Spot working application | [Original Prototype.tsx](spot/src/Prototype.tsx) |
| Personal / Chuck staged working application | [Distinct integration Prototype.tsx](personal-web/apps/web-runtime/integration/chuck-matching-preference-v406-20261102/source/web-runtime/src/Prototype.tsx) |
| Personal navigation routes | [Route definitions and helpers](spot/src/webPersonalNavigation.ts) |
| Community access | [React view](spot/src/WebSpotCommunityAccess.tsx) · [styles](spot/src/web-spot-community-access.css) |
| QR scanner presentation | [React view](spot/src/WebSpotQrScanner.tsx) · [styles](spot/src/web-spot-qr-scanner.css) |
| Arrival presentation | [React view](spot/src/WebSpotArrival.tsx) · [styles](spot/src/web-spot-arrival.css) |
| Payment records | [React view](spot/src/WebSpotPaymentRecords.tsx) · [record transformations](spot/src/spotPaymentRecords.ts) · [styles](spot/src/web-spot-payment-records.css) |
| Matching preferences | [Staged React view](personal-web/apps/web-runtime/integration/chuck-matching-preference-v406-20261102/source/web-runtime/src/WebCanonicalMatchingPreference.tsx) · [controller](personal-web/apps/web-runtime/integration/chuck-matching-preference-v406-20261102/source/web-runtime/src/live-chuck/preference-controller.mjs) |
| Host candidate preparation | [Original build controller](personal-web/apps/web-runtime/scripts/build-host-candidate.py) |
| Historical qualification evidence | [SDK source qualification](personal-web/apps/web-runtime/evidence/chuck-web-20261028/SERVER_ORIGINAL_SDK_QUALIFICATION.json) · [login-return result](personal-web/apps/web-runtime/evidence/chuck-web-20261028/global-window-v1/LOGIN_RETURN_RESULT.json) |

The payment and preference files contain application logic and runtime data relationships. Their presence does not establish a live payment, preference change or accepted customer flow. The two evidence files are historical qualification metadata: they explicitly do not establish real owner authentication, real Chuck acceptance or Core/model calls.

## Source relationships and recovery

The Spot files came from a working integration outside its recorded Git index/HEAD. The Personal / Chuck files came from recorded dirty working revisions. A repository HEAD alone cannot substitute for those exact original bytes. This separate snapshot keeps those relationships visible without applying them to another application composition.

[source-capture.json](source-capture.json) maps every file to its original source root and relative path, exact immutable archive version/member, byte count and SHA256. To reconstruct the selected source slice in a separate checkout, copy each original file to that recorded relative path and verify its size and SHA256. The map is source provenance, not authority to overwrite a running deployment. The snapshot now preserves all seventeen selected originals (3,729,870 bytes): the fifteen smaller files (85,820 bytes) and two complete, distinct Prototype.tsx working versions (3,644,050 bytes). The historical folder name retains source15 so existing links remain valid. These two versions retain their own original project and staged integration paths; neither is applied over the canonical application. A shared filename or related code does not make them interchangeable. This slice still omits imported modules, assets and complete build inputs; it is not a complete runnable application or a claim that a recorded build has been reproduced.

## Original terms

Original source bytes and any applicable original third-party terms remain unchanged. React, React DOM, @phosphor-icons/react, motion/react, qrcode, react-markdown and remark-gfm references are dependency boundaries; their implementations and complete dependency notices are not supplied by this slice. No license grant is inferred from a source filename, working directory or absent header, and this packet adds no new blanket license. Exact project/upstream licensing and complete dependency/source-offer closure remain separate questions; see the [repository licensing scope](../../LICENSING.md).

Source preservation performed no product/test execution, build, deployment or runtime adoption.
