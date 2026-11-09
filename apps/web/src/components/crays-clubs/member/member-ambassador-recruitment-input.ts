import {createAmbassadorRecruitmentDraftSchema,type RecruitmentInputPolicy} from "@/lib/clubs/ambassador-recruitment-draft-contract";

/** Snapshot an admitted native policy for both validation and visible choices.
 * Missing or malformed policy cannot silently install browser defaults. */
export function createMemberRecruitmentInput(policy:RecruitmentInputPolicy|undefined) {
  if(!policy)return null;
  try {
    const snapshot=Object.freeze({...policy,supportedLocales:Object.freeze([...policy.supportedLocales])});
    return {schema:createAmbassadorRecruitmentDraftSchema(snapshot),supportedLocales:snapshot.supportedLocales};
  }catch{return null;}
}
