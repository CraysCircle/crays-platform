import "server-only";
import {createHash} from "node:crypto";
import {readFileSync,lstatSync} from "node:fs";
import type {ConnectionOptions} from "node:tls";
type Env=Record<string,string|undefined>;
type Contract={role:string;schema:string;expiresAt:string;approvalReceiptSha256:string};
export const MEMBER_AWS_BINDING_APPROVAL="4b3da5c1526a1138d267e9e00d2141276724513336cfea2473b98cfc14a5ed2f";
const roles:Readonly<Record<string,{prefix:string;schema:string}>>={"crays_core_member_support_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_SUPPORT_RPC","schema":"crays.member.support-runtime.v1"},"crays_core_member_test_stays_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_TEST_STAYS_RPC","schema":"crays.member.test-stays.read-runtime.v1"},"crays_core_member_demo_catalog_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_DEMO_CATALOG_RPC","schema":"crays.member.demo-catalog.read-runtime.v1"},"crays_core_member_demo_services_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_DEMO_SERVICES_RPC","schema":"crays.member.demo-services.read-runtime.v1"},"crays_core_member_demo_finance_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_DEMO_FINANCE_RPC","schema":"crays.member.demo-finance.read-runtime.v1"},"crays_core_member_demo_commerce_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_DEMO_COMMERCE_RPC","schema":"crays.member.demo-commerce.write-runtime.v1"},"crays_core_member_demo_saved_plan_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_DEMO_SAVED_PLAN_RPC","schema":"crays.member.saved-plan.write-runtime.v1"},"crays_core_member_support_tools_rpc_runtime_v2":{"prefix":"CRAYS_MEMBER_SUPPORT_TOOLS_RPC","schema":"crays.member.support-tools.read-runtime.v2"},"crays_core_member_demo_documents_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_DEMO_DOCUMENTS_RPC","schema":"crays.member.documents.write-runtime.v1"},"crays_core_member_purchase_fulfilment_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_PURCHASE_FULFILMENT_RPC","schema":"crays.member.purchase-fulfilment.read-runtime.v1"},"crays_core_member_application_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_APPLICATION_RPC","schema":"crays.member.application.write-runtime.v1"},"crays_core_member_profile_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_PROFILE_RPC","schema":"crays.member.profile.runtime.v1"},"crays_core_member_finance_change_request_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_FINANCE_REQUEST_RPC","schema":"crays.member.finance-request.runtime.v1"},"crays_core_member_privacy_rpc_runtime_v1":{"prefix":"CRAYS_MEMBER_PRIVACY_RPC","schema":"crays.member.privacy.runtime.v1"}};
const caHash="a2c1bf4e3775a038e1db2cf92f9792c94855f20c6e1a72ada7587cb29e242c6e";
function denied():never{throw Error("MEMBER_AWS_DATABASE_BINDING_NOT_ADMITTED");}
export function memberAwsBinding(role:string,prefix:string,env:Env=process.env){
 if(env.CRAYS_MEMBER_NATIVE_BACKEND!=="aws-member-v1")return null;
 const b=roles[role];if(!b||b.prefix!==prefix||env.CRAYS_MEMBER_AWS_RUNTIME_APPROVAL!==MEMBER_AWS_BINDING_APPROVAL||env[prefix+"_TARGET"]!=="aws-member-core-v1"||env.CRAYS_MEMBER_NATIVE_RPC_SLOT!==undefined&&env.CRAYS_MEMBER_NATIVE_RPC_SLOT!=="original")denied();
 let u:URL;try{u=new URL(env[prefix+"_DATABASE_URL"]??"");}catch{denied();}
 if(!["postgres:","postgresql:"].includes(u.protocol)||u.hostname!=="crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com"||u.port!=="5432"||u.pathname!=="/member_core_01a11155_20261011"||decodeURIComponent(u.username)!==role||!u.password||u.search||u.hash)denied();
 return Object.freeze({host:"crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com",database:"member_core_01a11155_20261011",role});
}
export function memberAwsNoExpiryContract(c:Contract,role:string,env:Env=process.env){
 const b=roles[role];return !!b&&c.role===role&&c.schema===b.schema&&c.expiresAt==="infinity"&&c.approvalReceiptSha256===MEMBER_AWS_BINDING_APPROVAL&&!!memberAwsBinding(role,b.prefix,env);
}
export function memberAwsPgSsl(connectionString:string,env:Env=process.env):false|ConnectionOptions{
 if(env.CRAYS_MEMBER_NATIVE_BACKEND!=="aws-member-v1")return false;
 let u:URL;try{u=new URL(connectionString);}catch{denied();}
 const role=decodeURIComponent(u.username),b=roles[role];if(!b||!memberAwsBinding(role,b.prefix,env)||env[b.prefix+"_DATABASE_URL"]!==connectionString||env.CRAYS_MEMBER_AWS_TLS_CA_FILE!=="/run/crays/member-postgres-ca.crt")denied();
 const p=env.CRAYS_MEMBER_AWS_TLS_CA_FILE,s=lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||(s.uid!==0&&s.uid!==process.getuid?.())||(s.mode&0o022)!==0)denied();
 const ca=readFileSync(p);if(createHash("sha256").update(ca).digest("hex")!==caHash)denied();
 return {ca:ca.toString("utf8"),rejectUnauthorized:true,servername:"crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com",minVersion:"TLSv1.2"};
}
