# CRAYS Clubs Qlo gateway

This directory restores the source of the running XL container
`crays-clubs-qlo-gateway` into the canonical XXL development worktree.

- Recovered on: `2026-09-20`
- Recovered live path: `/app/server.mjs`
- Recovered SHA-256 before source changes:
  `968b12e4b0445709beb2887be3887b0e9e4be0112ac6c0154145fb9bbc0faf34`
- Recovered line count: `839`

The additive room-inventory endpoint is fail-closed and returns only the two
Forest City properties admitted by the sealed Qlo import receipt. Provider
IDs, room numbers, comments, guest data and cross-property rows remain inside
the gateway. A zero-room result is reported truthfully as
`physical_room_inventory_import_pending`; it is never filled with legacy
Palma or another vertical's inventory.

The live XL container is not rebuilt or replaced by source recovery alone.
Deployment requires the normal controlled release, backup, rollback and
runtime-verification gate.
