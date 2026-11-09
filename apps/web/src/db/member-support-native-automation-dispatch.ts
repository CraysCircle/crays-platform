import "server-only";
import {spawn} from "node:child_process";
import {writeFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import type {MemberSupportSdk} from "./member-stay-support-handler";
import type {OwnSupportReceipt} from "./member-support-native-contract";
const base="/srv/crays/dev-state/member-area-screen1-20261006/member-demo100-20261012";
const account="acct_384c05e7-e716-4dc9-864d-8c63bf13876c";
/** Only after the original SDK-bound Core transaction has committed.
 * The durable original Core rows remain authoritative if dispatch is unavailable.
 * Provider credentials never leave the existing restricted server runtime.
 */
export function queueConfirmedNativeMemberSupport(sdk:MemberSupportSdk,receipt:OwnSupportReceipt){
 if(process.env.CRAYS_MEMBER_SUPPORT_AUTOMATION_TARGET!=="xxl-original-member-test"||sdk.sessionReady!==true||sdk.expectedAccountId!==account||receipt.accountId!==account||receipt.testOnly!==true||receipt.externalDeliveryConfirmed!==false||receipt.receipt.outcome!=="applied"||!receipt.receipt.caseId)return;
 try{
  writeFileSync(base+"/SUPPORT_DISPATCH_PENDING.flag",new Date().toISOString()+":"+randomUUID(),{mode:0o600});
  const child=spawn("/usr/bin/python3",[base+"/erp-agent/support_dispatch.py"],{stdio:"ignore",detached:false});
  child.once("error",()=>console.warn("MEMBER_SUPPORT_TOOLS_DISPATCH_NOT_STARTED"));child.unref();
 }catch{console.warn("MEMBER_SUPPORT_TOOLS_DISPATCH_NOT_STARTED");}
}
