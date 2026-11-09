# Historical Nostr/Broker web and API source — 18 originals

This folder preserves 18 selected historical CRAYS web/API files (13 web routes and five API routes, 29,354 bytes). It records the exact versions matched to original deployment-source identities by the pinned Control62 evidence. It is a source recovery selection, not the current application, a runnable release or a runtime adoption instruction.

The web routes cover Candidate and Franchise Partner access, public Bank/Investor/Real Estate/Vendor entry pages, workspace entry pages, language status and a nonproduction portal bridge. The APIs cover administrator perspective, tenant sessions, Candidate read models/evidence and tenant membership lifecycle. Imported components, repositories and authentication helpers are referenced by the original source; their implementations and runtime records are outside this selection.

## Read and recover the originals

The files under [originals/src/src/app](originals/src/src/app/) retain the original deployment path spelling. The double src is intentional. [source-capture.json](source-capture.json) lists every original path, Git path, Git blob OID, raw-content SHA1, SHA256 and byte count.

For original-path recovery, copy each selected file to the exact originalPath recorded in the map and verify its SHA256 and byte count. For the historical Git source layout, map only src/src/app/<suffix> to crays-platform/src/app/<suffix>. The same exact 18 versions exist in all three recorded historical commits; this folder stores each version once. A raw-content SHA1 and a Git blob OID are different hashes.

The control evidence reports exact original deployment-UID matches for these 18 rows. Full deployment UID strings were not included in its selected metadata; this map preserves the supplied path/raw-hash relationship without manufacturing missing identifiers.

## Scope, privacy and original terms

All 18 source bodies were reviewed in full. Session, cookie, invitation, account and contact fields in these files are runtime input/output logic; no captured session, private credential, fixed customer record or private document payload was identified in the selected bodies. The nonproduction bridge remains unchanged source code, including its environment gates. This review is not a current application security assessment.

All original bytes are unchanged, including imports and any original comments. No new license is granted by this archive. External Next.js, Zod and Node.js dependencies are imported, not bundled here; their terms and the terms of other imported components remain separate.

Existing public shared-web and selected Core source indices did not contain these exact byte versions. That is a result within the checked indices, not proof of absence everywhere on GitHub. Held private Git objects are distinct from an offhost archive/member custody receipt. This finite addition does not establish complete deployment recovery, complete historical coverage, or closure of the wider 380-item preservation scope.
