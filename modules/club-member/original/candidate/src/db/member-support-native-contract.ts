import {z} from "zod";
const id=z.string().regex(/^[A-Za-z0-9:_.-]{3,180}$/);
const time=z.iso.datetime({offset:true});
const category=z.enum(["booking","change","cancellation","arrival","service","access","document","other"]);
const status=z.enum(["open","awaiting_team","awaiting_member","resolved","closed"]);
export const ownSupportCommandSchema=z.discriminatedUnion("type",[
 z.object({type:z.literal("open_case"),bookingId:id.optional(),category,subject:z.string().trim().min(3).max(160),message:z.string().trim().min(3).max(4000)}).strict(),
 z.object({type:z.literal("add_message"),caseId:id,message:z.string().trim().min(3).max(4000)}).strict(),
]);
export const ownSupportInputSchema=z.object({caseId:id.nullable()}).strict();
const supportCase=z.object({caseId:id,publicReference:id,bookingId:id.nullable(),category,subject:z.string().min(3).max(160),status,version:z.number().int().positive(),openedAt:time,updatedAt:time,messageCount:z.number().int().nonnegative()}).strict();
const message=z.object({messageId:id,caseId:id,authorType:z.enum(["member","team"]),body:z.string().min(3).max(4000),createdAt:time}).strict();
export const ownSupportStateSchema=z.object({schema:z.literal("crays.member.own-support.v1"),accountId:id,selectedCaseId:id.nullable(),supportCases:z.array(supportCase).max(100),messages:z.array(message).max(200),hasMoreCases:z.boolean(),hasMoreMessages:z.boolean(),testOnly:z.literal(true),externalDeliveryConfirmed:z.literal(false)}).strict().superRefine((v,c)=>{
 if(new Set(v.supportCases.map(s=>s.caseId)).size!==v.supportCases.length||new Set(v.messages.map(m=>m.messageId)).size!==v.messages.length)c.addIssue({code:"custom",message:"Duplicate original support record"});
 if(v.selectedCaseId===null&&(v.messages.length>0||v.hasMoreMessages))c.addIssue({code:"custom",message:"Messages require a selected case"});
 if(v.selectedCaseId!==null&&(v.supportCases.length!==1||v.supportCases[0]?.caseId!==v.selectedCaseId||v.messages.some(m=>m.caseId!==v.selectedCaseId)))c.addIssue({code:"custom",message:"Selected case scope mismatch"});
 if(v.messages.some(m=>!v.supportCases.some(s=>s.caseId===m.caseId)))c.addIssue({code:"custom",message:"Message case missing"});
});
export const ownSupportReceiptSchema=z.object({schema:z.literal("crays.member.own-support-receipt.v1"),accountId:id,testOnly:z.literal(true),externalDeliveryConfirmed:z.literal(false),receipt:z.object({receiptId:id,requestId:id,outcome:z.enum(["applied","denied","invalid"]),reason:z.string().nullable(),caseId:id.nullable(),resultingVersion:z.number().int().positive().nullable(),resultingStatus:status.nullable(),replayed:z.boolean()}).strict()}).strict().superRefine((v,c)=>{
 if(v.receipt.outcome==="applied"&&(!v.receipt.caseId||v.receipt.resultingVersion===null||v.receipt.resultingStatus===null))c.addIssue({code:"custom",message:"Applied support command requires persisted case/version/status"});
});
export type OwnSupportState=z.output<typeof ownSupportStateSchema>;
export type OwnSupportReceipt=z.output<typeof ownSupportReceiptSchema>;
