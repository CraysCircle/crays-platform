import "server-only";

import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import type { TeamStaySupportRepositoryRecord } from "@/lib/clubs/team-stay-support-operations-contract";

type TeamStaySupportQueryable = Pick<PoolClient, "query">;

export type TeamStaySupportReadInput = {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
  publicSupportReference?: string | null;
};

export async function readTeamStaySupportQueue(
  input: TeamStaySupportReadInput,
  database: TeamStaySupportQueryable = getCorePgPool(),
): Promise<TeamStaySupportRepositoryRecord[]> {
  const result = await database.query<{
    public_reference: string;
    category: string;
    status: string;
    version: number;
    opened_at: Date;
    updated_at: Date;
  }>(
    `with authorized_properties as (
       select distinct property.property_id
       from crays_core.tenant_sessions session
       join crays_core.partner_role_scopes scope
         on scope.account_id=session.account_id
        and scope.role_key='holiday-manager'
        and scope.vertical_root='clubs'
        and scope.relationship_type='clubs-franchise-partner'
        and scope.status='active'
        and scope.valid_from<=now()
        and (scope.valid_until is null or scope.valid_until>now())
        and scope.capabilities @> '["clubs.holiday.reservation.operate"]'::jsonb
       join crays_core.role_assignments role_assignment
         on role_assignment.assignment_id=scope.role_assignment_id
        and role_assignment.organization_id=session.organization_id
        and role_assignment.account_id=session.account_id
        and role_assignment.role_key=session.role_key
        and role_assignment.status='active'
       join crays_core.clubs_properties property
         on property.property_id=scope.property_id
        and property.partner_tenant_id=scope.partner_tenant_id
        and property.operator_legal_entity_id=scope.operator_legal_entity_id
       join crays_core.stores store
         on store.store_id=property.store_id and store.vertical_root='clubs'
       join crays_core.store_operator_assignments assignment
         on assignment.store_id=store.store_id
        and assignment.partner_tenant_id=scope.partner_tenant_id
        and assignment.operator_legal_entity_id=scope.operator_legal_entity_id
        and assignment.status='active'
        and assignment.valid_from<=now()
        and (assignment.valid_until is null or assignment.valid_until>now())
       where session.session_id=$2 and session.account_id=$1
         and session.organization_id=$3 and session.role_key='holiday-manager'
         and session.status='active' and session.expires_at>now()
         and $4='holiday-manager'
       union
       select property.property_id
       from crays_core.tenant_sessions session
       join crays_core.franchise_operator_tenants operator
         on operator.organization_id=$3 and operator.status='active'
       join crays_core.clubs_properties property
         on property.partner_tenant_id=operator.partner_tenant_id
       join crays_core.stores store
         on store.store_id=property.store_id and store.vertical_root='clubs'
       where session.session_id=$2 and session.account_id=$1
         and session.organization_id=$3 and session.role_key=$4
         and session.status='active' and session.expires_at>now()
         and $4 in ('crays-management','admin')
     )
     select support.public_reference,support.category,support.status,support.version,
       support.opened_at,support.updated_at
     from crays_core.clubs_member_support_cases support
     join authorized_properties scope on scope.property_id=support.property_id
     where ($5='' or support.public_reference=$5)
     order by
       case support.status when 'awaiting_team' then 0 when 'open' then 1 else 2 end,
       support.updated_at desc,support.public_reference
     limit 100`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
      input.publicSupportReference ?? "",
    ],
  );
  return result.rows.map((row) => ({
    publicSupportReference: row.public_reference,
    category: row.category,
    status: row.status,
    version: row.version,
    openedAt: row.opened_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}
