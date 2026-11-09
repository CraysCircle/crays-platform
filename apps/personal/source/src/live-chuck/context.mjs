import {createChuckFetchTransport,contactSetup,immutable,fail} from './protocol.mjs';
/** Authenticated fixed Personal-Core identity read. The general Web/member DTO
 * only triggers lifecycle reset; it never supplies the Personal-Core account.
 * This metadata is expected-context hygiene, never a caller identity/grant. */
export async function resolveChuckWebContext({fetch:fetcher=globalThis.fetch,signal}={}){
 if(typeof fetcher!=='function')throw fail('invalid-transport');
 const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000);
 let accountScope;
 const execute=createChuckFetchTransport({fetch:async(url,init)=>{const response=await fetcher(url,init);accountScope=response.headers.get('X-Crays-Web-Account-Context');return response;}});
 const setup=contactSetup(await execute('NativeEmailSetup',{}, {signal:requestSignal}));
 if(signal?.aborted)throw fail('cancelled');
 if(!setup.accountMapped||typeof accountScope!=='string'||!accountScope.length||accountScope.length>200||/[^\x21-\x7e]/.test(accountScope))throw fail('invalid-response');
 return immutable({accountScope,setup});
}
