/** App-created independent Spots cannot provision or claim a CRAYS franchise. */
export const craysFranchiseURL='https://www.crays.pro/';
export const craysFranchiseMessage='CRAYS Club, Gym, Coffee Bars and Shops are established through crays.pro with a franchise agreement and authorised SaaS access. They cannot be created in this app.';
const normal=(v:unknown)=>typeof v==='string'?v.normalize('NFKC').replace(/\p{Cf}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,''):'';
export function isCraysBrandSetup(c:unknown):boolean{if(!c||typeof c!=='object')return false;const x=c as Record<string,unknown>;return ['name','organisation','type','brand','brandId','vertical','franchiseBrand'].some(k=>normal(x[k]).includes('crays'));}
