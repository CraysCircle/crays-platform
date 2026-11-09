/** A view lease over an already admitted, still-live conversation transport.
 * Detaching a view does not re-authorize another account or cache a new grant.
 * The underlying client keeps its existing current-authority refresh/revocation
 * checks. Closing the account or the transport invalidates every view lease. */
export function leaseRetainedConversation(record,{signal,onSelect,onRelease}){
 const base=record.workspace,stop=new AbortController(),subscriptions=new Set();let closed=false,started=false;
 const closedSnapshot=Object.freeze({state:'closed',client:null,media:null,call:null,problem:null});
 const close=()=>{if(closed)return;closed=true;stop.abort();signal.removeEventListener('abort',close);base.signal.removeEventListener('abort',close);for(const unsubscribe of subscriptions)unsubscribe();subscriptions.clear();record.views--;if(record.views===0)base.getSnapshot().media?.cancelReads?.();onRelease?.(lease);};
 const check=()=>{if(!closed){base.recheck();if(signal.aborted||base.signal.aborted||base.getSnapshot().state==='closed')close();}return !closed;};
 const lease=Object.freeze({binding:base.binding,signal:stop.signal,getSnapshot:()=>check()?base.getSnapshot():closedSnapshot,
  subscribe(fn){if(!check())return()=>{};const unsubscribe=base.subscribe(()=>{check();fn();});subscriptions.add(unsubscribe);return()=>{subscriptions.delete(unsubscribe);unsubscribe();};},
  start(){if(started)return Promise.reject(Error('Conversation view already started'));started=true;if(!check())return Promise.reject(Error('Conversation view closed'));if(!record.startWork)record.startWork=base.start();return record.startWork;},
  recheck:check,close,async settled(){await record.startWork?.catch(()=>{});},
 });
 record.views++;signal.addEventListener('abort',close,{once:true});base.signal.addEventListener('abort',close,{once:true});if(check())onSelect?.(lease);return lease;
}
