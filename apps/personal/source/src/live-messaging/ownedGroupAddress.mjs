/** Routing syntax only. A matching address grants no group access: the current
 * Core directory and the account's actual MLS membership must still admit it. */
export function isOwnedGroupConversationAddress(value) {
 return typeof value==='string'&&(/^circle:(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(value)||/^spot:crays-demo-01a1863a-v1-spot-[0-9]{4}:(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(value));
}
