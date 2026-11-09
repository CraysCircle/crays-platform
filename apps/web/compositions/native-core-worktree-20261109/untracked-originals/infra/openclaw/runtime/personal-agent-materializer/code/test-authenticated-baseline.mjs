import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthenticatedBaselineOrchestrator } from './authenticated-baseline.mjs';

// Boundary-only synthetic host callbacks; not Core/SDK/deployment/channel qualification.
function fixture({ host = true, personPresent = true } = {}) {
  const request = Object.freeze({ body: { accountId: 'foreign-account', canonicalPersonId: 'foreign-person', path: '/foreign' } });
  const state = { sub: 'auth0|first', revoked: false, assignments: [], materializations: [], assignmentsPending: null };
  const sessions = new WeakMap();
  const row = { account_id: 'own-account', canonical_person_id: 'own-person', person_version: '1', account_status: 'active', lifecycle_state: 'active' };
  const bindings = {
    async getAuth0Session(r) {
      assert.equal(r, request);
      if (state.revoked) throw Error('AUTHENTICATED_SESSION_REQUIRED');
      const session = Object.freeze({ user: { sub: state.sub } });
      sessions.set(session, r); return session;
    },
    async getVerifiedSessionBinding(r, session) { assert.equal(sessions.get(session), r); return 'synthetic-original-session-binding'; },
    async getClient() { return { async query(sql, values) {
      if (sql.startsWith('select ')) {
        assert.deepEqual(values, ['auth0|first']);
        return { rows: personPresent ? [{ ...row }] : [] };
      }
      return { rows: [] };
    }, release() {} }; },
    async ensureAssignment(account) {
      state.assignments.push(account);
      return state.assignmentsPending ?? { status: 'BASELINE_INTENT_ASSIGNED', canonicalPersonId: row.canonical_person_id,
        agentId: 'own-agent', packageVersion: 'synthetic-version', runtimeReadinessVerified: false, ownAccountReadinessVerified: false };
    },
    async getMaterializer() { return host ? async account => {
      state.materializations.push(account);
      return { status: 'MATERIALIZED_NOT_STARTED', accountId: row.account_id, canonicalPersonId: row.canonical_person_id,
        agentId: 'own-agent', packageVersion: 'synthetic-version', admissionId: 'synthetic-admission',
        toolCount: 25, skillCount: 26, idempotent: state.materializations.length > 1, runtimeStarted: false,
        paths: { stateDir: '/must-not-escape' }, ownProfile: 'must-not-escape' };
    } : null; },
  };
  return { request, state, bindings, create: () => createAuthenticatedBaselineOrchestrator(bindings) };
}

test('only server-session/Core identity reaches assignment and materializer; private result fields do not escape', async () => {
  const f = fixture(), result = await f.create()(f.request);
  assert.deepEqual(f.state.assignments, [{ accountId: 'own-account', providerKey: 'auth0', providerSubject: 'auth0|first' }]);
  assert.deepEqual(f.state.materializations, f.state.assignments);
  assert.equal(result.status, 'MATERIALIZED_NOT_STARTED'); assert.equal(result.runtimeStarted, false);
  assert(!('paths' in result) && !('ownProfile' in result));
});

test('unadmitted host returns explicit pending after assignment without pretending to materialize', async () => {
  const f = fixture({ host: false }), result = await f.create()(f.request);
  assert.equal(result.status, 'PENDING_RUNTIME_HOST'); assert.equal(result.assignmentStatus, 'BASELINE_INTENT_ASSIGNED');
  assert.equal(f.state.materializations.length, 0);
});

test('no canonical person never assigns or asks the host to materialize', async () => {
  const f = fixture({ personPresent: false });
  f.bindings.getMaterializer = async () => { throw Error('UNEXPECTED_HOST_ACCESS'); };
  assert.equal((await f.create()(f.request)).status, 'PENDING_CANONICAL_PERSON');
  assert.equal(f.state.assignments.length, 0);
});

test('current session is rechecked after assignment and before host effects', async () => {
  const f = fixture(), original = f.bindings.ensureAssignment;
  f.bindings.ensureAssignment = async account => { const value = await original(account); f.state.revoked = true; return value; };
  await assert.rejects(f.create()(f.request), /AUTHENTICATED_SESSION_REQUIRED/);
  assert.equal(f.state.materializations.length, 0);
});

test('a changed Core person is rejected before materializer invocation', async () => {
  const f = fixture(), original = f.bindings.getMaterializer, getClient = f.bindings.getClient;
  let changed = false;
  f.bindings.getMaterializer = async () => { changed = true; return original(); };
  f.bindings.getClient = async () => { const c = await getClient(), query = c.query;
    c.query = async (sql, values) => { const result = await query(sql, values); if (changed && sql.startsWith('select ')) result.rows[0].person_version = '2'; return result; }; return c; };
  await assert.rejects(f.create()(f.request), /CORE_PERSON_CHANGED/);
  assert.equal(f.state.materializations.length, 0);
});

test('repeated calls retain the same derived account and preserve materializer idempotency result', async () => {
  const f = fixture(), run = f.create(), first = await run(f.request), second = await run(f.request);
  assert.equal(first.idempotent, false); assert.equal(second.idempotent, true);
  assert.deepEqual(f.state.materializations[0], f.state.materializations[1]);
  assert.equal(first.admissionId, second.admissionId);
});

test('unknown assignment and runtime-start claims cannot become success', async () => {
  const f = fixture(); f.state.assignmentsPending = { status: 'FAKE_SUCCESS' };
  await assert.rejects(f.create()(f.request), /UNKNOWN_ASSIGNMENT_OUTCOME/);
  const g = fixture(), original = g.bindings.getMaterializer;
  g.bindings.getMaterializer = async () => { const run = await original(); return async account => ({ ...await run(account), runtimeStarted: true }); };
  await assert.rejects(g.create()(g.request), /MATERIALIZER_MUST_NOT_START_RUNTIME/);
});


test('revocation after a materializer result returns unknown outcome without stale admission details', async () => {
  const f = fixture(), original = f.bindings.getMaterializer;
  f.bindings.getMaterializer = async () => { const run = await original(); return async account => {
    const result = await run(account); f.state.revoked = true; return result;
  }; };
  assert.deepEqual(await f.create()(f.request), { status: 'MATERIALIZATION_OUTCOME_UNCONFIRMED', runtimeStarted: false });
});
