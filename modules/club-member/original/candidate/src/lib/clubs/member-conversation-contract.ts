import {z} from "zod";
const id=z.string().min(1).max(180),time=z.iso.datetime({offset:true}),sha=z.string().regex(/^[a-f0-9]{64}$/);
const message=z.object({messageId:id,authorType:z.enum(["member","automation"]),authorName:z.string().min(1).max(100),body:z.string().min(1).max(4000),createdAt:time,messageRevisionSha256:sha}).strict();
const conversation=z.object({caseId:id,caseVersion:z.number().int().positive(),publicReference:id,bookingId:id.nullable(),
 category:z.enum(["booking","change","cancellation","arrival","service","access","document","other"]),subject:z.string().min(1).max(160),status:z.string().min(1).max(80),openedAt:time,updatedAt:time,crmRecords:z.array(z.object({recordId:id,taskId:id,title:z.string().min(1).max(160),provider:z.literal("twenty"),testOnly:z.literal(true)}).strict()).max(10),tasks:z.array(z.object({taskId:id,title:z.string().min(1).max(160),provider:z.literal("plane"),authorName:z.literal("CRAYS Support Automation (TEST)"),testOnly:z.literal(true)}).strict()).max(10),messages:z.array(message).max(50)}).strict();
/** This bounded first reader exposes only original member posts. Team replies, internal
 * provider comments and attachment/download access need separate publication/admission proof. */
export const ownMemberConversationsSchema=z.object({schema:z.literal("crays.clubs.member-own-conversations.v1"),accountId:id,
 teamReplyPublicationAvailable:z.literal(false),providerAttachmentAccessAvailable:z.literal(false),cases:z.array(conversation).max(50)}).strict().superRefine((v,c)=>{
 const cases=new Set<string>(),messages=new Set<string>();
 for(const row of v.cases){if(cases.has(row.caseId))c.addIssue({code:"custom",message:"Duplicate original case"});cases.add(row.caseId);
 for(const m of row.messages){if(messages.has(m.messageId))c.addIssue({code:"custom",message:"Duplicate original message"});messages.add(m.messageId);}}
});
export const ownMemberConversationInputSchema=z.object({caseId:z.string().regex(/^[A-Za-z0-9:_.-]{3,180}$/).nullable(),limit:z.number().int().min(1).max(50)}).strict();
export type OwnMemberConversations=z.output<typeof ownMemberConversationsSchema>;
