import 'server-only';
import {createRootOwnedPersonalAccountPolicyLoader} from '../../../infra/openclaw/connections/personal-account/root-owned-deployment-policy.mjs';
export type PersonalAccountDeployment=Readonly<{
 appOrigin:string;
 custody:Readonly<{schema:'crays.os-oauth-custody.v1';service:string;directory:string;currentKeyRef:string;keys:Readonly<Record<string,string>>;appSecrets:Readonly<Record<string,string>>}>;
 slack?:Readonly<{appId:string;clientId:string;secretRef:string;stateSecretRef:string;redirectUri:string;approvedActions:readonly string[];approvedScopes:readonly string[];allowedWorkspaceIds:readonly string[]|null;allowedEnterpriseIds:readonly string[]|null;schemaUpgradeAdmitted:true}>;
 apps:Readonly<Partial<Record<'google'|'microsoft'|'linkedin',Readonly<{clientId:string;secretRef:string;redirectUri:string;approvedScopes:readonly string[]}>>>>;
}>;
/** No registration, service name, key reference or callback origin is fabricated.
 * Root/server deployment must populate an immutable non-secret policy after actual app registration,
 * admitted schema/grants and OS credential delivery. Never fill from request/body/query/cookies/model.
 * CRAYS_PERSONAL_ACCOUNT_DEPLOYMENT_POLICY_PATH is set only by the owning server host.
 * Its root-owned non-secret envelope must use crays.personal-account-deployment.v1.
 * Missing/invalid configuration remains DEPLOYMENT_NOT_CONFIGURED; no default origin/app/key exists.
 * Root policy replacement/deletion revokes captured host instances on their next currentness check.
 */
const readDeployment=createRootOwnedPersonalAccountPolicyLoader({getPath:()=>process.env.CRAYS_PERSONAL_ACCOUNT_DEPLOYMENT_POLICY_PATH});
export function getPersonalAccountDeployment():PersonalAccountDeployment|null{
 return readDeployment() as PersonalAccountDeployment|null;
}
