import catalogue from './currentPublicPlans.json';
export type PublicPlanSegment='user'|'creator'|'spot';
export type PublicPlanPeriod='monthly'|'annual';
export type CurrentPublicPlan=typeof catalogue.plans[number];
export const currentPublicPlans=catalogue.plans;
export const currentPublicPlanVersion=catalogue.version;
export function currentPublicPlan(id:string){const found=currentPublicPlans.filter(p=>p.id===id);return found.length===1?found[0]:undefined;}
export function publicPlanPrice(plan:CurrentPublicPlan,period:PublicPlanPeriod){return {amount:period==='annual'?plan.annual:plan.monthly,currency:'USD' as const,period,months:period==='annual'?12:1,taxTotal:null,paymentTotal:null};}
/** Resolve explicitly advertised inheritance, never inferred quotas or entitlements. */
export function publicPlanBenefits(plan:CurrentPublicPlan):string[]{
 const parents:Record<string,string>={'GMI Caster':'Build Caster','OG Caster':'GMI Caster','Spot Badge':'Spot Connect Badge','Spot Collective':'Spot Badge'};
 const parent=parents[plan.displayName],inherited=parent?currentPublicPlans.find(p=>p.segment===plan.segment&&p.displayName===parent):undefined;
 return [...new Set([...(inherited?publicPlanBenefits(inherited):[]),...plan.benefits,...('additionalOriginalsPageBenefits' in plan?plan.additionalOriginalsPageBenefits||[]:[])])];
}
