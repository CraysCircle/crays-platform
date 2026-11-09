/** A pg Client emits an error after rejecting its queries on a lost idle socket.
 * Keep that connection-local error from killing the shared Web HTTP process.
 * No process-wide exception handler, query retry, or authorization change. */
export function installClientDisconnectGuard(Client) {
 const marker=Symbol.for('crays.own-web.pg-disconnect-guard.v1');
 if(typeof Client!=='function'||typeof Client.prototype?.connect!=='function')throw Error('PG_CLIENT_REQUIRED');
 if(Object.hasOwn(Client.prototype,marker))return Client.prototype[marker];
 const connect=Client.prototype.connect,attached=new WeakSet();let errors=0,clients=0;
 const state=Object.freeze({snapshot:()=>Object.freeze({clients,connectionErrors:errors})});
 Object.defineProperty(Client.prototype,marker,{value:state});
 Object.defineProperty(Client.prototype,'connect',{configurable:true,writable:true,value:function(...args){
  if(!attached.has(this)){
   this.on('error',()=>{errors++;});
   attached.add(this);clients++;
  }
  return Reflect.apply(connect,this,args);
 }});
 return state;
}
