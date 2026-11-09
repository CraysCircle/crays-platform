import './runtime-source-loader.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { proxy } = await import('../../src/proxy.ts');

// The controller must supply an empty credential environment. Browser errors
// below prove original middleware selection, not successful browser login.
assert.equal(process.env.AUTH0_DOMAIN, undefined);
assert.equal(process.env.AUTH0_ISSUER_BASE_URL, undefined);

for (const authorization of ['Bearer synthetic-not-a-credential', 'Basic invalid', '']) {
  test(`exact native GraphQL retains its own authority gate (${authorization || 'empty header'})`, async () => {
    const request = new Request('http://127.0.0.1/api/graphql', {
      method: 'POST', headers: { authorization, 'content-type': 'application/json' }, body: '{}',
    });
    const response = await proxy(request);
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(await request.text(), '{}');
  });
}

test('mixed cookie and Authorization remain for native handler rejection, never cookie fallback', async () => {
  const response = await proxy(new Request('http://127.0.0.1/api/graphql?unsupported=true', {
    headers: { authorization: 'Bearer synthetic-not-a-credential', cookie: 'synthetic=not-a-session' },
  }));
  assert.equal(response.headers.get('x-middleware-next'), '1');
  assert.equal(response.headers.get('set-cookie'), null);
});

for (const [path, authorization] of [
  ['/api/graphql', undefined], ['/api/graphql/', 'Bearer synthetic'],
  ['/api/graphql-sibling', 'Bearer synthetic'], ['/dashboard', 'Bearer synthetic'],
  ['/api/crays/workspace/session', 'Bearer synthetic'],
]) {
  test(`browser middleware still selected for ${path} / ${authorization ? 'Authorization' : 'no Authorization'}`, async () => {
    const headers = authorization ? { authorization } : {};
    await assert.rejects(proxy(new Request('http://127.0.0.1' + path, { headers })),
      error => error?.code === 'domain_resolution_error');
  });
}
