"use client";
import Image from "next/image";
import Link from "next/link";
import {ArrowRight, ArrowLeft, ChevronDown, CircleAlert, Info, FileText, MessageCircle, Mail} from "lucide-react";
import {useEffect, useId, useRef, useState, cloneElement, isValidElement, type FormEvent, type ReactNode, type ReactElement} from "react";
import {CLUBS_LOCALES, type ClubsLocale} from "@/lib/clubs/public-site";
import {hotelApplicationContext} from "@/lib/member-commerce/hotel-direct-application-link";
import {DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT as contract} from "@/lib/clubs/direct-membership-application-contract";
import {directApplicationCopy, type ApplicationCopy} from "./direct-application-copy";
import {ClubsPublicShell} from "./clubs-public-shell";
import styles from "./direct-application-wizard.module.css";
import tokens from "./clubs-public-design-tokens.module.css";
type Props = { returnTo: string; locale?: ClubsLocale };
type ApplicantType = "individual" | "family" | "team";
type FieldName =
  | "fullName"
  | "basedIn"
  | "interest"
  | "preferredArrivalWindow"
  | "preferredParticipationLength"
  | "linkedinUrl"
  | "socialUrl"
  | "profileUrl"
  | "motivation"
  | "contribution"
  | "consent";
type Errors = Partial<Record<FieldName, string>>;
type FormState = {
  applicantType: ApplicantType;
  fullName: string;
  basedIn: string;
  interest: string;
  preferredArrivalWindow: string;
  preferredParticipationLength: string;
  linkedinUrl: string;
  socialUrl: string;
  profileUrl: string;
  motivation: string;
  contribution: string;
  consent: boolean;
};
type Availability =
  | "loading"
  | "ready"
  | "signed_out"
  | "identity_binding_required"
  | "denied"
  | "rate_limited"
  | "unavailable"
  | "sending"
  | "retry"
  | "submitted";

const initialForm: FormState = {
  applicantType: "individual",
  fullName: "",
  basedIn: "",
  interest: "",
  preferredArrivalWindow: "",
  preferredParticipationLength: "",
  linkedinUrl: "",
  socialUrl: "",
  profileUrl: "",
  motivation: "",
  contribution: "",
  consent: false,
};

function isHttpsUrl(value: string) {
  if (!value.trim()) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validate(form: FormState, copy: ApplicationCopy): Errors {
  const errors: Errors = {};
  const required: Array<[FieldName, string, number]> = [
    ["fullName", form.fullName, 2],
    ["basedIn", form.basedIn, 2],
    ["interest", form.interest, 2],
    ["preferredArrivalWindow", form.preferredArrivalWindow, 2],
    ["preferredParticipationLength", form.preferredParticipationLength, 2],
    ["motivation", form.motivation, 20],
    ["contribution", form.contribution, 20],
  ];
  for (const [name, value, minimum] of required) {
    if (value.trim().length < minimum) {
      errors[name] =
        minimum === 20
          ? copy.minimum
          : copy.required;
    }
  }
  for (const name of ["linkedinUrl", "socialUrl", "profileUrl"] as const) {
    if (!isHttpsUrl(form[name])) errors[name] = copy.https;
  }
  if (!form.consent) errors.consent = copy.consentError;
  return errors;
}

function statusForHttp(status: number): Availability {
  if (status === 401) return "signed_out";
  if (status === 403) return "denied";
  if (status === 409) return "identity_binding_required";
  if (status === 429) return "rate_limited";
  return "unavailable";
}


export function ClubsDirectMembershipApplicationPage({returnTo, locale="en"}: Props) {
  const copy: ApplicationCopy = directApplicationCopy[locale];
  const headingId=useId();
  const stepHeading=useRef<HTMLHeadingElement>(null);
  const [step,setStep]=useState(0);
  const [clientReady,setClientReady]=useState(false);
  const [form,setForm]=useState<FormState>(()=>({...initialForm,...hotelApplicationContext(returnTo)}));
  const [errors,setErrors]=useState<Errors>({});
  const [availability,setAvailability]=useState<Availability>("loading");
  const pendingSubmission=useRef<{key:string;body:string}|null>(null);
  const submitting=useRef(false);
  const loginHref=`/auth/login?returnTo=${encodeURIComponent(`/${locale}/apply-directly?returnTo=${encodeURIComponent(returnTo)}`)}`;
  useEffect(() => {
    setClientReady(true);
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setAvailability("unavailable");
      controller.abort();
    }, 4500);
    void (async () => {
      try {
        const response = await fetch(contract.endpoints.publicConfiguration, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!active) return;
        if (!response.ok) {
          setAvailability(statusForHttp(response.status));
          return;
        }
        const payload = (await response.json()) as {
          schema?: unknown;
          version?: unknown;
          status?: unknown;
          submissionEnabled?: unknown;
          loginHref?: unknown;
        };
        if (!active) return;
        if (
          payload.schema !== contract.schema ||
          payload.version !== contract.version ||
          payload.status !== "ready"
        ) {
          setAvailability("unavailable");
          return;
        }
        setAvailability(payload.submissionEnabled === true ? "ready" : "unavailable");
      } catch (error) {
        if (active && (error as Error).name !== "AbortError") {
          setAvailability("unavailable");
        }
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [returnTo, locale]);


  const update=<K extends keyof FormState>(name:K,value:FormState[K])=>{
    setForm(current=>({...current,[name]:value}));
    setErrors(current=>({...current,[name]:undefined}));
  };
  const go=(target:number)=>{
    setStep(target);
    window.requestAnimationFrame(()=>stepHeading.current?.focus());
  };
  const advance=()=>{
    const all=validate(form,copy);
    const names:FieldName[]=step===0?["fullName","basedIn","interest","linkedinUrl","socialUrl","profileUrl"]:["preferredArrivalWindow","preferredParticipationLength","motivation","contribution"];
    const current:Errors={};
    names.forEach(name=>{if(all[name])current[name]=all[name]});
    setErrors(current);
    if(Object.keys(current).length){
      window.requestAnimationFrame(()=>document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    go(step+1);
  };
  const onSubmit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(step<2){advance();return;}
    const next=validate(form,copy);setErrors(next);
    if(Object.keys(next).length){
      const target=next.fullName||next.basedIn||next.interest||next.linkedinUrl||next.socialUrl||next.profileUrl?0:next.motivation||next.contribution||next.preferredArrivalWindow||next.preferredParticipationLength?1:2;
      if(target!==step)go(target);
      window.requestAnimationFrame(()=>document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if(submitting.current||availability==="submitted"||!["ready","retry"].includes(availability))return;
    // Keep the exact command and key after an uncertain response: retry never
    // creates a second command or submits a changed applicant payload.
    if(!pendingSubmission.current){
      const applicant={...form,linkedinUrl:form.linkedinUrl.trim()||null,socialUrl:form.socialUrl.trim()||null,profileUrl:form.profileUrl.trim()||null};
      pendingSubmission.current={key:`clubs-direct:${crypto.randomUUID()}`,body:JSON.stringify({type:"submit_application",applicant})};
    }
    const command=pendingSubmission.current;
    submitting.current=true;setAvailability("sending");
    try{
      const response=await fetch(contract.endpoints.memberApplication,{method:"POST",credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json","Content-Type":"application/json","Idempotency-Key":command.key},body:command.body,signal:AbortSignal.timeout(15000)});
      const payload=await response.json();
      if(!response.ok){
        if([400,401,403,409,429].includes(response.status)){
          pendingSubmission.current=null;setAvailability(statusForHttp(response.status));
        }else setAvailability("retry");
        return;
      }
      const id=payload?.application?.applicationId;
      if(payload?.status!=="persisted"||payload?.outcome!=="application_submitted"||payload?.authorities?.applicationPersisted!==true||typeof id!=="string"||!id){setAvailability("retry");return;}
      const readback=await fetch(contract.endpoints.memberApplication,{credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"},signal:AbortSignal.timeout(15000)});
      const stored=await readback.json();
      if(!readback.ok||stored?.status!=="ready"||stored?.authorities?.applicationPersisted!==true||stored?.application?.applicationId!==id){setAvailability("retry");return;}
      pendingSubmission.current=null;setAvailability("submitted");
    }catch{setAvailability("retry");}
    finally{submitting.current=false;}
  };
  const stateMessage=availability==="submitted"?copy.submitted:availability==="sending"?copy.sending:availability==="retry"?copy.retry:availability==="loading"?copy.checking:availability==="ready"?copy.ready:availability==="signed_out"?copy.signedOut:availability==="identity_binding_required"?copy.binding:availability==="rate_limited"?copy.limited:availability==="denied"?copy.denied:copy.unavailable;
  const steps=[copy.you,copy.chapter,copy.review];
  const headings=[copy.headingYou,copy.headingChapter,copy.headingReview];
  const process=[{icon:FileText,title:copy.processIntro,text:copy.processIntroText},{icon:MessageCircle,title:copy.processTalk,text:copy.processTalkText},{icon:Mail,title:copy.processDecision,text:copy.processDecisionText}];
  const reviewRows: Array<[string,string]>=[[copy.applicant,copy[form.applicantType]],[copy.fullName,form.fullName],[copy.basedIn,form.basedIn],[copy.interest,form.interest],[copy.arrival,form.preferredArrivalWindow],[copy.duration,form.preferredParticipationLength],[copy.motivation,form.motivation],[copy.contribution,form.contribution],...[ [copy.linkedin,form.linkedinUrl],[copy.social,form.socialUrl],[copy.portfolio,form.profileUrl] ].filter(row=>row[1]).map(row=>[row[0]!,row[1]!] as [string,string])];
  return <ClubsPublicShell availableLocales={CLUBS_LOCALES} headerTone="navy" locale={locale}>
    <main className={`${tokens.theme} ${styles.page}`} id="clubs-apply-directly-content" lang={locale}>
      <section className={styles.masthead} aria-labelledby={headingId}>
        <div><p className={styles.eyebrow}>{copy.eyebrow}</p><h1 id={headingId}>{copy.title}</h1><p className={styles.intro}>{copy.intro}</p></div>
        <Image className={styles.signature} src="/__crays-clubs/experiences-screen2/signature-transparent.png" alt="Work well. Live fully." width={2172} height={724} unoptimized/>
      </section>
      <section className={styles.workspace} aria-labelledby="application-title" id="application-form">
        <div className={styles.photo}>
          <Image src="/__crays-clubs/apply-directly/community-waterfront.webp" alt={copy.photoAlt} fill priority sizes="(max-width: 760px) 100vw, 50vw" data-crays-photo-treatment="none"/>
          <div className={styles.photoCopy}><h2>{copy.photoTitle}</h2><p>{copy.photoCopy}</p></div>
        </div>
        <div className={styles.formPanel}>
          <p className={styles.progressCount} aria-live="polite">{copy.step.replace("{n}",String(step+1))}</p>
          <ol className={styles.progress} aria-label={copy.eyebrow}>
            {steps.map((label,index)=><li key={index} aria-current={index===step?"step":undefined}>
              <button type="button" disabled={index>step||availability==="sending"||availability==="retry"||availability==="submitted"} onClick={()=>go(index)}><span>{String(index+1).padStart(2,"0")}</span>{label}</button>
            </li>)}
          </ol>
          <h2 id="application-title" tabIndex={-1} ref={stepHeading}>{headings[step]}</h2>
          <form noValidate onSubmit={onSubmit} aria-labelledby="application-title">
            {step===0&&<div className={styles.fields}>
              <fieldset className={styles.applicantType}><legend>{copy.applicant}</legend>
                {(["individual","family","team"] as const).map(type=><label key={type}><input checked={form.applicantType===type} name="applicantType" onChange={()=>update("applicantType",type)} type="radio" value={type}/><span>{copy[type]}</span></label>)}
              </fieldset>
              <Field label={copy.fullName} error={errors.fullName}><input autoComplete="name" maxLength={120} onChange={e=>update("fullName",e.target.value)} value={form.fullName} placeholder={copy.namePlaceholder}/></Field>
              <Field label={copy.basedIn} error={errors.basedIn}><input autoComplete="address-level2" maxLength={120} onChange={e=>update("basedIn",e.target.value)} value={form.basedIn} placeholder={copy.locationPlaceholder}/></Field>
              <Field label={copy.interest} error={errors.interest}><input maxLength={160} onChange={e=>update("interest",e.target.value)} value={form.interest} placeholder={copy.interestPlaceholder}/></Field>
              <details className={styles.optional} open={Boolean(errors.linkedinUrl||errors.socialUrl||errors.profileUrl)||undefined}><summary>{copy.links}<ChevronDown size={17} aria-hidden="true"/></summary><div className={styles.fields}>
                <Field label={copy.linkedin} error={errors.linkedinUrl}><input inputMode="url" maxLength={500} onChange={e=>update("linkedinUrl",e.target.value)} value={form.linkedinUrl} placeholder="https://"/></Field>
                <Field label={copy.social} error={errors.socialUrl}><input inputMode="url" maxLength={500} onChange={e=>update("socialUrl",e.target.value)} value={form.socialUrl} placeholder="https://"/></Field>
                <Field label={copy.portfolio} error={errors.profileUrl}><input inputMode="url" maxLength={500} onChange={e=>update("profileUrl",e.target.value)} value={form.profileUrl} placeholder="https://"/></Field>
              </div></details>
            </div>}
            {step===1&&<div className={styles.fields}>
              <div className={styles.twoFields}>
                <Field label={copy.arrival} error={errors.preferredArrivalWindow}><input maxLength={120} onChange={e=>update("preferredArrivalWindow",e.target.value)} value={form.preferredArrivalWindow} placeholder={copy.arrivalPlaceholder}/></Field>
                <Field label={copy.duration} error={errors.preferredParticipationLength}><input maxLength={120} onChange={e=>update("preferredParticipationLength",e.target.value)} value={form.preferredParticipationLength} placeholder={copy.durationPlaceholder}/></Field>
              </div>
              <Field label={copy.motivation} error={errors.motivation}><textarea maxLength={2000} rows={4} onChange={e=>update("motivation",e.target.value)} value={form.motivation} placeholder={copy.motivationPlaceholder}/></Field>
              <Field label={copy.contribution} error={errors.contribution}><textarea maxLength={2000} rows={4} onChange={e=>update("contribution",e.target.value)} value={form.contribution} placeholder={copy.contributionPlaceholder}/></Field>
            </div>}
            {step===2&&<div className={styles.review}>
              <dl>{reviewRows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              <label className={styles.consent}><input type="checkbox" checked={form.consent} onChange={e=>update("consent",e.target.checked)} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent?"consent-error":undefined}/><span>{copy.consent} <Link href={`/${locale}/legal/privacy-policy`}>{copy.privacy}</Link> · <Link href={`/${locale}/legal/data-protection`}>{copy.protection}</Link>.</span></label>
              {errors.consent&&<p id="consent-error" className={styles.error}>{errors.consent}</p>}
              <div className={styles.status} role="status"><CircleAlert size={18} aria-hidden="true"/><span>{stateMessage}</span>{availability==="signed_out"&&<a href={loginHref}>{copy.signin}</a>}{availability==="submitted"&&<Link href={`/${locale}/account?view=membership`}>{copy.viewApplication}</Link>}</div>
            </div>}
            <div className={styles.actions}>
              {step===0?<a href={returnTo} className={styles.back}><ArrowLeft size={17} aria-hidden="true"/>{copy.return}</a>:<button type="button" className={styles.back} disabled={availability==="sending"||availability==="retry"||availability==="submitted"} onClick={()=>go(step-1)}><ArrowLeft size={17} aria-hidden="true"/>{copy.back}</button>}
              <button type="submit" className={styles.primary} disabled={!clientReady||(step===2&&!["ready","retry"].includes(availability))}>{step===2?(availability==="retry"?copy.retryButton:copy.submit):copy.next}<ArrowRight size={19} aria-hidden="true"/></button>
            </div>
            <div className={styles.emailNote}><Info size={18} aria-hidden="true"/><p>{copy.emailNote} <a href={loginHref}>{copy.signin}</a></p></div>
            {step===2&&<p className={styles.boundary}>{copy.boundary}</p>}
          </form>
        </div>
      </section>
      <section className={styles.process} aria-label={copy.eyebrow}><ol>{process.map((item,index)=>{const Icon=item.icon;return <li key={item.title}><span className={styles.number}>{String(index+1).padStart(2,"0")}</span><Icon size={30} strokeWidth={1.4} aria-hidden="true"/><h3>{item.title}</h3><p>{item.text}</p></li>})}</ol></section>
    </main>
  </ClubsPublicShell>;
}
function Field({children,error,label}:{children:ReactNode;error?:string;label:string}){
 const id=useId();
 return <label className={styles.field} htmlFor={id}><span>{label}</span>{isValidElement(children)?cloneElement(children as ReactElement<Record<string,unknown>>,{id,"aria-invalid":Boolean(error),"aria-describedby":error?`${id}-error`:undefined}):children}{error&&<small id={`${id}-error`} className={styles.error}>{error}</small>}</label>;
}
