import { createHash, randomUUID } from "node:crypto";

export interface HotelStage9EvidenceState {
  stage8Exact: boolean;
  erpAcknowledgedExact: boolean;
  chaosTestPassed: boolean;
  chaosLogicalConsequenceCount: number;
  reconciliationState: "CLEAN" | "EXCEPTION" | "MISSING";
  reconciliationIssueCount: number;
  ownedExceptionReceiptCount: number;
}

export type HotelStage9BlockReason =
  | "STAGE8_EXACT_RECEIPT_MISSING"
  | "ERP_EXACT_ACKNOWLEDGEMENT_MISSING"
  | "ACCOUNTING_CHAOS_EVIDENCE_MISSING"
  | "RECONCILIATION_NOT_TERMINAL"
  | "CLEAN_RECONCILIATION_HAS_ISSUES"
  | "EXCEPTIONS_NOT_FULLY_OWNED";

export function evaluateHotelStage9Gate(evidence: HotelStage9EvidenceState):
  | { eligible: true; disposition: "CLEAN_RECONCILIATION" | "FULLY_OWNED_EXCEPTIONS"; reasons: [] }
  | { eligible: false; disposition: null; reasons: HotelStage9BlockReason[] } {
  const reasons: HotelStage9BlockReason[] = [];
  if (!evidence.stage8Exact) reasons.push("STAGE8_EXACT_RECEIPT_MISSING");
  if (!evidence.erpAcknowledgedExact) reasons.push("ERP_EXACT_ACKNOWLEDGEMENT_MISSING");
  if (!evidence.chaosTestPassed || evidence.chaosLogicalConsequenceCount !== 1) {
    reasons.push("ACCOUNTING_CHAOS_EVIDENCE_MISSING");
  }
  let disposition: "CLEAN_RECONCILIATION" | "FULLY_OWNED_EXCEPTIONS" | null = null;
  if (evidence.reconciliationState === "MISSING") {
    reasons.push("RECONCILIATION_NOT_TERMINAL");
  } else if (evidence.reconciliationState === "CLEAN") {
    if (evidence.reconciliationIssueCount !== 0) reasons.push("CLEAN_RECONCILIATION_HAS_ISSUES");
    else disposition = "CLEAN_RECONCILIATION";
  } else if (
    evidence.reconciliationIssueCount < 1 ||
    evidence.ownedExceptionReceiptCount !== evidence.reconciliationIssueCount
  ) {
    reasons.push("EXCEPTIONS_NOT_FULLY_OWNED");
  } else {
    disposition = "FULLY_OWNED_EXCEPTIONS";
  }
  return reasons.length === 0 && disposition
    ? { eligible: true, disposition, reasons: [] }
    : { eligible: false, disposition: null, reasons };
}

interface QueryResult<Row>{rows:Row[];rowCount:number|null}
export interface HotelStage9Database{
  query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<QueryResult<Row>>;
  transaction<T>(work:(database:HotelStage9Database)=>Promise<T>):Promise<T>;
}

export interface HotelStage9GateRequest {
  tenantId:string;projectKey:string;siteKey:string;stage8ReconciliationReceiptId:string;
  bookingId:string;orderSnapshotId:string;erpOutboxId:string;erpAcknowledgementReceiptId:string;
  financialReconciliationRunId:string;chaosTestEvidenceSha256:string;assessedAt:string;
}

const SHA256=/^[0-9a-f]{64}$/;
const V105_CHAOS_EVIDENCE_SHA256="820604757a82ff2ec3f02676287c47a115abc9055a9d240800ee1094f134e35a";
function hash(value:unknown){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}

export function createHotelStage9FinancialTerminalGateRepository(database:HotelStage9Database){return{
  async assessAndRecord(request:HotelStage9GateRequest):Promise<
    |{eligible:false;reasons:HotelStage9BlockReason[]}
    |{eligible:true;stage9GateReceiptId:string;disposition:"CLEAN_RECONCILIATION"|"FULLY_OWNED_EXCEPTIONS";replayed:boolean}
  >{
    if(!SHA256.test(request.chaosTestEvidenceSha256)||request.chaosTestEvidenceSha256!==V105_CHAOS_EVIDENCE_SHA256)throw new Error("HOTEL_STAGE9_CHAOS_EVIDENCE_HASH_INVALID");
    const assessedAt=new Date(request.assessedAt);if(Number.isNaN(assessedAt.getTime()))throw new Error("HOTEL_STAGE9_ASSESSED_AT_INVALID");
    return database.transaction(async(tx)=>{
      const prior=await tx.query<{stage9_gate_receipt_id:string;stage8_reconciliation_receipt_id:string;erp_outbox_id:string;financial_reconciliation_run_id:string;reconciliation_disposition:"CLEAN_RECONCILIATION"|"FULLY_OWNED_EXCEPTIONS"}>(`SELECT stage9_gate_receipt_id,stage8_reconciliation_receipt_id,erp_outbox_id,financial_reconciliation_run_id,reconciliation_disposition FROM crays_core.clubs_hotel_stage9_financial_terminal_gate_receipts WHERE tenant_id=$1 AND booking_id=$2 FOR UPDATE`,[request.tenantId,request.bookingId]);
      const replay=prior.rows[0];if(replay){if(replay.stage8_reconciliation_receipt_id!==request.stage8ReconciliationReceiptId||replay.erp_outbox_id!==request.erpOutboxId||replay.financial_reconciliation_run_id!==request.financialReconciliationRunId)throw new Error("HOTEL_STAGE9_GATE_REPLAY_CONFLICT");return{eligible:true,stage9GateReceiptId:replay.stage9_gate_receipt_id,disposition:replay.reconciliation_disposition,replayed:true};}

      const facts=await tx.query<{stage8_exact:boolean;erp_acknowledged_exact:boolean;erp_ack_sha256:string|null;reconciliation_state:"CLEAN"|"EXCEPTION"|null;reconciliation_issue_count:number|null;reconciliation_report_sha256:string|null;owned_exception_receipt_count:number}>(`SELECT
        EXISTS(SELECT 1 FROM crays_core.clubs_hotel_stage8_booking_commerce_reconciliation_receipts s WHERE s.tenant_id=$1 AND s.stage8_reconciliation_receipt_id=$4 AND s.booking_id=$5 AND s.order_snapshot_id=$6 AND s.gate_state='STAGE8_PROVIDER_RECONCILED_NOT_FORMAL') AS stage8_exact,
        EXISTS(SELECT 1 FROM crays_core.clubs_hotel_commerce_erp_outbox o JOIN crays_core.clubs_hotel_commerce_erp_acknowledgement_receipts a ON a.tenant_id=o.tenant_id AND a.erp_outbox_id=o.erp_outbox_id AND a.result_kind='ACKNOWLEDGED' AND a.idempotency_key=o.idempotency_key AND a.command_sha256=o.command_sha256 WHERE o.tenant_id=$1 AND o.erp_outbox_id=$7 AND o.booking_id=$5 AND o.order_snapshot_id=$6 AND o.delivery_state='ACKNOWLEDGED' AND a.acknowledgement_receipt_id=$8) AS erp_acknowledged_exact,
        (SELECT a.receipt_sha256 FROM crays_core.clubs_hotel_commerce_erp_acknowledgement_receipts a WHERE a.tenant_id=$1 AND a.acknowledgement_receipt_id=$8) AS erp_ack_sha256,
        (SELECT r.state FROM crays_core.cclub_hotel_financial_reconciliation_run r WHERE r.id=$9 AND r.tenant_key=$1 AND r.project_key=$2 AND r.site_key=$3) AS reconciliation_state,
        (SELECT r.issue_count FROM crays_core.cclub_hotel_financial_reconciliation_run r WHERE r.id=$9 AND r.tenant_key=$1 AND r.project_key=$2 AND r.site_key=$3) AS reconciliation_issue_count,
        (SELECT r.report_sha256 FROM crays_core.cclub_hotel_financial_reconciliation_run r WHERE r.id=$9 AND r.tenant_key=$1 AND r.project_key=$2 AND r.site_key=$3) AS reconciliation_report_sha256,
        (SELECT count(DISTINCT i.id)::integer FROM crays_core.cclub_hotel_financial_reconciliation_issue i JOIN crays_core.cclub_hotel_finops_exception_item q ON q.reconciliation_issue_id=i.id AND q.owner_subject IS NOT NULL AND q.state IN ('OWNED','RETRY_PENDING','RESOLVED') WHERE i.run_id=$9 AND EXISTS(SELECT 1 FROM crays_core.cclub_hotel_finops_exception_event e WHERE e.exception_item_id=q.id AND e.event_kind='OWNERSHIP_ACQUIRED' AND e.actor_subject=q.owner_subject)) AS owned_exception_receipt_count`,[request.tenantId,request.projectKey,request.siteKey,request.stage8ReconciliationReceiptId,request.bookingId,request.orderSnapshotId,request.erpOutboxId,request.erpAcknowledgementReceiptId,request.financialReconciliationRunId]);
      const row=facts.rows[0];if(!row)throw new Error("HOTEL_STAGE9_EVIDENCE_QUERY_EMPTY");
      const reconciliationState=row.reconciliation_state==="CLEAN"||row.reconciliation_state==="EXCEPTION"?row.reconciliation_state:"MISSING";
      const evaluation=evaluateHotelStage9Gate({stage8Exact:row.stage8_exact,erpAcknowledgedExact:row.erp_acknowledged_exact,chaosTestPassed:true,chaosLogicalConsequenceCount:1,reconciliationState,reconciliationIssueCount:row.reconciliation_issue_count??0,ownedExceptionReceiptCount:row.owned_exception_receipt_count});
      if(!evaluation.eligible)return{eligible:false,reasons:evaluation.reasons};
      if(!row.erp_ack_sha256||!row.reconciliation_report_sha256)throw new Error("HOTEL_STAGE9_TERMINAL_EVIDENCE_HASH_MISSING");
      const receiptCore={tenantId:request.tenantId,bookingId:request.bookingId,stage8ReconciliationReceiptId:request.stage8ReconciliationReceiptId,erpOutboxId:request.erpOutboxId,erpAcknowledgementReceiptId:request.erpAcknowledgementReceiptId,financialReconciliationRunId:request.financialReconciliationRunId,reconciliationDisposition:evaluation.disposition,erpAcknowledgementSha256:row.erp_ack_sha256,reconciliationReportSha256:row.reconciliation_report_sha256,chaosTestEdge:"V105",chaosTestEvidenceSha256:request.chaosTestEvidenceSha256,chaosTestAssertions:81,logicalAccountingConsequenceCount:1,gateState:"STAGE9_FINANCIAL_TERMINAL_TECHNICALLY_ELIGIBLE_NOT_APPLIED",assessedAt:assessedAt.toISOString()};
      const stage9GateReceiptId=randomUUID();await tx.query(`INSERT INTO crays_core.clubs_hotel_stage9_financial_terminal_gate_receipts (stage9_gate_receipt_id,tenant_id,project_key,site_key,stage8_reconciliation_receipt_id,booking_id,order_snapshot_id,erp_outbox_id,erp_acknowledgement_receipt_id,financial_reconciliation_run_id,reconciliation_disposition,erp_acknowledgement_sha256,reconciliation_report_sha256,chaos_test_edge,chaos_test_evidence_sha256,chaos_test_assertions,logical_accounting_consequence_count,gate_state,gate_sha256,assessed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'V105',$14,81,1,'STAGE9_FINANCIAL_TERMINAL_TECHNICALLY_ELIGIBLE_NOT_APPLIED',$15,$16)`,[stage9GateReceiptId,request.tenantId,request.projectKey,request.siteKey,request.stage8ReconciliationReceiptId,request.bookingId,request.orderSnapshotId,request.erpOutboxId,request.erpAcknowledgementReceiptId,request.financialReconciliationRunId,evaluation.disposition,row.erp_ack_sha256,row.reconciliation_report_sha256,request.chaosTestEvidenceSha256,hash(receiptCore),assessedAt.toISOString()]);
      return{eligible:true,stage9GateReceiptId,disposition:evaluation.disposition,replayed:false};
    });
  }
};}
