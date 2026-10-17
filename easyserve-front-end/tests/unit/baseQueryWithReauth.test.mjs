// Unit tests for access-token refresh in src/services/private/index.js,
// run through the real Redux store (makeStore) with a mocked fetch.
//   node --test --import ./tests/unit/register.mjs "tests/unit/*.test.mjs"
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { browser, resetBrowser, switchTab } from './browser-env.mjs';
import { makeStore } from '@/store';
import { privateAPi } from '@/services/private';
import { onLoggedIn, onSessionRestored } from '@/store/slices/authSlice';
import { readSession, saveLogin } from '@/utilities/authStorage';

const testApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    probe: build.query({ query: (n) => `/probe/${n}/` }),
  }),
});

const WAITER = { token: 'w-access', refresh: 'w-refresh', user: { email: 'waiter@x.test', user_type: 'waiter' } };
const CHEF = { token: 'c-access', refresh: 'c-refresh', user: { email: 'chef@x.test', user_type: 'chef' } };

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Fake backend: /token-refresh/ is answered by `onRefresh`, other URLs by
// `validTokens` (200 for a known access token, 401 otherwise).
let calls;
let backend;
const realFetch = globalThis.fetch;

const installFetch = () => {
  calls = [];
  globalThis.fetch = async (input) => {
    const req = input instanceof Request ? input : new Request(input);
    const auth = req.headers.get('Authorization');
    const path = new URL(req.url).pathname;
    const body = req.method === 'POST' ? await req.clone().json() : null;
    calls.push({ path, auth, body });
    if (path.endsWith('/user/token-refresh/')) return backend.onRefresh(body);
    const token = auth?.replace('Bearer ', '');
    return backend.validTokens.has(token) ? json(200, { ok: true, token }) : json(401, { detail: 'expired' });
  };
};

const refreshCalls = () => calls.filter((c) => c.path.endsWith('/user/token-refresh/'));

const startTab = (name) => {
  switchTab(name);
  const store = makeStore();
  store.dispatch(onSessionRestored(readSession()));
  return store;
};

const probe = (store, n = 1) => store.dispatch(testApi.endpoints.probe.initiate(n, { forceRefetch: true }));

beforeEach(() => {
  resetBrowser();
  installFetch();
  backend = {
    validTokens: new Set(),
    // simplejwt with ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION:
    // returns {access, refresh}; a used refresh token is rejected with 401.
    used: new Set(),
    onRefresh(body) {
      if (!body?.refresh || this.used.has(body.refresh) || body.refresh.startsWith('bad')) {
        return json(401, { detail: 'Token is blacklisted', code: 'token_not_valid' });
      }
      this.used.add(body.refresh);
      const access = `${body.refresh}-access-new`;
      this.validTokens.add(access);
      return json(200, { access, refresh: `${body.refresh}-r` });
    },
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('an expired access token is refreshed once and the request is retried with the new token', async () => {
  saveLogin(WAITER);
  const store = startTab('A');
  const result = await probe(store);

  assert.equal(result.data?.ok, true);
  assert.equal(refreshCalls().length, 1);
  assert.deepEqual(refreshCalls()[0].body, { refresh: 'w-refresh' });
  assert.deepEqual(calls.map((c) => c.path.replace('/api', '')), ['/probe/1/', '/user/token-refresh/', '/probe/1/']);
  assert.equal(calls[2].auth, 'Bearer w-refresh-access-new');
  // Redux and this tab's persisted session both hold the new pair.
  assert.equal(store.getState().auth.token, 'w-refresh-access-new');
  assert.equal(readSession().refresh, 'w-refresh-r');
  assert.equal(readSession().user.user_type, 'waiter');
});

test('concurrent 401s trigger a single refresh and every request is retried', async () => {
  saveLogin(WAITER);
  const store = startTab('A');
  const results = await Promise.all([probe(store, 1), probe(store, 2), probe(store, 3)]);

  assert.ok(results.every((r) => r.data?.ok));
  assert.equal(refreshCalls().length, 1);
});

test('a rejected refresh token logs the tab out once, with no retry loop', async () => {
  saveLogin({ ...WAITER, refresh: 'bad-refresh' });
  const store = startTab('A');
  const result = await probe(store);

  // Logging out resets the private API cache, so the request settles empty.
  assert.equal(result.data, undefined);
  assert.equal(refreshCalls().length, 1);
  assert.equal(calls.length, 2);
  assert.equal(store.getState().auth.isAuthenticated, false);
  assert.equal(readSession(), null);
});

test('a missing refresh token logs the tab out', async () => {
  saveLogin({ ...WAITER, refresh: null });
  const store = startTab('A');
  const result = await probe(store);

  assert.equal(result.data, undefined);
  assert.equal(refreshCalls().length, 0);
  assert.equal(store.getState().auth.isAuthenticated, false);
  assert.equal(readSession(), null);
});

test('a network or server failure during refresh keeps the session', async () => {
  saveLogin(WAITER);
  const store = startTab('A');
  backend.onRefresh = () => json(502, { detail: 'bad gateway' });
  const result = await probe(store);

  assert.equal(result.error?.status, 401);
  assert.equal(store.getState().auth.isAuthenticated, true);
  assert.equal(readSession().refresh, 'w-refresh');

  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  await probe(store);
  assert.equal(store.getState().auth.isAuthenticated, true);
  assert.equal(readSession().refresh, 'w-refresh');
});

test('a retry that is still unauthorized stops after one refresh (no loop)', async () => {
  saveLogin(WAITER);
  const store = startTab('A');
  backend.onRefresh = () => json(200, { access: 'still-invalid', refresh: 'w-refresh-r' });
  const result = await probe(store);

  assert.equal(result.error?.status, 401);
  assert.equal(refreshCalls().length, 1);
  assert.equal(calls.length, 3);
});

test("requests use this tab's token, never the newer shared login of another user", async () => {
  switchTab('A');
  saveLogin(WAITER);
  switchTab('B');
  saveLogin(CHEF);
  backend.validTokens.add('w-access').add('c-access');

  const storeA = startTab('A');
  await probe(storeA);
  assert.deepEqual(calls.map((c) => c.auth), ['Bearer w-access']);
});

test('a refresh token rotated by another tab of the same user is adopted instead of logging out', async () => {
  switchTab('A');
  saveLogin(WAITER);
  const storeC = startTab('C'); // new tab: inherits the waiter login
  const storeA = startTab('A');

  await probe(storeA); // tab A rotates w-refresh (now blacklisted)
  assert.equal(browser.localStorage.getItem('refresh_token'), 'w-refresh-r');

  switchTab('C');
  calls.length = 0;
  const result = await probe(storeC);
  assert.equal(result.data?.ok, true);
  assert.deepEqual(refreshCalls().map((c) => c.body.refresh), ['w-refresh', 'w-refresh-r']);
  assert.equal(storeC.getState().auth.isAuthenticated, true);
});

test("a rejected refresh never switches the tab to another user's shared login", async () => {
  switchTab('A');
  saveLogin({ ...WAITER, refresh: 'bad-refresh' });
  switchTab('B');
  saveLogin(CHEF);
  backend.validTokens.add('c-access');

  const storeA = startTab('A');
  await probe(storeA);
  assert.equal(storeA.getState().auth.isAuthenticated, false);
  assert.ok(refreshCalls().every((c) => c.body.refresh !== 'c-refresh'));

  // Later requests from tab A (and a reload of tab A) do not pick up the Chef.
  calls.length = 0;
  await probe(storeA);
  assert.deepEqual(calls.map((c) => c.auth), [null]);
  assert.equal(readSession(), null);

  switchTab('B');
  assert.equal(readSession().user.user_type, 'chef');
});

test('logging in again in the same tab replaces the session and clears the logged-out state', async () => {
  saveLogin(WAITER);
  const store = startTab('A');
  store.dispatch({ type: 'auth/onLoggedOut' });
  store.dispatch(onLoggedIn({ access: 'c-access', refresh: 'c-refresh', user_type: 'chef' }));
  backend.validTokens.add('c-access');

  await probe(store);
  assert.deepEqual(calls.map((c) => c.auth), ['Bearer c-access']);
  assert.equal(readSession().user.user_type, 'chef');
});
