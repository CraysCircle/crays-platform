# TLS19 DNS01 bootstrap sources

These three original CRAYS operations programs preserve a finite, two-phase DNS01 certificate bootstrap for nineteen public CRAYS names and its separately reviewed Ubuntu library preparation. They are a historical source archive. Publishing them does not establish certificate issuance, installation, public reachability, or a completed renewal setup.

## Files and responsibilities

| Original program | Purpose |
| --- | --- |
| [official_dns01_two_phase.candidate.py](official_dns01_two_phase.candidate.py) | Uses the official Python ACME client in separate begin and finalize phases, with exclusive intents and private state custody. |
| [refresh_and_simulate.candidate.sh](refresh_and_simulate.candidate.sh) | Creates a separate APT metadata/cache namespace, uses Ubuntu HTTPS repositories and produces an exact installation simulation for Root inspection. |
| [install_exact_libraries.candidate.sh](install_exact_libraries.candidate.sh) | Performs the separate installation step with acme 2.9.0-1 and josepy 1.14.0-1 package pins, no upgrades/removals/recommends, then queries acme, josepy and rfc3339 package status. |

The nineteen names are nine apex/www pairs plus member.crays.world. Exact filenames, source locations, byte lengths and SHA-256 values are recorded in [source-capture.json](source-capture.json). The original filenames and comments remain unchanged.

## Two phases and private boundary

The begin phase is designed to generate an ACME account key, a certificate key and a nineteen-name CSR inside Root-controlled private storage. It requires an explicitly supplied contact and acceptance of the exact live directory terms URL, creates one account and one order, and emits DNS01 owner/value pairs. It does not acknowledge challenges.

The finalize phase reconstructs that same account/order/CSR. Before challenge acknowledgement it requires a fresh proof bound to the exact challenge file: nineteen owners checked against two fixed authoritative nameservers each, giving thirty-eight authoritative answer rows. It then obtains and checks the returned chain, exact SAN set, generated public-key relationship, validity and system trust. An exclusive finalize intent prevents blind application replay.

Only program text is included here. Private keys, account/order resources and URLs, contact inputs, DNS proof inputs, challenge values, certificate bodies and runtime result files are excluded. The private pathname in the original program is a technical boundary, not exported private state. This publication does not execute APT, ACME, DNS, OpenSSL, Caddy or an application.

## Renewal and adoption remain separate

The source peer review records a future handoff from the bootstrap certificate to native Caddy HTTP01 renewal after actual Caddy policy/adaptation, authoritative DNS, public ports 80/443, challenge routing and certificate selection are independently verified. The bootstrap certificate must be retained until that handoff is actually qualified. No installed Caddy renewal policy, successful renewal or complete ingress transition is claimed by this archive.

The APT source pins two requested Python packages. The separately reported three-library installation outcome belongs to Root runtime receipts; it cannot be proved from these scripts alone, and this archive does not assert that the rfc3339 version was explicitly pinned by the install command.

## Provenance and licenses

Root supplied these exact source hashes and the independent source review b0161631b4eaa38eab74ffc9f08a83dddc42a0c6a9796add74eb45524a5e3611. Its source-only PASS includes comparison with official Certbot ACME v2.9.0 APIs and a qualified future renewal plan; it is not a runtime or deployment acceptance.

All three original program bodies are preserved byte for byte. No original copyright or license text has been removed or replaced. These are CRAYS orchestration sources using external packages and system tools. Their publication creates no new blanket license grant over Python ACME, josepy, cryptography, Ubuntu packages, OpenSSL or Caddy. Applicable original upstream terms and existing file-scoped CRAYS licensing boundaries remain separate. Dependency packages, package notices and a complete execution environment are not bundled here.

Return to [operations](../README.md) or the [platform guide](../../README.md).
