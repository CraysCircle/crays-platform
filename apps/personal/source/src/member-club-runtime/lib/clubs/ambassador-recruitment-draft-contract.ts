import {z} from "zod";

/** NEXT_DEPLOYMENT. Separate Creator/Affiliate recruitment; never replaces the
 * original 13-field membership application. This validates input only. */
export type RecruitmentInputPolicy = Readonly<{
  maxTextLength: number; maxNarrativeLength: number; maxPublicUrlLength: number;
  maxChannels: number; maxMetricDigits: number; supportedLocales: readonly string[];
}>;
export const AMBASSADOR_RECRUITMENT_PARTNER_TYPES = ["Content creator", "Influencer", "Affiliate partner", "Community builder"] as const;
export const AMBASSADOR_RECRUITMENT_FORMATS = ["Video / reels", "Photography", "Articles", "Newsletter", "Events / community", "Website / affiliate"] as const;
export const AMBASSADOR_RECRUITMENT_COLLABORATION = ["Content", "Affiliate / referrals", "Events / community"] as const;

export function createAmbassadorRecruitmentDraftSchema(policy: RecruitmentInputPolicy) {
  for (const value of [policy?.maxTextLength, policy?.maxNarrativeLength, policy?.maxPublicUrlLength,
    policy?.maxChannels, policy?.maxMetricDigits]) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error("AMBASSADOR_RECRUITMENT_NATIVE_INPUT_POLICY_UNAVAILABLE");
  }
  if (!Array.isArray(policy.supportedLocales) || !policy.supportedLocales.length ||
    policy.supportedLocales.some(v => typeof v !== "string" || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(v)) ||
    new Set(policy.supportedLocales).size !== policy.supportedLocales.length) {
    throw new Error("AMBASSADOR_RECRUITMENT_NATIVE_INPUT_POLICY_UNAVAILABLE");
  }
  // Preserve the original validation policy across asynchronous submission work;
  // mutating a caller-owned locale array must not broaden an already-built schema.
  policy = Object.freeze({...policy, supportedLocales:Object.freeze([...policy.supportedLocales])});
  const text = z.string().trim().max(policy.maxTextLength);
  const narrative = z.string().trim().max(policy.maxNarrativeLength);
  const publicUrl = z.string().trim().max(policy.maxPublicUrlLength).refine(value => {
    if (!value) return true;
    try {const u = new URL(value); return ["http:", "https:"].includes(u.protocol) && !!u.hostname && !u.username && !u.password;}
    catch {return false;}
  }, "Use a public HTTP or HTTPS URL without credentials.");
  const digits = z.string().trim().refine(v => v === "" || new RegExp(`^\\d{1,${policy.maxMetricDigits}}$`).test(v), "Use an optional nonnegative whole number.");
  const metricValue = z.string().trim().refine(v => v === "" || new RegExp(`^\\d{1,${policy.maxMetricDigits}}(?:\\.\\d{1,${policy.maxMetricDigits}})?$`).test(v), "Use an optional nonnegative number.");
  const channel = z.object({rowId:text.min(1),platform:text.min(1),url:publicUrl.refine(v=>v.length>0),
    handle:text,followers:digits,metric:text,metricValue,period:text}).strict().superRefine((row,ctx) => {
      if (row.metricValue && (!row.metric || !row.period)) ctx.addIssue({code:"custom",path:["metricValue"],message:"Give the metric and its period with the value."});
    });
  return z.object({
    partnerTypes:z.array(z.enum(AMBASSADOR_RECRUITMENT_PARTNER_TYPES)).min(1).max(AMBASSADOR_RECRUITMENT_PARTNER_TYPES.length),
    fullName:text.min(1),email:z.string().trim().email().max(policy.maxTextLength),region:text.min(1),
    language:text.refine(v=>policy.supportedLocales.includes(v)),company:text,companyContact:text,
    website:publicUrl,phone:text,introduction:narrative,channels:z.array(channel).max(policy.maxChannels),
    audienceRegions:text,audienceLanguages:text,audienceDescription:narrative,topics:narrative,
    formats:z.array(z.enum(AMBASSADOR_RECRUITMENT_FORMATS)).max(AMBASSADOR_RECRUITMENT_FORMATS.length),
    motivation:narrative.min(1),ideas:narrative,previousWork:narrative,availability:narrative,
    collaboration:z.array(z.enum(AMBASSADOR_RECRUITMENT_COLLABORATION)).max(AMBASSADOR_RECRUITMENT_COLLABORATION.length),
    compensation:narrative,conflicts:narrative,privacyAcknowledged:z.literal(true),marketingConsent:z.boolean(),
  }).strict().superRefine((draft,ctx)=>{
    for (const key of ["partnerTypes","formats","collaboration"] as const) {
      if (new Set(draft[key]).size!==draft[key].length) ctx.addIssue({code:"custom",path:[key],message:"Choose each option once."});
    }
    if (new Set(draft.channels.map(c=>c.rowId)).size!==draft.channels.length) ctx.addIssue({code:"custom",path:["channels"],message:"Each channel needs its own row reference."});
  });
}
export type AmbassadorRecruitmentDraft = z.infer<ReturnType<typeof createAmbassadorRecruitmentDraftSchema>>;
