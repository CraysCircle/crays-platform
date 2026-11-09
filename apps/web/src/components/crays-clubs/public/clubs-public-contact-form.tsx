"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import type {ClubsLocale} from "../../../lib/clubs/public-site";
import type {ClubsMembershipApplicationInput} from "../../../lib/clubs/public-ambassador-registry";
import {createPublicFullApplicationAttempt,recoverPublicFullApplication,submitPublicFullApplication,type PublicFullApplicationAttempt} from "../../../lib/clubs/public-full-ambassador-application-client";
import {publicFullApplicantSchema,publicFullContextSchema,publicFullApplicationJournalSchema,type PublicFullApplicationJournal,type PublicFullApplicationReply} from "../../../lib/clubs/public-full-ambassador-application-contract";
import {ambassadorJourneyCopy} from "./clubs-ambassador-journey-copy";
import {ClubsAmbassadorApplicationForm} from "./clubs-ambassador-application-form";
import {ClubsAmbassadorOriginalContent,ClubsAmbassadorOriginalEnding} from "./clubs-ambassador-original-content";
const messages:Record<ClubsLocale,readonly string[]>={"en": ["Submitting…", "Your application has been received.", "The receipt is being checked. Re-enter the same details to retry the original application.", "Receipt could not be confirmed. Check the original application before retrying.", "Check receipt", "The request could not be prepared safely. Nothing new has been sent.", "Re-enter the same details as the original application. Your original request is retained."], "de": ["Wird gesendet…", "Deine Bewerbung ist eingegangen.", "Der Eingang wird geprüft. Gib dieselben Angaben erneut ein, um die ursprüngliche Bewerbung wieder zu senden.", "Der Eingang konnte nicht bestätigt werden. Prüfe die ursprüngliche Bewerbung vor einem erneuten Versand.", "Eingang prüfen", "Die Anfrage konnte nicht sicher vorbereitet werden. Es wurde nichts Neues gesendet.", "Gib dieselben Angaben wie bei der ursprünglichen Bewerbung ein. Deine ursprüngliche Anfrage bleibt erhalten."], "es": ["Enviando…", "Hemos recibido tu solicitud.", "Estamos comprobando la recepción. Introduce los mismos datos para reintentar la solicitud original.", "No se ha podido confirmar la recepción. Comprueba la solicitud original antes de reintentarlo.", "Comprobar recepción", "No se ha podido preparar la solicitud de forma segura. No se ha enviado nada nuevo.", "Introduce los mismos datos que en la solicitud original. Conservamos la solicitud original."], "ca": ["S’està enviant…", "Hem rebut la teva sol·licitud.", "Estem comprovant la recepció. Introdueix les mateixes dades per tornar a enviar la sol·licitud original.", "No s’ha pogut confirmar la recepció. Comprova la sol·licitud original abans de tornar-ho a provar.", "Comprova la recepció", "No s’ha pogut preparar la sol·licitud de manera segura. No s’ha enviat res de nou.", "Introdueix les mateixes dades que a la sol·licitud original. Conservem la sol·licitud original."], "fr": ["Envoi en cours…", "Votre candidature a été reçue.", "Nous vérifions la réception. Saisissez les mêmes informations pour réessayer la candidature initiale.", "La réception n’a pas pu être confirmée. Vérifiez la candidature initiale avant de réessayer.", "Vérifier la réception", "La demande n’a pas pu être préparée en toute sécurité. Aucun nouvel envoi n’a été effectué.", "Saisissez les mêmes informations que dans la candidature initiale. Votre demande initiale est conservée."], "pt": ["A enviar…", "Recebemos a sua candidatura.", "Estamos a verificar a receção. Introduza os mesmos dados para tentar novamente a candidatura original.", "Não foi possível confirmar a receção. Verifique a candidatura original antes de tentar novamente.", "Verificar receção", "Não foi possível preparar o pedido em segurança. Não foi enviado nada novo.", "Introduza os mesmos dados da candidatura original. O seu pedido original é mantido."], "it": ["Invio in corso…", "La tua candidatura è stata ricevuta.", "Stiamo verificando la ricezione. Inserisci gli stessi dati per riprovare la candidatura originale.", "Non è stato possibile confermare la ricezione. Verifica la candidatura originale prima di riprovare.", "Verifica ricezione", "Non è stato possibile preparare la richiesta in sicurezza. Non è stato inviato nulla di nuovo.", "Inserisci gli stessi dati della candidatura originale. La richiesta originale viene conservata."]};
const emptyInput:ClubsMembershipApplicationInput={applicantType:"individual",fullName:"",email:"",basedIn:"",interest:"",preferredArrivalWindow:"",preferredParticipationLength:"",linkedinUrl:"",socialUrl:"",profileUrl:"",motivation:"",contribution:"",consent:false};
type Status="loading"|"idle"|"sending"|"pending"|"unknown"|"received"|"preparation_error"|"reentry_error";
export function ClubsPublicContactForm({locale,recipients,recipientSlug}:{locale:ClubsLocale;recipients:readonly {slug:string;name:string}[];recipientSlug:string}) {
 const recipient=recipients.find(r=>r.slug===recipientSlug);
 const copy=ambassadorJourneyCopy[locale],c=messages[locale];
 const [input,setInput]=useState<ClubsMembershipApplicationInput>(emptyInput);
 const [errors,setErrors]=useState<Partial<Record<keyof ClubsMembershipApplicationInput,string>>>({});
 const [status,setStatus]=useState<Status>("loading");const [reference,setReference]=useState("");
 const [hasAttempt,setHasAttempt]=useState(false);const [hasJournal,setHasJournal]=useState(false);
 const journal=useRef<PublicFullApplicationJournal|null>(null);
 const attempt=useRef<PublicFullApplicationAttempt|null>(null);
 const observation=useRef<PublicFullApplicationReply|null>(null);
 const busy=useRef(false);
 const storageKey="crays:public-full-application:v1:"+locale+":"+recipientSlug;
 function accept(reply:PublicFullApplicationReply) {
  observation.current=reply;
  if(reply.status==="persisted") {setReference(reply.applicationId);setStatus("received");}
  else setStatus(reply.status);
 }
 useEffect(()=>{
  let current=true;
  async function load() {
   try {
    const raw=window.localStorage.getItem(storageKey);
    if(raw===null){if(current)setStatus("idle");return;}
    const previous=publicFullApplicationJournalSchema.parse(JSON.parse(raw));
    if(previous.locale!==locale||previous.ambassadorSlug!==recipientSlug)throw Error("JOURNEY_MISMATCH");
    journal.current=previous;setHasJournal(true);
    const reply=await recoverPublicFullApplication(previous);
    if(current)accept(reply);
   }catch{if(current)setStatus("preparation_error");}
  }
  void load();return()=>{current=false;};
 },[locale,recipientSlug,storageKey]);
 function setValue<K extends keyof ClubsMembershipApplicationInput>(name:K,value:ClubsMembershipApplicationInput[K]) {
  if(attempt.current||busy.current||status==="received")return;
  setInput(old=>({...old,[name]:value}));setErrors(old=>({...old,[name]:undefined}));
 }
 function context() {
  const canonicalPersonalPath="/"+locale+"/ambassadors/"+recipientSlug;
  const params=new URLSearchParams(window.location.search);
  const acquisition:Record<string,string>={};
  for(const [query,key] of [["campaign_id","campaignId"],["utm_source","utmSource"],["utm_medium","utmMedium"],["utm_campaign","utmCampaign"]] as const) {
   const values=params.getAll(query);if(values.length>1)throw Error("AMBIGUOUS_CAMPAIGN_METADATA");
   if(values.length===1)acquisition[key]=values[0];
  }
  const value={locale,ambassadorSlug:recipientSlug,canonicalPersonalPath,entryPath:window.location.pathname,acquisition};
  const parsed=publicFullContextSchema.parse({...value,opaqueReferralContext:"0".repeat(64)});
  return {locale:parsed.locale,ambassadorSlug:parsed.ambassadorSlug,canonicalPersonalPath:parsed.canonicalPersonalPath,entryPath:parsed.entryPath,acquisition:parsed.acquisition};
 }
 function durableReadback(value:PublicFullApplicationJournal) {
  // Only metadata is durable. Applicant fields and email stay in memory, never in URLs or storage.
  window.localStorage.setItem(storageKey,JSON.stringify(value));
  const raw=window.localStorage.getItem(storageKey);if(raw===null)throw Error("JOURNAL_WRITE_UNAVAILABLE");
  const read=publicFullApplicationJournalSchema.parse(JSON.parse(raw));
  if(JSON.stringify(read)!==JSON.stringify(value))throw Error("JOURNAL_READBACK_MISMATCH");
  return read;
 }
 async function checkReceipt() {
  if(busy.current||!journal.current||status==="received")return;
  busy.current=true;setStatus("sending");
  try{accept(await recoverPublicFullApplication(journal.current));}
  catch{setStatus("unknown");}finally{busy.current=false;}
 }
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();if(busy.current||status==="received"||status==="loading"||!recipient)return;
  if(!attempt.current) {
   const valid=publicFullApplicantSchema.safeParse(input);
   if(!valid.success) {
    const next:Partial<Record<keyof ClubsMembershipApplicationInput,string>>={};
    for(const issue of valid.error.issues) {
     const field=issue.path[0] as keyof ClubsMembershipApplicationInput;
     next[field]=field==="email"?copy.invalidEmail:field.endsWith("Url")?copy.invalidUrl:copy.missing;
    }
    setErrors(next);return;
   }
  }
  busy.current=true;setStatus("sending");
  try {
   if(journal.current) {
    const recovered=await recoverPublicFullApplication(journal.current);
    observation.current=recovered;
    if(recovered.status==="persisted"){accept(recovered);return;}
   }
   const next=attempt.current??await createPublicFullApplicationAttempt({applicant:input,context:context(),...(journal.current?{priorJournal:journal.current}:{})});
   // Keep one memory-only immutable request even if durable storage readback fails.
   attempt.current=next;setHasAttempt(true);journal.current=next.journal;setHasJournal(true);
   const readback=durableReadback(next.journal);
   accept(await submitPublicFullApplication(next,readback,observation.current??undefined));
  }catch(error){setStatus(error instanceof Error&&error.message==="ORIGINAL_APPLICATION_REENTRY_MISMATCH"?"reentry_error":attempt.current?"unknown":"preparation_error");}
  finally{busy.current=false;}
 }
 if(!recipient)return null;
 const statusMessage=status==="received"?c[1]:status==="pending"?c[2]:status==="unknown"?c[3]:status==="preparation_error"?c[5]:status==="reentry_error"?c[6]:status==="sending"?c[0]:"";
 return <><ClubsAmbassadorOriginalContent locale={locale} ambassadorName={recipient.name} input={input} setValue={setValue} disabled={hasAttempt||status==="sending"||status==="loading"||status==="received"||status==="preparation_error"}/><ClubsAmbassadorApplicationForm locale={locale} ambassadorName={recipient.name} input={input} errors={errors} setValue={setValue} onSubmit={submit}
  submissionLocked={status==="sending"||status==="loading"||status==="received"||status==="preparation_error"}
  fieldsLocked={hasAttempt||status==="sending"||status==="loading"||status==="received"||status==="preparation_error"}
  submitLabel={status==="sending"?c[0]:copy.submit}
  status={<><p>{statusMessage}</p>{reference?<p>{reference}</p>:null}{hasJournal&&status!=="received"?<button type="button" disabled={status==="sending"} onClick={()=>void checkReceipt()}>{c[4]}</button>:null}</>} /><ClubsAmbassadorOriginalEnding locale={locale}/></>;
}
