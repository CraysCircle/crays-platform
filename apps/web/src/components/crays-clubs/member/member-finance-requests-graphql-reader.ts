"use client";
import registry from "@/graphql/member-self/MEMBER_SELF_OPERATION_REGISTRY.json";
import {createMemberGraphQLTransport,type MemberOperationRegistry} from "@/lib/clubs/member-graphql-transport";
import {memberFinanceRequestCommand,memberFinanceRequestRead,memberFinanceRequestReceipt,type MemberFinanceRequestCommand} from "@/lib/clubs/member-finance-request-contract";
const transport=createMemberGraphQLTransport(registry as MemberOperationRegistry);
export const readMemberFinanceRequests=(signal?:AbortSignal)=>transport.read("ownFinanceRequests",{contractVersion:"1.0.0"},memberFinanceRequestRead,signal);
/** Caller preserves requestId + draft on any unknown response; history reconciliation, never automatic resubmission. */
export function submitMemberFinanceRequest(value:MemberFinanceRequestCommand,signal?:AbortSignal){
 const command=memberFinanceRequestCommand.parse(value);
 return transport.command("financeRequestCommand",{requestId:command.requestId,correlationId:command.requestId,commandJson:JSON.stringify(command)},memberFinanceRequestReceipt,command.requestId,signal);
}
