import {z} from "zod";
const id=z.string().min(1).max(180),sha=z.string().regex(/^[a-f0-9]{64}$/),version=z.number().int().positive();
const currencies=z.enum(["CHF","EUR","USD"]),time=z.iso.datetime({offset:true});
const slot=z.object({slotId:id,date:z.iso.date(),version,capacity:z.number().int().nonnegative().nullable(),sourceSha256:sha}).strict();
/** A Core-approved experience offering is a ticket product. Hotel/Gym products and title/category guesses are not mappings. */
export const memberExperienceOfferSchema=z.object({offerId:id,offerVersion:version,coreCatalogueReceiptId:id,coreCatalogueReceiptSha256:sha,
 productId:id,variantId:id,productKind:z.literal("ticket"),title:z.string().min(1).max(300),description:z.string().max(6000),category:z.string().min(1).max(100),
 imageAssetId:id.nullable(),currency:currencies,unitPriceMinor:z.number().int().nonnegative().max(1000000000),priceRevisionSha256:sha,
 slots:z.array(slot).max(100),productEnabled:z.boolean(),variantEnabled:z.boolean(),sellable:z.boolean(),
 sourceAuthority:z.literal("test_only"),bookingAuthority:z.literal(false),paymentAuthority:z.literal(false)}).strict().superRefine((v,c)=>{
 if(new Set(v.slots.map(s=>s.slotId)).size!==v.slots.length)c.addIssue({code:"custom",message:"Duplicate original slot"});
 if(v.sellable&&(!v.productEnabled||!v.variantEnabled))c.addIssue({code:"custom",message:"Disabled native product is not sellable"});
});
/** First own-plan read: persisted saved plans only. Cart/confirmation require dedicated native effect/readback contracts. */
export const memberExperienceSavedPlanSchema=z.object({planId:id,version,offerId:id,offerVersion:version,offerSourceSha256:sha,
 state:z.literal("saved"),selectedSlotId:id.nullable(),createdAt:time,updatedAt:time}).strict();
export const memberExperienceReadSchema=z.object({schema:z.literal("crays.clubs.member-experiences-read.v1"),accountId:id,
 sourceAuthority:z.literal("test_only"),catalog:z.array(memberExperienceOfferSchema).max(100),plans:z.array(memberExperienceSavedPlanSchema).max(100),
 cartWriteAvailable:z.literal(false),checkoutAvailable:z.literal(false),liveMoneyAvailable:z.literal(false),confirmedPlansAvailable:z.literal(false)}).strict().superRefine((v,c)=>{
 const offers=new Map(v.catalog.map(o=>[o.offerId,o]));
 if(offers.size!==v.catalog.length||new Set(v.catalog.map(o=>o.variantId)).size!==v.catalog.length||new Set(v.plans.map(p=>p.planId)).size!==v.plans.length)c.addIssue({code:"custom",message:"Duplicate original offer/variant/plan"});
 for(const p of v.plans){const o=offers.get(p.offerId);if(!o||o.offerVersion!==p.offerVersion||o.coreCatalogueReceiptSha256!==p.offerSourceSha256||p.selectedSlotId!==null&&!o.slots.some(s=>s.slotId===p.selectedSlotId))c.addIssue({code:"custom",message:"Own plan requires exact original catalogue/slot version"});}
});

export const memberExperienceReadInputSchema=z.object({offerId:id.nullable(),planId:id.nullable(),limit:z.number().int().min(1).max(100)}).strict();
export type MemberExperienceRead=z.output<typeof memberExperienceReadSchema>;
