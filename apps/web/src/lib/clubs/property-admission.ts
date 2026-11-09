import { createHash } from "node:crypto";
export const CLUBS_PROPERTY_ACCESS_MODES=["open","property_admission_required"] as const;
export type ClubsPropertyAccessMode=(typeof CLUBS_PROPERTY_ACCESS_MODES)[number];
export const FAIL_CLOSED_PROPERTY_ACCESS_MODE:ClubsPropertyAccessMode="property_admission_required";
export type PropertyAdmissionDecisionReason="OPEN_ACCESS"|"ACTIVE_GRANT"|"ACCOUNT_REQUIRED"|"GRANT_NOT_FOUND_OR_AMBIGUOUS";
export type PropertyAdmissionDecisionMaterial={tenantId:string;propertyId:string;storeId:string;operatorLegalEntityId:string;
 assignmentId:string;assignmentVersion:number;accessMode:ClubsPropertyAccessMode;admitted:boolean;accountId:string|null;
 grantId:string|null;grantVersion:number|null;policyVersion:string;authorityAt:string|Date;
 decisionReason:PropertyAdmissionDecisionReason;decisionKeySha256:string|null;commandIdempotencySha256:string|null};
export type ClubsPropertyAdmissionDecision={propertyId:string;accessMode:ClubsPropertyAccessMode;admitted:boolean;
 accountId:string|null;grantId:string|null;grantVersion:number|null;policyVersion:string;authorityAt:string;
 assignmentId:string;assignmentVersion:number;decisionKeySha256:string|null;commandIdempotencySha256:string|null;
 decisionReceiptId:string;decisionSha256:string};
export function normalizePropertyAdmissionAuthorityAt(v:string|Date){
 const d=v instanceof Date?v:new Date(v);if(!Number.isFinite(d.getTime()))throw new Error("invalid_property_admission_authority_at");
 return d.toISOString();
}
function segment(v:string|null){return v===null?"-1:":Buffer.byteLength(v,"utf8")+":"+v;}
export function canonicalPropertyAdmissionDecision(m:PropertyAdmissionDecisionMaterial){
 if(!CLUBS_PROPERTY_ACCESS_MODES.includes(m.accessMode)||!m.tenantId||!m.propertyId||!m.storeId||
  !m.operatorLegalEntityId||!m.assignmentId||!m.policyVersion)throw new Error("incomplete_property_admission_authority");
 if(!Number.isInteger(m.assignmentVersion)||m.assignmentVersion<1)throw new Error("invalid_property_admission_assignment");
 if(m.decisionKeySha256!==null&&!/^[a-f0-9]{64}$/.test(m.decisionKeySha256))throw new Error("invalid_property_admission_decision_key");
 if(m.commandIdempotencySha256!==null&&!/^[a-f0-9]{64}$/.test(m.commandIdempotencySha256))
  throw new Error("invalid_property_admission_command_idempotency");
 if((m.grantId===null)!==(m.grantVersion===null)||m.grantVersion!==null&&(!Number.isInteger(m.grantVersion)||m.grantVersion<1))
  throw new Error("invalid_property_admission_grant");
 if(m.accessMode==="open"&&(!m.admitted||m.grantId!==null||m.decisionReason!=="OPEN_ACCESS"))throw new Error("invalid_open_property_admission");
 if(m.accessMode==="property_admission_required"&&m.admitted&&(m.accountId===null||m.grantId===null||m.decisionReason!=="ACTIVE_GRANT"))
  throw new Error("invalid_required_property_admission");
 if(m.accessMode==="property_admission_required"&&!m.admitted&&(m.grantId!==null||
  !["ACCOUNT_REQUIRED","GRANT_NOT_FOUND_OR_AMBIGUOUS"].includes(m.decisionReason)))throw new Error("invalid_property_admission_denial");
 return["cclub063.property-admission.decision.v3",m.tenantId,m.propertyId,m.storeId,m.operatorLegalEntityId,
  m.assignmentId,String(m.assignmentVersion),m.accessMode,m.admitted?"true":"false",m.accountId,m.grantId,
  m.grantVersion===null?null:String(m.grantVersion),m.policyVersion,normalizePropertyAdmissionAuthorityAt(m.authorityAt),
  m.decisionReason,m.decisionKeySha256,m.commandIdempotencySha256].map(segment).join("");
}
export function propertyAdmissionDecisionSha256(m:PropertyAdmissionDecisionMaterial){
 return createHash("sha256").update(canonicalPropertyAdmissionDecision(m),"utf8").digest("hex");
}
export function propertyAdmissionDecisionReceiptId(sha:string){
 if(!/^[a-f0-9]{64}$/.test(sha))throw new Error("invalid_property_admission_decision_sha256");
 return "cpa-decision-"+sha;
}
