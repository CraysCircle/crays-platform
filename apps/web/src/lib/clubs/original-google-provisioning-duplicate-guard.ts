import {createHash} from "node:crypto";
/** Duplication prevention only. These exact registered Original lineage fingerprints are not an identity grant. */
const originalRepairTuple=Object.freeze({issuerSha256:"fcf2138080f51eea189ac7b3189e18652c098f54cb3831af32f01e66b385ee94",subjectSha256:"c33f9ea064c5d82ccf2ad3646583b8a1fa16c8187ee3979463ffd6e393448841",clientIdSha256:"5d71a7020619b160d66ee62d0f66facd7c73dc12508c6d7042991b2fbddf6341"});
const hash=(v:string)=>createHash("sha256").update(v,"utf8").digest("hex");
/** Pass only validated values from the existing same-request exact OIDC server SDK. Never request.body or email/name. */
export function isRegisteredOriginalGoogleRepairRequired(input:Readonly<{validatedIssuer:string;validatedSubject:string;serverConfiguredClientIdSha256:string}>):boolean{
 return typeof input.validatedIssuer==="string"&&typeof input.validatedSubject==="string"&&typeof input.serverConfiguredClientIdSha256==="string"&&
 hash(input.validatedIssuer)===originalRepairTuple.issuerSha256&&hash(input.validatedSubject)===originalRepairTuple.subjectSha256&&input.serverConfiguredClientIdSha256===originalRepairTuple.clientIdSha256;
}
export const originalGoogleRepairPendingResponse=Object.freeze({status:"existing_original_identity_binding_required",providerAuthenticated:true,accountMapped:false,provisioningAvailable:false,bookingAuthority:false,identityBindingAuthority:false,nextAction:"Complete the existing original-account identity binding before opening member data."});
