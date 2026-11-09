import { GraphQLError } from "graphql";
import { getCorePgPool } from "@/db/client";
import type { CraysGraphQLContext } from "../context";
import { canReadGymDomain, type GymReadDomainKey } from "../reads/gym-read-model";

const aggregateDomain: Record<string,GymReadDomainKey>={relationship:"CRM",opportunity:"FRANCHISE","work-item":"PROJECT",invoice:"ERP_FINANCE",document:"DOCUMENTS","metric-observation":"ANALYTICS","studio-operation":"STUDIO_OPERATIONS",membership:"MEMBER"};

export async function* subscribeGymEvents(input: { domain?: GymReadDomainKey | null; afterEventId?: string | null }, context: CraysGraphQLContext) {
  if (context.route.authoritySource === "anonymous-fail-closed") throw new GraphQLError("A mapped or explicitly authorized local CRAYS identity is required.",{extensions:{code:"FORBIDDEN"}});
  const requested=input.domain?[input.domain]:Object.values(aggregateDomain);const domains=requested.filter((domain,index,all)=>all.indexOf(domain)===index&&canReadGymDomain(domain,context.route.role));
  if(!domains.length) throw new GraphQLError("No authorized event domain is available.",{extensions:{code:"FORBIDDEN"}});
  let after:Date|null=null;
  if(input.afterEventId){const cursor=await getCorePgPool().query<{occurred_at:Date}>(`select occurred_at from crays_core.domain_event_outbox where tenant_id=$1 and event_id=$2`,[context.route.tenantId,input.afterEventId]);if(!cursor.rowCount)throw new GraphQLError("Resume cursor is unavailable.",{extensions:{code:"INVALID_CURSOR"}});after=cursor.rows[0].occurred_at;}
  const aggregates=Object.entries(aggregateDomain).filter(([,domain])=>domains.includes(domain)).map(([aggregate])=>aggregate);
  const events=await getCorePgPool().query<{event_id:string;event_type:string;aggregate_id:string;occurred_at:Date}>(`select event_id,event_type,aggregate_id,occurred_at from crays_core.domain_event_outbox where tenant_id=$1 and aggregate_type=any($2::text[]) and ($3::timestamptz is null or occurred_at>$3) order by occurred_at,event_id limit 100`,[context.route.tenantId,aggregates,after]);
  for(const event of events.rows) yield {gymEvents:{eventId:event.event_id,eventType:event.event_type,aggregateId:Buffer.from(event.aggregate_id).toString("base64url"),occurredAt:event.occurred_at.toISOString()}};
}
