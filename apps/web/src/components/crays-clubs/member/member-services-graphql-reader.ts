import {memberServiceOffersReadSchema,memberExperienceReadInputSchema,type MemberServiceOffersRead} from "@/lib/clubs/member-service-offers-contract";
import {createMemberGraphQLTransport,type MemberOperationRegistry} from "@/lib/clubs/member-graphql-transport";
import type {MemberFeed} from "./clubs-member-home-model";
export async function readMemberServiceOffersGraphQLFeed(registry:MemberOperationRegistry,fetcher:typeof fetch,signal:AbortSignal):Promise<MemberFeed<MemberServiceOffersRead>>{
 try {const input=memberExperienceReadInputSchema.parse({offerId:null,planId:null,limit:100});const data=await createMemberGraphQLTransport(registry,fetcher).read("ownServiceOffers",{contractVersion:"1.0.0",...input},memberServiceOffersReadSchema,signal);if(signal.aborted)throw new DOMException("Cancelled","AbortError");return {kind:"ready",data};}
 catch {if(signal.aborted)throw new DOMException("Cancelled","AbortError");return {kind:"unavailable"};}
}
