// Auth session persistence.
//
// The session used to live only in localStorage, which every tab of the
// same origin shares. Logging in as a Chef in one tab therefore silently
// replaced the Waiter's token/user in every other open tab; refreshing the
// Waiter tab then restored the Chef's role and RoleGuard bounced it to "/".
//
// Each tab now keeps its own copy in sessionStorage (survives F5, isolated
// per tab). localStorage still holds the most recent login so a newly
// opened tab starts signed in, but it never overrides a tab's own session.

const KEYS = {
  token: 'token',
  refresh: 'refresh_token',
  user: 'user',
};

// Set in sessionStorage when this tab logs out (or its session is rejected),
// so the tab does not silently adopt another tab's shared login afterwards.
const SIGNED_OUT_KEY = 'auth_signed_out';

const isBrowser = () => typeof window !== 'undefined';

const safeGet = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch (_) {
    return null;
  }
};

const safeSet = (storage, key, value) => {
  try {
    if (value === null || value === undefined) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  } catch (_) {
    // Storage can be unavailable (private mode, quota); the in-memory
    // Redux state still carries the session for this page load.
  }
};

const readFrom = (storage) => {
  const token = safeGet(storage, KEYS.token);
  if (!token) return null;

  let user = null;
  try {
    const userStr = safeGet(storage, KEYS.user);
    user = userStr ? JSON.parse(userStr) : null;
  } catch (_) {
    user = null;
  }

  return {
    token,
    refresh: safeGet(storage, KEYS.refresh),
    user,
  };
};

const writeTo = (storage, { token, refresh, user }) => {
  if (token !== undefined) safeSet(storage, KEYS.token, token);
  if (refresh !== undefined) safeSet(storage, KEYS.refresh, refresh);
  if (user !== undefined) {
    safeSet(storage, KEYS.user, user ? JSON.stringify(user) : null);
  }
};

const clearFrom = (storage) => {
  safeSet(storage, KEYS.token, null);
  safeSet(storage, KEYS.refresh, null);
  safeSet(storage, KEYS.user, null);
};

// Returns this tab's session, adopting the last shared login when the tab
// has none of its own yet (e.g. a freshly opened tab).
export const readSession = () => {
  if (!isBrowser()) return null;

  const own = readFrom(window.sessionStorage);
  if (own) return own;

  // A tab that logged out stays logged out until it logs in again.
  if (isSignedOut()) return null;

  const shared = readFrom(window.localStorage);
  if (shared) {
    writeTo(window.sessionStorage, shared);
    return shared;
  }

  return null;
};

// True after this tab logged out, until it logs in again.
export const isSignedOut = () =>
  isBrowser() && !!safeGet(window.sessionStorage, SIGNED_OUT_KEY);

export const getAccessToken = () => readSession()?.token || null;

export const getRefreshToken = () => readSession()?.refresh || null;

// A fresh login: becomes this tab's session and the default for new tabs.
export const saveLogin = ({ token, refresh, user }) => {
  if (!isBrowser()) return;
  safeSet(window.sessionStorage, SIGNED_OUT_KEY, null);
  writeTo(window.sessionStorage, { token, refresh, user });
  writeTo(window.localStorage, { token, refresh, user });
};

// A token refresh or profile update for this tab's session. The shared copy
// is only updated when it still belongs to this same session, so one tab
// never overwrites another user's login.
export const updateSession = ({ token, refresh, user }, previousRefresh) => {
  if (!isBrowser()) return;
  // A late refresh or /me response must not bring back a session this tab
  // has already logged out of.
  if (isSignedOut()) return;

  const ownRefresh = previousRefresh ?? safeGet(window.sessionStorage, KEYS.refresh);
  writeTo(window.sessionStorage, { token, refresh, user });

  if (ownRefresh && safeGet(window.localStorage, KEYS.refresh) === ownRefresh) {
    writeTo(window.localStorage, { token, refresh, user });
  }
};

// Another tab of the same user may have rotated the refresh token this tab
// adopted (rotation blacklists the old one). If the shared login is the same
// user with a newer token, take it over instead of logging out.
export const adoptSharedIfSameUser = (rejectedRefresh) => {
  if (!isBrowser()) return null;

  const own = readFrom(window.sessionStorage);
  const shared = readFrom(window.localStorage);
  if (!shared || !shared.refresh || shared.refresh === rejectedRefresh) return null;

  const ownId = own?.user?.email || own?.user?.id;
  const sharedId = shared.user?.email || shared.user?.id;
  if (!ownId || ownId !== sharedId) return null;

  writeTo(window.sessionStorage, shared);
  return shared;
};

// Logs this tab out. The shared copy is cleared only when it is this same
// session, so logging out of one role does not sign out another tab's user.
export const clearSession = () => {
  if (!isBrowser()) return;

  const ownRefresh = safeGet(window.sessionStorage, KEYS.refresh);
  const ownToken = safeGet(window.sessionStorage, KEYS.token);
  const sharedRefresh = safeGet(window.localStorage, KEYS.refresh);
  const sharedToken = safeGet(window.localStorage, KEYS.token);
  const alreadySignedOut = isSignedOut();

  // With no own copy the tab was running on the shared login (e.g. storage
  // writes failed), unless it had already logged out: then the shared login
  // belongs to another tab and must be left alone.
  if (
    (ownRefresh && ownRefresh === sharedRefresh) ||
    (ownToken && ownToken === sharedToken) ||
    (!ownToken && !ownRefresh && !alreadySignedOut)
  ) {
    clearFrom(window.localStorage);
  }
  clearFrom(window.sessionStorage);
  safeSet(window.sessionStorage, SIGNED_OUT_KEY, '1');
};

// Turns only this tab into a signed-out guest, leaving every other tab and
// the shared login alone. Used when a table QR code is opened in a browser
// where staff are signed in: the person ordering is a customer, not the
// manager whose login a new tab would otherwise adopt.
export const detachTabAsGuest = () => {
  if (!isBrowser()) return;
  clearFrom(window.sessionStorage);
  safeSet(window.sessionStorage, SIGNED_OUT_KEY, '1');
};