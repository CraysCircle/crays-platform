import {readMemberExperiencesGraphQLFeed} from "./member-experiences-graphql-reader";
import {readMemberTestStaysGraphQLFeed} from "./member-test-stays-graphql-reader";
import {readMemberDocumentsGraphQLFeed} from "./member-documents-graphql-reader";
import {readMemberConversationsGraphQLFeed} from "./member-conversations-graphql-reader";
import type {MemberOperationRegistry} from "@/lib/clubs/member-graphql-transport";
import {z} from "zod";
import registry from "@/graphql/member-self/MEMBER_SELF_OPERATION_REGISTRY.json";
import {readMemberOwnStateGraphQLFeeds} from "./member-own-state-graphql-reader";
import type {MemberWorkspace} from "./clubs-member-home-model";

// This validates presentation data only. Account ownership remains in the existing server BFF.
const text=z.string();
const nullableText=text.nullable();
const booking=z.object({bookingId:text,publicReference:text,status:text,propertyId:text,arrivalDate:nullableText,departureDate:nullableText,guestCount:z.number().int().nonnegative().nullable(),currency:nullableText,totalMinor:z.number().int().nullable()}).passthrough();
const service=z.object({selectionId:text,bookingId:text,displayName:text,status:text,requestedFor:nullableText}).passthrough();
const offering=z.object({offeringId:text,bookingId:text,bookingReference:text,displayName:text,serviceCode:text,serviceType:text}).passthrough();
const document=z.object({documentId:text,kind:text,title:text,createdAt:text,bookingUrn:text.optional()}).passthrough();
const supportCase=z.object({caseId:text,publicReference:text,subject:text,status:text,messageCount:z.number().int().nonnegative()}).passthrough();
const schemas={
 bookings:z.object({bookings:z.array(booking)}).passthrough(),
 requests:z.object({requests:z.array(z.object({bookingRequestId:text,publicReference:text,status:text}).passthrough())}).passthrough(),
 services:z.object({services:z.array(service),availableOfferings:z.array(offering).optional()}).passthrough(),
 support:z.object({documents:z.array(document),supportCases:z.array(supportCase)}).passthrough(),
 membership:z.object({membership:z.object({status:text,validUntil:nullableText}).passthrough().nullable(),application:z.object({status:text}).passthrough().nullable(),authorities:z.object({membershipConfirmed:z.boolean()}).passthrough()}).passthrough(),
 savedCart:z.object({savedPropertyIds:z.array(text),cartItems:z.array(z.unknown())}).passthrough(),
};
export function parseMemberFeed<K extends keyof typeof schemas>(key:K,value:unknown):MemberWorkspace[K]{
 if(!value||typeof value!=="object"||!("status" in value)||value.status!=="ready")return {kind:"unavailable"} as MemberWorkspace[K];
 const parsed=schemas[key].safeParse(value);
 return (parsed.success?{kind:"ready",data:parsed.data}:{kind:"unavailable"}) as MemberWorkspace[K];
}
const paths=[['bookings','bookings'],['requests','booking-requests'],['services','services'],['support','stay-support'],['membership','membership'],['savedCart','state']] as const;
export async function readMemberWorkspaceFeeds(fetcher:typeof fetch,signal:AbortSignal):Promise<MemberWorkspace>{
 const entries=await Promise.all(paths.map(async([key,path])=>{
  try{
   const result=await fetcher(`/api/crays/clubs/member/${path}`,{credentials:"same-origin",cache:"no-store",signal});
   return [key,result.ok?parseMemberFeed(key,await result.json()):{kind:"unavailable"}] as const;
  }catch{return [key,{kind:"unavailable"}] as const;}
 }));
 // An older refresh must never overwrite the result of a later refresh.
 if(signal.aborted)throw new DOMException("The member refresh was cancelled.","AbortError");
 return Object.fromEntries(entries) as MemberWorkspace;
}

/** Saved and membership use the admitted Core persisted operation; cart stays independently unavailable. */
const ownRegistry={sourceSha256:registry.sourceSha256,operations:{ownState:{...registry.operations.ownState,kind:z.literal("query").parse(registry.operations.ownState.kind)}}};
export async function readMemberOwnStateFeed(fetcher:typeof fetch,signal:AbortSignal):Promise<Pick<MemberWorkspace,"membership"|"savedProperties">>{
 return readMemberOwnStateGraphQLFeeds(ownRegistry,fetcher,signal);
}

/** Missing active operation returns unavailable without making a request. */
export async function readMemberConversationFeed(fetcher:typeof fetch,signal:AbortSignal){
 return readMemberConversationsGraphQLFeed(registry as MemberOperationRegistry,fetcher,signal);
}

export async function readMemberDocumentFeed(fetcher:typeof fetch,signal:AbortSignal){return readMemberDocumentsGraphQLFeed(registry as MemberOperationRegistry,fetcher,signal);}

/** A missing active Core operation performs no request. TEST source stays remain separate from bookings. */
export async function readMemberTestStaysFeed(fetcher:typeof fetch,signal:AbortSignal){return readMemberTestStaysGraphQLFeed(registry as MemberOperationRegistry,fetcher,signal);}

/** Only the exact active ownExperiences operation can read; absent registry makes no request. */
export async function readMemberExperienceFeed(fetcher:typeof fetch,signal:AbortSignal){return readMemberExperiencesGraphQLFeed(registry as MemberOperationRegistry,fetcher,signal);}
