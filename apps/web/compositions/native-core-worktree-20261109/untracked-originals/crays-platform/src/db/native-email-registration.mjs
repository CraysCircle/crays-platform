import { randomUUID } from 'node:crypto';
import { getCorePgPool } from './client.ts';
import { createNativeAuth0Verifier } from '../lib/native-auth/native-auth0-verifier.mjs';
import { createNativeEmailProofReader } from '../lib/native-auth/native-email-proof.mjs';

const fail = code => new Error(code);
const scopeValid = value => typeof value === 'string' && /^[\x21\x23-\x5b\x5d-\x7e]+$/.test(value);

/** Internal Core command. Not a GraphQL admission or an agent-accessible DB port.
 * Primary account comes only from verified provider/sub; the secondary proof
 * must have been issued by this same service. No account/email/key DTO accepted.
 */
export function createNativeEmailRegistrationService(config, { fetch: transport = globalThis.fetch } = {}) {
  return createRegistrationService(config, transport, false);
}

/** Native BFF composition: original exact issuer/client/Core authority and the
 * separate non-bypass own-account pool. No fallback to the legacy business pool.
 */
export function createNativeScopedEmailRegistrationService(config, { fetch: transport = globalThis.fetch } = {}) {
  return createRegistrationService(config, transport, true);
}
function createRegistrationService(config, transport, native) {
  const verifier = createNativeAuth0Verifier(config, { fetch: transport });
  const reader = createNativeEmailProofReader(config, { fetch: transport });
  const readScope = config.requiredIdentityScope, writeScope = config.requiredContactWriteScope;
  if (!scopeValid(readScope) || !scopeValid(writeScope) || readScope === writeScope) {
    throw fail('NATIVE_CONTACT_WRITE_SCOPE_REQUIRED');
  }
  function current(request, principal, secondaryRequest, proof) {
    if (request.signal.aborted) throw fail('NATIVE_EMAIL_REGISTRATION_CANCELLED');
    verifier.requireScopes(request, principal, [readScope, writeScope]);
    verifier.requireRecentAuthentication(request, principal, 300);
    return reader.resolve(secondaryRequest, proof);
  }
  return Object.freeze({
    readEmailProof: request => reader.read(request),
    async register(request, secondaryRequest, proof, { idempotencyKey, expectedContactRevision } = {}) {
      if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(idempotencyKey) ||
          typeof expectedContactRevision !== 'string' || !/^[1-9][0-9]{0,18}$/.test(expectedContactRevision)) {
        throw fail('NATIVE_EMAIL_REGISTRATION_INPUT_INVALID');
      }
      const principal = await verifier.authenticate(request);
      let contact = current(request, principal, secondaryRequest, proof);
      const subject = verifier.resolveVerifiedProviderSubject(request, principal).providerSubject;
      let accountId, lookup, binding;
      if (native) {
        ({lookupNativeIdentityThroughOriginalCore: lookup} = await import('../lib/native-core-identity-lookup.ts'));
        binding = verifier.resolveVerifiedProviderBinding(request, principal);
        const mapped = await lookup(binding.providerKey, binding.providerSubject, binding);
        current(request, principal, secondaryRequest, proof);
        if (!mapped || mapped.account?.status !== 'active' || typeof mapped.account.account_id !== 'string') throw fail('NATIVE_EMAIL_REGISTRATION_ACCOUNT_REQUIRED');
        accountId = mapped.account.account_id;
      }
      const pool = native ? (await import('./native-personal-runtime-pool.ts')).getNativePersonalRuntimePool() : getCorePgPool();
      const client = await pool.connect();
      let transaction = false, committing = false, discardClient = false;
      const committed = async result => {
        committing = true; await client.query('commit'); transaction = false;
        current(request, principal, secondaryRequest, proof);
        if (native) {
          const mapped = await lookup(binding.providerKey, binding.providerSubject, binding);
          current(request, principal, secondaryRequest, proof);
          if (mapped?.account?.status !== 'active' || mapped.account.account_id !== accountId) throw fail('NATIVE_EMAIL_REGISTRATION_OUTCOME_UNKNOWN');
        }
        return result;
      };
      try {
        await client.query('begin'); transaction = true;
        if (native) {
          await client.query("set local lock_timeout='1500ms'; set local statement_timeout='5000ms'; set local crays.app_role='core_service'");
          // Contact registration has its own write context. The existing
          // personal-chat identity read/lock-only triggers remain unchanged.
          await client.query("select set_config('crays.native_contact_account',$1,true)",[accountId]);
        }
        const accountResult = await client.query(`
          select a.account_id, a.status, a.primary_contact, a.primary_contact_type,
                 a.primary_contact_revision::text as revision
          from crays_core.auth_identities i join crays_core.crays_accounts a on a.account_id=i.account_id
          where i.provider_key='auth0' and i.provider_subject=$1 and ($2::text is null or (a.account_id=$2 and i.verified=true))
          for update of a for key share of i
        `, [subject,accountId??null]);
        if (accountResult.rows.length !== 1 || !['active','review'].includes(accountResult.rows[0].status)) {
          throw fail('NATIVE_EMAIL_REGISTRATION_ACCOUNT_REQUIRED');
        }
        const account = accountResult.rows[0];
        const prior = await client.query(`select receipt_id,contact_revision::text,contact_address,
            provider_subject,provider_issuer,auth_identity_id,revoked_at from crays_core.account_email_verifications
            where account_id=$1 and idempotency_key=$2`, [account.account_id,idempotencyKey]);
        contact = current(request, principal, secondaryRequest, proof);
        if (prior.rows[0]) {
          const receipt = prior.rows[0];
          if (receipt.contact_address !== contact.email || receipt.provider_subject !== contact.providerSubject ||
              receipt.provider_issuer !== contact.issuer) throw fail('NATIVE_EMAIL_REGISTRATION_IDEMPOTENCY_CONFLICT');
          // A retry reports the original durable result. It never overwrites a
          // later contact change or pretends the old receipt is still current.
          const proofOwner=await client.query("select account_id from crays_core.auth_identities where identity_id=$1 and provider_key='auth0' and provider_subject=$2",[receipt.auth_identity_id,receipt.provider_subject]);
          const active = proofOwner.rows[0]?.account_id === account.account_id && receipt.contact_revision === account.revision && account.primary_contact_type === 'contact' &&
            account.primary_contact === receipt.contact_address && !receipt.revoked_at;
          current(request, principal, secondaryRequest, proof);
          return await committed(Object.freeze({receiptId:receipt.receipt_id,contactRevision:receipt.contact_revision,current:active,replayed:true}));
        }
        if (account.revision !== expectedContactRevision) throw fail('NATIVE_EMAIL_REGISTRATION_CONTACT_CHANGED');
        // Do not reassign an existing authentication identity. Unique constraint
        // admission also serializes concurrent links from different accounts.
        await client.query(`insert into crays_core.auth_identities(identity_id,account_id,method_type,
            provider_key,provider_subject,verified,last_used_at)
            values($1,$2,'contact','auth0',$3,true,now())
            on conflict(provider_key,provider_subject) do nothing`,
          ['auth_'+randomUUID(),account.account_id,contact.providerSubject]);
        const identity = await client.query(`select identity_id,account_id from crays_core.auth_identities
            where provider_key='auth0' and provider_subject=$1 for key share`, [contact.providerSubject]);
        if (identity.rows.length !== 1 || identity.rows[0].account_id !== account.account_id) {
          throw fail('NATIVE_EMAIL_REGISTRATION_IDENTITY_ALREADY_BOUND');
        }
        const updated = await client.query(`update crays_core.crays_accounts set primary_contact=$2,
            primary_contact_type='contact',updated_at=now() where account_id=$1
            returning primary_contact_revision::text as revision`,[account.account_id,contact.email]);
        const revision = updated.rows[0].revision;
        const receiptId = 'email_'+randomUUID();
        await client.query(`insert into crays_core.account_email_verifications(receipt_id,account_id,
            contact_revision,contact_address,auth_identity_id,provider_subject,provider_issuer,
            proof_method,proof_token_digest,idempotency_key,verified_at)
            values($1,$2,$3,$4,$5,$6,$7,'auth0-userinfo-verified-email',$8,$9,$10)`,
          [receiptId,account.account_id,revision,contact.email,identity.rows[0].identity_id,
            contact.providerSubject,contact.issuer,contact.tokenDigest,idempotencyKey,contact.verifiedAt]);
        await client.query(`insert into crays_core.audit_events(audit_id,actor_account_id,action,
            target_type,target_id,outcome,risk_level,metadata)
            values($1,$2,'identity.registration_email.verified','crays-account',$2,'changed','sensitive',$3::jsonb)`,
          ['audit_'+randomUUID(),account.account_id,JSON.stringify({receiptId,contactRevision:revision,privateKeysStored:false})]);
        current(request, principal, secondaryRequest, proof);
        return await committed(Object.freeze({receiptId,contactRevision:revision,current:true,replayed:false}));
      } catch (error) {
        if (transaction) await client.query('rollback').catch(()=>{discardClient=true;});
        if (committing) throw fail('NATIVE_EMAIL_REGISTRATION_OUTCOME_UNKNOWN');
        if (error?.code === '23505') throw fail('NATIVE_EMAIL_REGISTRATION_PROOF_OR_RECEIPT_CONFLICT');
        if (/^NATIVE_(EMAIL|AUTHENTICATION)_/.test(error?.message ?? '')) throw error;
        throw fail('NATIVE_EMAIL_REGISTRATION_UNAVAILABLE');
      } finally { client.release(discardClient || (committing && transaction)); }
    },
  });
}
