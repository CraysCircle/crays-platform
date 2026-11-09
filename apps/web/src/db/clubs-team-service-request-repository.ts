import "server-only";

import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { executeClubsServiceCommandWithClient } from "@/db/clubs-services-entitlements-repository";
import {
  parseTeamServiceRequestPersistedCommandResponse,
  type TeamServiceRequestActionType,
  type TeamServiceRequestPersistedCommandResponse,
  type TeamServiceRequestRepositoryRecord,
} from "@/lib/clubs/team-service-request-operations-contract";

type TeamServiceRequestQueryable = Pick<PoolClient, "query">;

export type TeamServiceRequestReadInput = {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
  publicServiceReference?: string | null;
};

export async function readTeamServiceRequestQueue(
  input: TeamServiceRequestReadInput,
  database: TeamServiceRequestQueryable = getCorePgPool(),
): Promise<TeamServiceRequestRepositoryRecord[]> {
  const result = await database.query<{
    public_reference: string;
    category: string;
    status: string;
    version: number;
    requested_at: Date;
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
     select selection.public_reference,
       offering.service_type category,selection.status,selection.version,
       selection.created_at requested_at,selection.updated_at
     from crays_core.clubs_booking_service_selections selection
     join crays_core.clubs_bookings booking
       on booking.booking_id=selection.booking_id
     join authorized_properties scope on scope.property_id=booking.property_id
     join crays_core.clubs_service_offerings offering
       on offering.service_offering_id=selection.service_offering_id
      and offering.property_id=booking.property_id
     where ($5='' or selection.public_reference=$5)
     order by
       case selection.status
         when 'requested' then 0 when 'confirmed' then 1 else 2
       end,
       selection.updated_at desc,selection.public_reference
     limit 100`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
      input.publicServiceReference ?? "",
    ],
  );
  return result.rows.map((row) => ({
    publicServiceReference: row.public_reference,
    category: row.category,
    status: row.status,
    version: row.version,
    requestedAt: row.requested_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function resolveTeamServiceRequestCommandTarget(
  input: TeamServiceRequestReadInput & { publicServiceReference: string },
  database: TeamServiceRequestQueryable = getCorePgPool(),
): Promise<{ selectionId: string; propertyId: string } | null> {
  const result = await database.query<{
    selection_id: string;
    property_id: string;
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
     select selection.booking_service_selection_id selection_id,
       booking.property_id
     from crays_core.clubs_booking_service_selections selection
     join crays_core.clubs_bookings booking
       on booking.booking_id=selection.booking_id
     join authorized_properties scope on scope.property_id=booking.property_id
     where selection.public_reference=$5
     limit 1`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
      input.publicServiceReference,
    ],
  );
  const target = result.rows[0];
  return target
    ? { selectionId: target.selection_id, propertyId: target.property_id }
    : null;
}

type TeamServiceRequestCommandInput = {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: "holiday-manager" | "crays-management" | "admin";
  propertyId: string;
  selectionId: string;
  action: TeamServiceRequestActionType;
  expectedVersion: number;
  idempotencyKey: string;
  correlationId: string;
  publicServiceReference: string;
};

export async function executeTeamServiceRequestCommand(
  input: TeamServiceRequestCommandInput,
): Promise<TeamServiceRequestPersistedCommandResponse> {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `select
         set_config('crays.app_role','core_service',true),
         set_config('crays.actor_account_id',$1,true),
         set_config('crays.tenant_session_id',$2,true),
         set_config('crays.organization_id',$3,true),
         set_config('crays.role_key',$4,true),
         set_config('crays.property_id',$5,true)`,
      [
        input.accountId,
        input.tenantSessionId,
        input.organizationId,
        input.roleKey,
        input.propertyId,
      ],
    );
    const receipt = await executeClubsServiceCommandWithClient(client, {
      accountId: input.accountId,
      actorType: input.roleKey,
      tenantSessionId: input.tenantSessionId,
      organizationId: input.organizationId,
      roleKey: input.roleKey,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      command: {
        type: input.action,
        selectionId: input.selectionId,
        expectedVersion: input.expectedVersion,
        reason:
          input.action === "confirm_service"
            ? "Team confirmed service request"
            : "Team fulfilled service request",
      },
    });
    const persisted = await client.query<{ response_payload: unknown }>(
      `select receipt.response_payload
       from crays_core.clubs_service_command_receipts receipt
       join crays_core.clubs_service_command_requests request
         on request.service_command_request_id=
           receipt.service_command_request_id
       join crays_core.clubs_booking_service_selections selection
         on selection.booking_service_selection_id=request.target_id
       join crays_core.clubs_bookings booking
         on booking.booking_id=selection.booking_id
       where receipt.service_command_receipt_id=$1
         and receipt.response_persistence_version=1
         and request.actor_account_id=$2
         and request.actor_type=$3
         and request.command_type=$4
         and request.target_id=$5
         and request.expected_version=$6
         and booking.property_id=$9
         and exists (
           select 1 from crays_core.tenant_sessions session
           where session.session_id=$7 and session.account_id=$2
             and session.organization_id=$8 and session.role_key=$3
             and session.status='active' and session.expires_at>now()
         )
         and crays_core.clubs_team_service_command_authority_active(
           request.actor_account_id,request.actor_type,request.target_id
         )`,
      [
        receipt.receiptId,
        input.accountId,
        input.roleKey,
        input.action,
        input.selectionId,
        input.expectedVersion,
        input.tenantSessionId,
        input.organizationId,
        input.propertyId,
      ],
    );
    const response = parseTeamServiceRequestPersistedCommandResponse(
      persisted.rows[0]?.response_payload,
      {
        action: input.action,
        publicServiceReference: input.publicServiceReference,
      },
    );
    await client.query("commit");
    return response;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
