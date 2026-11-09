import "server-only";
import {loadPublicAmbassadors} from "@/lib/server/clubs/public-ambassador-page-data";
import { readPublicHospitalityContentEnvelope } from "./public-hospitality-content-runtime";
import { GET as readRates } from "@/app/api/crays/clubs/forest-city/properties/[propertyId]/rates/route";
import { GET as readPricing } from "@/app/api/crays/clubs/forest-city/properties/[propertyId]/pricing/route";
import type { CoreHotelId } from "@/lib/member-commerce/core-public-hospitality-view";
/** Search consumes only the verified content and base sale. Property-only planning
 * policy and Ambassador choices must not delay its first usable results. */
async function readPublicHospitalitySearchBootstrapLegacy(propertyId:CoreHotelId,asOf:string) {
 const context={params:Promise.resolve({propertyId})};
 const [content,rateResponse]=await Promise.all([
  readPublicHospitalityContentEnvelope({propertyId}),
  readRates(new Request(`http://hospitality.internal/rates?asOf=${encodeURIComponent(asOf)}`),context),
 ]);
 return {content:content.status === "ready" ? content : undefined,rate:rateResponse.ok ? await rateResponse.json() as unknown : undefined};
}
/** Same existing public readers, called in-process. No native, approval or payment authority. */
async function readPublicHospitalityPageBootstrapLegacy(propertyId:CoreHotelId,asOf:string) {
 const context={params:Promise.resolve({propertyId})};
 const [content,rateResponse,policyResponse,profiles]=await Promise.all([
  readPublicHospitalityContentEnvelope({propertyId}),
  readRates(new Request(`http://hospitality.internal/rates?asOf=${encodeURIComponent(asOf)}`),context),
  readPricing(new Request("http://hospitality.internal/pricing"),context),
  loadPublicAmbassadors("en").catch(()=>[]),
 ]);
 return {ambassadors:profiles.map(({slug,name})=>({slug,name})),content:content.status === "ready" ? content : undefined,rate:rateResponse.ok ? await rateResponse.json() as unknown : undefined,policy:policyResponse.ok ? await policyResponse.json() as unknown : undefined};
}

import {createPublicHospitalityRequestBatch} from "@/db/public-hospitality-request-batch";
import {readHospitalityPublicContent} from "@/db/clubs-hospitality-content-repository";
import {readPublicHospitalityMediaManifest} from "@/db/public-hospitality-media-repository";
import {createPublicHospitalityContentReader} from "./public-hospitality-content-runtime";
import {createPublicHotelBaseSaleReader} from "@/db/clubs-public-hotel-base-sale-repository";
import {parseHospitalityPublicPricingPolicy} from "@/lib/member-commerce/hospitality-public-pricing-policy";
export async function readPublicHospitalitySearchBootstrap(propertyId:CoreHotelId,asOf:string){
 try{
  const batch=createPublicHospitalityRequestBatch(propertyId,asOf,false);
  const contentRead=createPublicHospitalityContentReader(id=>readHospitalityPublicContent(id,batch.query),id=>readPublicHospitalityMediaManifest(id,batch.query));
  const [content,rate]=await Promise.all([contentRead({propertyId}),createPublicHotelBaseSaleReader(batch.query)({propertyId,asOf})]);
  return {content:content.status==="ready"?content:undefined,rate:rate.status==="ready"?rate:undefined};
 }catch{return readPublicHospitalitySearchBootstrapLegacy(propertyId,asOf);}
}
export async function readPublicHospitalityPageBootstrap(propertyId:CoreHotelId,asOf:string){
 try{
  const batch=createPublicHospitalityRequestBatch(propertyId,asOf,true);
  const contentRead=createPublicHospitalityContentReader(id=>readHospitalityPublicContent(id,batch.query),id=>readPublicHospitalityMediaManifest(id,batch.query));
  const [content,rate,policyResult,profiles]=await Promise.all([contentRead({propertyId}),createPublicHotelBaseSaleReader(batch.query)({propertyId,asOf}),batch.query("SELECT crays_core_rpc.hospitality_public_planning_policy_prod_v1($1::text) AS data",[propertyId]),loadPublicAmbassadors("en").catch(()=>[])]);
  const policy=parseHospitalityPublicPricingPolicy((policyResult.rows[0] as {data:unknown}).data,propertyId);
  return {ambassadors:profiles.map(({slug,name})=>({slug,name})),content:content.status==="ready"?content:undefined,rate:rate.status==="ready"?rate:undefined,policy};
 }catch{return readPublicHospitalityPageBootstrapLegacy(propertyId,asOf);}
}
