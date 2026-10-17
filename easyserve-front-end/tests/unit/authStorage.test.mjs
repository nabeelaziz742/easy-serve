// Unit tests for per-tab session persistence (src/utilities/authStorage.js).
//   node --test --import ./tests/unit/register.mjs "tests/unit/*.test.mjs"
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { browser, resetBrowser, switchTab } from './browser-env.mjs';
import {
  adoptSharedIfSameUser,
  clearSession,
  getAccessToken,
  readSession,
  saveLogin,
  updateSession,
} from '@/utilities/authStorage';

const WAITER = { token: 'w-access', refresh: 'w-refresh', user: { email: 'waiter@x.test', user_type: 'waiter' } };
const CHEF = { token: 'c-access', refresh: 'c-refresh', user: { email: 'chef@x.test', user_type: 'chef' } };

beforeEach(() => resetBrowser());

test('a tab keeps its own session across a reload (sessionStorage survives F5)', () => {
  saveLogin(WAITER);
  // A reload keeps the same sessionStorage; nothing else is carried over.
  assert.deepEqual(readSession(), WAITER);
});

test('Waiter in tab A and Chef in tab B stay isolated after a refresh of tab A', () => {
  switchTab('A');
  saveLogin(WAITER);
  switchTab('B');
  saveLogin(CHEF);

  switchTab('A');
  assert.equal(readSession().user.user_type, 'waiter');
  assert.equal(getAccessToken(), 'w-access');
  switchTab('B');
  assert.equal(readSession().user.user_type, 'chef');
});

test('a newly opened tab inherits the most recent login', () => {
  switchTab('A');
  saveLogin(WAITER);
  switchTab('B');
  saveLogin(CHEF);
  switchTab('C');
  assert.equal(readSession().user.user_type, 'chef');
});

test("logging out in tab A leaves tab B's different user signed in", () => {
  switchTab('A');
  saveLogin(WAITER);
  switchTab('B');
  saveLogin(CHEF);

  switchTab('A');
  clearSession();
  switchTab('B');
  assert.equal(readSession().user.user_type, 'chef');
  assert.equal(browser.localStorage.getItem('token'), 'c-access');
});

test('logging out of the shared login clears it for new tabs but not for other users', () => {
  switchTab('A');
  saveLogin(WAITER);
  switchTab('B');
  saveLogin(CHEF);

  clearSession(); // tab B, which owns the shared copy
  assert.equal(browser.localStorage.getItem('token'), null);
  switchTab('A');
  assert.equal(readSession().user.user_type, 'waiter');
});

test("a logged-out tab does not adopt another tab's login, even after F5", () => {
  switchTab('A');
  saveLogin(WAITER);
  switchTab('B');
  saveLogin(CHEF);

  switchTab('A');
  clearSession();
  assert.equal(readSession(), null);
  assert.equal(getAccessToken(), null);
  // F5 keeps sessionStorage, so the tab must still be logged out.
  assert.equal(readSession(), null);

  // Logging in again in this tab works normally.
  saveLogin(WAITER);
  assert.equal(readSession().user.user_type, 'waiter');
});

test('a late token refresh does not bring back a logged-out session', () => {
  saveLogin(WAITER);
  clearSession();
  updateSession({ token: 'late-access', refresh: 'late-refresh' }, 'w-refresh');
  assert.equal(readSession(), null);
  assert.equal(browser.localStorage.getItem('token'), null);
});

test("a token refresh updates the shared copy only when it is this tab's session", () => {
  switchTab('A');
  saveLogin(WAITER);
  switchTab('B');
  saveLogin(CHEF);

  switchTab('A');
  updateSession({ token: 'w-access-2', refresh: 'w-refresh-2' }, 'w-refresh');
  assert.equal(readSession().token, 'w-access-2');
  assert.equal(browser.localStorage.getItem('token'), 'c-access');

  switchTab('B');
  updateSession({ token: 'c-access-2', refresh: 'c-refresh-2' }, 'c-refresh');
  assert.equal(browser.localStorage.getItem('refresh_token'), 'c-refresh-2');
});

test('adoptSharedIfSameUser takes over a newer token of the same user only', () => {
  switchTab('A');
  saveLogin(WAITER);
  switchTab('C'); // inherits the waiter login
  readSession();
  switchTab('A');
  updateSession({ token: 'w-access-2', refresh: 'w-refresh-2' }, 'w-refresh');

  switchTab('C');
  const adopted = adoptSharedIfSameUser('w-refresh');
  assert.equal(adopted.refresh, 'w-refresh-2');
  assert.equal(readSession().refresh, 'w-refresh-2');

  switchTab('B');
  saveLogin(CHEF);
  switchTab('C');
  assert.equal(adoptSharedIfSameUser('w-refresh-2'), null);
  assert.equal(readSession().user.user_type, 'waiter');
});
