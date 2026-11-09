import "server-only";
import {readExactXxlCustomerProviderAdmission} from "./member-xxl-customer-provider-admission";
// Exact existing XL services, admitted by deployment Root readback on 2026-10-15.
// No caller-selected URL, default-to-XL, fallback, redirect or retry.
type Env=Record<string,string|undefined>;
function denied():never{throw Error("MEMBER073_PROVIDER_BINDING_NOT_ADMITTED");}
export function member073NativeProviders(env:Env=process.env){
 const binding=env.CRAYS_MEMBER_NATIVE_PROVIDER_BINDING;
 if(binding===undefined){if(env.CRAYS_MEMBER_NATIVE_BACKEND!==undefined)denied();return false;}
 if(binding!=="build073-xl-providers-v1"||env.CRAYS_MEMBER_NATIVE_BACKEND!=="build073-xl-v1")denied();
 return true;
}
export function member073VendureEndpoint(kind:"shop"|"admin",env:Env=process.env){
 const native=member073NativeProviders(env),admission=readExactXxlCustomerProviderAdmission(env);
 return native?`http://crays-member-providers-vendure-1:3000/${kind}-api`:admission?.vendure[kind==="shop"?"shopEndpoint":"adminEndpoint"]??`http://172.30.0.2:3000/${kind}-api`;
}
export function member073ErpHost(env:Env=process.env){return member073NativeProviders(env)?"crays-erp-backend":"172.25.0.3";}
export function member073ErpEndpoint(env:Env=process.env){return `http://${member073ErpHost(env)}:8000`;}
// Docs alone keep the already adopted original Document24 private-test binding on exact AWS.
function member073DocumentNativeProviders(env:Env){
 if(env.CRAYS_MEMBER_NATIVE_BACKEND==="aws-member-v1"&&env.CRAYS_MEMBER_NATIVE_PROVIDER_BINDING===undefined)return false;
 return member073NativeProviders(env);
}
export function member073DocumentTarget(env:Env=process.env){return member073DocumentNativeProviders(env)?"existing-xl-nextcloud-member073-test":"existing-xxl-nextcloud-test";}
export function member073DocumentHost(url:URL,env:Env=process.env){
 if(member073DocumentNativeProviders(env))return url.hostname==="crays-nextcloud-test-nextcloud-1"&&(url.port===""||url.port==="80");
 return /^172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}$/.test(url.hostname);
}
