interface ExpiringPublicOriginal {readonly event:{readonly tags:readonly (readonly string[])[]}}
export function publicExpirationMilliseconds(event:ExpiringPublicOriginal['event']):number|null;
export function visiblePublicOriginals<T extends ExpiringPublicOriginal>(originals:readonly T[],now?:number):readonly T[];
export function nextPublicExpiration(originals:readonly ExpiringPublicOriginal[],now?:number):number|null;
