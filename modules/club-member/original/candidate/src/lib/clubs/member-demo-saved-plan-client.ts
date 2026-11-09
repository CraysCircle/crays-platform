import {memberGraphQLEndpoint} from "./member-graphql-transport";
import {z} from "zod";
import operation from "./member-demo-saved-plan-operation.json";
const plan=z.object({planId:z.string(),version:z.number().int().positive(),offerId:z.string(),offerVersion:z.number().int().positive(),offerSourceSha256:z.string(),state:z.literal("saved"),selectedSlotId:z.string().nullable(),createdAt:z.string(),updatedAt:z.string()}).strict();
const result=z.object({schema:z.literal("crays.member.saved-plan-command.v1"),accountId:z.string(),action:z.enum(["save","remove"]),offerId:z.string(),plan:plan.nullable(),bookingConfirmed:z.literal(false),testOnly:z.literal(true),liveMoney:z.literal(false)}).strict();
export async function writeMemberSavedPlan(command:Record<string,unknown>){
 const response=await fetch(memberGraphQLEndpoint(),{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({operationName:"ClubMemberSavedPlanCommand",variables:{input:{commandJson:JSON.stringify({...command,contractVersion:"1.0.0"})}},extensions:{persistedQuery:{version:1,sha256Hash:operation.id}}})});
 const body=await response.json();if(!response.ok||body.errors||typeof body.data?.clubMemberSavedPlanCommand?.payloadJson!=="string")throw Error("SAVED_PLAN_UPDATE_UNCONFIRMED");
 const out=result.parse(JSON.parse(body.data.clubMemberSavedPlanCommand.payloadJson));window.dispatchEvent(new Event("crays-member-plans-updated"));return out;
}
