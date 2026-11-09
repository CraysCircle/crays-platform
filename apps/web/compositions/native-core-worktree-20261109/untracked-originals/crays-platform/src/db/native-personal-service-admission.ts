import "server-only";
import type { CommittedNativePersonalOutbox } from "@/lib/native-personal-chuck-lifecycle";
import { getNativePersonalRuntimePool } from "./native-personal-runtime-pool";

/** Owning server read of existing Core rights, not a public identity/route DTO.
 * Authentication/issuer approval and the actual SDK host are checked separately
 * by the server. A matching file/hash cannot replace these current originals.
 */
export async function assertNativePersonalServiceScope(scope: CommittedNativePersonalOutbox): Promise<string> {
  const client = await getNativePersonalRuntimePool().connect();
  let active = false, discard = false;
  try {
    await client.query("begin read only"); active = true;
    await client.query("set local crays.app_role='core_service'; set local statement_timeout='5000ms'");
    await client.query("select set_config('crays.native_personal_account',$1,true)", [scope.accountId]);
    const result = await client.query<{conversation_id:string}>(`select b.conversation_id
      from crays_core.crays_accounts a
      join crays_core.canonical_person_accounts l on l.account_id=a.account_id
        and l.canonical_person_id=$2 and l.purpose='customer' and l.status='active' and l.version>0
      join crays_core.canonical_people p on p.canonical_person_id=l.canonical_person_id
        and p.lifecycle_state='active' and p.superseded_by_person_id is null
      join crays_core.personal_agent_standard_assignments s on s.account_id=a.account_id
        and s.canonical_person_id=p.canonical_person_id and s.agent_id=$3
      join crays_core.personal_messenger_bindings b on b.account_id=a.account_id
        and b.canonical_person_id=p.canonical_person_id and b.agent_id=s.agent_id
        and b.binding_id=$4 and b.revision=$5::bigint and b.status='active' and b.purpose='own-personal-chuck'
      join crays_core.conversations c on c.conversation_id=b.conversation_id and c.status='open'
        and c.conversation_type='personal_chuck' and c.created_by_account_id=a.account_id
        and c.related_entity_type='canonical-person' and c.related_entity_id=p.canonical_person_id
      join crays_core.conversation_participants participant on participant.participant_id=b.participant_id
        and participant.conversation_id=c.conversation_id and participant.account_id=a.account_id
        and participant.status='active' and participant.can_reply=true
        and participant.can_invite=false and participant.can_share_externally=false
      join crays_core.account_email_verifications v on v.account_id=a.account_id
        and v.contact_revision=a.primary_contact_revision and v.contact_address=a.primary_contact
        and v.provider_issuer=$7 and v.proof_method='auth0-userinfo-verified-email' and v.revoked_at is null
      join crays_core.auth_identities i on i.identity_id=v.auth_identity_id and i.account_id=a.account_id
        and i.provider_key='auth0' and i.provider_subject=v.provider_subject and i.verified=true
      where a.account_id=$1 and a.status='active' and a.primary_contact_type='contact'
        and a.primary_contact_revision=$6::bigint`,
    [scope.accountId,scope.canonicalPersonId,scope.agentId,scope.bindingId,scope.bindingRevision,scope.contactRevision,scope.expectedIssuer]);
    if (result.rows.length !== 1) throw new Error("NATIVE_PERSONAL_CURRENT_SERVICE_SCOPE_REQUIRED");
    await client.query("commit"); active = false;
    return result.rows[0].conversation_id;
  } catch (error) {
    if (active) await client.query("rollback").catch(() => { discard = true; });
    throw error;
  } finally { client.release(discard || active); }
}
