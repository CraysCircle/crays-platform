import {z} from "zod";
const id=z.string().min(1).max(180),time=z.iso.datetime({offset:true}),sha=z.string().regex(/^[a-f0-9]{64}$/);
export const ownMemberDocumentSchema=z.object({documentId:id,bookingId:id,bookingVersion:z.number().int().positive(),kind:z.string().min(1).max(100),title:z.string().min(1).max(300),createdAt:time,contentSha256:sha.nullable(),documentRevisionSha256:sha,downloadAvailable:z.literal(false),inlineAvailable:z.literal(false)}).strict();
export const ownMemberDocumentsSchema=z.object({schema:z.literal("crays.clubs.member-own-documents.v1"),accountId:id,documents:z.array(ownMemberDocumentSchema).max(50)}).strict().superRefine((v,c)=>{if(new Set(v.documents.map(d=>d.documentId)).size!==v.documents.length)c.addIssue({code:"custom",message:"Duplicate original document"});});
export const ownMemberDocumentInputSchema=z.object({bookingId:z.string().regex(/^[A-Za-z0-9:_.-]{3,180}$/).nullable(),documentId:z.string().regex(/^[A-Za-z0-9:_.-]{3,180}$/).nullable(),limit:z.number().int().min(1).max(50)}).strict();
export type OwnMemberDocuments=z.output<typeof ownMemberDocumentsSchema>;
