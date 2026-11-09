import { createHash, randomUUID } from "node:crypto";

export type HotelPmsAttemptPool = { connect(): Promise<{ query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<{rows:Row[]}>; release():void }> };
export type RecordHotelPmsAttemptInput = {
  tenantId:string; commandId:string; leaseToken:string; leaseOwner:string; attemptNumber:number;
  outcome:"accepted-awaiting-confirmation"|"retryable-failure"|"terminal-failure";
  providerRequestId:string; httpStatus:number|null; providerResponseSha256:string;
  transportEvidenceSha256:string; occurredAt:string; retryAfterSeconds?:number|null;
};
export type HotelPmsAttemptResult = { attemptReceiptId:string; commandId:string; commandStatus:"transmitted-awaiting-confirmation"|"retry-wait"|"dead-letter"; attemptEvidenceSha256:string; replayed:boolean };
type CommandRow={command_id:string;command_status:string;lease_token:string|null;lease_owner:string|null;attempt_count:number|string;lease_acquired_at:string|Date|null;lease_until:string|Date|null;max_attempts:number|string};
type ReceiptRow={attempt_receipt_id:string;command_id:string;attempt_evidence_sha256:string;outcome:RecordHotelPmsAttemptInput["outcome"]};
function canonicalJson(value:unknown):string{if(Array.isArray(value))return`[${value.map(canonicalJson).join(",")}]`;if(value&&typeof value==="object"){const object=value as Record<string,unknown>;return`{${Object.keys(object).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(object[k])}`).join(",")}}`;}return JSON.stringify(value);}
const sha256=(value:unknown)=>createHash("sha256").update(canonicalJson(value)).digest("hex");
const target=(outcome:RecordHotelPmsAttemptInput["outcome"]):HotelPmsAttemptResult["commandStatus"]=>outcome==="accepted-awaiting-confirmation"?"transmitted-awaiting-confirmation":outcome==="retryable-failure"?"retry-wait":"dead-letter";

export async function recordHotelPmsTransmissionAttempt(pool:HotelPmsAttemptPool,input:RecordHotelPmsAttemptInput):Promise<HotelPmsAttemptResult>{
 if(!Number.isInteger(input.attemptNumber)||input.attemptNumber<1)throw new Error("attemptNumber must be positive");
 if(!/^[A-Za-z0-9:_.-]{3,180}$/.test(input.leaseOwner)||!/^[A-Za-z0-9:_.-]{3,180}$/.test(input.providerRequestId))throw new Error("lease owner or provider request ID is invalid");
 if(input.httpStatus!==null&&(!Number.isInteger(input.httpStatus)||input.httpStatus<100||input.httpStatus>599))throw new Error("httpStatus is invalid");
 if(!/^[0-9a-f]{64}$/.test(input.providerResponseSha256)||!/^[0-9a-f]{64}$/.test(input.transportEvidenceSha256))throw new Error("attempt hashes must be lowercase SHA-256");
 const occurredAt=new Date(input.occurredAt);if(!Number.isFinite(occurredAt.getTime()))throw new Error("occurredAt is invalid");
 const retry=input.retryAfterSeconds??null;if(input.outcome==="retryable-failure"&&(!Number.isInteger(retry)||retry!<5||retry!>86400))throw new Error("retryable outcome requires bounded retryAfterSeconds");
 if(input.outcome!=="retryable-failure"&&retry!==null)throw new Error("non-retryable outcome cannot set retryAfterSeconds");
 const normalized={...input,occurredAt:occurredAt.toISOString(),retryAfterSeconds:retry};const attemptEvidenceSha256=sha256(normalized);const client=await pool.connect();
 try{
  await client.query("BEGIN");await client.query("SELECT set_config('app.tenant_id', $1, true)",[input.tenantId]);
  const replay=await client.query<ReceiptRow>(`SELECT attempt_receipt_id,command_id,attempt_evidence_sha256,outcome FROM crays_core.clubs_hotel_pms_transmission_attempt_receipts WHERE tenant_id=$1 AND command_id=$2 AND attempt_number=$3 FOR UPDATE`,[input.tenantId,input.commandId,input.attemptNumber]);
  if(replay.rows[0]){if(replay.rows[0].attempt_evidence_sha256!==attemptEvidenceSha256)throw new Error("PMS attempt replay conflict");await client.query("COMMIT");return{attemptReceiptId:replay.rows[0].attempt_receipt_id,commandId:input.commandId,commandStatus:target(replay.rows[0].outcome),attemptEvidenceSha256,replayed:true};}
  const command=await client.query<CommandRow>(`SELECT command_id,command_status,lease_token,lease_owner,attempt_count,lease_acquired_at,lease_until,max_attempts FROM crays_core.clubs_hotel_pms_transmission_commands WHERE tenant_id=$1 AND command_id=$2 FOR UPDATE`,[input.tenantId,input.commandId]);const c=command.rows[0];
  if(!c||c.command_status!=="leased"||c.lease_token!==input.leaseToken||c.lease_owner!==input.leaseOwner||Number(c.attempt_count)!==input.attemptNumber)throw new Error("PMS attempt does not own exact live lease");
  if(!c.lease_acquired_at||!c.lease_until||occurredAt.getTime()<new Date(c.lease_acquired_at).getTime()||occurredAt.getTime()>new Date(c.lease_until).getTime())throw new Error("PMS attempt occurred outside lease window");
  const attemptReceiptId=randomUUID();await client.query(`INSERT INTO crays_core.clubs_hotel_pms_transmission_attempt_receipts(attempt_receipt_id,tenant_id,command_id,lease_token,lease_owner,attempt_number,outcome,provider_request_id,http_status,provider_response_sha256,transport_evidence_sha256,attempt_evidence_sha256,occurred_at,retry_after_seconds,persisted_record,synthetic_source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::timestamptz,$14,true,false)`,[attemptReceiptId,input.tenantId,input.commandId,input.leaseToken,input.leaseOwner,input.attemptNumber,input.outcome,input.providerRequestId,input.httpStatus,input.providerResponseSha256,input.transportEvidenceSha256,attemptEvidenceSha256,occurredAt.toISOString(),retry]);
  const commandStatus=target(input.outcome);await client.query(`UPDATE crays_core.clubs_hotel_pms_transmission_commands SET command_status=$3,last_attempt_receipt_sha256=$4,next_attempt_at=CASE WHEN $3='retry-wait' THEN $5::timestamptz+make_interval(secs=>$6::int) ELSE next_attempt_at END,terminal_reason=CASE WHEN $3='dead-letter' THEN 'terminal-provider-transport-failure' ELSE NULL END,lease_token=NULL,lease_owner=NULL,lease_acquired_at=NULL,lease_until=NULL WHERE tenant_id=$1 AND command_id=$2 AND command_status='leased'`,[input.tenantId,input.commandId,commandStatus,attemptEvidenceSha256,occurredAt.toISOString(),retry??0]);
  await client.query(`INSERT INTO crays_core.clubs_hotel_pms_transmission_command_events(event_id,tenant_id,command_id,sequence_no,event_type,from_status,to_status,evidence_sha256,event_payload) SELECT $1,$2,$3,COALESCE(max(sequence_no),0)+1,$4,'leased',$5,$6,$7::jsonb FROM crays_core.clubs_hotel_pms_transmission_command_events WHERE tenant_id=$2 AND command_id=$3`,[randomUUID(),input.tenantId,input.commandId,input.outcome,commandStatus,attemptEvidenceSha256,JSON.stringify({attemptReceiptId,providerRequestId:input.providerRequestId,httpStatus:input.httpStatus})]);
  await client.query("COMMIT");return{attemptReceiptId,commandId:input.commandId,commandStatus,attemptEvidenceSha256,replayed:false};
 }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
