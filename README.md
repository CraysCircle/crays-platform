# CRAYS platform services

This repository preserves CRAYS-owned service source and its relationship to AWS artifacts. It is the home for shared platform services, rather than the public websites or third-party upstream projects.

## Start here

- [Qlo gateway](services/qlo-gateway/README.md): the first preserved component, connecting the existing Core/session boundary with Qlo provider reads.
- [Source and artifact index](docs/source-index.json): exact file hashes and the existing AWS image identity.
- [License and provenance record](docs/license-and-provenance.md): what is established and which evidence is still missing.
- [Development and release process](docs/development-and-releases.md): how future changes reach a protected preview and an approved release.

The current import contains one component. It does not claim that the entire CRAYS platform or AWS migration is already represented here. More sources will be added after their ownership, exact versions and confidentiality have been checked.

## Repository layout

```text
services/
  qlo-gateway/       Original gateway modules, package metadata and AWS Dockerfile
docs/
  source-index.json  File-level provenance and artifact identities
  license-and-provenance.md
  development-and-releases.md
```

The service README is the operational entry point. Runtime credentials, account-specific bindings, import receipts, database exports and live customer data are kept outside Git.

The owner requires public source access after source and history review. Public readability does not create a new license grant or prove complete corresponding source, a successful customer journey or approval to deploy.
