import { createSlice } from '@reduxjs/toolkit';

const getInitialState = () => {
  if (typeof window === 'undefined') {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }

  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
      isAuthenticated: !!token,
      user: user,
      token: token || null,
    };
  } catch (_) {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    onAuthorized: (state, { payload }) => {
      state.isAuthenticated = true;
      state.user = payload ? { ...state.user, ...payload } : state.user;
      if (typeof window !== 'undefined') {
        state.token = localStorage.getItem('token') || state.token;
        if (state.user) {
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      }
    },

    onLoggedIn: (state, { payload }) => {
      state.token = payload.access;
      state.isAuthenticated = true;
      state.user = payload.user_type
        ? { user_type: payload.user_type }
        : state.user;

      if (typeof window !== 'undefined') {
        if (payload.access) {
          localStorage.setItem('token', payload.access);
        }
        if (payload.refresh) {
          localStorage.setItem('refresh_token', payload.refresh);
        }
        if (state.user) {
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      }
    },

    onLoggedOut: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    },
  },
});

export default authSlice.reducer;
export const { onAuthorized, onLoggedIn, onLoggedOut } = authSlice.actions;

