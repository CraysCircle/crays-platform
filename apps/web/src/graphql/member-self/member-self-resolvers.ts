import {GraphQLError} from "graphql";
import {z} from "zod";
import {readOwnMemberState,memberOwnStateSchema,type MemberOwnState,type MemberOwnStatePorts} from "./member-own-state-client";
export const memberOwnStateInputSchema=z.object({contractVersion:z.literal("1.0.0")}).strict();
export function createMemberSelfResolvers<Request>(ports:MemberOwnStatePorts<Request>,combinedOriginalReader?: (request:Request)=>Promise<MemberOwnState|null>){return {Query:{clubMemberOwnState:async(_parent:unknown,args:{input:unknown},context:{request:Request})=>{
 try{memberOwnStateInputSchema.parse(args.input);}catch{throw new GraphQLError("Invalid member request.",{extensions:{code:"BAD_USER_INPUT"}});}
 try{const result=combinedOriginalReader?await combinedOriginalReader(context.request):await readOwnMemberState(context.request,ports);if(result!==null)memberOwnStateSchema.parse(result);if(result===null)throw new GraphQLError("Member identity connection is required.",{extensions:{code:"IDENTITY_BINDING_REQUIRED"}});return result;}
 catch(error){if(error instanceof GraphQLError)throw error;throw new GraphQLError("Member details are temporarily unavailable.",{extensions:{code:"UNAVAILABLE"}});}
 }}};}
