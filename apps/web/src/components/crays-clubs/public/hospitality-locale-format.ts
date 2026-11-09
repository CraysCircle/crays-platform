import type {ClubsLocale} from "@/lib/clubs/public-site";

const languageTags:Record<ClubsLocale,string>={en:"en-GB",de:"de-DE",es:"es-ES",ca:"ca-ES",fr:"fr-FR",pt:"pt-PT",it:"it-IT"};
const units:Record<ClubsLocale,Record<"guest"|"pet"|"night"|"month",readonly [string,string]>>={
 en:{guest:["guest","guests"],pet:["pet","pets"],night:["night","nights"],month:["month","months"]},
 de:{guest:["Gast","Gäste"],pet:["Haustier","Haustiere"],night:["Nacht","Nächte"],month:["Monat","Monate"]},
 es:{guest:["huésped","huéspedes"],pet:["mascota","mascotas"],night:["noche","noches"],month:["mes","meses"]},
 ca:{guest:["hoste","hostes"],pet:["mascota","mascotes"],night:["nit","nits"],month:["mes","mesos"]},
 fr:{guest:["voyageur","voyageurs"],pet:["animal","animaux"],night:["nuit","nuits"],month:["mois","mois"]},
 pt:{guest:["hóspede","hóspedes"],pet:["animal","animais"],night:["noite","noites"],month:["mês","meses"]},
 it:{guest:["ospite","ospiti"],pet:["animale","animali"],night:["notte","notti"],month:["mese","mesi"]},
};
/** Presentation only: never use these strings as search parameters or date keys. */
export function hospitalityCount(value:number,unit:keyof typeof units.en,locale:ClubsLocale){
 return `${new Intl.NumberFormat(languageTags[locale]).format(value)} ${units[locale][unit][value===1?0:1]}`;
}
export function hospitalityGuestSummary(adults:number,children:number,pets:number,locale:ClubsLocale){
 return hospitalityCount(adults+children,"guest",locale)+(pets>0?` - ${hospitalityCount(pets,"pet",locale)}`:"");
}
export function hospitalityDate(value:string,locale:ClubsLocale,fallback=""){
 if(!value)return fallback;
 const parsed=new Date(`${value}T12:00:00`);
 if(Number.isNaN(parsed.getTime()))return fallback||value;
 return new Intl.DateTimeFormat(languageTags[locale],{day:"2-digit",month:"short",year:"numeric"}).format(parsed);
}
const monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];
/** Existing flexible_month query values stay English, including restored URLs. */
export function hospitalityMonthLabel(machineValue:string,locale:ClubsLocale,includeYear=true){
 const match=/^([A-Za-z]+) (\d{4})$/.exec(machineValue);
 const month=match?monthNames.indexOf(match[1]):-1;
 if(!match||month<0)return machineValue;
 return new Intl.DateTimeFormat(languageTags[locale],{month:"long",...(includeYear?{year:"numeric" as const}:{}),timeZone:"UTC"}).format(new Date(Date.UTC(Number(match[2]),month,1)));
}
export function hospitalityWeekdays(locale:ClubsLocale){
 if(locale==="pt")return ["seg","ter","qua","qui","sex","sáb","dom"];
 const formatter=new Intl.DateTimeFormat(languageTags[locale],{weekday:"short",timeZone:"UTC"});
 return Array.from({length:7},(_,i)=>formatter.format(new Date(Date.UTC(2026,9,5+i))));
}
export function hospitalityFromDate(value:string,locale:ClubsLocale){
 const from:Record<ClubsLocale,string>={en:"From",de:"Ab",es:"Desde",ca:"Des de",fr:"À partir du",pt:"A partir de",it:"Dal"};
 return `${from[locale]} ${hospitalityDate(value,locale)}`;
}
export function hospitalityWhoSummary(adults:number,children:number,pets:number,locale:ClubsLocale){
 const labels:Record<ClubsLocale,readonly [string,string,string,string]>={en:["adult","adults","child","children"],de:["Erwachsener","Erwachsene","Kind","Kinder"],es:["adulto","adultos","niño","niños"],ca:["adult","adults","infant","infants"],fr:["adulte","adultes","enfant","enfants"],pt:["adulto","adultos","criança","crianças"],it:["adulto","adulti","bambino","bambini"]};
 const l=labels[locale];
 return `${adults} ${l[adults===1?0:1]} · ${children} ${l[children===1?2:3]} · ${hospitalityCount(pets,"pet",locale)}`;
}

export function hospitalityDayTolerance(value:number,locale:ClubsLocale){
 const words:Record<ClubsLocale,readonly [string,string]>={en:["day","days"],de:["Tag","Tage"],es:["día","días"],ca:["dia","dies"],fr:["jour","jours"],pt:["dia","dias"],it:["giorno","giorni"]};
 return `+/- ${value} ${words[locale][value===1?0:1]}`;
}
