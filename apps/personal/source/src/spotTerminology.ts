/** Presentation only: source contracts, category discriminators and space:* IDs remain unchanged. */
export function spotLabel(value: string): string {
 return value.replace(/\bBoardy\b/g, 'Chuck').replace(/\bSpaces\b/g, 'Spots').replace(/\bSpace\b/g, 'Spot').replace(/\bSPACES\b/g, 'SPOTS').replace(/\bSPACE\b/g, 'SPOT');
}
/** Migrate built-in filters only; personal text is never rewritten. */
export function spotInboxFilter(value: string): string {
 return value === 'Space contacts' ? 'Spot contacts' : value === 'New in your Spaces' ? 'New in your Spots' : value;
}
