import "server-only";
import {queueMember073NativeWorker} from "@/lib/clubs/member073-native-worker-queue";
import {spawn} from "node:child_process";
const dispatcher="/srv/crays/dev-state/member-area-screen1-20261006/member-demo100-20261012/erp-agent/finance_dispatch.py";
/** Call only AFTER the SDK-bound Core finish_own... RPC has committed native
 * settled order and outbox. Never accept a browser supplied orderId here.
 * Cart order shows financeState pending until native ERP acknowledgement.
 */
export function dispatchCommittedMemberTestFinance(nativeOrderId:string):void{
 if(!/^[0-9]{1,16}$/.test(nativeOrderId))throw Error("INVALID_COMMITTED_ORDER_ID");
 if(process.env.CRAYS_MEMBER_NATIVE_BACKEND!==undefined){try{queueMember073NativeWorker("finance",nativeOrderId);}catch{console.warn("MEMBER_NATIVE_FINANCE_DISPATCH_NOT_QUEUED");}return;}
 if(process.env.CRAYS_MEMBER_XXL_CUSTOMER_PROVIDER_ADMISSION_SHA256!==undefined){
  if(!/^[a-f0-9]{64}$/.test(process.env.CRAYS_MEMBER_XXL_FRESH_FINANCE_SOURCE_SHA256??"")){console.warn("MEMBER_FRESH_FINANCE_NOT_ADMITTED");return;}
  const names=["NODE_ENV","VERCEL_ENV","AUTH0_CLUBS_BASE_URL","AUTH0_CLUBS_DOMAIN","AUTH0_CLUBS_CLIENT_ID","CRAYS_CORE_ORIGINAL_MEMBER_RPC_XL_TARGET","CRAYS_MEMBER_XXL_NO_EXPIRY_RUNTIME_APPROVAL","CRAYS_MEMBER_XXL_CUSTOMER_PROVIDER_ADMISSION_PATH","CRAYS_MEMBER_XXL_CUSTOMER_PROVIDER_ADMISSION_SHA256","CRAYS_MEMBER_XXL_FRESH_FINANCE_SOURCE_SHA256"];
  const flags=names.flatMap(k=>process.env[k]===undefined?[]:[k+"="+process.env[k]]);
  const job=spawn("/usr/bin/systemd-run",["--user","--quiet","--collect","--unit=crays-member-fresh-finance-dispatch-"+nativeOrderId+".service","--property=RuntimeMaxSec=480","--property=MemoryMax=268435456","--property=MemorySwapMax=0","--property=CPUQuota=100%","--property=TasksMax=64","--property=UMask=0077","--property=KillMode=control-group","/usr/bin/env","-i","PATH=/usr/bin:/bin","HOME="+(process.env.HOME??"/home/craysdev"),"XDG_RUNTIME_DIR="+(process.env.XDG_RUNTIME_DIR??"/run/user/1000"),...flags,"/usr/bin/python3","/home/craysdev/codex-chat-projects/member/output/successor-20261028/finance-worker/finance_dispatch.py",nativeOrderId],{detached:true,stdio:"ignore",shell:false,env:{NODE_ENV:"production",PATH:"/usr/bin:/bin",HOME:process.env.HOME,XDG_RUNTIME_DIR:process.env.XDG_RUNTIME_DIR??"/run/user/1000"}});
  job.once("error",()=>{});job.unref();return;
 }
 const child=spawn("/usr/bin/python3",[dispatcher,nativeOrderId],{detached:true,stdio:"ignore",shell:false});
 child.once("error",()=>{/* Core outbox remains durable pending; reader can dispatch again. */});
 child.unref();
}
