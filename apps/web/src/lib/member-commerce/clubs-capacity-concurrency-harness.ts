import { createHash } from "node:crypto";

export type CapacityComponent="SEARCH"|"AVAILABILITY"|"HOLD"|"CHECKOUT"|"WEBHOOK"|"WORKER"|"DATABASE"|"VPS";
export interface CapacityBudget{component:CapacityComponent;maxP95Ms:number;maxErrorRate:number;minThroughputPerSecond:number;maxConcurrency:number;maxQueueAgeSeconds:number;maxResourceUtilization:number;budgetReceiptSha256:string}
export interface CapacitySample{component:CapacityComponent;p95Ms:number;errorRate:number;throughputPerSecond:number;concurrency:number;queueAgeSeconds:number;resourceUtilization:number}
export type CapacityFailure="P95_EXCEEDED"|"ERROR_RATE_EXCEEDED"|"THROUGHPUT_BELOW_MINIMUM"|"CONCURRENCY_EXCEEDED"|"QUEUE_AGE_EXCEEDED"|"RESOURCE_UTILIZATION_EXCEEDED"|"BUDGET_RECEIPT_INVALID";
const SHA256=/^[0-9a-f]{64}$/;
export function evaluateCapacitySample(budget:CapacityBudget,sample:CapacitySample):readonly CapacityFailure[]{
  const failures:CapacityFailure[]=[];if(!SHA256.test(budget.budgetReceiptSha256))failures.push("BUDGET_RECEIPT_INVALID");if(sample.component!==budget.component)throw new Error("CAPACITY_COMPONENT_MISMATCH");
  if(sample.p95Ms>budget.maxP95Ms)failures.push("P95_EXCEEDED");if(sample.errorRate>budget.maxErrorRate)failures.push("ERROR_RATE_EXCEEDED");if(sample.throughputPerSecond<budget.minThroughputPerSecond)failures.push("THROUGHPUT_BELOW_MINIMUM");if(sample.concurrency>budget.maxConcurrency)failures.push("CONCURRENCY_EXCEEDED");if(sample.queueAgeSeconds>budget.maxQueueAgeSeconds)failures.push("QUEUE_AGE_EXCEEDED");if(sample.resourceUtilization>budget.maxResourceUtilization)failures.push("RESOURCE_UTILIZATION_EXCEEDED");return failures;
}

export function simulateConcurrentHolds(input:{inventoryCapacity:number;requestIds:readonly string[]}):Readonly<{accepted:readonly string[];rejected:readonly string[];remaining:number;oversold:boolean}>{
  if(!Number.isInteger(input.inventoryCapacity)||input.inventoryCapacity<0)throw new Error("HOLD_CAPACITY_INVALID");const accepted:string[]=[],rejected:string[]=[],seen=new Set<string>();let remaining=input.inventoryCapacity;
  for(const requestId of input.requestIds){if(seen.has(requestId)){rejected.push(requestId);continue;}seen.add(requestId);if(remaining>0){remaining-=1;accepted.push(requestId);}else rejected.push(requestId);}
  return Object.freeze({accepted,rejected,remaining,oversold:remaining<0||accepted.length>input.inventoryCapacity});
}

export function simulateIdempotentCheckouts(commands:readonly{commandId:string;idempotencyKey:string;payloadSha256:string}[]):Readonly<{logicalOutcomeCount:number;replayCount:number;conflictCount:number}>{
  const outcomes=new Map<string,string>();let replayCount=0,conflictCount=0;for(const command of commands){const prior=outcomes.get(command.idempotencyKey);if(!prior){outcomes.set(command.idempotencyKey,command.payloadSha256);}else if(prior===command.payloadSha256)replayCount+=1;else conflictCount+=1;}
  return Object.freeze({logicalOutcomeCount:outcomes.size,replayCount,conflictCount});
}

export function simulateWebhookIngress(events:readonly{eventId:string;payloadSha256:string}[]):Readonly<{acceptedCount:number;replayCount:number;conflictCount:number}>{
  const accepted=new Map<string,string>();let replayCount=0,conflictCount=0;for(const event of events){const prior=accepted.get(event.eventId);if(!prior)accepted.set(event.eventId,event.payloadSha256);else if(prior===event.payloadSha256)replayCount+=1;else conflictCount+=1;}
  return Object.freeze({acceptedCount:accepted.size,replayCount,conflictCount});
}

interface WorkerJob{id:string;state:"PENDING"|"LEASED"|"ACKNOWLEDGED";leaseOwner:string|null;leaseExpiresAt:number|null;attempts:number}
export class WorkerLeaseCapacityHarness{
  readonly #jobs:WorkerJob[];#now:number;
  constructor(jobIds:readonly string[],startEpochSeconds:number){this.#jobs=jobIds.map((id)=>({id,state:"PENDING",leaseOwner:null,leaseExpiresAt:null,attempts:0}));this.#now=startEpochSeconds;}
  advance(seconds:number){if(!Number.isInteger(seconds)||seconds<0)throw new Error("WORKER_CLOCK_INVALID");this.#now+=seconds;}
  claim(workerId:string,leaseSeconds:number):Readonly<{jobId:string;attempt:number}>|null{const job=this.#jobs.find((candidate)=>candidate.state==="PENDING"||(candidate.state==="LEASED"&&(candidate.leaseExpiresAt??Infinity)<=this.#now));if(!job)return null;job.state="LEASED";job.leaseOwner=workerId;job.leaseExpiresAt=this.#now+leaseSeconds;job.attempts+=1;return Object.freeze({jobId:job.id,attempt:job.attempts});}
  acknowledge(workerId:string,jobId:string):void{const job=this.#jobs.find((candidate)=>candidate.id===jobId);if(!job||job.state!=="LEASED"||job.leaseOwner!==workerId)throw new Error("WORKER_LEASE_FENCE_FAILED");job.state="ACKNOWLEDGED";job.leaseOwner=null;job.leaseExpiresAt=null;}
  snapshot(){return Object.freeze({pending:this.#jobs.filter((job)=>job.state==="PENDING").length,leased:this.#jobs.filter((job)=>job.state==="LEASED").length,acknowledged:this.#jobs.filter((job)=>job.state==="ACKNOWLEDGED").length,totalAttempts:this.#jobs.reduce((sum,job)=>sum+job.attempts,0),receiptSha256:createHash("sha256").update(JSON.stringify(this.#jobs)).digest("hex")});}
}
