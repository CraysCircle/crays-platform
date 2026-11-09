/** Current native Core transaction successor. Source-only selection does not admit a runtime host. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCorePersonResolver } from '../../../connections/personal-account/slack-installation-v1/core-person-v2.mjs';
import { createPersonPgContext } from '../../../connections/personal-account/slack-installation-v1/person-pg-context-v2.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const pending = status => Object.freeze({ status, runtimeStarted: false });
const assignmentPendingStatuses = new Set([
  'PENDING_CANONICAL_PERSON', 'PENDING_ASSIGNMENT_SCHEMA', 'PENDING_BASELINE_UPDATE_SCHEMA',
  'ACCOUNT_SCOPE_DENIED', 'ASSIGNMENT_REVIEW_REQUIRED',
]);
const materializationStatuses = new Set([
  'PENDING_CANONICAL_PERSON', 'PENDING_BASELINE_INTENT', 'ACCOUNT_SCOPE_DENIED',
  'PENDING_OWN_ACCOUNT', 'PENDING_ARTIFACT_ADMISSION', 'MATERIALIZATION_BUSY',
  'MATERIALIZATION_OUTCOME_UNCONFIRMED', 'MATERIALIZED_NOT_STARTED',
]);

/** Server composition only. Dependencies come from the trusted Auth0/Core host, never request data.
 * No account/person/role creation, provider login, credential copying, process or channel startup.
 * Actual host materialization remains a separate admitted dependency; null means explicitly pending.
 */
export function createAuthenticatedBaselineOrchestrator({
  getAuth0Session, getVerifiedSessionBinding, getClient, assignInTransaction, getMaterializer,
}) {
  for (const fn of [getAuth0Session, getVerifiedSessionBinding, getClient, assignInTransaction, getMaterializer]) {
    assert.equal(typeof fn, 'function', 'SERVER_HOST_BINDING_REQUIRED');
  }
  const resolvePerson = createCorePersonResolver({ getAuth0Session, getVerifiedSessionBinding, getClient });
  return async function ensureAuthenticatedBaseline(request) {
    const session = await getAuth0Session(request);
    await getVerifiedSessionBinding(request, session);
    const sub = session?.user?.sub;
    assert(typeof sub === 'string' && sub.length > 0 && sub.length <= 2048, 'AUTHENTICATED_SESSION_REQUIRED');
    let person;
    try { person = await resolvePerson(request); }
    catch (error) {
      if (error.message === 'CANONICAL_PERSON_REQUIRED') return pending('PENDING_CANONICAL_PERSON');
      throw error;
    }
    assert.equal(person.authSubjectSha256, digest(sub), 'AUTHENTICATED_SESSION_CHANGED');
    const current = async () => resolvePerson.assertResolvedPerson(person);
    await current();
    const account = Object.freeze({ accountId: person.accountId, providerKey: 'auth0', providerSubject: sub });
    // Current Core context owns native RLS, person locks and transaction; the existing command
    // retains its original assignment schema/proposal/immutability checks inside that transaction.
    const pg = await createPersonPgContext({ getClient, resolvePerson, person });
    const assignment = await pg.tx(true, client => assignInTransaction(client, account));
    await current();
    if (assignment.status !== 'BASELINE_INTENT_ASSIGNED') {
      assert(assignmentPendingStatuses.has(assignment.status), 'UNKNOWN_ASSIGNMENT_OUTCOME');
      return pending(assignment.status);
    }
    assert.equal(assignment.canonicalPersonId, person.canonicalPersonId, 'ASSIGNMENT_PERSON_CHANGED');
    assert.equal(assignment.runtimeReadinessVerified, false, 'ASSIGNMENT_IS_NOT_RUNTIME_AUTHORITY');
    assert.equal(assignment.ownAccountReadinessVerified, false, 'ASSIGNMENT_IS_NOT_ACCOUNT_AUTHORITY');
    const materialize = await getMaterializer(Object.freeze({ person, pg, verifiedProviderAccount: account }));
    await current();
    if (materialize === null) return Object.freeze({
      ...pending('PENDING_RUNTIME_HOST'), assignmentStatus: assignment.status,
      packageVersion: assignment.packageVersion,
    });
    assert.equal(typeof materialize, 'function', 'ADMITTED_MATERIALIZER_REQUIRED');
    const outcome = await materialize(account);
    // Materializer rechecks committed assignment and own native profile at its write boundaries.
    // Session/Core currentness is additionally required before this orchestration returns a result.
    try { await current(); }
    catch {
      // A private pointer may already have been committed. Do not return a stale success or
      // suggest that retrying a revoked identity is safe; reconcile the existing admission.
      return pending('MATERIALIZATION_OUTCOME_UNCONFIRMED');
    }
    assert(materializationStatuses.has(outcome?.status), 'UNKNOWN_MATERIALIZATION_OUTCOME');
    assert.equal(outcome.runtimeStarted, false, 'MATERIALIZER_MUST_NOT_START_RUNTIME');
    if (outcome.status !== 'MATERIALIZED_NOT_STARTED') return pending(outcome.status);
    assert.equal(outcome.accountId, person.accountId, 'MATERIALIZATION_ACCOUNT_CHANGED');
    assert.equal(outcome.canonicalPersonId, person.canonicalPersonId, 'MATERIALIZATION_PERSON_CHANGED');
    assert.equal(outcome.agentId, assignment.agentId, 'MATERIALIZATION_AGENT_CHANGED');
    assert.equal(outcome.packageVersion, assignment.packageVersion, 'MATERIALIZATION_VERSION_CHANGED');
    // Do not expose private filesystem paths, own-profile metadata or account-store observations.
    return Object.freeze({ status: outcome.status, assignmentStatus: assignment.status,
      packageVersion: outcome.packageVersion, admissionId: outcome.admissionId,
      toolCount: outcome.toolCount, skillCount: outcome.skillCount,
      idempotent: outcome.idempotent, runtimeStarted: false,
      nativeToolRegistryLoaded: false, userAcceptanceProven: false });
  };
}
