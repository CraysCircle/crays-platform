import { createHash } from "node:crypto";

export type DrillComponent="AUTH0"|"BOOKING_CORE"|"STRIPE"|"VENDURE"|"ERP";
export type DrillComponentState="UP"|"DOWN"|"PARTITIONED";
type OperationResult="CREATED"|"REPLAY"|"UNAVAILABLE"|"UNKNOWN_COMMITTED";

interface LogicalOperation{component:DrillComponent;idempotencyKey:string;payloadSha256:string;receiptSha256:string}

export class ClubsProviderOutageDrillHarness{
  readonly #states=new Map<DrillComponent,DrillComponentState>([["AUTH0","UP"],["BOOKING_CORE","UP"],["STRIPE","UP"],["VENDURE","UP"],["ERP","UP"]]);
  readonly #operations=new Map<string,LogicalOperation>();
  readonly #bookingKey:string;readonly #payloadSha256:string;#sessionEstablished=false;#observed=new Set<string>();
  constructor(input:{bookingKey:string;payloadSha256:string}){if(!input.bookingKey.trim()||!/^[0-9a-f]{64}$/.test(input.payloadSha256))throw new Error("OUTAGE_DRILL_INPUT_INVALID");this.#bookingKey=input.bookingKey;this.#payloadSha256=input.payloadSha256;}
  setComponentState(component:DrillComponent,state:DrillComponentState):void{this.#states.set(component,state);}
  establishSession():"ESTABLISHED"|"EXISTING"|"UNAVAILABLE"{if(this.#sessionEstablished)return"EXISTING";if(this.#states.get("AUTH0")!=="UP")return"UNAVAILABLE";this.#sessionEstablished=true;return"ESTABLISHED";}
  advance():"AUTH_REQUIRED"|"BOOKING_PENDING"|"CHARGE_PENDING"|"VENDURE_PENDING"|"ERP_PENDING"|"COMPLETE"{
    if(!this.#sessionEstablished)return"AUTH_REQUIRED";
    const steps:readonly[DrillComponent,string,string][]=[["BOOKING_CORE","booking",this.#payloadSha256],["STRIPE","charge",this.#payloadSha256],["VENDURE","order",this.#payloadSha256],["ERP","posting",this.#payloadSha256]];
    const pending=["BOOKING_PENDING","CHARGE_PENDING","VENDURE_PENDING","ERP_PENDING"] as const;
    for(let index=0;index<steps.length;index+=1){const[component,kind,payload]=steps[index];const operationKey=`${kind}:${this.#bookingKey}`;if(this.#observed.has(operationKey))continue;const result=this.#execute(component,operationKey,payload);if(result==="CREATED"||result==="REPLAY")this.#observed.add(operationKey);else return pending[index];}
    return"COMPLETE";
  }
  requestRefund(refundPayloadSha256:string):"AUTH_REQUIRED"|"CHARGE_REQUIRED"|"REFUND_PENDING"|"REFUNDED"{
    if(!this.#sessionEstablished)return"AUTH_REQUIRED";if(!this.#observed.has(`charge:${this.#bookingKey}`))return"CHARGE_REQUIRED";const operationKey=`refund:${this.#bookingKey}`;if(this.#observed.has(operationKey))return"REFUNDED";const result=this.#execute("STRIPE",operationKey,refundPayloadSha256);if(result==="CREATED"||result==="REPLAY"){this.#observed.add(operationKey);return"REFUNDED";}return"REFUND_PENDING";
  }
  injectConflictingReplay(component:DrillComponent,kind:"booking"|"charge"|"order"|"posting"|"refund",payloadSha256:string):void{this.#execute(component,`${kind}:${this.#bookingKey}`,payloadSha256);}
  snapshot():Readonly<{bookingCount:number;chargeCount:number;refundCount:number;vendureOrderCount:number;erpPostingCount:number;observedCount:number;receiptSha256:string}>{
    const count=(prefix:string)=>[...this.#operations.keys()].filter((key)=>key.startsWith(`${prefix}:`)).length;const core={bookingCount:count("booking"),chargeCount:count("charge"),refundCount:count("refund"),vendureOrderCount:count("order"),erpPostingCount:count("posting"),observedCount:this.#observed.size};return Object.freeze({...core,receiptSha256:createHash("sha256").update(JSON.stringify(core)).digest("hex")});
  }
  #execute(component:DrillComponent,idempotencyKey:string,payloadSha256:string):OperationResult{
    if(!/^[0-9a-f]{64}$/.test(payloadSha256))throw new Error("OUTAGE_DRILL_PAYLOAD_HASH_INVALID");const prior=this.#operations.get(idempotencyKey);if(prior){if(prior.component!==component||prior.payloadSha256!==payloadSha256)throw new Error("OUTAGE_DRILL_IDEMPOTENCY_CONFLICT");return this.#states.get(component)==="DOWN"?"UNAVAILABLE":"REPLAY";}
    const state=this.#states.get(component);if(state==="DOWN")return"UNAVAILABLE";const receiptSha256=createHash("sha256").update(`${component}\u0000${idempotencyKey}\u0000${payloadSha256}`).digest("hex");this.#operations.set(idempotencyKey,{component,idempotencyKey,payloadSha256,receiptSha256});return state==="PARTITIONED"?"UNKNOWN_COMMITTED":"CREATED";
  }
}
