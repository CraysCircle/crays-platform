# Commerce and membership

CRAYS connects membership and commerce interfaces to a dedicated commerce provider. The CRAYS-owned Clubs Commerce BFF keeps application requests and provider integration in a separate service; Vendure is the underlying commerce application in the preserved provider evidence.

## Follow the implementation

- [Clubs Commerce BFF](https://github.com/CraysWorld/crays-platform/tree/a9e950d5403f39750dfe6fa644f7bf2aac044a10/services/clubs-commerce-bff) contains the original service, library, build inputs, test source and dependency notices.
- [server.mjs](https://github.com/CraysWorld/crays-platform/blob/a9e950d5403f39750dfe6fa644f7bf2aac044a10/services/clubs-commerce-bff/server.mjs) and [lib.mjs](https://github.com/CraysWorld/crays-platform/blob/a9e950d5403f39750dfe6fa644f7bf2aac044a10/services/clubs-commerce-bff/lib.mjs) are concrete service entry points.
- [Shared web application](https://github.com/CraysWorld/crays-platform/blob/main/apps/web/README.md) explains the qualified Club/Member application compositions and their separate configuration requirements.
- [Original BFF test source](https://github.com/CraysWorld/crays-platform/blob/a9e950d5403f39750dfe6fa644f7bf2aac044a10/services/clubs-commerce-bff/test.mjs) preserves the original test contract; its publication is not a new test result.

The original provider source record identifies Vendure **3.7.1**, CRAYS source package **3.7.1-crays.30** and Node **22.18.0**. These describe the cited preserved provider snapshot. The BFF source publication does not by itself establish that every current commerce container uses that exact revision.

## Work on this area

Begin with the BFF README, package scripts and sanitized configuration example. Review the application/provider contract before changing either side. Useful contributions include clearer API contract documentation, meaningful integration tests using synthetic data, and exact mapping of the CRAYS provider customizations to their upstream revision.

Provider credentials and original customer state are separate recovery inputs. A development setup needs an explicitly configured test provider and account boundary; the archive is not a turnkey production runner.

## Integration status

The existing provider evidence includes ERP projection and historical-import settings. In that snapshot real money movement was disabled and ERP dispatch was deferred; the separate Vendure source, patch, runtime and notice relationships still need a complete public developer release. Published BFF source and dependency notices are concrete starting points, while payment, fulfillment and end-to-end customer acceptance require their own evidence.

[Back to services](README.md)
