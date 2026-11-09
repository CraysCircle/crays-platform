/** A projection-specific empty/error is not a scope-wide revocation.
 * This selects confirmed authentication/contact/binding/context loss only.
 * It clears visible state through existing controllers; it grants no rights,
 * sends no request, and never changes stored pending commands or receipts. */
const phases=new Set(['unavailable','contact-required']);
const codes=new Set(['access-denied','binding-revoked','binding-changed','contact-required','contact-changed','context-changed','session-context-changed','sign-in-required']);
export function chuckScopeAuthorityLost(snapshot){return !!snapshot&&phases.has(snapshot.phase)&&codes.has(snapshot.problem);}
