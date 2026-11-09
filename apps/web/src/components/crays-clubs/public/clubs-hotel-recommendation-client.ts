export type RecommendationView = { status: "checking" | "required" | "approved" | "unavailable" | "signed_out" | "identity_binding_required"; ambassadorName: string | null; ambassadorSlug?: string | null; lifecycleState?: string | null };

export function parseRecommendationResponse(data: unknown): RecommendationView {
 if(!data||typeof data!=="object")return {status:"unavailable",ambassadorName:null};
 const value=data as Record<string,unknown>;
 if(value.schema!=="crays.clubs.member-ambassador-application-status.v1"||(value.version!=="1.1.0"&&value.version!=="1.2.0")||value.status!=="ready")return {status:"unavailable",ambassadorName:null};
 const ambassador=value.ambassador&&typeof value.ambassador==="object"?value.ambassador as Record<string,unknown>:null;
 const name=typeof ambassador?.displayName==="string"&&ambassador.displayName.trim()?ambassador.displayName.trim():null;
 const slug=typeof ambassador?.slug==="string"&&ambassador.slug.trim()?ambassador.slug:null;
 const state=typeof value.state==="string"?value.state:null;
 const knownStates=new Set(["no_application","application_received","review_pending","attributed","ambassador_review","more_information_required","team_review","approved","team_go_issued","declined","withdrawn","reconciliation_required"]);
 if(value.version==="1.2.0")knownStates.add("not_recommended");
 if(!state||!knownStates.has(state))return {status:"unavailable",ambassadorName:null};
 return {status:name&&slug&&(state==="approved"||state==="team_go_issued")?"approved":"required",ambassadorName:name,ambassadorSlug:slug,lifecycleState:state};
}
export async function readRecommendation(signal: AbortSignal): Promise<RecommendationView> {
 const controller=new AbortController();const abort=()=>controller.abort();signal.addEventListener("abort",abort,{once:true});if(signal.aborted)controller.abort();
 const timeout=setTimeout(()=>controller.abort(),8000);
 try {
  const response=await fetch("/api/crays/clubs/member/ambassador-application/status",{cache:"no-store",credentials:"same-origin",signal:controller.signal});
  if(response.status===401)return {status:"signed_out",ambassadorName:null};
  if(response.status===409)return {status:"identity_binding_required",ambassadorName:null};
  if(!response.ok)return {status:"unavailable",ambassadorName:null};
  return parseRecommendationResponse(await response.json());
 }catch{return {status:"unavailable",ambassadorName:null};}
 finally{clearTimeout(timeout);signal.removeEventListener("abort",abort);}
}
