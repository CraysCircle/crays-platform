# Qlo gateway

The gateway is a small Node.js HTTP service between the existing CRAYS Core/session boundary and the Qlo provider. The preserved server handles session exchange and redemption, session inspection/logout, provider hotel reads, room-inventory and property-service projections, provider images and the operations entry point.

It reuses the original provider and session relationships. Pending inventory or service imports remain explicit states; this snapshot does not establish room availability, booking readiness, payment readiness or customer acceptance.

## Files and responsibilities

| File | Purpose |
| --- | --- |
| `server.mjs` | HTTP routing, Core/session interaction and Qlo provider requests |
| `provider-room-inventory.mjs` | Projects provider property/room inventory from the supplied receipt |
| `provider-property-services.mjs` | Projects provider property-service data |
| `package.json` | Original ESM package metadata and original test command |
| `Dockerfile` | Exact Dockerfile used for the existing AWS image30 build |

The four application files were imported unchanged from the retained original application capture. The Dockerfile was imported unchanged from the actual AWS build context. Their exact SHA-256 values are in [the source index](../../docs/source-index.json).

## Runtime and configuration

The accepted existing build evidence identifies Node.js 22.23.1. The Dockerfile pins its Node 22 Alpine base by digest and copies the three `.mjs` modules. It does not install npm dependencies or copy `package.json`. It retains the original `USER root`; this import does not silently change the runtime contract.

[.env.example](.env.example) documents variable names with deliberately non-working example hosts and external file paths. The application reads `process.env`; it does not automatically load this example file. Supply variables through an approved local runner or container environment.

Credential values belong in separately protected files. The provider import receipt contains runtime/business data and must also remain outside Git. Do not replace these files with invented credentials or copied production data.

## Development and build

For an authorized development environment, use a compatible Node 22 runtime. The source uses Node built-in modules and the two local projection modules.

The preserved image can be described by this build command from the repository root:

```sh
docker build -t crays-qlo-gateway:local services/qlo-gateway
```

That command is documentation, not a request to build or run a production replacement. No fresh build or runtime start was performed for this import. The existing image must not be described as a reproducible build from this Git commit until that relationship has been separately demonstrated.

## Tests and validation limits

The original `package.json` lists four test scripts. Those test files were not present in the five-file AWS source allowlist and are not included in this initial import. Consequently, `npm test` is **not** a passing verification command for this snapshot. Their source provenance and import remain open.

This import verifies file bytes against the supplied original/build pins and checks the committed files after publication. It reuses the already recorded image30 build evidence. It does not rerun the unchanged gateway, call provider APIs, change credentials, start a container or establish customer acceptance.

## Artifact and release status

- Existing Docker image ID: `sha256:190ad343504d8807d1cebaadccf37c3c4858114175fe844100e874a90cf92686`.
- Existing build evidence: image30, command `a87168c1-983a-4a21-9f7d-8763715bc56b`.
- A Docker image ID is not a registry manifest digest. No registry manifest digest is asserted here.
- Runtime wrappers, account bindings and later configuration revisions require their own source/version records.
- Source publication does not approve starting or exposing the service.

Read [license and provenance](../../docs/license-and-provenance.md) before treating this as a release-ready component.
