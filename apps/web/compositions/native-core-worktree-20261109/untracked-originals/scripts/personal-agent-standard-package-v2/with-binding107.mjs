/** Additive pure assignment proposal; never loads uninstalled tools or proves readiness. */
import {createNewPersonalAgentStandardConfigWithEverydayAssistance} from './with-everyday-assistance.mjs';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const RECEIPT_SHA='3a332961f27eb95b0d4935f976ca131102cf12337201dbc248a448920bdf4a0a';
const RECEIPT_ROOT='/opt/crays/openclaw/skill-artifacts/crays-receipt-reading/'+RECEIPT_SHA;
const receipt=freeze({skillId:'crays-receipt-reading',contentSha256:RECEIPT_SHA,
 source:'infra/openclaw/skills/crays-receipt-reading/SKILL.md',proposedArtifactRoot:RECEIPT_ROOT,
 proposedExtraDir:RECEIPT_ROOT+'/skills',proposedSkillPath:RECEIPT_ROOT+'/skills/crays-receipt-reading/SKILL.md',
 artifactManifestSha256Reference:'ef76541cf351e9f67c4a3d21a53097189292c9ef08a1f129787baf0f26dbfc50',
 state:'SOURCE_ASSIGNED_PENDING_REFERENCE_VERIFICATION_AND_NATIVE_LOAD',codeAssigned:true,
 artifactReferenceVerifiedByFactory:false,nativeLoadVerified:false,runtimeStartAllowed:false,userPhotoAcceptanceProven:false});
const names=['crays-parcel-tracking','crays-link-check','crays-shared-expenses','crays-household-lists','crays-booking','crays-smart-home','crays-document-archive'];
export function getReceiptReadingSkillAssignment(){return receipt;}
export function createNewPersonalAgentStandardConfigWith107(input){
 const everyday=createNewPersonalAgentStandardConfigWithEverydayAssistance(input);
 const config=structuredClone(everyday.proposal.nativeConfigFragment);
 const agent=config.agents.entries[everyday.proposal.agentId];
 agent.skills=[...new Set([...(agent.skills??[]),receipt.skillId])];
 config.skills={...config.skills,load:{...config.skills?.load,
  extraDirs:[...new Set([...(config.skills?.load?.extraDirs??[]),receipt.proposedExtraDir])]},
  entries:{...config.skills?.entries,[receipt.skillId]:{enabled:true}}};
 return freeze({schema:'crays.new-personal-agent.standard-binding107-proposal.v1',
  proposal:{...everyday.proposal,assignedBindingCapabilityIds:[...everyday.proposal.assignedBindingCapabilityIds,
   ...names.map((_,i)=>'B2C-CAP-'+(101+i))],nativeConfigFragment:config},
  skillAssignment:everyday.skillAssignment,receiptSkillAssignment:receipt,
  additionalSkillAssignments:names.map((skillId,i)=>({skillId,capabilityId:'B2C-CAP-'+(101+i),
   state:'PENDING_IMPLEMENTATION_INSTALLATION_CONNECTION',codeAssignmentRequired:true,
   installed:false,connected:false,runtimeToolRegistered:false,userAcceptanceProven:false})),
  assignmentScope:'107_CAPABILITY_INTENT_NOT_INSTALLATION_OR_RUNTIME_AUTHORITY'});
}
