import {ownTestStaySchema,type OwnTestStay} from "@/lib/clubs/member-test-stays-contract";
import {memberInterpretedStayPeriodAt} from "./member-stay-period";
export type TestStayPeriod="upcoming"|"current"|"past";
export function selectSavedTestStay(stays:OwnTestStay[],sourceRecordId:string|null,asOf:string|null,period:TestStayPeriod){
 if(sourceRecordId){const exact=stays.filter(s=>s.sourceRecordId===sourceRecordId);const parsed=exact.length===1?ownTestStaySchema.safeParse(exact[0]):null;return parsed?.success?{stay:parsed.data,unavailable:false}:{stay:null,unavailable:true};}
 if(!asOf)return {stay:null,unavailable:false};
 const matches=stays.filter(s=>ownTestStaySchema.safeParse(s).success&&memberInterpretedStayPeriodAt(s,new Date(asOf),s.dateSemanticsTimezone)===period).sort((a,b)=>a.arrivalDate.localeCompare(b.arrivalDate)||a.sourceRecordId.localeCompare(b.sourceRecordId));
 return {stay:matches[0]??null,unavailable:false};
}
