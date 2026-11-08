# Development and releases

This repository is the source checkpoint for shared CRAYS services. It does not deploy products automatically. GitHub Actions is disabled for the newly created repository during consolidation, and no deployment workflow is included.

## Required sequence

1. Develop the authorized change on a fresh XXL development environment.
2. Preserve the complete intended source and required documentation in Git/GitHub under CraysCircle. Keep secrets and live data outside Git.
3. Check repository workflows, Git provider connections and external deploy triggers before pushing. Use an isolated source branch when preparing a candidate.
4. Build through the authorized AWS/Amplify process and provide a protected preview.
5. Before release approval, reconcile the exact source commit, build inputs, resulting artifact identity, original licenses/NOTICE files, modifications and any required source availability.
6. Obtain the user's concrete release approval.
7. Publish through the responsible runtime/deployment owner and retain an identified rollback version.

A source import, successful compile, image existence, HTTP response or screenshot does not replace functional and rights acceptance. The AWS migration owner remains responsible for runtime operations and the final migration handoff.

## Version records

Each artifact record must distinguish source commits, Docker image IDs, registry manifest digests, framework build IDs and configuration revisions. Use the appropriate identity; do not substitute one for another.

The [source index](source-index.json) records the currently preserved gateway bytes and the existing image30 identity. The corresponding Git tag/commit and capture receipt identify this source snapshot. It is not a statement that a container has started, that a production site has switched over or that a customer journey passed.

## Changes and contributions

Keep each service self-contained under `services/<component>` with its own README and configuration example. Reuse existing native providers and preserve their account, document, version and image relationships. Explain the changed behavior and cite relevant validation in the commit or pull request. Add no placeholder tests, invented licenses or unverified feature claims.

For a source-preservation change, compare the imported bytes with the exact qualified originals. For a functional change, perform the checks appropriate to that behavior and retain the resulting evidence. Do not rerun unrelated acceptance solely because source files moved into GitHub.
