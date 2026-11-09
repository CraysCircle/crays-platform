import {memberAwsBinding} from "./member-aws-runtime";
import "server-only";
// Source-only Build073 native XL binding. No grants, role inheritance or retries.
const nativeMode="build073-xl-v1";
const nativeTarget="xl-member073-native";
const originalRoles=new Set(["crays_core_member_application_rpc_runtime_v1", "crays_core_member_demo_catalog_rpc_runtime_v1", "crays_core_member_demo_commerce_rpc_runtime_v1", "crays_core_member_demo_documents_rpc_runtime_v1", "crays_core_member_demo_finance_rpc_runtime_v1", "crays_core_member_demo_saved_plan_rpc_runtime_v1", "crays_core_member_demo_services_rpc_runtime_v1", "crays_core_member_finance_change_request_rpc_runtime_v1", "crays_core_member_privacy_rpc_runtime_v1", "crays_core_member_profile_rpc_runtime_v1", "crays_core_member_purchase_fulfilment_rpc_runtime_v1", "crays_core_member_support_rpc_runtime_v1", "crays_core_member_support_tools_rpc_runtime_v2", "crays_core_member_test_stays_rpc_runtime_v1"]);
type Env=Record<string,string|undefined>;
function denied():never{throw new Error("MEMBER073_NATIVE_BINDING_NOT_ADMITTED");}
function mode(env:Env){
 const value=env.CRAYS_MEMBER_NATIVE_BACKEND;
 if(value==="aws-member-v1"){if(env.CRAYS_MEMBER_NATIVE_RPC_SLOT!==undefined&&env.CRAYS_MEMBER_NATIVE_RPC_SLOT!=="original")denied();return false;}
 if(value!==undefined&&value!==nativeMode)denied();
 if(value===undefined&&env.CRAYS_MEMBER_NATIVE_RPC_SLOT!==undefined)denied();
 return value===nativeMode;
}
export function member073RuntimeRole(original:string,env:Env=process.env):string{
 if(!originalRoles.has(original))denied();
 if(!mode(env))return original;
 const slot=env.CRAYS_MEMBER_NATIVE_RPC_SLOT??"original";
 if(!["original","a","b"].includes(slot))denied();
 const role=slot==="original"?original:original+"_073"+slot;
 if(role.length>63)denied();return role;
}
export function member073NativeBinding(original:string,prefix:string,moduleRole:string,env:Env=process.env){
 const aws=memberAwsBinding(original,prefix,env);if(aws){if(moduleRole!==original)denied();return aws;}
 const expected=member073RuntimeRole(original,env);
 if(moduleRole!==expected)denied(); // No in-process slot changes; drain/restart.
 if(!mode(env)){
  if(env[prefix+"_TARGET"]===nativeTarget)denied();
  return null;
 }
 if(env[prefix+"_TARGET"]!==nativeTarget)denied();
 const text=env[prefix+"_DATABASE_URL"];if(!text)denied();
 let url:URL;try{url=new URL(text);}catch{denied();}
 if(!["postgres:","postgresql:"].includes(url.protocol)||url.hostname!=="crays-shared-core-postgres-xl"||url.port!=="5432"||url.pathname!=="/crays_core"||decodeURIComponent(url.username)!==expected||!url.password||url.search||url.hash)denied();
 return Object.freeze({host:"crays-shared-core-postgres-xl",database:"crays_core",role:expected});
}
export function member073RuntimeDatabase(original:string,legacy:string,env:Env=process.env){
 member073RuntimeRole(original,env);if(env.CRAYS_MEMBER_NATIVE_BACKEND==="aws-member-v1")return "member_core_01a11155_20261011";return mode(env)?"crays_core":legacy;
}
