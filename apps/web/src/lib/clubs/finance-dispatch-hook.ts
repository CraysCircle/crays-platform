import "server-only";
import {spawn} from "node:child_process";
const dispatcher="/srv/crays/dev-state/member-area-screen1-20261006/member-demo100-20261012/erp-agent/finance_dispatch.py";
/** Call only AFTER the SDK-bound Core finish_own... RPC has committed native
 * settled order and outbox. Never accept a browser supplied orderId here.
 * Cart order shows financeState pending until native ERP acknowledgement.
 */
export function dispatchCommittedMemberTestFinance(nativeOrderId:string):void{
 if(!/^[0-9]{1,16}$/.test(nativeOrderId))throw Error("INVALID_COMMITTED_ORDER_ID");
 const child=spawn("/usr/bin/python3",[dispatcher,nativeOrderId],{detached:true,stdio:"ignore",shell:false});
 child.once("error",()=>{/* Core outbox remains durable pending; reader can dispatch again. */});
 child.unref();
}
