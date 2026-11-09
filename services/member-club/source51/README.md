# Member document provider selector: source51

This original server-side source keeps the Member document provider selection compatible with the exact AWS backend flag. It is a narrow change to the existing provider-binding module; the [Member transport sources](../source50/README.md) remain separate.

For document selection only, the combination of backend value aws-member-v1 and an undefined native-provider binding selects the existing original Document24 private-test branch. The existing document target names and host predicates are retained. Other combinations continue through the original binding checks; the generic selector and Vendure/ERP selector behavior are unchanged.

The source imports the existing server-only boundary and local customer-provider admission reader. It does not contain that reader, the document handler, DAV provider, private principal, credentials or customer documents. This source change adds no provider account, authorization scope, redirect, retry or caller-selected destination.

## Exact source and delivery

[member073-native-provider-binding.ts](member073-native-provider-binding.ts) preserves all 2,090 original candidate bytes unchanged. [source-capture.json](source-capture.json) records its SHA256, original source filename, qualified predecessor hash, source-review receipt and restoration target:

src/lib/clubs/member073-native-provider-binding.ts

Preserve that path within its matching original application source composition and verify the byte count and SHA256. The predecessor and unchanged handler/provider hashes are reported by the pinned independent Root source review; this packet does not claim a new historical comparison or capture those additional source bodies.

The selector is compiled into the Next.js application. Publishing or copying this TypeScript file alone does not change the running route. Delivery requires a separately qualified, complete immutable Next bundle from the matching application baseline; editing a minified chunk is not an equivalent source delivery.

## Review and contribution boundaries

The independent source review reports no findings and reuses 249 existing pure selector checks without rerunning them. This is source evidence, not proof that a build was produced, that genuine customer document bytes were delivered or that runtime adoption succeeded.

Inspect the exact document-only branch and preserved host/binding predicates when proposing changes; follow the [contribution guide](../../../CONTRIBUTING.md). Original file-specific terms and upstream dependency rights remain authoritative. No original notice has been removed and this publication adds no blanket license grant. Private environment, admission, principal and runtime inputs are excluded.
