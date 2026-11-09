import {z} from "zod";
import {memberExperienceOfferSchema} from "./member-experience-contract";
export {memberExperienceReadInputSchema} from "./member-experience-contract";
export const memberServiceOffersReadSchema=z.object({schema:z.literal("crays.clubs.member-service-offers-read.v1"),accountId:z.string().min(1).max(180),sourceAuthority:z.literal("test_only"),catalog:z.array(memberExperienceOfferSchema).max(100),plans:z.array(z.never()).length(0),cartWriteAvailable:z.literal(false),checkoutAvailable:z.literal(false),liveMoneyAvailable:z.literal(false),confirmedPlansAvailable:z.literal(false)}).strict().superRefine((v,c)=>{if(new Set(v.catalog.map(o=>o.offerId)).size!==v.catalog.length||new Set(v.catalog.map(o=>o.variantId)).size!==v.catalog.length)c.addIssue({code:"custom",message:"Duplicate original service offer/variant"});});
export type MemberServiceOffersRead=z.output<typeof memberServiceOffersReadSchema>;
