import { createHash } from "node:crypto";

const SHA256=/^[0-9a-f]{64}$/;
function digest(value:string){return createHash("sha256").update(value).digest("hex");}
function safeCode(value:string|null):string|null{return value&&/^[A-Z0-9_:-]{2,80}$/.test(value)?value:"REDACTED_ERROR";}

export interface StructuredLogInput{timestamp:string;level:"DEBUG"|"INFO"|"WARN"|"ERROR";service:string;tenantId:string;subjectId:string|null;traceId:string;eventName:string;outcome:"SUCCESS"|"DENIED"|"RETRY"|"FAILURE";durationMs:number;queueAgeSeconds:number|null;errorCode:string|null;rawContext?:Record<string,unknown>}
export interface StructuredLogEvent{timestamp:string;level:string;service:string;tenantDigest:string;subjectDigest:string|null;traceId:string;eventName:string;outcome:string;durationMs:number;queueAgeSeconds:number|null;errorCode:string|null;schema:"crays.observability.safe.v1"}
export function createSafeStructuredLog(input:StructuredLogInput):Readonly<StructuredLogEvent>{
  if(!Number.isFinite(Date.parse(input.timestamp)))throw new Error("OBSERVABILITY_TIMESTAMP_INVALID");if(!/^[a-z0-9-]{2,50}$/.test(input.service)||!/^[a-z0-9_.:-]{2,100}$/i.test(input.traceId)||!/^[A-Z0-9_.:-]{2,100}$/.test(input.eventName))throw new Error("OBSERVABILITY_IDENTIFIER_INVALID");
  return Object.freeze({timestamp:new Date(input.timestamp).toISOString(),level:input.level,service:input.service,tenantDigest:digest(input.tenantId),subjectDigest:input.subjectId?digest(input.subjectId):null,traceId:input.traceId,eventName:input.eventName,outcome:input.outcome,durationMs:Math.max(0,Math.round(input.durationMs)),queueAgeSeconds:input.queueAgeSeconds===null?null:Math.max(0,Math.round(input.queueAgeSeconds)),errorCode:safeCode(input.errorCode),schema:"crays.observability.safe.v1"});
}

const METRICS=["clubs_request_duration_ms","clubs_queue_age_seconds","clubs_reconciliation_unowned_total","clubs_provider_unknown_total","clubs_dead_letter_total","clubs_health_state"] as const;
const LABEL_KEYS=["service","component","outcome","queue","site_class","tenant_bucket"] as const;
export function createSafeMetric(input:{name:string;value:number;labels:Record<string,string>;tenantId:string}):Readonly<{name:string;value:number;labels:Record<string,string>}>{
  if(!(METRICS as readonly string[]).includes(input.name))throw new Error("OBSERVABILITY_METRIC_NAME_DENIED");if(!Number.isFinite(input.value))throw new Error("OBSERVABILITY_METRIC_VALUE_INVALID");const labels:Record<string,string>={};for(const[key,value]of Object.entries(input.labels)){if(!(LABEL_KEYS as readonly string[]).includes(key)||!/^[A-Za-z0-9_.:-]{1,50}$/.test(value))throw new Error("OBSERVABILITY_HIGH_CARDINALITY_LABEL_DENIED");labels[key]=value;}labels.tenant_bucket=digest(input.tenantId).slice(0,12);return Object.freeze({name:input.name,value:input.value,labels:Object.freeze(labels)});
}

export type OperationalOwnerRole="FINANCE"|"OPERATIONS"|"PLATFORM"|"SECURITY";
export type OperationalAlertKind="QUEUE_AGE"|"UNOWNED_RECONCILIATION"|"PROVIDER_UNKNOWN"|"DEAD_LETTER"|"HEALTH_DOWN";
export interface OperationalSignals{budgetReceiptSha256:string;maxQueueAgeSeconds:number;queueAgeSeconds:number;unownedReconciliationCount:number;providerUnknownCount:number;deadLetterCount:number;downComponents:readonly string[]}
export interface OperationalAlert{alertKey:string;kind:OperationalAlertKind;severity:"P1"|"P2";ownerRole:OperationalOwnerRole;ownerSubject:string|null;runbookReceiptSha256:string|null;evidenceSha256:string}
export function evaluateOperationalAlerts(signals:OperationalSignals):readonly OperationalAlert[]{
  if(!SHA256.test(signals.budgetReceiptSha256))throw new Error("OBSERVABILITY_BUDGET_RECEIPT_INVALID");const alerts:OperationalAlert[]=[];const add=(kind:OperationalAlertKind,severity:"P1"|"P2",ownerRole:OperationalOwnerRole,value:unknown)=>{const alertKey=`${kind}:${digest(JSON.stringify(value)).slice(0,16)}`;alerts.push({alertKey,kind,severity,ownerRole,ownerSubject:null,runbookReceiptSha256:null,evidenceSha256:digest(JSON.stringify({kind,value,budgetReceiptSha256:signals.budgetReceiptSha256}))});};
  if(signals.queueAgeSeconds>signals.maxQueueAgeSeconds)add("QUEUE_AGE","P2","PLATFORM",signals.queueAgeSeconds);if(signals.unownedReconciliationCount>0)add("UNOWNED_RECONCILIATION","P1","FINANCE",signals.unownedReconciliationCount);if(signals.providerUnknownCount>0)add("PROVIDER_UNKNOWN","P1","OPERATIONS",signals.providerUnknownCount);if(signals.deadLetterCount>0)add("DEAD_LETTER","P1","PLATFORM",signals.deadLetterCount);for(const component of[...signals.downComponents].sort())add("HEALTH_DOWN","P1","PLATFORM",component);return Object.freeze(alerts);
}

export function assignOperationalAlert(alert:OperationalAlert,input:{ownerSubject:string;runbookReceiptSha256:string}):Readonly<OperationalAlert>{if(!input.ownerSubject.trim()||!SHA256.test(input.runbookReceiptSha256))throw new Error("OBSERVABILITY_ALERT_OWNERSHIP_INVALID");return Object.freeze({...alert,ownerSubject:input.ownerSubject.trim(),runbookReceiptSha256:input.runbookReceiptSha256});}
export function allOperationalAlertsOwned(alerts:readonly OperationalAlert[]):boolean{return alerts.every((alert)=>Boolean(alert.ownerSubject)&&Boolean(alert.runbookReceiptSha256&&SHA256.test(alert.runbookReceiptSha256)));}

export function aggregateHealth(components:readonly{name:string;state:"UP"|"DEGRADED"|"DOWN";secretDetail?:string}[]):Readonly<{state:"UP"|"DEGRADED"|"DOWN";components:readonly{name:string;state:string}[]}>{const state=components.some((item)=>item.state==="DOWN")?"DOWN":components.some((item)=>item.state==="DEGRADED")?"DEGRADED":"UP";return Object.freeze({state,components:Object.freeze(components.map((item)=>Object.freeze({name:item.name,state:item.state})))});}
