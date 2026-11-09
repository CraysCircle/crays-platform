/** A short renewable call-scope lease from an explicitly supplied authority read.
 * No relay URL or shared membership creates a grant. Host owns the authoritative
 * read port; a failed/stalled renewal aborts ongoing devices as well as new signals. */
export function createCallAccessLease({binding,readAdmission,isAccountCurrent,signal,ttlMs=10000,refreshMs=2000}){
 if(!binding?.accountId||!binding?.conversationId||typeof readAdmission!=='function'||typeof isAccountCurrent!=='function'||!signal?.addEventListener||ttlMs<1000||ttlMs>30000||refreshMs<100||refreshMs>=ttlMs/2)throw Error('Explicit bounded call admission lease required');
 const scope=Object.freeze({...binding}),lifetime=new AbortController();let expiry,refresh,closed=false,started=false,validUntil=0,reading=false;
 const close=()=>{if(closed)return;closed=true;clearTimeout(expiry);clearTimeout(refresh);signal.removeEventListener('abort',close);lifetime.abort();};
 const current=()=>!closed&&!signal.aborted&&!lifetime.signal.aborted&&isAccountCurrent(scope)===true;
 const admitted=()=>current()&&validUntil>Date.now();
 const renew=async()=>{
  if(reading||!current()){if(!current())close();return false;}reading=true;
  try{const granted=await readAdmission(scope,{signal:lifetime.signal});if(!current()||granted!==true){close();return false;}validUntil=Date.now()+ttlMs;clearTimeout(expiry);expiry=setTimeout(close,ttlMs);refresh=setTimeout(()=>void renew(),refreshMs);return true;}catch{close();return false;}finally{reading=false;}
 };
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 return Object.freeze({signal:lifetime.signal,isAuthorized:admitted,
  async start(){if(started)throw Error('Call scope lease already started');started=true;if(!current()){close();throw Error('Call scope is not current');}expiry=setTimeout(close,ttlMs);if(!await renew())throw Error('Call scope is not admitted');},close,
 });
}
