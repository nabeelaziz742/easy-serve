import { createSlice } from '@reduxjs/toolkit';
import { clearSession, detachTabAsGuest, isSignedOut, readSession, saveLogin, updateSession } from '@/utilities/authStorage';

// The server render and the first client render must agree, so the
// persisted session is not read here. StateProvider restores it right after
// mount via onSessionRestored; until then `initialized` is false and route
// guards wait instead of treating the user as logged out.
const initialState = {
  initialized: false,
  isAuthenticated: false,
  user: null,
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    onSessionRestored: (state, { payload }) => {
      state.initialized = true;
      state.isAuthenticated = !!payload?.token;
      state.user = payload?.user || null;
      state.token = payload?.token || null;
    },

    onAuthorized: (state, { payload }) => {
      // A /me response that lands after this tab logged out is ignored.
      if (isSignedOut()) return;
      state.isAuthenticated = true;
      state.user = payload ? { ...state.user, ...payload } : state.user;
      if (typeof window !== 'undefined') {
        state.token = readSession()?.token || state.token;
        if (state.user) {
          updateSession({ user: state.user });
        }
      }
    },

    onLoggedIn: (state, { payload }) => {
      state.initialized = true;
      state.token = payload.access;
      state.isAuthenticated = true;
      state.user = payload.user_type
        ? { user_type: payload.user_type }
        : state.user;

      if (typeof window !== 'undefined') {
        saveLogin({
          token: payload.access || undefined,
          refresh: payload.refresh || undefined,
          user: state.user || undefined,
        });
      }
    },

    // Token refresh for the current tab's session. Unlike onLoggedIn it
    // keeps the full user profile and does not touch another tab's login.
    onTokenRefreshed: (state, { payload }) => {
      // A refresh that finishes after this tab logged out is ignored.
      if (isSignedOut()) return;
      state.token = payload.access;
      state.isAuthenticated = true;

      if (typeof window !== 'undefined') {
        updateSession(
          { token: payload.access, refresh: payload.refresh },
          payload.previousRefresh
        );
      }
    },

    // The table QR was opened in a tab that picked up a staff login: only
    // this tab becomes a signed-out guest, other tabs keep their logins.
    onBecameGuest: (state) => {
      state.initialized = true;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;

      if (typeof window !== 'undefined') {
        detachTabAsGuest();
      }
    },

    onLoggedOut: (state) => {
      state.initialized = true;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;

      if (typeof window !== 'undefined') {
        clearSession();
      }
    },
  },
});

export default authSlice.reducer;
export const { onSessionRestored, onAuthorized, onLoggedIn, onTokenRefreshed, onLoggedOut, onBecameGuest } = authSlice.actions;