/** Additive pure source assignment. No installation, account access or runtime mutation. */
import {createNewPersonalAgentStandardConfig} from './new-personal-agent-baseline-config.mjs';
const SKILL='crays-everyday-assistance';
const SKILL_SHA='861181bfc30500e87b548e205429207aababc5eadd853e2b88d16a6328d0e1b2';
const ARTIFACT='/opt/crays/openclaw/skill-artifacts/'+SKILL+'/'+SKILL_SHA;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const assignment=freeze({
  skillId:SKILL,contentSha256:SKILL_SHA,
  source:'infra/openclaw/skills/'+SKILL+'/SKILL.md',
  proposedArtifactRoot:ARTIFACT,
  proposedExtraDir:ARTIFACT+'/skills',
  proposedSkillPath:ARTIFACT+'/skills/'+SKILL+'/SKILL.md',
  state:'SOURCE_ASSIGNED_PENDING_ARTIFACT_ADMISSION',
  codeAssigned:true,artifactInstalled:false,artifactAdmissionVerified:false,
  nativeLoadVerified:false,runtimeStartAllowed:false,userToolAcceptanceProven:false,
});
export function getEverydayAssistanceSkillAssignment(){return assignment;}
/** Accept EXACT original V2 inputs; preserve its own-person/account/artifact checks. */
export function createNewPersonalAgentStandardConfigWithEverydayAssistance(input){
  const original=createNewPersonalAgentStandardConfig(input);
  const config=structuredClone(original.nativeConfigFragment);
  const agent=config.agents.entries[original.agentId];
  agent.skills=[...new Set([...(agent.skills??[]),SKILL])];
  config.skills={...config.skills,
    load:{...config.skills?.load,extraDirs:[...new Set([...(config.skills?.load?.extraDirs??[]),assignment.proposedExtraDir])]},
    entries:{...config.skills?.entries,[SKILL]:{...config.skills?.entries?.[SKILL],enabled:true}},
  };
  return freeze({schema:'crays.new-personal-agent.standard-with-everyday-assistance-proposal.v1',
    proposal:{...original,nativeConfigFragment:config},skillAssignment:assignment});
}
