import { createHash } from "node:crypto";

export type HotelStripeFundingClient = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql:string,parameters?:readonly unknown[]):Promise<{rows:T[];rowCount?:number}>;
  release():void;
};
export type HotelStripeFundingPool = { connect():Promise<HotelStripeFundingClient> };

type FundingMode="FULL_IMMEDIATE_CAPTURE"|"DEPOSIT_IMMEDIATE_CAPTURE"|"PREAUTH_MANUAL_CAPTURE";
type PolicyRow={
  funding_policy_id:string;funding_mode:FundingMode;deposit_basis_points:number|null;
  preauthorization_basis_points:number|null;manual_capture_within_seconds:number|null;
  legal_approval_receipt_sha256:string;operational_approval_receipt_sha256:string;
};
type AuthorityRow={
  checkout_command_id:string;hold_id:string;amount_total_minor:string|number;currency:string;
  seller_snapshot_sha256:string;hold_expires_at:string;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function digest(value:string){return createHash("sha256").update(value,"utf8").digest("hex")}
function canonical(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string,unknown>).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}
function requireUuid(value:string,label:string){if(!UUID.test(value))throw new Error(`${label} must be UUID`)}
function requireTenant(value:string){if(value.trim().length===0)throw new Error("tenantId must be non-empty")}
function addSeconds(iso:string,seconds:number){return new Date(Date.parse(iso)+seconds*1000).toISOString()}
async function tx<T>(pool:HotelStripeFundingPool,run:(client:HotelStripeFundingClient)=>Promise<T>):Promise<T>{
  const client=await pool.connect();await client.query("BEGIN");
  try{const result=await run(client);await client.query("COMMIT");return result}catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}

function exactBasisPointAmount(totalMinor:number,basisPoints:number,label:string):number{
  if(!Number.isSafeInteger(totalMinor)||totalMinor<=0||!Number.isSafeInteger(basisPoints)||basisPoints<=0||basisPoints>10000)throw new Error(`${label} amount input invalid`);
  const numerator=totalMinor*basisPoints;
  if(!Number.isSafeInteger(numerator)||numerator%10000!==0)throw new Error(`${label} requires an explicitly approved exact minor-unit amount; implicit rounding is denied`);
  return numerator/10000;
}

export async function prepareHotelStripeFundingDecision(input:{
  pool:HotelStripeFundingPool;tenantId:string;checkoutCommandId:string;fundingDecisionReceiptId:string;
  fundingCreateCommandId:string;decidedAt:string;
}):Promise<{
  fundingDecisionReceiptId:string;fundingMode:FundingMode;providerAuthorizationAmountMinor:number;
  immediateCaptureAmountMinor:number;remainingBalanceMinor:number;captureMethod:"automatic"|"manual";
  manualCaptureDeadline:string|null;providerMutationPerformed:false;formalApplied:false;
}>{
  requireTenant(input.tenantId);[input.checkoutCommandId,input.fundingDecisionReceiptId,input.fundingCreateCommandId].forEach(id=>requireUuid(id,"funding id"));
  return tx(input.pool,async client=>{
    const authorityResult=await client.query<AuthorityRow>(
      `SELECT c.checkout_command_id,c.hold_id,c.amount_total_minor,c.currency,c.seller_snapshot_sha256,
              h.expires_at AS hold_expires_at
         FROM crays_core.clubs_hotel_stripe_checkout_commands c
         JOIN crays_core.clubs_hotel_booking_inventory_holds h ON h.tenant_id=c.tenant_id AND h.hold_id=c.hold_id
        WHERE c.tenant_id=$1 AND c.checkout_command_id=$2 AND h.hold_status='held-pending-payment'
          AND h.expires_at>$3
          AND NOT EXISTS (SELECT 1 FROM crays_core.clubs_hotel_stripe_webhook_inbox w WHERE w.tenant_id=c.tenant_id AND w.checkout_command_id=c.checkout_command_id)
        FOR UPDATE OF h`,[input.tenantId,input.checkoutCommandId,input.decidedAt]);
    const authority=authorityResult.rows[0];if(!authority)throw new Error("unexpired pre-provider hotel checkout authority not found");
    const policyResult=await client.query<PolicyRow>(
      `SELECT p.funding_policy_id,p.funding_mode,p.deposit_basis_points,p.preauthorization_basis_points,
              p.manual_capture_within_seconds,p.legal_approval_receipt_sha256,p.operational_approval_receipt_sha256
         FROM crays_core.clubs_hotel_stripe_funding_policies p
         JOIN crays_core.clubs_hotel_stripe_checkout_commands c ON c.tenant_id=p.tenant_id AND c.checkout_command_id=$2
         JOIN crays_core.clubs_hotel_booking_inventory_holds h ON h.tenant_id=c.tenant_id AND h.hold_id=c.hold_id
        WHERE p.tenant_id=$1 AND p.franchise_project_id=h.franchise_project_id AND p.property_id=h.property_id
          AND p.store_id=h.store_id AND p.legal_entity_id=h.legal_entity_id
          AND p.stripe_environment=c.stripe_environment AND p.currency=c.currency
          AND p.lifecycle_state='ACTIVE' AND p.persisted_record=true AND p.synthetic_source=false
          AND p.valid_from<=$3 AND p.valid_until>$3
        ORDER BY p.policy_version DESC LIMIT 1`,[input.tenantId,input.checkoutCommandId,input.decidedAt]);
    const policy=policyResult.rows[0];if(!policy)throw new Error("real legal and operational hotel Stripe funding policy missing");
    const total=Number(authority.amount_total_minor);if(!Number.isSafeInteger(total)||total<=0)throw new Error("booking total is not a safe positive minor-unit amount");
    let authorization=total,captureNow=total,remaining=0,captureMethod:"automatic"|"manual"="automatic",captureDeadline:string|null=null;
    if(policy.funding_mode==="DEPOSIT_IMMEDIATE_CAPTURE"){
      authorization=exactBasisPointAmount(total,Number(policy.deposit_basis_points),"deposit");captureNow=authorization;remaining=total-authorization;
    }else if(policy.funding_mode==="PREAUTH_MANUAL_CAPTURE"){
      authorization=exactBasisPointAmount(total,Number(policy.preauthorization_basis_points),"preauthorization");captureNow=0;remaining=total;captureMethod="manual";captureDeadline=addSeconds(input.decidedAt,Number(policy.manual_capture_within_seconds));
    }
    const decisionBody={checkoutCommandId:authority.checkout_command_id,holdId:authority.hold_id,policyId:policy.funding_policy_id,
      mode:policy.funding_mode,total,currency:authority.currency,authorization,captureNow,remaining,captureMethod,captureDeadline,
      sellerSnapshotSha256:authority.seller_snapshot_sha256,legalApprovalSha256:policy.legal_approval_receipt_sha256,
      operationalApprovalSha256:policy.operational_approval_receipt_sha256};
    const decisionSha256=digest(canonical(decisionBody));const idempotencyKey=`hotel-stripe-funding:${authority.checkout_command_id}`;
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_stripe_funding_decision_receipts (
         funding_decision_receipt_id,tenant_id,checkout_command_id,hold_id,funding_policy_id,funding_mode,currency,
         booking_total_minor,provider_authorization_amount_minor,immediate_capture_amount_minor,remaining_balance_minor,
         capture_method,manual_capture_deadline,seller_snapshot_sha256,legal_approval_receipt_sha256,
         operational_approval_receipt_sha256,decision_sha256,idempotency_key,decided_at,
         provider_mutation_performed,formal_applied,created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,false,false,$19)
       ON CONFLICT (tenant_id,idempotency_key) DO NOTHING`,
      [input.fundingDecisionReceiptId,input.tenantId,authority.checkout_command_id,authority.hold_id,policy.funding_policy_id,
       policy.funding_mode,authority.currency,total,authorization,captureNow,remaining,captureMethod,captureDeadline,
       authority.seller_snapshot_sha256,policy.legal_approval_receipt_sha256,policy.operational_approval_receipt_sha256,
       decisionSha256,idempotencyKey,input.decidedAt]);
    const persisted=await client.query<{funding_decision_receipt_id:string;decision_sha256:string}>(
      `SELECT funding_decision_receipt_id,decision_sha256 FROM crays_core.clubs_hotel_stripe_funding_decision_receipts WHERE tenant_id=$1 AND idempotency_key=$2`,[input.tenantId,idempotencyKey]);
    if(!persisted.rows[0]||persisted.rows[0].decision_sha256!==decisionSha256)throw new Error("hotel Stripe funding decision replay conflict");
    const commandKind=captureMethod==="manual"?"CREATE_PAYMENT_INTENT_MANUAL_CAPTURE":"CREATE_PAYMENT_INTENT_AUTOMATIC_CAPTURE";
    const requestSha256=digest(canonical({decisionSha256,providerAmountMinor:authorization,currency:authority.currency,captureMethod,providerMutationPerformed:false}));
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_stripe_funding_create_commands (
         funding_create_command_id,tenant_id,funding_decision_receipt_id,checkout_command_id,command_kind,
         provider_amount_minor,currency,capture_method,request_sha256,idempotency_key,command_state,
         provider_mutation_performed,formal_applied,created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PERSISTED_PENDING_PROVIDER',false,false,$11)
       ON CONFLICT (tenant_id,funding_decision_receipt_id) DO NOTHING`,
      [input.fundingCreateCommandId,input.tenantId,persisted.rows[0].funding_decision_receipt_id,
       authority.checkout_command_id,commandKind,authorization,authority.currency,captureMethod,requestSha256,
       `${idempotencyKey}:create`,input.decidedAt]);
    return {fundingDecisionReceiptId:persisted.rows[0].funding_decision_receipt_id,fundingMode:policy.funding_mode,
      providerAuthorizationAmountMinor:authorization,immediateCaptureAmountMinor:captureNow,remainingBalanceMinor:remaining,
      captureMethod,manualCaptureDeadline:captureDeadline,providerMutationPerformed:false,formalApplied:false};
  });
}

export async function prepareHotelStripeManualCaptureCommand(input:{
  pool:HotelStripeFundingPool;tenantId:string;fundingDecisionReceiptId:string;captureAuthorityReceiptId:string;
  webhookApplicationReceiptId:string;manualCaptureCommandId:string;createdAt:string;
}):Promise<{manualCaptureCommandId:string;paymentIntentId:string;captureAmountMinor:number;providerMutationPerformed:false;formalApplied:false}>{
  requireTenant(input.tenantId);[input.fundingDecisionReceiptId,input.captureAuthorityReceiptId,input.webhookApplicationReceiptId,input.manualCaptureCommandId].forEach(id=>requireUuid(id,"capture id"));
  return tx(input.pool,async client=>{
    const result=await client.query<{
      checkout_command_id:string;currency:string;capture_authority_receipt_id:string;webhook_receipt_id:string;
      payment_intent_id:string;approved_capture_amount_minor:string|number;authority_sha256:string;
      human_aal2_receipt_sha256:string;capture_approval_receipt_sha256:string;
    }>(
      `SELECT d.checkout_command_id,d.currency,a.capture_authority_receipt_id,w.webhook_receipt_id,
              a.payment_intent_id,a.approved_capture_amount_minor,a.authority_sha256,
              a.human_aal2_receipt_sha256,a.capture_approval_receipt_sha256
         FROM crays_core.clubs_hotel_stripe_funding_decision_receipts d
         JOIN crays_core.clubs_hotel_stripe_manual_capture_authority_receipts a
           ON a.tenant_id=d.tenant_id AND a.funding_decision_receipt_id=d.funding_decision_receipt_id
         JOIN crays_core.clubs_hotel_stripe_webhook_application_receipts wa
           ON wa.tenant_id=d.tenant_id AND wa.application_receipt_id=$4 AND wa.checkout_command_id=d.checkout_command_id
         JOIN crays_core.clubs_hotel_stripe_webhook_inbox w
           ON w.tenant_id=wa.tenant_id AND w.webhook_receipt_id=wa.webhook_receipt_id
        WHERE d.tenant_id=$1 AND d.funding_decision_receipt_id=$2 AND a.capture_authority_receipt_id=$3
          AND d.funding_mode='PREAUTH_MANUAL_CAPTURE' AND d.capture_method='manual'
          AND d.manual_capture_deadline>$5 AND a.issued_at<=$5 AND a.expires_at>$5
          AND a.persisted_record=true AND a.synthetic_source=false
          AND wa.disposition='APPLIED_CURRENT' AND wa.derived_payment_state='CAPTURABLE'
          AND w.signature_verified=true AND w.payment_intent_id=a.payment_intent_id
          AND a.approved_capture_amount_minor<=d.provider_authorization_amount_minor
        FOR UPDATE OF a`,
      [input.tenantId,input.fundingDecisionReceiptId,input.captureAuthorityReceiptId,input.webhookApplicationReceiptId,input.createdAt]);
    const authority=result.rows[0];if(!authority)throw new Error("fresh AAL2 amount-bound capturable Stripe authority missing");
    const amount=Number(authority.approved_capture_amount_minor);if(!Number.isSafeInteger(amount)||amount<=0)throw new Error("capture amount is invalid");
    const requestSha256=digest(canonical({decisionId:input.fundingDecisionReceiptId,authoritySha256:authority.authority_sha256,
      aal2Sha256:authority.human_aal2_receipt_sha256,captureApprovalSha256:authority.capture_approval_receipt_sha256,
      paymentIntentId:authority.payment_intent_id,captureAmountMinor:amount,currency:authority.currency}));
    const idempotencyKey=`hotel-stripe-manual-capture:${authority.capture_authority_receipt_id}`;
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_stripe_manual_capture_commands (
         manual_capture_command_id,tenant_id,funding_decision_receipt_id,capture_authority_receipt_id,
         webhook_receipt_id,webhook_application_receipt_id,checkout_command_id,payment_intent_id,
         capture_amount_minor,currency,request_sha256,idempotency_key,command_state,
         provider_mutation_performed,formal_applied,created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'PERSISTED_PENDING_PROVIDER',false,false,$13)
       ON CONFLICT (tenant_id,capture_authority_receipt_id) DO NOTHING`,
      [input.manualCaptureCommandId,input.tenantId,input.fundingDecisionReceiptId,input.captureAuthorityReceiptId,
       authority.webhook_receipt_id,input.webhookApplicationReceiptId,authority.checkout_command_id,
       authority.payment_intent_id,amount,authority.currency,requestSha256,idempotencyKey,input.createdAt]);
    const persisted=await client.query<{manual_capture_command_id:string;request_sha256:string}>(
      `SELECT manual_capture_command_id,request_sha256 FROM crays_core.clubs_hotel_stripe_manual_capture_commands WHERE tenant_id=$1 AND capture_authority_receipt_id=$2`,[input.tenantId,input.captureAuthorityReceiptId]);
    if(!persisted.rows[0]||persisted.rows[0].request_sha256!==requestSha256)throw new Error("hotel Stripe manual capture replay conflict");
    return {manualCaptureCommandId:persisted.rows[0].manual_capture_command_id,paymentIntentId:authority.payment_intent_id,
      captureAmountMinor:amount,providerMutationPerformed:false,formalApplied:false};
  });
}
