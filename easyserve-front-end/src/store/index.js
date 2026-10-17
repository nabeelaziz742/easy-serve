import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authSlice, { onLoggedIn, onLoggedOut } from './slices/authSlice';
import cartSlice from './slices/cartSlice';
import { serviceMiddlewares, serviceReducers } from '@/services';
import { privateAPi } from '@/services/private';
import dineInSlice from "@/store/slices/dineInSlice";

// F-14: This used to be a single store instance created once at module
// scope and shared by every request. In Next.js, server-side modules are
// cached and reused across concurrent requests within the same server
// process, so a module-level store is effectively a cross-user singleton
// during SSR -- one user's cart/auth state could leak into another
// user's server-rendered response.
//
// Exporting a factory instead lets each request (server) / each app
// mount (browser) build its own isolated store. See:
// https://redux-toolkit.js.org/usage/nextjs
export const makeStore = () => {
  // Cached private API data belongs to the user who fetched it. Without this
  // reset, logging out and back in as another role in the same tab reused
  // the previous user's cached /user/me/ response: RoleGuard then saw the
  // old role and sent the new user to "/" (or to the old role's dashboard).
  const authListener = createListenerMiddleware();
  authListener.startListening({
    matcher: isAnyOf(onLoggedIn, onLoggedOut),
    effect: (_action, listenerApi) => {
      listenerApi.dispatch(privateAPi.util.resetApiState());
    },
  });

  const store = configureStore({
    reducer: {
      auth: authSlice,
      cart: cartSlice,
      dineIn: dineInSlice,
      ...serviceReducers,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().prepend(authListener.middleware).concat(serviceMiddlewares),
  });

  // Required for RTK Query's refetchOnFocus / refetchOnReconnect to work at
  // all. Without this call those options are silently inert — orders would
  // only ever update on the fixed polling interval, and never immediately
  // when a tab regains focus or the network reconnects (this was the root
  // cause of new orders not reliably appearing on the chef screen).
  setupListeners(store.dispatch);

  return store;
};
