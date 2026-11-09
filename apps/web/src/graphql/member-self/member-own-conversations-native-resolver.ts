import "server-only";
import {createHash} from "node:crypto";
import {GraphQLError} from "graphql";
import {ownMemberConversationsSchema,ownMemberConversationInputSchema} from "@/lib/clubs/member-conversation-contract";
import {ownSupportStateSchema} from "@/db/member-support-native-contract";
import {createMemberSupportDatabasePorts} from "@/db/member-support-bff-runtime";
import {MEMBER_SUPPORT_TOOLS_SQL,queryMemberOwnSupportTools} from "@/db/core-member-support-tools-runtime";
import {memberSupportToolsSchema} from "@/lib/clubs/member-support-tools-contract";
import {memberSelfPorts} from "./member-self-runtime-ports";
const support=createMemberSupportDatabasePorts();
export async function readNativeMemberOwnConversations(_:unknown,args:{input:unknown},context:{request:Request}){
 const raw=args.input as Record<string,unknown>;
 if(!raw||raw.contractVersion!=="1.0.0"||Object.keys(raw).some(k=>!["contractVersion","caseId","limit"].includes(k)))throw new GraphQLError("Invalid member request.",{extensions:{code:"BAD_USER_INPUT"}});
 const parsed=ownMemberConversationInputSchema.safeParse({caseId:raw.caseId??null,limit:raw.limit});
 if(!parsed.success)throw new GraphQLError("Invalid member request.",{extensions:{code:"BAD_USER_INPUT"}});
 const sdk=await memberSelfPorts.resolveCurrentSdk(context.request);
 if(!sdk)throw new GraphQLError("Member binding is required.",{extensions:{code:"IDENTITY_BINDING_REQUIRED"}});
 const list=ownSupportStateSchema.parse(await support.readSupport(sdk));
 const selected=list.supportCases.filter(c=>parsed.data.caseId===null||c.caseId===parsed.data.caseId).slice(0,parsed.data.limit);
 if(parsed.data.caseId!==null&&selected.length!==1)throw new GraphQLError("Conversation unavailable.",{extensions:{code:"FORBIDDEN"}});
 const cases=[];
 for(const item of selected){
  const history=await support.readSupportHistory(sdk,item.caseId);
  if(history.hasMoreMessages||history.messages.length>50)throw new GraphQLError("Conversation paging is required.",{extensions:{code:"UNAVAILABLE"}});
  const row=history.supportCases[0];
  const toolResult=await queryMemberOwnSupportTools(MEMBER_SUPPORT_TOOLS_SQL,[sdk.issuer,sdk.subject,createHash("sha256").update(sdk.serverConfiguredClientId).digest("hex"),item.caseId]);
  if(toolResult.rows.length!==1)throw new GraphQLError("Support context unavailable.",{extensions:{code:"UNAVAILABLE"}});
  const tools=memberSupportToolsSchema.parse(toolResult.rows[0].payload);
  if(tools.accountId!==sdk.expectedAccountId||tools.caseId!==item.caseId||tools.receipts.some(r=>r.caseId!==item.caseId))throw new GraphQLError("Support context unavailable.",{extensions:{code:"FORBIDDEN"}});
  const automation=tools.receipts.filter(r=>r.kind==="automation_reply").map(r=>({messageId:r.commentId,authorType:"automation" as const,authorName:r.authorName,body:r.body,createdAt:r.createdAt,messageRevisionSha256:createHash("sha256").update(JSON.stringify(r)).digest("hex")}));
  const tasks=tools.receipts.filter(r=>r.kind==="task").map(r=>({taskId:r.taskId,title:r.title,provider:r.provider,authorName:r.authorName,testOnly:true as const}));
  const crmRecords=tools.receipts.filter(r=>r.kind==="crm_record").map(r=>({recordId:r.recordId,taskId:r.taskId,title:r.title,provider:r.provider,testOnly:true as const}));
  cases.push({caseId:row.caseId,caseVersion:row.version,publicReference:row.publicReference,bookingId:row.bookingId,category:row.category,subject:row.subject,status:row.status,openedAt:row.openedAt,updatedAt:row.updatedAt,tasks,crmRecords,
   messages:history.messages.filter(m=>m.authorType==="member").map(m=>({messageId:m.messageId,authorType:"member" as "member"|"automation",authorName:"You",body:m.body,createdAt:m.createdAt,messageRevisionSha256:createHash("sha256").update(JSON.stringify(m)).digest("hex")})).concat(automation).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))});
 }
 const fresh=await memberSelfPorts.resolveCurrentSdk(context.request);
 if(!fresh||fresh.expectedAccountId!==sdk.expectedAccountId||fresh.subject!==sdk.subject)throw new GraphQLError("Member access changed.",{extensions:{code:"FORBIDDEN"}});
 return ownMemberConversationsSchema.parse({schema:"crays.clubs.member-own-conversations.v1",accountId:sdk.expectedAccountId,teamReplyPublicationAvailable:false,providerAttachmentAccessAvailable:false,cases});
}
