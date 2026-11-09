import {z} from "zod";
const id=z.string().min(1).max(180);
const shared={provider:z.literal("plane"),caseId:id,taskId:id,authorType:z.literal("automation"),authorName:z.literal("CRAYS Support Automation (TEST)"),testOnly:z.literal(true),nativeApiAcknowledged:z.literal(true)};
const task=z.object({kind:z.literal("task"),...shared,projectId:id,workspaceId:id,title:z.string().min(1).max(160),nativeStateId:id.nullable()}).strict();
const reply=z.object({kind:z.literal("automation_reply"),...shared,commentId:id,body:z.string().min(1).max(4000),createdAt:z.iso.datetime({offset:true})}).strict();
const crm=z.object({kind:z.literal("crm_record"),provider:z.literal("twenty"),caseId:id,taskId:id,recordId:id,objectMetadataId:id,workspaceId:id,title:z.string().min(1).max(160),authorType:z.literal("automation"),authorName:z.literal("CRAYS Support Automation (TEST)"),testOnly:z.literal(true),nativeApiAcknowledged:z.literal(true)}).strict();
export const memberSupportToolsSchema=z.object({schema:z.literal("crays.clubs.member-support-tools.v2"),accountId:id,caseId:id,receipts:z.array(z.discriminatedUnion("kind",[task,reply,crm])).max(100),testOnly:z.literal(true),externalDeliveryConfirmed:z.literal(false)}).strict();
