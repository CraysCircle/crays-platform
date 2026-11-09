import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import {
  authorizeHolidayManager,
  type HolidayManagerAssurance,
  type HolidayManagerAuthorityContext,
} from "@/lib/clubs/holiday-manager-access";
import {
  clubsTeamAudience,
  clubsTeamOrigin,
  createClubsTeamLaunchAssertion,
} from "@/lib/clubs/team-launch-assertion";

const launchCapability = "clubs.qlo.launch" as const;
const launchLifetimeSeconds = 60;
const hostSessionLifetimeSeconds = 8 * 60 * 60;

function opaqueToken() {
  return randomBytes(32).toString("base64url");
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function identifier(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function safeReturnPath(value: string) {
  return /^\/[A-Za-z0-9/_-]*$/.test(value) ? value : "/operations";
}

function validBindingHash(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export type IssueClubsTeamLaunchInput = {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  propertyId: string;
  browserBindingHash: string;
  assuranceLevel: HolidayManagerAssurance;
  returnPath?: string;
  correlationId: string;
};

export async function issueClubsTeamLaunchCode(input: IssueClubsTeamLaunchInput) {
  if (!validBindingHash(input.browserBindingHash)) {
    throw new Error("A SHA-256 browser binding is required.");
  }
  if (input.assuranceLevel === "aal1") {
    throw new Error("Step-up authentication is required.");
  }

  return transaction(async (client) => {
    const authorityResult = await client.query<{
      account_status: HolidayManagerAuthorityContext["accountStatus"];
      membership_status: HolidayManagerAuthorityContext["membershipStatus"];
      role_status: string;
      role_scope_id: string;
      scope_status: HolidayManagerAuthorityContext["assignmentStatus"];
      organization_id: string;
      partner_tenant_id: string;
      legal_entity_id: string;
      property_id: string;
      capabilities: unknown;
      provider_ready: boolean;
    }>(
      `select
         account.status account_status,
         membership.status membership_status,
         role_assignment.status role_status,
         scope.role_scope_id,
         scope.status scope_status,
         operator.organization_id,
         scope.partner_tenant_id,
         scope.operator_legal_entity_id legal_entity_id,
         scope.property_id,
         scope.capabilities,
         exists (
           select 1
           from crays_core.clubs_properties property
           join crays_core.store_operator_assignments assignment
             on assignment.store_id=property.store_id
            and assignment.partner_tenant_id=scope.partner_tenant_id
            and assignment.operator_legal_entity_id=scope.operator_legal_entity_id
            and assignment.status='active'
            and assignment.valid_from<=now()
            and (assignment.valid_until is null or assignment.valid_until>now())
           join crays_core.provider_scope_bindings binding
             on binding.assignment_id=assignment.assignment_id
            and binding.assignment_version=assignment.version
            and binding.status='active'
            and binding.qlo_shop_id is not null
            and binding.qlo_hotel_id is not null
           join crays_core.clubs_qlo_staff_bindings staff_binding
             on staff_binding.account_id=scope.account_id
            and staff_binding.role_scope_id=scope.role_scope_id
            and staff_binding.provider_scope_binding_id=binding.binding_id
            and staff_binding.status='active'
           where property.property_id=scope.property_id
         ) provider_ready
       from crays_core.partner_role_scopes scope
       join crays_core.franchise_operator_tenants operator
         on operator.partner_tenant_id=scope.partner_tenant_id
        and operator.status='active'
       join crays_core.crays_accounts account
         on account.account_id=scope.account_id
       join crays_core.organization_memberships membership
         on membership.account_id=scope.account_id
        and membership.organization_id=operator.organization_id
        and membership.role_key='holiday-manager'
       join crays_core.role_assignments role_assignment
         on role_assignment.assignment_id=scope.role_assignment_id
        and role_assignment.account_id=scope.account_id
        and role_assignment.organization_id=operator.organization_id
        and role_assignment.role_key='holiday-manager'
       join crays_core.tenant_sessions tenant_session
         on tenant_session.session_id=$2
        and tenant_session.account_id=scope.account_id
        and tenant_session.organization_id=operator.organization_id
        and tenant_session.role_key='holiday-manager'
        and tenant_session.status='active'
        and tenant_session.expires_at>now()
       where scope.account_id=$1
         and scope.role_key='holiday-manager'
         and scope.vertical_root='clubs'
         and scope.relationship_type='clubs-franchise-partner'
         and scope.status='active'
         and scope.property_id=$3
         and operator.organization_id=$4
         and scope.valid_from<=now()
         and (scope.valid_until is null or scope.valid_until>now())
       limit 1
       for update of scope`,
      [
        input.accountId,
        input.tenantSessionId,
        input.propertyId,
        input.organizationId,
      ],
    );
    const row = authorityResult.rows[0];
    if (!row || row.role_status !== "active" || !row.provider_ready) {
      throw new Error("An active, provider-bound Clubs Holiday Manager assignment is required.");
    }
    const capabilities = Array.isArray(row.capabilities)
      ? row.capabilities.filter((value): value is string => typeof value === "string")
      : [];
    const authority: HolidayManagerAuthorityContext = {
      personId: input.accountId,
      accountStatus: row.account_status,
      roleKey: "holiday-manager",
      membershipStatus: row.membership_status,
      assignmentStatus: row.scope_status,
      relationshipType: "clubs-franchise-partner",
      relationshipStatus: "active",
      venture: "clubs",
      organizationId: row.organization_id,
      operatorId: row.partner_tenant_id,
      legalEntityId: row.legal_entity_id,
      propertyIds: [row.property_id],
      capabilities,
      assuranceLevel: input.assuranceLevel,
    };
    const decision = authorizeHolidayManager(authority, {
      capability: launchCapability,
      organizationId: input.organizationId,
      operatorId: row.partner_tenant_id,
      legalEntityId: row.legal_entity_id,
      propertyId: row.property_id,
    });
    if (!decision.allowed) {
      throw new Error(`Clubs team launch denied: ${decision.reason}.`);
    }

    const code = opaqueToken();
    const launchCodeId = identifier("clubs_launch");
    const receiptId = identifier("clubs_launch_receipt");
    const returnPath = safeReturnPath(input.returnPath ?? "/operations");
    const launchInsert = await client.query<{ expires_at: Date }>(
      `insert into crays_core.clubs_team_launch_codes
        (launch_code_id,code_hash,account_id,tenant_session_id,role_scope_id,
         organization_id,partner_tenant_id,operator_legal_entity_id,property_id,
         capability,purpose,browser_binding_hash,return_path,assurance_level,expires_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'holiday-operations',$11,$12,$13,
         now() + make_interval(secs => $14::int))
       returning expires_at`,
      [
        launchCodeId,
        sha256(code),
        input.accountId,
        input.tenantSessionId,
        row.role_scope_id,
        input.organizationId,
        row.partner_tenant_id,
        row.legal_entity_id,
        row.property_id,
        launchCapability,
        input.browserBindingHash,
        returnPath,
        input.assuranceLevel,
        launchLifetimeSeconds,
      ],
    );
    const expiresAt = launchInsert.rows[0].expires_at;
    await client.query(
      `insert into crays_core.clubs_team_launch_receipts
        (receipt_id,launch_code_id,event_type,result,correlation_id,metadata)
       values ($1,$2,'issued','allowed',$3,$4::jsonb)`,
      [
        receiptId,
        launchCodeId,
        input.correlationId,
        JSON.stringify({ audience: clubsTeamAudience, callbackOrigin: clubsTeamOrigin }),
      ],
    );
    const destination = new URL("/auth/exchange", clubsTeamOrigin);
    destination.searchParams.set("code", code);
    return {
      launchCodeId,
      receiptId,
      destination: destination.toString(),
      expiresAt: expiresAt.toISOString(),
    };
  });
}

export async function redeemClubsTeamLaunchCode(input: {
  code: string;
  browserBindingHash: string;
  correlationId: string;
  assertionSecret: string;
  consumerId: string;
}) {
  if (!validBindingHash(input.browserBindingHash)) {
    throw new Error("A SHA-256 browser binding is required.");
  }
  const outcome = await transaction(async (client) => {
    await client.query(
      `update crays_core.clubs_team_launch_codes
       set status='expired'
       where status='issued' and expires_at<=now()`,
    );
    const result = await client.query<{
      launch_code_id: string;
      account_id: string;
      tenant_session_id: string;
      role_scope_id: string;
      browser_binding_hash: string;
      status: "issued" | "consumed" | "expired" | "revoked";
      organization_id: string;
      partner_tenant_id: string;
      operator_legal_entity_id: string;
      property_id: string;
      assurance_level: "aal2" | "aal3";
      return_path: string;
      expires_at: Date;
    }>(
      `select launch_code_id,account_id,tenant_session_id,role_scope_id,
         browser_binding_hash,status,organization_id,partner_tenant_id,
         operator_legal_entity_id,property_id,assurance_level,return_path,expires_at
       from crays_core.clubs_team_launch_codes
       where code_hash=$1
         and audience='crays-clubs-team'
         and callback_origin='https://team.craysclub.com'
       limit 1
       for update`,
      [sha256(input.code)],
    );
    const row = result.rows[0];
    if (!row) {
      return {
        deniedReason: "Launch code is invalid.",
      } as const;
    }
    const deny = async (
      reason: string,
      eventType: "denied" | "expired" = "denied",
    ) => {
      await client.query(
        `insert into crays_core.clubs_team_launch_receipts
          (receipt_id,launch_code_id,event_type,result,reason,correlation_id,metadata)
         values ($1,$2,$3,'denied',$4,$5,$6::jsonb)`,
        [
          identifier("clubs_launch_receipt"),
          row.launch_code_id,
          eventType,
          reason,
          input.correlationId,
          JSON.stringify({ consumerId: input.consumerId }),
        ],
      );
      return {
        deniedReason:
          "Launch code is invalid, expired, already consumed or bound to another browser.",
      } as const;
    };
    if (row.status !== "issued") {
      return deny(
        `launch-code-${row.status}`,
        row.status === "expired" ? "expired" : "denied",
      );
    }
    if (row.expires_at.getTime() <= Date.now()) {
      await client.query(
        `update crays_core.clubs_team_launch_codes
         set status='expired' where launch_code_id=$1 and status='issued'`,
        [row.launch_code_id],
      );
      return deny("launch-code-expired", "expired");
    }
    if (row.browser_binding_hash !== input.browserBindingHash) {
      return deny("browser-binding-mismatch");
    }
    await client.query(
      `update crays_core.clubs_team_launch_codes
       set status='consumed',consumed_at=now(),consumed_by=$2
       where launch_code_id=$1 and status='issued'`,
      [row.launch_code_id, input.consumerId],
    );
    const receiptId = identifier("clubs_launch_receipt");
    await client.query(
      `insert into crays_core.clubs_team_launch_receipts
        (receipt_id,launch_code_id,event_type,result,correlation_id,metadata)
       values ($1,$2,'consumed','allowed',$3,$4::jsonb)`,
      [
        receiptId,
        row.launch_code_id,
        input.correlationId,
        JSON.stringify({ consumerId: input.consumerId }),
      ],
    );
    const sessionAuthority = await client.query<{
      security_version: number;
      tenant_session_expires_at: Date;
    }>(
      `select account.security_version, tenant_session.expires_at tenant_session_expires_at
       from crays_core.crays_accounts account
       join crays_core.tenant_sessions tenant_session
         on tenant_session.session_id=$2
        and tenant_session.account_id=account.account_id
        and tenant_session.status='active'
        and tenant_session.expires_at>now()
        and tenant_session.account_security_version=account.security_version
       where account.account_id=$1 and account.status='active'
       for share of account, tenant_session`,
      [row.account_id, row.tenant_session_id],
    );
    const sessionAuthorityRow = sessionAuthority.rows[0];
    if (!sessionAuthorityRow) {
      throw new Error("The CRAYS tenant session is no longer active.");
    }
    const hostSessionId = identifier("clubs_team_session");
    const hostSessionToken = opaqueToken();
    const hostSessionExpiresAt = new Date(
      Math.min(
        Date.now() + hostSessionLifetimeSeconds * 1000,
        sessionAuthorityRow.tenant_session_expires_at.getTime(),
      ),
    );
    await client.query(
      `insert into crays_core.clubs_team_host_sessions
        (session_id,token_hash,launch_code_id,launch_receipt_id,account_id,
         tenant_session_id,role_scope_id,organization_id,partner_tenant_id,
         operator_legal_entity_id,property_id,capability,assurance_level,
         account_security_version,expires_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        hostSessionId,
        sha256(hostSessionToken),
        row.launch_code_id,
        receiptId,
        row.account_id,
        row.tenant_session_id,
        row.role_scope_id,
        row.organization_id,
        row.partner_tenant_id,
        row.operator_legal_entity_id,
        row.property_id,
        launchCapability,
        row.assurance_level,
        sessionAuthorityRow.security_version,
        hostSessionExpiresAt,
      ],
    );
    const nowSeconds = Math.floor(Date.now() / 1000);
    const assertion = createClubsTeamLaunchAssertion(
      {
        iss: "https://www.crays.pro",
        aud: clubsTeamAudience,
        sub: row.account_id,
        role: "holiday-manager",
        organizationId: row.organization_id,
        partnerTenantId: row.partner_tenant_id,
        legalEntityId: row.operator_legal_entity_id,
        propertyId: row.property_id,
        capability: launchCapability,
        assuranceLevel: row.assurance_level,
        launchReceiptId: receiptId,
        iat: nowSeconds,
        exp: Math.min(nowSeconds + launchLifetimeSeconds, Math.floor(row.expires_at.getTime() / 1000)),
      },
      input.assertionSecret,
    );
    return {
      assertion,
      hostSessionId,
      hostSessionToken,
      hostSessionExpiresAt: hostSessionExpiresAt.toISOString(),
      returnPath: row.return_path,
      receiptId,
      expiresAt: row.expires_at.toISOString(),
    };
  });
  if ("deniedReason" in outcome) {
    throw new Error(outcome.deniedReason);
  }
  return outcome;
}

export type ClubsTeamHostSession = {
  sessionId: string;
  accountId: string;
  organizationId: string;
  partnerTenantId: string;
  legalEntityId: string;
  propertyId: string;
  assuranceLevel: "aal2" | "aal3";
  qloShopId: string;
  qloHotelId: string;
  qloEmployeeRef: string;
  expiresAt: string;
};

export async function resolveClubsTeamHostSession(
  sessionToken: string | null | undefined,
): Promise<ClubsTeamHostSession | null> {
  if (!sessionToken) return null;
  return transaction(async (client) => {
    await client.query(
      `update crays_core.clubs_team_host_sessions
       set status='expired',revoked_at=coalesce(revoked_at,now()),
           revoke_reason=coalesce(revoke_reason,'expired')
       where status='active' and expires_at<=now()`,
    );
    const result = await client.query<{
      session_id: string;
      account_id: string;
      organization_id: string;
      partner_tenant_id: string;
      operator_legal_entity_id: string;
      property_id: string;
      assurance_level: "aal2" | "aal3";
      expires_at: Date;
      qlo_shop_id: string;
      qlo_hotel_id: string;
      qlo_employee_ref: string;
    }>(
      `select
         host_session.session_id,
         host_session.account_id,
         host_session.organization_id,
         host_session.partner_tenant_id,
         host_session.operator_legal_entity_id,
         host_session.property_id,
         host_session.assurance_level,
         host_session.expires_at,
         binding.qlo_shop_id,
         binding.qlo_hotel_id,
         staff_binding.qlo_employee_ref
       from crays_core.clubs_team_host_sessions host_session
       join crays_core.crays_accounts account
         on account.account_id=host_session.account_id
        and account.status='active'
        and account.security_version=host_session.account_security_version
       join crays_core.tenant_sessions tenant_session
         on tenant_session.session_id=host_session.tenant_session_id
        and tenant_session.account_id=host_session.account_id
        and tenant_session.organization_id=host_session.organization_id
        and tenant_session.role_key='holiday-manager'
        and tenant_session.status='active'
        and tenant_session.expires_at>now()
        and tenant_session.account_security_version=account.security_version
       join crays_core.organization_memberships membership
         on membership.account_id=host_session.account_id
        and membership.organization_id=host_session.organization_id
        and membership.role_key='holiday-manager'
        and membership.status='active'
       join crays_core.role_assignments role_assignment
         on role_assignment.account_id=host_session.account_id
        and role_assignment.organization_id=host_session.organization_id
        and role_assignment.role_key='holiday-manager'
        and role_assignment.status='active'
        and role_assignment.nostr_binding_status in ('verified','system_attested')
       join crays_core.partner_role_scopes scope
         on scope.role_scope_id=host_session.role_scope_id
        and scope.account_id=host_session.account_id
        and scope.role_assignment_id=role_assignment.assignment_id
        and scope.role_key='holiday-manager'
        and scope.vertical_root='clubs'
        and scope.relationship_type='clubs-franchise-partner'
        and scope.partner_tenant_id=host_session.partner_tenant_id
        and scope.operator_legal_entity_id=host_session.operator_legal_entity_id
        and scope.property_id=host_session.property_id
        and scope.status='active'
        and scope.valid_from<=now()
        and (scope.valid_until is null or scope.valid_until>now())
        and scope.capabilities @> '["clubs.qlo.launch"]'::jsonb
       join crays_core.clubs_properties property
         on property.property_id=host_session.property_id
       join crays_core.store_operator_assignments assignment
         on assignment.store_id=property.store_id
        and assignment.vertical_root='clubs'
        and assignment.partner_tenant_id=host_session.partner_tenant_id
        and assignment.operator_legal_entity_id=host_session.operator_legal_entity_id
        and assignment.status='active'
        and assignment.valid_from<=now()
        and (assignment.valid_until is null or assignment.valid_until>now())
       join lateral (
         select provider.binding_id,provider.qlo_shop_id,provider.qlo_hotel_id
         from crays_core.provider_scope_bindings provider
         where provider.assignment_id=assignment.assignment_id
           and provider.assignment_version=assignment.version
           and provider.status='active'
           and provider.qlo_shop_id is not null
           and provider.qlo_hotel_id is not null
         order by provider.binding_version desc
         limit 1
       ) binding on true
       join crays_core.clubs_qlo_staff_bindings staff_binding
         on staff_binding.account_id=host_session.account_id
        and staff_binding.role_scope_id=host_session.role_scope_id
        and staff_binding.provider_scope_binding_id=binding.binding_id
        and staff_binding.status='active'
       where host_session.token_hash=$1
         and host_session.status='active'
         and host_session.capability='clubs.qlo.launch'
         and host_session.expires_at>now()
       limit 1
       for update of host_session`,
      [sha256(sessionToken)],
    );
    const row = result.rows[0];
    if (!row) return null;
    await client.query(
      `update crays_core.clubs_team_host_sessions
       set last_seen_at=now() where session_id=$1`,
      [row.session_id],
    );
    return {
      sessionId: row.session_id,
      accountId: row.account_id,
      organizationId: row.organization_id,
      partnerTenantId: row.partner_tenant_id,
      legalEntityId: row.operator_legal_entity_id,
      propertyId: row.property_id,
      assuranceLevel: row.assurance_level,
      qloShopId: row.qlo_shop_id,
      qloHotelId: row.qlo_hotel_id,
      qloEmployeeRef: row.qlo_employee_ref,
      expiresAt: row.expires_at.toISOString(),
    };
  });
}

export async function revokeClubsTeamHostSession(
  sessionToken: string | null | undefined,
  reason = "user_sign_out",
) {
  if (!sessionToken) return { revoked: false };
  const result = await getCorePgPool().query(
    `update crays_core.clubs_team_host_sessions
     set status='revoked',revoked_at=now(),revoke_reason=$2
     where token_hash=$1 and status='active'`,
    [sha256(sessionToken), reason],
  );
  return { revoked: (result.rowCount ?? 0) > 0 };
}
