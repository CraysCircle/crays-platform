import "server-only";
import type {NativePersonalRuntimeTarget,PreparedPersonalAttempt} from "@/db/native-personal-runtime-repository";
import {createNativePersonalChuckHost} from "./native-personal-chuck-host";
import {createNativePersonalChuckWorker} from "./native-personal-chuck-worker";
import type {OriginalPersonalGatewayClient,PersonalGatewayBinding} from "./native-personal-gateway-transport";
import type {PersonalSdkSessionGuards} from "./native-personal-sdk-dispatch";

export type CommittedNativePersonalOutbox=Readonly<Pick<NativePersonalRuntimeTarget,
 "accountId"|"canonicalPersonId"|"agentId"|"bindingId"|"bindingRevision"|"contactRevision"|"expectedIssuer">>;
type Policy=Readonly<{expiresAtMs:number;revoked:AbortSignal;pageSize:number;pollIntervalMs:number}>;
type Entry={scope:CommittedNativePersonalOutbox;wake:()=>boolean;stop:()=>Promise<unknown>;expiresAtMs:number;deadline:number;revoked:AbortSignal};
// A Next server can load the bootstrap and GraphQL route in separate chunks.
// Share only the server process registry, never a browser/HTTP configuration.
const stateKey=Symbol.for("crays.native.personal-chuck.lifecycles.v1");
const processState=globalThis as typeof globalThis & Record<symbol,unknown>;
const existingState=processState[stateKey];
if(existingState!==undefined && !(existingState instanceof Map))throw Error("NATIVE_CHUCK_LIFECYCLE_INVALID_PROCESS_STATE");
const hosts:Map<string,Entry>=existingState as Map<string,Entry>??new Map<string,Entry>();
processState[stateKey]=hosts;
const key=(scope:CommittedNativePersonalOutbox)=>JSON.stringify([scope.accountId,scope.canonicalPersonId,scope.agentId,scope.bindingId,scope.bindingRevision,scope.contactRevision,scope.expectedIssuer]);
const fail=(code:string)=>new Error("NATIVE_CHUCK_LIFECYCLE_"+code);
const current=(entry:Entry)=>hosts.get(entry.scope.accountId)===entry && !entry.revoked.aborted && Date.now()<entry.expiresAtMs && performance.now()<entry.deadline;

/** Server bootstrap for an ALREADY admitted own-person Core/SDK deployment.
 * Reuses its original GatewayClient, explicitly admitted user profile OR local
 * service worker, agent and model; never
 * creates an identity/profile/token, changes a WhatsApp channel or grants access.
 * Do not expose this function through HTTP/GraphQL or fill it from user JSON.
 * Actual Core/OCA/profile authority must supply and revalidate these bindings.
 */
export async function startNativePersonalChuckLifecycle(target:NativePersonalRuntimeTarget,
 Client:OriginalPersonalGatewayClient,binding:PersonalGatewayBinding,
 assertAdmitted:(attempt?:PreparedPersonalAttempt)=>Promise<PersonalSdkSessionGuards>,policy:Policy){
 if(!policy || !Number.isSafeInteger(policy.expiresAtMs) || policy.expiresAtMs<=Date.now() ||
  !(policy.revoked instanceof AbortSignal) || !Number.isSafeInteger(policy.pageSize) || policy.pageSize<1 || policy.pageSize>20 ||
  !Number.isSafeInteger(policy.pollIntervalMs) || policy.pollIntervalMs<1000 || policy.pollIntervalMs>60000)throw fail("INVALID_POLICY");
 const principal=binding.corePrincipal??binding.servicePrincipal;
 if(!principal || principal.corePersonId!==target.canonicalPersonId || (binding.corePrincipal!==undefined && binding.servicePrincipal!==undefined))throw fail("ACTUAL_CORE_GATEWAY_BINDING_REQUIRED");
 if(hosts.has(target.accountId))throw fail("EXISTING_LIFECYCLE_MUST_STOP_FIRST");
 const scope=Object.freeze({accountId:target.accountId,canonicalPersonId:target.canonicalPersonId,agentId:target.agentId,
  bindingId:target.bindingId,bindingRevision:target.bindingRevision,contactRevision:target.contactRevision,expectedIssuer:target.expectedIssuer});
 const host=createNativePersonalChuckHost(target,Client,binding,assertAdmitted);
 const revoked=AbortSignal.any([policy.revoked,principal.revoked]);
 let resolveReady!:()=>void,rejectReady!:(error:Error)=>void;
 const ready=new Promise<void>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 const worker=createNativePersonalChuckWorker({
  async connect(){await host.connect();resolveReady();},
  dispatchOutboxPage:(after,limit,signal)=>host.dispatchOutboxPage(after,limit,signal),
  close:()=>host.close(),
 },{...policy,revoked});
 const entry:Entry={scope,wake:()=>worker.wake(),stop:()=>worker.stop(),expiresAtMs:policy.expiresAtMs,
  deadline:performance.now()+(policy.expiresAtMs-Date.now()),revoked};
 hosts.set(scope.accountId,entry);
 const running=worker.run().then(result=>{
  if(hosts.get(scope.accountId)===entry)hosts.delete(scope.accountId);
  rejectReady(fail("HOST_DID_NOT_REMAIN_READY"));return result;
 });
 try{await ready;if(!current(entry))throw fail("CURRENT_LIFECYCLE_REQUIRED");}
 catch(error){await worker.stop();await running;throw error;}
 return Object.freeze({state:worker.state,settled:()=>host.settled(),completion:running,
  async stop(){try{return await worker.stop();}finally{await running;if(hosts.get(scope.accountId)===entry)hosts.delete(scope.accountId);}}});
}

/** Called only AFTER the admitted native SQL write commits and releases its
 * connection. The exact Core-derived tuple selects an existing consumer; this
 * cannot register/start a host, select an agent or turn a receipt into a reply.
 * Missing admission leaves the original durable outbox pending, unchanged.
 */
export function notifyCommittedNativePersonalOutbox(scope:CommittedNativePersonalOutbox){
 const entry=hosts.get(scope.accountId);
 if(!entry || !current(entry) || key(entry.scope)!==key(scope))return false;
 return entry.wake();
}
