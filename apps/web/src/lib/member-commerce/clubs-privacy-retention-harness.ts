import { createHash } from "node:crypto";

export type PrivacyField =
  | "GUEST_DISPLAY_NAME" | "GUEST_CONTACT_HANDLE" | "GUEST_SUBJECT_REF"
  | "BOOKING_REF" | "STAY_WINDOW" | "ROOM_CATEGORY" | "BOOKING_STATUS"
  | "PAYMENT_STATUS_CLASS" | "PAYMENT_PROVIDER_TOKEN" | "AMOUNT_MINOR" | "CURRENCY" | "TAX_MINOR"
  | "FINANCE_DOCUMENT_REF" | "AUDIT_EVENT_REF" | "INTERNAL_RISK_NOTE" | "PROVIDER_SECRET"
  | "LEGAL_HOLD_REASON" | "MEDIA_REF" | "DOCUMENT_REF";
export type ProcessingPurpose = "BOOKING_FULFILLMENT" | "CRM_ACTIVITY_SUMMARY" | "ERP_POSTING" | "SUBJECT_EXPORT" | "SUPPORT" | "SECURITY_AUDIT";

const PURPOSE_FIELDS: Readonly<Record<ProcessingPurpose, readonly PrivacyField[]>> = {
  BOOKING_FULFILLMENT: ["GUEST_DISPLAY_NAME","GUEST_CONTACT_HANDLE","GUEST_SUBJECT_REF","BOOKING_REF","STAY_WINDOW","ROOM_CATEGORY","BOOKING_STATUS","PAYMENT_STATUS_CLASS"],
  CRM_ACTIVITY_SUMMARY: ["GUEST_SUBJECT_REF","BOOKING_REF","STAY_WINDOW","ROOM_CATEGORY","BOOKING_STATUS"],
  ERP_POSTING: ["GUEST_SUBJECT_REF","BOOKING_REF","PAYMENT_STATUS_CLASS","AMOUNT_MINOR","CURRENCY","TAX_MINOR","FINANCE_DOCUMENT_REF"],
  SUBJECT_EXPORT: ["GUEST_DISPLAY_NAME","GUEST_CONTACT_HANDLE","GUEST_SUBJECT_REF","BOOKING_REF","STAY_WINDOW","ROOM_CATEGORY","BOOKING_STATUS","PAYMENT_STATUS_CLASS","AMOUNT_MINOR","CURRENCY","TAX_MINOR","FINANCE_DOCUMENT_REF","AUDIT_EVENT_REF","MEDIA_REF","DOCUMENT_REF"],
  SUPPORT: ["GUEST_DISPLAY_NAME","GUEST_CONTACT_HANDLE","GUEST_SUBJECT_REF","BOOKING_REF","STAY_WINDOW","ROOM_CATEGORY","BOOKING_STATUS","PAYMENT_STATUS_CLASS","MEDIA_REF","DOCUMENT_REF"],
  SECURITY_AUDIT: ["GUEST_SUBJECT_REF","BOOKING_REF","BOOKING_STATUS","PAYMENT_STATUS_CLASS","AUDIT_EVENT_REF","INTERNAL_RISK_NOTE"],
};

export function isPrivacyFieldPermitted(purpose: ProcessingPurpose, field: PrivacyField): boolean {
  return PURPOSE_FIELDS[purpose].includes(field);
}

export interface ConsentReceipt {
  tenantId: string;
  subjectId: string;
  purpose: "CRM_ACTIVITY_SUMMARY";
  scope: "PSEUDONYMOUS_BOOKING_ACTIVITY";
  grantedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  receiptSha256: string;
}

const SHA256=/^[0-9a-f]{64}$/;
export function validateConsent(receipt: ConsentReceipt | null, input: {tenantId:string;subjectId:string;purpose:ProcessingPurpose;now:string}): boolean {
  if(input.purpose!=="CRM_ACTIVITY_SUMMARY")return true;
  if(!receipt||!SHA256.test(receipt.receiptSha256))return false;
  const now=Date.parse(input.now),granted=Date.parse(receipt.grantedAt),expires=Date.parse(receipt.expiresAt);
  return Number.isFinite(now)&&Number.isFinite(granted)&&Number.isFinite(expires)&&receipt.tenantId===input.tenantId&&receipt.subjectId===input.subjectId&&receipt.purpose==="CRM_ACTIVITY_SUMMARY"&&receipt.scope==="PSEUDONYMOUS_BOOKING_ACTIVITY"&&receipt.revokedAt===null&&granted<=now&&now<expires;
}

export interface SubjectDataRecord {recordId:string;tenantId:string;subjectId:string;thirdPartySubject:boolean;field:PrivacyField;valueSha256:string}
export function buildSubjectExport(records:readonly SubjectDataRecord[],input:{tenantId:string;subjectId:string;requestReceiptSha256:string}):Readonly<{recordHashes:readonly string[];exportSha256:string;excludedCount:number}>{
  if(!SHA256.test(input.requestReceiptSha256))throw new Error("PRIVACY_EXPORT_REQUEST_RECEIPT_INVALID");
  const eligible=records.filter((record)=>record.tenantId===input.tenantId&&record.subjectId===input.subjectId&&!record.thirdPartySubject&&isPrivacyFieldPermitted("SUBJECT_EXPORT",record.field)&&SHA256.test(record.valueSha256));
  const recordHashes=eligible.map((record)=>createHash("sha256").update(`${record.recordId}\u0000${record.field}\u0000${record.valueSha256}`).digest("hex")).sort();
  return Object.freeze({recordHashes,exportSha256:createHash("sha256").update(JSON.stringify({requestReceiptSha256:input.requestReceiptSha256,recordHashes})).digest("hex"),excludedCount:records.length-eligible.length});
}

export type RetentionClass="DIRECT_IDENTITY"|"BOOKING_OPERATIONAL"|"FINANCE_LEDGER"|"AUDIT"|"MEDIA"|"DOCUMENT"|"PROVIDER_SECRET";
export type DeletionDecision="DELETE"|"PSEUDONYMIZE"|"DEFER_ACTIVE_BOOKING"|"RETAIN_FINANCE"|"RETAIN_AUDIT"|"RETAIN_LEGAL_HOLD"|"BLOCKED_RETENTION_POLICY_MISSING";
export function decideDeletion(input:{retentionClass:RetentionClass;legalHoldActive:boolean;activeBooking:boolean;retentionUntil:string|null;now:string}):DeletionDecision{
  if(input.legalHoldActive)return"RETAIN_LEGAL_HOLD";
  const now=Date.parse(input.now);if(!Number.isFinite(now))throw new Error("PRIVACY_DELETION_NOW_INVALID");
  if(input.retentionClass==="FINANCE_LEDGER"||input.retentionClass==="AUDIT"){
    if(!input.retentionUntil)return"BLOCKED_RETENTION_POLICY_MISSING";
    const until=Date.parse(input.retentionUntil);if(!Number.isFinite(until))throw new Error("PRIVACY_RETENTION_UNTIL_INVALID");
    if(now<until)return input.retentionClass==="FINANCE_LEDGER"?"RETAIN_FINANCE":"RETAIN_AUDIT";
  }
  if(input.activeBooking&&["DIRECT_IDENTITY","BOOKING_OPERATIONAL","DOCUMENT"].includes(input.retentionClass))return"DEFER_ACTIVE_BOOKING";
  if(input.retentionClass==="DIRECT_IDENTITY")return"PSEUDONYMIZE";
  if(input.retentionClass==="PROVIDER_SECRET")return"DELETE";
  return"DELETE";
}

export type AssetVisibility="PUBLIC_APPROVED"|"PUBLIC_PENDING"|"MEMBER_GRANTED"|"PRIVATE_RECIPIENT"|"INTERNAL_RESTRICTED"|"PROVIDER_SECRET";
export interface PrivacyAsset{assetId:string;tenantId:string;visibility:AssetVisibility;requiredGrantId:string|null;recipientSubjectId:string|null}
export interface AssetViewer{authenticated:boolean;tenantId:string|null;subjectId:string|null;activeGrantIds:readonly string[];internalAuthorized:boolean}
export function canViewPrivacyAsset(asset:PrivacyAsset,viewer:AssetViewer):boolean{
  if(asset.visibility==="PUBLIC_APPROVED")return true;
  if(asset.visibility==="PUBLIC_PENDING"||asset.visibility==="PROVIDER_SECRET")return false;
  if(!viewer.authenticated||viewer.tenantId!==asset.tenantId)return false;
  if(asset.visibility==="INTERNAL_RESTRICTED")return viewer.internalAuthorized;
  if(!asset.requiredGrantId||!viewer.activeGrantIds.includes(asset.requiredGrantId))return false;
  if(asset.visibility==="PRIVATE_RECIPIENT")return viewer.subjectId!==null&&viewer.subjectId===asset.recipientSubjectId;
  return asset.visibility==="MEMBER_GRANTED";
}
