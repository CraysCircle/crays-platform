import{createHash}from"node:crypto";
import{prepareHotelStripeRefundCommand,type HotelRefundSagaPool,type PrepareHotelStripeRefundCommandInput}from"./hotel-booking-stripe-refund-saga-repository";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;const digest=(v:string)=>createHash("sha256").update(v,"utf8").digest("hex");
function canonical(v:unknown):string{if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return`[${v.map(canonical).join(",")}]`;return`{${Object.entries(v as Record<string,unknown>).filter(([,x])=>x!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>`${JSON.stringify(k)}:${canonical(x)}`).join(",")}}`}
const instant=(v:string)=>{const n=Date.parse(v);if(!Number.isFinite(n))throw new Error("HOTEL_CANONICAL_REFUND_TIME_INVALID");return n};

type ReasonPolicyRow={reason_policy_id:string;stripe_refund_reason:"duplicate"|"fraudulent"|"requested_by_customer"|null;legal_approval_receipt_sha256:string;operational_approval_receipt_sha256:string};
type Db={query<T=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<{rows:T[]}>;release():void};
async function transaction<T>(pool:HotelRefundSagaPool,tenantId:string,run:(db:Db)=>Promise<T>){const db=await pool.connect() as Db;try{await db.query("begin");await db.query("select set_config('crays.app_role','integration_service',true),set_config('crays.tenant_id',$1,true)",[tenantId]);const result=await run(db);await db.query("commit");return result}catch(error){await db.query("rollback").catch(()=>undefined);throw error}finally{db.release()}}

export type PersistCanonicalHotelRefundCreditInput=PrepareHotelStripeRefundCommandInput&Readonly<{refundDispatchEnvelopeId:string;creditCommandId:string}>;

export async function persistCanonicalHotelRefundAndCreditCommands(pool:HotelRefundSagaPool,input:PersistCanonicalHotelRefundCreditInput){
  if(!UUID.test(input.refundDispatchEnvelopeId)||!UUID.test(input.creditCommandId))throw new Error("HOTEL_CANONICAL_REFUND_IDS_INVALID");
  const validated=prepareHotelStripeRefundCommand(input);const authority=input.authority;
  return transaction(pool,validated.tenantId,async db=>{
    const policy=(await db.query<ReasonPolicyRow>(
      `select m.reason_policy_id,m.stripe_refund_reason,m.legal_approval_receipt_sha256,m.operational_approval_receipt_sha256
         from crays_integration.clubs_hotel_stripe_refund_reason_policies m
        where m.tenant_id=$1 and m.project_id=$2 and m.site_id=$3 and m.property_id=$4
          and m.stripe_environment=$5 and m.internal_reason_code=$6
          and m.lifecycle_state='ACTIVE' and m.persisted_record and not m.synthetic_source
          and m.valid_from<=$7 and m.valid_until>$7 order by m.policy_version desc limit 1`,
      [validated.tenantId,validated.projectId,validated.siteId,validated.propertyId,validated.stripeEnvironment,authority.reasonCode,validated.createdAt])).rows[0];
    if(!policy)throw new Error("HOTEL_CANONICAL_REFUND_REAL_REASON_POLICY_MISSING");
    const requestPayload=Object.freeze({payment_intent:validated.paymentIntentId,amount:validated.refundAmountMinor,
      ...(policy.stripe_refund_reason===null?{}:{reason:policy.stripe_refund_reason}),metadata:Object.freeze({
        crays_domain:"hotel-booking",crays_final_booking_receipt_id:authority.scope.finalBookingReceiptId,
        crays_cancellation_authority_id:authority.cancellationAuthorityId,
        crays_pms_cancellation_confirmation_id:input.pmsCancellation.confirmationReceiptId,
        crays_internal_reason_code:authority.reasonCode})});
    const reasonEvidenceSha256=digest(canonical({internalReasonCode:authority.reasonCode,stripeRefundReason:policy.stripe_refund_reason,
      reasonPolicyId:policy.reason_policy_id,legalApprovalSha256:policy.legal_approval_receipt_sha256,
      operationalApprovalSha256:policy.operational_approval_receipt_sha256,decisionReceiptId:authority.decisionReceiptId,
      decisionSha256:authority.decisionSha256,assuranceLevel:authority.assuranceLevel}));
    const requestSha256=digest(canonical({stripeAccountId:validated.stripeAccountId,stripeApiVersion:validated.stripeApiVersion,
      idempotencyKey:validated.idempotencyKey,requestPayload,authoritySha256:authority.authoritySha256,
      pmsConfirmationSha256:input.pmsCancellation.confirmationSha256,paymentEventPayloadSha256:input.paymentEvidence.eventPayloadSha256,
      reasonEvidenceSha256}));
    const prior=(await db.query<{refund_command_id:string;request_sha256:string}>(
      `select refund_command_id,request_sha256 from crays_integration.clubs_hotel_stripe_refund_commands where stripe_account_id=$1 and idempotency_key=$2`,[validated.stripeAccountId,validated.idempotencyKey])).rows[0];
    if(prior){if(prior.refund_command_id!==validated.refundCommandId||prior.request_sha256!==requestSha256)throw new Error("HOTEL_CANONICAL_REFUND_REPLAY_CONFLICT");}
    else await db.query(
      `insert into crays_integration.clubs_hotel_stripe_refund_commands
       (refund_command_id,cancellation_authority_id,pms_cancellation_confirmation_receipt_id,tenant_id,project_id,site_id,property_id,
        payment_evidence_receipt_id,stripe_api_version,stripe_environment,stripe_account_mode,stripe_account_id,checkout_session_id,
        stripe_customer_id,payment_intent_id,charge_id,currency,paid_amount_minor,refund_amount_minor,idempotency_key,request_sha256,
        command_state,attempt_count,available_at,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'queued',0,$22,$23,$23)`,
      [validated.refundCommandId,validated.cancellationAuthorityId,validated.pmsCancellationConfirmationReceiptId,validated.tenantId,
       validated.projectId,validated.siteId,validated.propertyId,validated.paymentEvidenceReceiptId,validated.stripeApiVersion,
       validated.stripeEnvironment,validated.stripeAccountMode,validated.stripeAccountId,validated.checkoutSessionId,
       validated.stripeCustomerId,validated.paymentIntentId,validated.chargeId,validated.currency,validated.paidAmountMinor,
       validated.refundAmountMinor,validated.idempotencyKey,requestSha256,validated.availableAt,validated.createdAt]);
    const kind=validated.refundAmountMinor===validated.paidAmountMinor?"FULL":"PARTIAL";
    await db.query(
      `insert into crays_integration.clubs_hotel_stripe_refund_dispatch_envelopes
       (refund_dispatch_envelope_id,tenant_id,refund_command_id,cancellation_authority_id,pms_cancellation_confirmation_receipt_id,
        reason_policy_id,cancellation_kind,refund_kind,credit_kind,internal_reason_code,stripe_refund_reason,
        step_up_decision_receipt_id,step_up_decision_sha256,assurance_level,paid_amount_minor,refund_amount_minor,currency,
        reason_evidence_sha256,request_payload,request_sha256,idempotency_key,command_state,attempt_count,available_at,
        provider_mutation_performed,formal_applied,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,'FULL_BOOKING',$7,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,'queued',0,$20,false,false,$21,$21)
       on conflict(tenant_id,idempotency_key)do nothing`,
      [input.refundDispatchEnvelopeId,validated.tenantId,validated.refundCommandId,validated.cancellationAuthorityId,
       validated.pmsCancellationConfirmationReceiptId,policy.reason_policy_id,kind,authority.reasonCode,policy.stripe_refund_reason,
       authority.decisionReceiptId,authority.decisionSha256,authority.assuranceLevel,validated.paidAmountMinor,
       validated.refundAmountMinor,validated.currency,reasonEvidenceSha256,canonical(requestPayload),requestSha256,
       `canonical:${validated.idempotencyKey}`,validated.availableAt,validated.createdAt]);
    const canonicalEnvelope=(await db.query<{refund_dispatch_envelope_id:string;request_sha256:string}>(
      `select refund_dispatch_envelope_id,request_sha256 from crays_integration.clubs_hotel_stripe_refund_dispatch_envelopes where tenant_id=$1 and idempotency_key=$2`,
      [validated.tenantId,`canonical:${validated.idempotencyKey}`])).rows[0];
    if(!canonicalEnvelope||canonicalEnvelope.request_sha256!==requestSha256)throw new Error("HOTEL_CANONICAL_REFUND_ENVELOPE_REPLAY_CONFLICT");
    const commandSha256=digest(canonical({refundCommandId:validated.refundCommandId,kind,amountMinor:validated.refundAmountMinor,
      currency:validated.currency.toUpperCase(),reasonEvidenceSha256,state:"BLOCKED_UNTIL_SIGNED_REFUND_SUCCESS"}));
    await db.query(
      `insert into crays_integration.clubs_hotel_refund_credit_commands
       (credit_command_id,tenant_id,refund_dispatch_envelope_id,refund_command_id,cancellation_authority_id,credit_kind,
        credit_amount_minor,currency,internal_reason_code,reason_evidence_sha256,command_sha256,command_state,
        provider_mutation_performed,formal_applied,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'BLOCKED_UNTIL_SIGNED_REFUND_SUCCESS',false,false,$12,$12)
       on conflict(tenant_id,refund_command_id)do nothing`,
      [input.creditCommandId,validated.tenantId,canonicalEnvelope.refund_dispatch_envelope_id,validated.refundCommandId,
       validated.cancellationAuthorityId,kind,validated.refundAmountMinor,validated.currency.toUpperCase(),authority.reasonCode,
       reasonEvidenceSha256,commandSha256,validated.createdAt]);
    return Object.freeze({refundCommandId:validated.refundCommandId,refundDispatchEnvelopeId:canonicalEnvelope.refund_dispatch_envelope_id,
      creditCommandId:input.creditCommandId,cancellationKind:"FULL_BOOKING"as const,refundKind:kind,creditKind:kind,
      internalReasonCode:authority.reasonCode,stripeRefundReason:policy.stripe_refund_reason,requestSha256,
      providerMutationPerformed:false as const,formalApplied:false as const});
  });
}

export async function leaseCanonicalHotelRefundEnvelope(pool:HotelRefundSagaPool,input:Readonly<{tenantId:string;leaseToken:string;leaseOwnerHash:string;leasedAt:string;leaseExpiresAt:string}>){
  if(!input.tenantId.trim()||!input.leaseToken.trim()||!SHA.test(input.leaseOwnerHash))throw new Error("HOTEL_CANONICAL_REFUND_LEASE_INVALID");
  const leased=instant(input.leasedAt),expires=instant(input.leaseExpiresAt);if(expires<=leased||expires-leased>300000)throw new Error("HOTEL_CANONICAL_REFUND_LEASE_WINDOW_INVALID");
  return transaction(pool,input.tenantId,async db=>{
    await db.query(`update crays_integration.clubs_hotel_stripe_refund_dispatch_envelopes e set command_state='queued',lease_token=null,lease_owner_hash=null,lease_expires_at=null,available_at=$2,updated_at=$2 where e.tenant_id=$1 and e.command_state='leased' and e.lease_expires_at<=$2`,[input.tenantId,input.leasedAt]);
    await db.query(`update crays_integration.clubs_hotel_stripe_refund_commands c set command_state='queued',lease_token=null,lease_owner_hash=null,lease_expires_at=null,available_at=$2,updated_at=$2 where c.tenant_id=$1 and c.command_state='leased' and c.lease_expires_at<=$2`,[input.tenantId,input.leasedAt]);
    const envelope=(await db.query<{refund_dispatch_envelope_id:string;refund_command_id:string;request_payload:Record<string,unknown>;request_sha256:string;attempt_count:number}>(
      `with candidate as(select refund_dispatch_envelope_id from crays_integration.clubs_hotel_stripe_refund_dispatch_envelopes where tenant_id=$1 and command_state='queued' and available_at<=$2 order by available_at,refund_dispatch_envelope_id for update skip locked limit 1)
       update crays_integration.clubs_hotel_stripe_refund_dispatch_envelopes e set command_state='leased',attempt_count=e.attempt_count+1,lease_token=$3,lease_owner_hash=$4,lease_expires_at=$5,updated_at=$2 from candidate where e.refund_dispatch_envelope_id=candidate.refund_dispatch_envelope_id returning e.refund_dispatch_envelope_id,e.refund_command_id,e.request_payload,e.request_sha256,e.attempt_count`,
      [input.tenantId,input.leasedAt,input.leaseToken,input.leaseOwnerHash,input.leaseExpiresAt])).rows[0];
    if(!envelope)return null;
    const updated=await db.query(`update crays_integration.clubs_hotel_stripe_refund_commands set command_state='leased',attempt_count=attempt_count+1,lease_token=$3,lease_owner_hash=$4,lease_expires_at=$5,updated_at=$2 where tenant_id=$1 and refund_command_id=$6 and command_state='queued' and request_sha256=$7 returning refund_command_id`,
      [input.tenantId,input.leasedAt,input.leaseToken,input.leaseOwnerHash,input.leaseExpiresAt,envelope.refund_command_id,envelope.request_sha256]);
    if(updated.rows.length!==1)throw new Error("HOTEL_CANONICAL_REFUND_DUAL_LEASE_CONFLICT");
    return Object.freeze({...envelope,leaseToken:input.leaseToken,leaseOwnerHash:input.leaseOwnerHash,leaseExpiresAt:input.leaseExpiresAt});
  });
}

export async function promoteHotelRefundCreditAfterSignedSuccess(pool:HotelRefundSagaPool,input:Readonly<{tenantId:string;creditCommandId:string;observedAt:string}>){
  if(!input.tenantId.trim()||!UUID.test(input.creditCommandId))throw new Error("HOTEL_REFUND_CREDIT_PROMOTION_INPUT_INVALID");instant(input.observedAt);
  return transaction(pool,input.tenantId,async db=>{const updated=await db.query(
    `update crays_integration.clubs_hotel_refund_credit_commands set command_state='READY_FOR_ERP',updated_at=$3 where tenant_id=$1 and credit_command_id=$2 and command_state='BLOCKED_UNTIL_SIGNED_REFUND_SUCCESS' returning credit_command_id,command_sha256`,[input.tenantId,input.creditCommandId,input.observedAt]);
    if(updated.rows.length!==1)throw new Error("HOTEL_REFUND_CREDIT_NOT_PROMOTABLE");return Object.freeze({...updated.rows[0],state:"READY_FOR_ERP"as const,erpCallPerformed:false as const,formalApplied:false as const});});
}
