"use client";
import {z} from "zod";
import type {UploadInput} from "./member-demo-document-upload-client";
const sha=z.string().regex(/^[a-f0-9]{64}$/);
const metadata=z.object({contractVersion:z.literal("1.0.0"),idempotencyKey:z.string().min(16).max(100),title:z.string().trim().min(1).max(300),kind:z.enum(["travel","stay","membership","general"]),sourceRecordId:z.string().regex(/^map_member_test_stay_[a-f0-9]{32}$/).nullable(),sourceVersion:z.number().int().positive().nullable(),sourceRowSha256:sha.nullable()}).strict().superRefine((v,c)=>{if((v.sourceRecordId===null)!==(v.sourceVersion===null)||(v.sourceRecordId===null)!==(v.sourceRowSha256===null))c.addIssue({code:"custom",message:"Original stay version is required"});});
const schema=z.object({schema:z.literal("crays.member.document-upload-intent.v1"),accountId:z.string().min(1).max(180),createdAt:z.iso.datetime(),file:z.object({name:z.string().min(1).max(180).refine(v=>!/[\/\\\r\n]/.test(v)),type:z.enum(["application/pdf","image/png","image/jpeg"]),bytes:z.number().int().min(8).max(10485760),sha256:sha}).strict(),metadata}).strict();
export type MemberDocumentUploadIntent=z.output<typeof schema>;
const key=(accountId:string)=>"crays-member-document-upload-pending:v1:"+accountId;
/** Account-scoped recovery reference only. File contents, session tokens and provider
 * credentials are never stored. Server SDK/Core remains the sole authority. */
export function restoreMemberDocumentUpload(storage:Storage,accountId:string):MemberDocumentUploadIntent|null{
 const raw=storage.getItem(key(accountId));if(raw===null)return null;
 if(raw.length>8192)throw Error("Your earlier upload reference needs checking. No new file was sent.");
 const value=schema.parse(JSON.parse(raw));if(value.accountId!==accountId)throw Error("The original upload account changed. No new file was sent.");return value;
}
export async function prepareMemberDocumentUpload(storage:Storage,accountId:string,input:Omit<UploadInput,"idempotencyKey">):Promise<MemberDocumentUploadIntent>{
 const file=input.file;if(file.size<8||file.size>10485760||!["application/pdf","image/png","image/jpeg"].includes(file.type))throw Error("Choose a PDF, PNG or JPEG up to 10 MB.");
 const bytes=await file.arrayBuffer();const sha256=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(v=>v.toString(16).padStart(2,"0")).join("");
 const original=restoreMemberDocumentUpload(storage,accountId);
 if(original){if(original.file.name!==file.name||original.file.type!==file.type||original.file.bytes!==file.size||original.file.sha256!==sha256)throw Error("Select the original file to check its saved upload. A different file will not be shared.");return original;}
 const intent=schema.parse({schema:"crays.member.document-upload-intent.v1",accountId,createdAt:new Date().toISOString(),file:{name:file.name,type:file.type,bytes:file.size,sha256},metadata:{contractVersion:"1.0.0",idempotencyKey:"member-document-"+crypto.randomUUID(),title:input.title,kind:input.kind,sourceRecordId:input.sourceRecordId,sourceVersion:input.sourceVersion,sourceRowSha256:input.sourceRowSha256}});
 const raw=JSON.stringify(intent);storage.setItem(key(accountId),raw);if(storage.getItem(key(accountId))!==raw)throw Error("We couldn’t retain the original upload reference. No file was sent.");return intent;
}
export function clearMemberDocumentUpload(storage:Storage,intent:MemberDocumentUploadIntent):boolean{
 const current=restoreMemberDocumentUpload(storage,intent.accountId);if(current===null)return true;
 if(JSON.stringify(current)!==JSON.stringify(intent))return false;
 storage.removeItem(key(intent.accountId));return storage.getItem(key(intent.accountId))===null;
}
/** Called inside the account lock. Preserve an older tab reference before
 * removing it; a conflicting or unreadable reference always blocks a new upload. */
export function restorePersistentMemberDocumentUpload(storage:Storage,tab:Storage,accountId:string):MemberDocumentUploadIntent|null{
 const persistent=restoreMemberDocumentUpload(storage,accountId),previous=restoreMemberDocumentUpload(tab,accountId);
 if(previous&&persistent&&JSON.stringify(previous)!==JSON.stringify(persistent))throw Error("Two earlier upload references need checking. No new file was sent.");
 if(previous&&!persistent){const raw=JSON.stringify(previous);storage.setItem(key(accountId),raw);if(storage.getItem(key(accountId))!==raw)throw Error("We couldn’t retain the original upload reference. No file was sent.");}
 if(previous&&!clearMemberDocumentUpload(tab,previous))throw Error("Your earlier upload reference changed. No new file was sent.");
 return persistent??previous;
}
export async function withMemberDocumentUploadLock<T>(accountId:string,operation:()=>Promise<T>):Promise<T>{
 if(typeof navigator==="undefined"||!navigator.locks?.request)throw Error("This browser couldn’t protect your original upload reference. No new file was sent.");
 return navigator.locks.request("crays.member.document-upload.v1:"+accountId,{mode:"exclusive"},operation);
}
