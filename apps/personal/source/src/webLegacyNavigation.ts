/** Compatibility links carry selectors only, never drafts, approvals or callback arguments. */
const originalId = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,199}$/;
const locatorKeys = new Set(['personId','venueId','postId','objectId','walletId','sourceId']);
const purposes = new Set(['Socializing','Business','Dating']);
export function legacyOriginalId(value: unknown): string | undefined {
  return typeof value === 'string' && originalId.test(value) ? value : undefined;
}
export function readLegacyFeatureContext(raw: unknown): Record<string,string> | undefined {
  if(!raw || typeof raw !== 'object' || Array.isArray(raw))return;
  const result: Record<string,string> = {};
  for(const [key,value] of Object.entries(raw)){
    if(locatorKeys.has(key)){
      const id=legacyOriginalId(value);if(!id)return;result[key]=id;
    }else if(key==='purpose' && typeof value==='string' && purposes.has(value))result[key]=value;
    else return;
  }
  return result;
}
