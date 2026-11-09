import {memberFinanceReadSchema,type MemberFinanceRead} from "../../../lib/clubs/member-finance-contract";
import {createMemberGraphQLTransport,type MemberOperationRegistry} from "../../../lib/clubs/member-graphql-transport";
import {memberExperienceReadInputSchema} from "../../../lib/clubs/member-experience-contract";
import type {MemberFeed} from "./clubs-member-home-model";
export async function readMemberFinanceGraphQLFeed(registry:MemberOperationRegistry,fetcher:typeof fetch,signal:AbortSignal):Promise<MemberFeed<MemberFinanceRead>>{
 try {const input=memberExperienceReadInputSchema.parse({offerId:null,planId:null,limit:100});const data=await createMemberGraphQLTransport(registry,fetcher).read("ownFinance",{contractVersion:"1.0.0",...input},memberFinanceReadSchema,signal);if(signal.aborted)throw new DOMException("Cancelled","AbortError");return {kind:"ready",data};}
 catch {if(signal.aborted)throw new DOMException("Cancelled","AbortError");return {kind:"unavailable"};}
}
