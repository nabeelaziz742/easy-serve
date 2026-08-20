/* eslint-disable no-param-reassign */

import { createSlice } from '@reduxjs/toolkit';


const initialState = () => ({
  isAuthenticated: false,
  user: null,
  token: null,
});

const authSlice = createSlice({
  name: 'auth',
  initialState: initialState(),
  reducers: {
    onAuthorized: (state, { payload }) => {
      state.isAuthenticated = true;
      state.user = payload;
      // Keep token in sync with localStorage on a reload-restore. Header.jsx
      // (and anywhere else that derives "logged in" from !!token rather
      // than isAuthenticated) would otherwise render as logged-out even
      // though the user was successfully re-authenticated.
      if (typeof window !== 'undefined') {
        state.token = localStorage.getItem('token') || state.token;
      }
    },

    onLoggedIn: (state, { payload }) => {
      state.token = payload.access;
      state.isAuthenticated = true;
      state.user = { user_type: payload.user_type };

      if (payload.access) {
        localStorage.setItem('token', payload.access);
      }
      if (payload.refresh) {
        localStorage.setItem('refresh_token', payload.refresh);
      }
    },

    onLoggedOut: state => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;

      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    },
  },
});

export default authSlice.reducer;

export const { onAuthorized, onLoggedIn, onLoggedOut } = authSlice.actions;
