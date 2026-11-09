/** Show already admitted encrypted history while relay backfill connects.
 * Nothing may write or administer the group before actual SDK connection.
 * This is neither membership admission nor a successful-delivery receipt. */
export function createGroupConnectionGate({connect,isCurrent,signal,onChange=()=>{}}){
 if(typeof connect!=='function'||typeof isCurrent!=='function'||!signal?.addEventListener)throw Error('Current group connection required');
 let closed=false,state='connecting',pending=null,connection=null;const views=new Set();
 const current=()=>!closed&&!signal.aborted&&isCurrent()===true;
 const ready=()=>current()&&state==='ready';
 const notify=()=>{for(const fn of views)fn();onChange();};
 const check=()=>{if(!ready())throw Error('Wait for this group to connect before sending or changing it.');};
 const close=()=>{if(closed)return;closed=true;signal.removeEventListener('abort',close);connection?.unsubscribe();connection=null;state='closed';notify();views.clear();};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 function start(){
  if(!current())return Promise.reject(Error('Group access is no longer available'));
  if(ready())return Promise.resolve();if(pending)return pending;
  state='connecting';notify();
  const work=(async()=>{let opened;try{opened=await connect();if(!current()){opened?.unsubscribe();throw Error('Group access is no longer available');}if(typeof opened?.unsubscribe!=='function')throw Error('Actual group subscription required');connection=opened;state='ready';notify();}catch(error){if(current()){state='unavailable';notify();}throw error;}})();
  pending=work;void work.then(()=>{if(pending===work)pending=null;},()=>{if(pending===work)pending=null;});return work;
 }
 function guard(client){
  let previous,previousState,previousCurrent,snapshot;
  const target=client;
  const member=key=>{
   if(key==='getSnapshot')return()=>{const value=target.getSnapshot(),allowed=current();if(value!==previous||state!==previousState||allowed!==previousCurrent){previous=value;previousState=state;previousCurrent=allowed;snapshot=Object.freeze({...value,...(!allowed?{available:false,messages:[],rows:[]}:{}),connectionState:allowed?state:'closed',canSend:ready()&&value.canSend!==false,problem:value.problem??(state==='unavailable'?'This group could not connect. Refresh the conversation to retry.':null)});}return snapshot;};
   if(key==='subscribe')return fn=>{views.add(fn);const stop=target.subscribe(fn);return()=>{views.delete(fn);stop();};};
   if(key==='send'||key==='prepareAttempt')return(...args)=>{check();return target[key](...args);};
   if(key==='refresh')return async(...args)=>{await start();if(!current())throw Error('Group access is no longer available');return target.refresh(...args);};
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  };
  return Object.freeze(Object.fromEntries(Object.keys(client).map(key=>[key,member(key)])));
 }
 return Object.freeze({ready,start,guard,close,async settled(){await pending?.catch(()=>{});}});
}
