/** Explicit fictional merchant examples. Not a provider/tenant grant or generic fallback. */
export const gymRetailVenueId='crays-gym-preview' as const;
export const merchantExampleVenueIds=['crays-coffee-bar-preview','crays-store-preview',gymRetailVenueId] as const;
export type MerchantExampleVenueId=typeof merchantExampleVenueIds[number];
export type ShippingExampleVenueId='crays-store-preview'|typeof gymRetailVenueId;
export function isMerchantExampleVenue(id:unknown):id is MerchantExampleVenueId{return typeof id==='string'&&(merchantExampleVenueIds as readonly string[]).includes(id);}
export function isShippingExampleVenue(id:unknown):id is ShippingExampleVenueId{return id==='crays-store-preview'||id===gymRetailVenueId;}
