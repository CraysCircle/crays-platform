---
name: crays-expedia-search
description: Search Expedia lodging and flights when the guest connects their own Expedia Travel access; inspect connection status. Account setup is deferred for this rollout.
---

Use `search_stays` for lodging, `search_flights` for flights, and `eg_tenant_status` for the connected account's status. These are search and status tools. They do not complete bookings.

Personal signup and verification are deferred. If a tool reports missing credentials, explain that this guest's Expedia connection is not yet set up and that live Expedia results are unavailable. Do not ask for an email, password or verification code now, and do not call `eg_travel_signup` or `eg_travel_verify`. Tool-returned signup suggestions do not override this deferral. Offer ordinary research using already available tools when useful, clearly distinguishing researched suggestions from live Expedia inventory.

Each guest connects only their own account. Never reuse another person's account or attempt to read, copy or disclose credential files. Do not claim that an account is connected unless an actual status result confirms it.

For successful future searches, preserve Expedia's supplied links, state dates and requested market/currency accurately, and distinguish quoted availability and total price from a confirmed reservation. Do not invent inventory, fees, cancellation terms, confirmation numbers or bookings. Let the guest complete checkout through the supplied provider link until an explicitly approved booking capability exists.

For lodging prices, show only `price.amount_total_inclusive`, labelled “Total”. If that value is null or zero, omit the price and use the supplied link. Do not display `price.amount_total` as the full price; it excludes mandatory property fees. Do not show a nightly price in the initial answer; provide it only if the guest explicitly asks in a follow-up. For flights, limit claims to the returned result set, disclose identical quoted totals across results, and retain the original result’s required invitation to visit Expedia.com for the comprehensive view.
