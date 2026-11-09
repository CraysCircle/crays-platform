/** Bounded original-entry reads; expiration never creates an account or grant. */
export function withWorkspaceEntryDeadline(operation,{signal}={}){
 if(typeof operation!=='function')return Promise.reject(Error('WORKSPACE_ENTRY_OPERATION_REQUIRED'));
 return new Promise((resolve,reject)=>{
  const controller=new AbortController();let settled=false,timer;
  const finish=(ok,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);if(ok)resolve(value);else reject(value);};
  const cancel=()=>{finish(false,Object.assign(Error('Workspace entry cancelled'),{code:'WORKSPACE_ENTRY_CANCELLED'}));controller.abort();};
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted){cancel();return;}
  timer=setTimeout(()=>{finish(false,Object.assign(Error('Workspace entry timed out'),{code:'WORKSPACE_ENTRY_TIMEOUT'}));controller.abort();},20000);
  Promise.resolve().then(()=>{if(controller.signal.aborted)throw Error('WORKSPACE_ENTRY_CANCELLED');return operation(controller.signal);}).then(value=>finish(true,value),error=>finish(false,error));
 });
}
