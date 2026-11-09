import {z} from "zod";
import type {ClubsMembershipApplicationInput} from "@/lib/clubs/public-ambassador-registry";
import {DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT} from "@/lib/clubs/direct-membership-application-contract";
export const PUBLIC_FULL_APPLICATION_PURPOSE="public_ambassador_membership_application" as const;
export const PUBLIC_FULL_APPLICATION_CONSENT_VERSION=DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.privacy.consentStatementVersion;
export const PUBLIC_FULL_APPLICATION_LOCALES=["en","de","es","ca","fr","pt","it"] as const;
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const key=z.string().regex(/^cclub:application:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
// Browser validates shape only. Actual publication and recipient authority come from SaaS/Core.
const slug=z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalHttps=z.union([z.string().trim().max(500),z.null()]).transform(v=>v===""?null:v).refine(v=>{
 if(v===null)return true;try{return new URL(v).protocol==="https:"}catch{return false;}
}).transform(v=>v===null?null:new URL(v).toString());
/** Exact original 12 application fields plus the original UI's visitor email.
 * Email is a contact claim, never a verified identity/account/reviewer lookup. */
export const publicFullApplicantSchema=z.object({
 applicantType:z.enum(["individual","family","team"]),fullName:z.string().trim().min(2).max(120),
 email:z.string().trim().toLowerCase().email().max(254),basedIn:z.string().trim().min(2).max(120),
 interest:z.string().trim().min(2).max(160),preferredArrivalWindow:z.string().trim().min(2).max(120),
 preferredParticipationLength:z.string().trim().min(2).max(120),linkedinUrl:optionalHttps,socialUrl:optionalHttps,
 profileUrl:optionalHttps,motivation:z.string().trim().min(20).max(2000),contribution:z.string().trim().min(20).max(2000),consent:z.literal(true),
}).strict();
export type PublicFullApplicant=z.output<typeof publicFullApplicantSchema>;
export type OriginalPublicFullFormValues=ClubsMembershipApplicationInput;
const campaignToken=z.string().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
export const publicFullAcquisitionSchema=z.object({
 campaignId:z.string().min(3).max(256).regex(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/).optional(),
 utmSource:campaignToken.optional(),utmMedium:campaignToken.optional(),utmCampaign:campaignToken.optional(),
}).strict();
/** Whitelisted acquisition metadata is untrusted until matched to actual admitted
 * server campaign records. It never selects another recipient or grants commission. */
export const publicFullContextSchema=z.object({locale:z.enum(PUBLIC_FULL_APPLICATION_LOCALES),ambassadorSlug:slug,
 canonicalPersonalPath:z.string().max(180),entryPath:z.string().max(190),
 opaqueReferralContext:z.string().regex(/^[a-f0-9]{64}$/),acquisition:publicFullAcquisitionSchema,
}).strict().refine(c=>{
 const path="/"+c.locale+"/ambassadors/"+c.ambassadorSlug;
 return c.canonicalPersonalPath===path&&(c.entryPath===path||c.entryPath===path+"/apply");
});
export const publicFullApplicationSchema=z.object({schema:z.literal("crays.clubs.public-full-ambassador-application.v1"),
 purpose:z.literal(PUBLIC_FULL_APPLICATION_PURPOSE),type:z.literal("submit_application"),
 applicant:publicFullApplicantSchema,context:publicFullContextSchema,consentStatementVersion:z.literal(PUBLIC_FULL_APPLICATION_CONSENT_VERSION),
}).strict();
export type PublicFullApplication=z.output<typeof publicFullApplicationSchema>;
export type PublicFullApplicationContext=z.output<typeof publicFullContextSchema>;
export const publicFullApplicationJournalSchema=z.object({schema:z.literal("crays.clubs.public-full-application-journal.v1"),
 idempotencyKey:key,requestSha256:digest,locale:z.enum(PUBLIC_FULL_APPLICATION_LOCALES),ambassadorSlug:slug,
 canonicalPersonalPath:z.string(),entryPath:z.string(),opaqueReferralContext:z.string().regex(/^[a-f0-9]{64}$/),
 acquisition:publicFullAcquisitionSchema,consentStatementVersion:z.literal(PUBLIC_FULL_APPLICATION_CONSENT_VERSION),
 state:z.enum(["pending","unknown"]),createdAt:z.string().datetime({offset:true}),
}).strict().refine(j=>publicFullContextSchema.safeParse({locale:j.locale,ambassadorSlug:j.ambassadorSlug,canonicalPersonalPath:j.canonicalPersonalPath,entryPath:j.entryPath,opaqueReferralContext:j.opaqueReferralContext,acquisition:j.acquisition}).success);
export type PublicFullApplicationJournal=z.output<typeof publicFullApplicationJournalSchema>;
const replyBinding=z.object({idempotencyKey:key,requestSha256:digest,locale:z.enum(PUBLIC_FULL_APPLICATION_LOCALES),
 ambassadorSlug:slug,canonicalPersonalPath:z.string(),sourceBindingSha256:digest}).strict();
export const publicFullApplicationReplySchema=z.discriminatedUnion("status",[
 z.object({status:z.literal("unknown"),retryMode:z.literal("retain_original_idempotency_key")}).strict(),
 z.object({status:z.literal("pending"),retryMode:z.literal("same_idempotency_key"),binding:replyBinding}).strict(),
 z.object({status:z.literal("persisted"),serverPass:z.literal(true),binding:replyBinding,
 applicationId:z.string().regex(/^clubs-direct-membership-application_[0-9a-f-]{36}$/).refine(v=>z.string().uuid().safeParse(v.slice("clubs-direct-membership-application_".length)).success),
 receiptSha256:digest,attributionReceiptId:z.string().regex(/^clubs-public-ambassador-referral-attribution_[0-9a-f-]{36}$/).refine(v=>z.string().uuid().safeParse(v.slice("clubs-public-ambassador-referral-attribution_".length)).success),
 attributionReceiptSha256:digest,separateCoreReadbackVerified:z.literal(true),allFieldsStored:z.literal(true),
 replayed:z.boolean(),authorities:z.object({applicationPersisted:z.literal(true),membership:z.literal(false),
 propertyAdmission:z.literal(false),booking:z.literal(false),payment:z.literal(false),commission:z.literal(false)}).strict(),
 }).strict(),
]);
export type PublicFullApplicationReply=z.output<typeof publicFullApplicationReplySchema>;
/** This is a server-owned type, never accepted from a browser DTO. The current
 * Core reader resolves and verifies the exact original person/role/version against
 * configured public origin + canonicalPersonalPath, then persists this immutable binding
 * with the existing application/command/referral receipts in one governed workflow. */
export type CurrentPublicFullApplicationSourceBinding=Readonly<{
 purpose:typeof PUBLIC_FULL_APPLICATION_PURPOSE;originalRecipientId:string;originalPersonId:string;
 originalRecipientVersion:number;originalPublicProfileVersion:number;originalSourceSha256:string;
 recipientRoleId:string;canonicalPersonalUrl:string;locale:PublicFullApplicationContext["locale"];
 ambassadorSlug:string;canonicalPersonalPath:string;acquisitionAdmissionReceiptSha256:string|null;
 visitorEmailIdentityVerified:false;sourceBindingSha256:string;
}>;
export const PUBLIC_FULL_APPLICATION_ENDPOINTS={submit:"/api/crays/clubs/public/ambassador-applications",recovery:"/api/crays/clubs/public/ambassador-applications/recovery"} as const;

