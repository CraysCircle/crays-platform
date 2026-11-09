/** In-process composition lifecycle only. Does not mint authority or allocate resources. */
export function createWorkbenchBaselineBootstrap(){
 let attempted=false,inflight=null;
 return async function seed({loadServerReferences,assertExistingResourceGate,register}){
  let references;try{references=await loadServerReferences();}catch{return{status:'PENDING_SERVER_BOOTSTRAP_BINDINGS',registered:false};}
  try{await assertExistingResourceGate(references);}catch{return{status:'PENDING_BOOTSTRAP_RESOURCE_GATE',registered:false};}
  // One constructor/hash attempt per actual server process; no user-triggered retry loop.
  if(inflight)return inflight;
  if(attempted)return{status:'PENDING_RUNTIME_HOST',registered:false};
  attempted=true;
  inflight=(async()=>{try{return await register(references);}catch{return{status:'PENDING_RUNTIME_HOST',registered:false};}})();
  return inflight;
 };
}
