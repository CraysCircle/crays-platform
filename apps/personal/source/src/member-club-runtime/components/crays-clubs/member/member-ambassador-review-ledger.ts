export type AmbassadorReviewCommand="start_ambassador_review"|"request_more_information"|"recommend_for_team_review"|"do_not_recommend";
export type AmbassadorReviewReference=Readonly<{type:AmbassadorReviewCommand;applicationOriginalId:string;expectedVersion:number;idempotencyKey:string}>;
type Receipt=Readonly<{status:"confirmed"|"not_committed"|"pending";applicationOriginalId:string;idempotencyKey:string;persistedReadbackVerified?:true;terminalNonCommitVerified?:true;revision?:number}>;
/** Normalized UI port only, not an installed SaaS API or an authority source. */
export type AmbassadorReviewPort={execute(input:AmbassadorReviewReference&{reason?:string}):Promise<Receipt>;maxReasonLength?:number;reconcile?(input:AmbassadorReviewReference):Promise<Receipt>};
type Store={read():unknown;write(value:readonly AmbassadorReviewReference[]):void};
type Phase="idle"|"sending"|"uncertain"|"confirmed";
const commands=new Set(["start_ambassador_review","request_more_information","recommend_for_team_review","do_not_recommend"]);
function reference(value:unknown):value is AmbassadorReviewReference {
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const r=value as AmbassadorReviewReference;
 return Object.keys(r).sort().join("|")==="applicationOriginalId|expectedVersion|idempotencyKey|type"
  &&typeof r.applicationOriginalId==="string"&&r.applicationOriginalId.length>0&&r.applicationOriginalId.length<=200&&!/[\x00-\x1f\x7f]/.test(r.applicationOriginalId)
  &&Number.isSafeInteger(r.expectedVersion)&&r.expectedVersion>0&&commands.has(r.type)
  &&typeof r.idempotencyKey==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(r.idempotencyKey);
}
const browserStore=(scope:string):Store=>({
 read(){const raw=window.sessionStorage.getItem("crays.member.ambassador.review.pending.v1:"+scope);return raw===null?[]:JSON.parse(raw);},
 write(value){window.sessionStorage.setItem("crays.member.ambassador.review.pending.v1:"+scope,JSON.stringify(value));}
});
/** Stores only opaque unresolved command references, never applications, profiles,
 * access decisions, session credentials or business master data. */
export class AmbassadorReviewLedger {
 private scope="";private port:AmbassadorReviewPort|null=null;private generation=0;private revision=0;
 private references=new Map<string,AmbassadorReviewReference>();private phases=new Map<string,Phase>();private confirmedVersions=new Map<string,number>();
 private storageUnknown=false;private active=new Set<string>();private listeners=new Set<()=>void>();
 constructor(private readonly storeFor:(scope:string)=>Store=browserStore){}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 getSnapshot=()=>this.revision;
 getServerSnapshot=()=>0;
 private notify(){this.revision++;for(const listener of this.listeners)listener();}
 bind(port:AmbassadorReviewPort|null,scope:string){
  if(this.port===port&&this.scope===scope)return;
  this.generation++;this.port=port;this.active.clear();
  if(this.scope!==scope){this.phases.clear();this.references.clear();this.confirmedVersions.clear();}this.scope=scope;
  this.storageUnknown=false;
  try {const rows=this.storeFor(scope).read();if(!Array.isArray(rows)||rows.length>100||rows.some(row=>!reference(row)))throw Error("INVALID_PENDING");
   const ids=new Set<string>();for(const row of rows){if(ids.has(row.applicationOriginalId))throw Error("DUPLICATE_PENDING");ids.add(row.applicationOriginalId);this.references.set(row.applicationOriginalId,Object.freeze({...row}));this.phases.set(row.applicationOriginalId,"uncertain");}
  }catch{this.storageUnknown=true;}
  this.notify();
 }
 phase(id:string):Phase{return this.phases.get(id)??"idle";}
 canExecute(id:string,expectedVersion?:number){const confirmed=this.confirmedVersions.get(id);return this.port!==null&&!this.storageUnknown&&!this.active.has(id)&&!this.references.has(id)&&(this.phase(id)==="idle"||(this.phase(id)==="confirmed"&&confirmed!==undefined&&Number.isSafeInteger(expectedVersion)&&expectedVersion!>=confirmed));}
 canReconcile(id:string){return Boolean(this.port?.reconcile)&&!this.storageUnknown&&!this.active.has(id)&&this.references.has(id);}
 private persist(){const value=[...this.references.values()];if(value.length>100)throw Error("PENDING_LIMIT");const store=this.storeFor(this.scope);store.write(value);if(JSON.stringify(store.read())!==JSON.stringify(value))throw Error("PENDING_WRITE_REQUIRED");}
 private matches(receipt:Receipt,ref:AmbassadorReviewReference){return receipt.applicationOriginalId===ref.applicationOriginalId&&receipt.idempotencyKey===ref.idempotencyKey;}
 private settle(receipt:Receipt,ref:AmbassadorReviewReference):boolean {
  if(!this.matches(receipt,ref))return false;
  const confirmed=receipt.status==="confirmed"&&receipt.persistedReadbackVerified===true&&Number.isSafeInteger(receipt.revision)&&receipt.revision!>ref.expectedVersion;
  const absent=receipt.status==="not_committed"&&receipt.terminalNonCommitVerified===true;
  if(!confirmed&&!absent)return false;
  this.references.delete(ref.applicationOriginalId);
  try{this.persist();}catch{this.references.set(ref.applicationOriginalId,ref);this.storageUnknown=true;return false;}
  if(confirmed)this.confirmedVersions.set(ref.applicationOriginalId,receipt.revision!);else this.confirmedVersions.delete(ref.applicationOriginalId);
  this.phases.set(ref.applicationOriginalId,confirmed?"confirmed":"idle");return true;
 }
 async execute(input:Omit<AmbassadorReviewReference,"idempotencyKey">&{reason?:string}):Promise<void>{
  if(!this.canExecute(input.applicationOriginalId,input.expectedVersion)||!this.port)return;
  const port=this.port,generation=this.generation;const reason=input.reason?.trim();
  if(["request_more_information","do_not_recommend"].includes(input.type)&&(!reason||!Number.isSafeInteger(port.maxReasonLength)||port.maxReasonLength!<1||reason.length>port.maxReasonLength!))return;
  const ref=Object.freeze({type:input.type,applicationOriginalId:input.applicationOriginalId,expectedVersion:input.expectedVersion,idempotencyKey:crypto.randomUUID()});
  if(!reference(ref))return;
  this.active.add(ref.applicationOriginalId);this.references.set(ref.applicationOriginalId,ref);this.phases.set(ref.applicationOriginalId,"sending");this.notify();
  try{try{this.persist();}catch{this.storageUnknown=true;throw Error("PENDING_WRITE_REQUIRED");}const receipt=await port.execute({...ref,...(reason===undefined?{}:{reason})});if(this.port!==port||this.generation!==generation)return;
   if(!this.settle(receipt,ref))this.phases.set(ref.applicationOriginalId,"uncertain");
  }catch{if(this.port===port&&this.generation===generation)this.phases.set(ref.applicationOriginalId,"uncertain");}
  finally{if(this.port===port&&this.generation===generation){this.active.delete(ref.applicationOriginalId);this.notify();}}
 }
 async reconcile(id:string):Promise<void>{
  if(!this.canReconcile(id)||!this.port?.reconcile)return;
  const port=this.port,generation=this.generation,ref=this.references.get(id)!;this.active.add(id);this.notify();
  try{const receipt=await port.reconcile!(ref);if(this.port===port&&this.generation===generation)this.settle(receipt,ref);}
  catch{/* Preserve the same reference on unavailable or unknown readback. */}
  finally{if(this.port===port&&this.generation===generation){this.active.delete(id);this.notify();}}
 }
}

