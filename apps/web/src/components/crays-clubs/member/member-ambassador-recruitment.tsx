"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {ArrowRight,Camera,ChartNoAxesColumn,Check,Plus,Trash2,UsersRound} from "lucide-react";
import {MemberRecruitmentAudience} from "./member-recruitment-audience";
import {recruitmentAudienceLabels} from "./member-recruitment-audience-text";
import styles from "./member-ambassador-recruitment.module.css";

import {
  AMBASSADOR_RECRUITMENT_PARTNER_TYPES,
  AMBASSADOR_RECRUITMENT_FORMATS,
  AMBASSADOR_RECRUITMENT_COLLABORATION,
  type AmbassadorRecruitmentDraft as SubmittedRecruitmentDraft,
} from "@/lib/clubs/ambassador-recruitment-draft-contract";
import {createMemberRecruitmentInput} from "./member-ambassador-recruitment-input";
import {createMemberRecruitmentCommandConsumer,recruitmentBrowserWebLock,type RecruitmentAttemptStorage} from "./member-recruitment-command-consumer";
import type {RecruitmentBrowserCommands,RecruitmentBrowserPolicy,RecruitmentBrowserResult} from "@/lib/clubs/ambassador-recruitment-native-port-contract";

/** Transient form state can be incomplete; only the canonical parsed type is dispatched. */
export type AmbassadorRecruitmentDraft = Omit<SubmittedRecruitmentDraft,"privacyAcknowledged"|"partnerTypes"|"formats"|"collaboration"> & {
  privacyAcknowledged:boolean;partnerTypes:string[];formats:string[];collaboration:string[];
};
/** NEXT DEPLOYMENT. No native port is mounted until its original purpose,
 * input policy and persisted attempt/reconciliation producer are admitted. */
export type AmbassadorRecruitmentPort = {
  policy:RecruitmentBrowserPolicy;
  commands:RecruitmentBrowserCommands;
  storage:RecruitmentAttemptStorage;
};
const partnerTypes=AMBASSADOR_RECRUITMENT_PARTNER_TYPES;
const formats=AMBASSADOR_RECRUITMENT_FORMATS;
const collaboration=AMBASSADOR_RECRUITMENT_COLLABORATION;
const emptyDraft:AmbassadorRecruitmentDraft={partnerTypes:[],fullName:"",email:"",region:"",language:"",company:"",companyContact:"",website:"",phone:"",introduction:"",channels:[],audienceRegions:"",audienceLanguages:"",audienceDescription:"",topics:"",formats:[],motivation:"",ideas:"",previousWork:"",availability:"",collaboration:[],compensation:"",conflicts:"",privacyAcknowledged:false,marketingConsent:false};

type RecruitmentProps={locale:string;port?:AmbassadorRecruitmentPort;showHeading?:boolean};
export function MemberAmbassadorRecruitment(props:RecruitmentProps) {
  // An original server binding change unmounts all prior private draft/result state.
  const binding=props.port?.policy.journalBinding;
  const key=binding?JSON.stringify([binding.opaqueNamespace,binding.generation,props.port?.policy.policyOriginalId,props.port?.policy.policyVersion,props.port?.policy.privacyNoticeOriginalRef,props.port?.policy.privacyNoticeVersion]):"unbound";
  return <RecruitmentForm key={key} {...props}/>;
}
function RecruitmentForm({locale,port,showHeading=false}:RecruitmentProps) {
  const inputContract=useMemo(()=>createMemberRecruitmentInput(port?.policy.input),[port]);
  const consumer=useMemo(()=>{
    if(!port)return null;
    try{return createMemberRecruitmentCommandConsumer({commands:port.commands,policy:port.policy,storage:port.storage,exclusive:recruitmentBrowserWebLock,newKey:()=>crypto.randomUUID()});}catch{return null;}
  },[port]);
  const [draft,setDraft]=useState<AmbassadorRecruitmentDraft>(emptyDraft);
  const [step,setStep]=useState(1);
  const [error,setError]=useState("");
  const [submission,setSubmission]=useState<"idle"|"checking"|"sending"|"uncertain"|"fenced"|"confirmed">(consumer?"checking":"idle");
  const [receipt,setReceipt]=useState<{applicationOriginalRef:string;revision:number}|null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  const dispatch=useRef(false);
  const schema=inputContract?.schema;
  const canSubmit=!!consumer&&!!schema;
  const applyResult=useCallback((result:RecruitmentBrowserResult|null)=>{
    if(!result){setSubmission("idle");setError("");return;}
    if(result.status==="received"){setReceipt({applicationOriginalRef:result.applicationOriginalRef,revision:result.revision});setSubmission("confirmed");setError("");return;}
    if(result.status==="not_committed"){setSubmission("fenced");setError("This attempt wasn’t submitted. You can start a new application after we check its status again.");return;}
    setSubmission("uncertain");setError("We’re checking your original application attempt. Please check its status before sending anything again.");
  },[]);
  useEffect(()=>{
    if(!consumer)return;
    let disposed=false;
    dispatch.current=true;
    void consumer.resume().then(result=>{if(!disposed)applyResult(result);}).catch(()=>{if(!disposed){setSubmission("uncertain");setError("We couldn’t check your application yet. Try checking its status again.");}}).finally(()=>{if(!disposed)dispatch.current=false;});
    return()=>{disposed=true;};
  },[consumer,applyResult]);
  function field<K extends keyof AmbassadorRecruitmentDraft>(key:K,value:AmbassadorRecruitmentDraft[K]) {setDraft(previous=>({...previous,[key]:value}));}
  function choices(key:"partnerTypes"|"formats"|"collaboration",values:readonly string[]) {
    return <div className={styles.choices}>{values.map(value=><label key={value}><input type="checkbox" checked={draft[key].includes(value)} onChange={event=>field(key,event.target.checked?[...draft[key],value]:draft[key].filter(item=>item!==value))}/>{value}</label>)}</div>;
  }
  function input(key:Exclude<keyof AmbassadorRecruitmentDraft,"channels"|"partnerTypes"|"formats"|"collaboration"|"privacyAcknowledged"|"marketingConsent">,label:string,required=false,type="text") {
    return <label>{label}{required?" *":""}<input type={type} required={required} value={draft[key]} onChange={event=>field(key,event.target.value)} autoComplete={key==="fullName"?"name":key==="email"?"email":key==="phone"?"tel":"off"}/></label>;
  }
  function area(key:"introduction"|"audienceDescription"|"topics"|"motivation"|"ideas"|"previousWork"|"availability"|"compensation"|"conflicts",label:string,required=false) {
    return <label>{label}{required?" *":""}<textarea required={required} rows={3} value={draft[key]} onChange={event=>field(key,event.target.value)}/></label>;
  }
  function navigate(next:number) {setError("");setStep(next);requestAnimationFrame(()=>heading.current?.focus());}
  function validateStep():boolean {
    if(step===1&&(!draft.partnerTypes.length||!draft.fullName.trim()||!draft.email.trim()||!draft.region.trim()||!draft.language.trim())) {setError("Tell us your partner type, name, email, region and preferred language.");return false;}
    if(step===2&&[draft.audienceRegions,draft.audienceLanguages].some(value=>recruitmentAudienceLabels(value)===null)) {setError("Choose up to five distinct audience countries and languages. Your original text is preserved so you can review it.");return false;}
    if(step===2&&draft.channels.some(row=>row.url&&!/^https?:\/\//i.test(row.url))) {setError("Use a public http or https link for each channel.");return false;}
    return true;
  }
  async function submit() {
    if(!consumer||!schema||dispatch.current||submission!=="idle")return;
    if(!draft.motivation.trim()||!draft.privacyAcknowledged){setError("Tell us why CRAYS and acknowledge the privacy information before applying.");return;}
    const parsed=schema.safeParse(draft);
    if(!parsed.success){setError(parsed.error.issues[0]?.message??"Please review your application details.");return;}
    dispatch.current=true;setSubmission("sending");setError("");
    try {applyResult(await consumer.start(parsed.data));}
    catch {setSubmission("uncertain");setError("We couldn’t confirm the result. Check your original application attempt before sending anything again.");}
    finally {dispatch.current=false;}
  }
  async function checkStatus() {
    if(!consumer||dispatch.current)return;
    dispatch.current=true;setSubmission("checking");setError("");
    try {applyResult(await consumer.resume());}
    catch {setSubmission("uncertain");setError("We couldn’t check your application yet. Your original attempt is preserved.");}
    finally {dispatch.current=false;}
  }
  async function startNewAttempt() {
    if(!consumer||dispatch.current||submission!=="fenced")return;
    dispatch.current=true;setSubmission("checking");setError("");
    try {if(await consumer.resetFencedAttempt()){setSubmission("idle");}else applyResult(await consumer.resume());}
    catch {setSubmission("uncertain");setError("We couldn’t confirm that it’s safe to start again. Please check the original attempt.");}
    finally {dispatch.current=false;}
  }
  return <div className={styles.layout} data-release-target="next-deployment">
    {showHeading?<header className={styles.pageHeading}><h1>Bring your people to CRAYS.</h1><p>For creators, community builders and affiliate partners who share our vision.</p></header>:null}
    <aside className={styles.intro}><h2>Tell your story. Make meaningful introductions.</h2><p>As a CRAYS Ambassador, you help bring inspiring people to our global home-sharing community. Share what you love, introduce your audience, and be part of a more connected way to travel.</p>
      <ul><li><Camera size={30} aria-hidden/><div><h3>Create content that feels like you</h3><p>Share your experiences, stories and perspective in your own voice.</p></div></li><li><UsersRound size={30} aria-hidden/><div><h3>Introduce your community to CRAYS</h3><p>Invite people who value meaningful travel and connections.</p></div></li><li><ChartNoAxesColumn size={30} aria-hidden/><div><h3>Track your referrals and agreed rewards</h3><p>Follow your introductions and the rewards confirmed in your agreement.</p></div></li></ul><h3>A simple three-step process</h3><ol className={styles.process}>{[["Apply","Tell us about yourself and your audience."],["CRAYS review","Our team reviews your application."],["Agreement & access","If approved, you will receive the next steps."]].map(([title,description])=><li key={title}><strong>{title}</strong><p>{description}</p></li>)}</ol><p className={styles.note}>Applying is the first step. Team acceptance, your agreement and personal access are confirmed separately.</p>
    </aside>
    <section className={styles.formCard} aria-busy={submission==="sending"||submission==="checking"}>
      <h2 className={styles.formTitle}>Apply to become an Ambassador</h2><ol className={styles.steps} aria-label="Application steps">{["About you","Your audience","Motivation & review"].map((label,index)=><li key={label} data-complete={step>index+1} aria-current={step===index+1?"step":undefined}><span aria-hidden>{step>index+1?<Check size={18}/>:index+1}</span>{step>index+1?<span className={styles.srOnly}>Completed: </span>:null}{label}</li>)}</ol>
      {submission==="confirmed"?<div role="status"><h2>Lovely. Your application is in.</h2><p>Your reference: {receipt?.applicationOriginalRef}</p><p>The CRAYS team will review your application. Your Ambassador access follows a separate approval.</p></div>:<form onSubmit={event=>{event.preventDefault();if(step<3){if(validateStep())navigate(step+1);}else void submit();}}>
        <h2 ref={heading} tabIndex={-1}>{step===1?"Let’s get to know you.":step===2?"Your audience":"What could we create together?"}</h2>
        <p className={styles.description}>{step===1?"A little about you and how you’d like to work with CRAYS.":step===2?"Tell us where you connect with people. Social accounts are optional.":"Share your ideas, then review your application."}</p>
        <fieldset disabled={submission!=="idle"}><legend className={styles.srOnly}>Application details</legend>
          {step===1?<><label className={styles.groupLabel}>I’m applying as *</label>{choices("partnerTypes",partnerTypes)}<div className={styles.fields}>{input("fullName","Full name",true)}{input("email","Contact email",true,"email")}{input("region","Country / region",true)}{inputContract?<label>Preferred language *<select required value={draft.language} onChange={event=>field("language",event.target.value)}><option value="">Choose your preferred language</option>{inputContract.supportedLocales.map(code=><option key={code} value={code}>{code}</option>)}</select></label>:input("language","Preferred language",true)}{input("company","Company / agency (optional)")}{input("companyContact","Company contact (optional)")}{input("website","Website / portfolio (optional)",false,"url")}{input("phone","Phone (optional)",false,"tel")}</div>{area("introduction","A little about you (optional)")}</>:null}
          {step===2?<><h3>Your public channels</h3>{draft.channels.map((row,index)=><div className={styles.channel} key={row.rowId}><h4 className={styles.srOnly}>Channel {index+1}</h4><div className={styles.channelFields}>{([['platform','Platform / channel'],['url','Public profile / website link'],['followers','Followers (optional)']] as const).map(([key,label])=><label key={key}>{label}<input value={row[key]} type={key==='url'?'url':'text'} onChange={event=>field("channels",draft.channels.map(item=>item.rowId===row.rowId?{...item,[key]:event.target.value}:item))}/></label>)}<button type="button" className={styles.removeChannel} aria-label={`Remove channel ${index+1}`} onClick={()=>field("channels",draft.channels.filter(item=>item.rowId!==row.rowId))}><Trash2 size={18} aria-hidden/></button></div><details className={styles.channelDetails}><summary>More about channel {index+1} (optional)</summary><div className={styles.fields}>{([['handle','Handle (optional)'],['metric','Reach metric (optional)'],['metricValue','Value (optional)'],['period','Metric period (optional)']] as const).map(([key,label])=><label key={key}>{label}<input value={row[key]} onChange={event=>field("channels",draft.channels.map(item=>item.rowId===row.rowId?{...item,[key]:event.target.value}:item))}/></label>)}</div></details></div>)}<button type="button" className={styles.secondary} onClick={()=>field("channels",[...draft.channels,{rowId:crypto.randomUUID(),platform:"",url:"",handle:"",followers:"",metric:"",metricValue:"",period:""}])}><Plus size={17} aria-hidden/>Add a channel</button><div className={styles.fields}><MemberRecruitmentAudience label="Top audience countries" value={draft.audienceRegions} onChange={value=>field("audienceRegions",value)}/><MemberRecruitmentAudience label="Audience languages" value={draft.audienceLanguages} onChange={value=>field("audienceLanguages",value)}/></div>{area("audienceDescription","Tell us about your audience (optional)")}{area("topics","Content topics (optional)")}<label className={styles.groupLabel}>Content formats</label>{choices("formats",formats)}<p className={styles.note}>Reach figures are your own estimates. Never share passwords or account access. Media-kit uploads need the connected secure document service.</p></>:null}
          {step===3?<>{area("motivation","Why CRAYS?",true)}{area("ideas","Your ideas for content, referrals or events (optional)")}{area("previousWork","Previous collaborations / portfolio links (optional)")}{area("availability","Availability, region and possible visits (optional)")}<label className={styles.groupLabel}>How would you like to collaborate?</label>{choices("collaboration",collaboration)}{area("compensation","Preferred cooperation model (optional)")}{area("conflicts","Relevant commitments / conflicts (optional)")}<div className={styles.review}><h3>Your application at a glance</h3><p>{draft.fullName} · {draft.email}</p><p>{draft.partnerTypes.join(", ")} · {draft.region}</p><p>{draft.channels.length} public channels</p><button type="button" className={styles.secondary} onClick={()=>navigate(1)}>Edit your details</button></div><label className={styles.consent}><input type="checkbox" required checked={draft.privacyAcknowledged} onChange={event=>field("privacyAcknowledged",event.target.checked)}/>I’ve read the <a href={`/${locale}/legal/privacy-policy`}>privacy information</a>.</label><label className={styles.consent}><input type="checkbox" checked={draft.marketingConsent} onChange={event=>field("marketingConsent",event.target.checked)}/>Keep me posted about CRAYS (optional).</label></>:null}
        </fieldset>
        {error?<p role="alert" className={styles.error}>{error}</p>:null}
        {submission==="checking"?<p role="status" className={styles.note}>Checking your original application attempt…</p>:null}
        {submission==="uncertain"?<button type="button" className={styles.secondary} onClick={()=>void checkStatus()}>Check application status</button>:null}
        {submission==="fenced"?<button type="button" className={styles.secondary} onClick={()=>void startNewAttempt()}>Start a new application</button>:null}
        {step===3&&!canSubmit?<p role="status" className={styles.note}>Secure submission is being connected to the CRAYS team. These details haven’t been sent or saved yet.</p>:null}
        <div className={styles.actions}>{step>1?<button type="button" className={styles.secondary} disabled={submission!=="idle"} onClick={()=>navigate(step-1)}>Back</button>:null}<button className={styles.primary} type="submit" disabled={submission!=="idle"||step===3&&!canSubmit}>{step<3?"Continue":submission==="sending"?"Sending your application…":"Apply as an Ambassador"}<ArrowRight size={17} aria-hidden/></button></div>
      </form>}
    </section>
  </div>;
}
