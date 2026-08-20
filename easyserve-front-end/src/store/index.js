import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authSlice from './slices/authSlice';
import cartSlice from './slices/cartSlice';
import { serviceMiddlewares, serviceReducers } from '@/services';
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
  const store = configureStore({
    reducer: {
      auth: authSlice,
      cart: cartSlice,
      dineIn: dineInSlice,
      ...serviceReducers,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(serviceMiddlewares),
  });

  // Required for RTK Query's refetchOnFocus / refetchOnReconnect to work at
  // all. Without this call those options are silently inert — orders would
  // only ever update on the fixed polling interval, and never immediately
  // when a tab regains focus or the network reconnects (this was the root
  // cause of new orders not reliably appearing on the chef screen).
  setupListeners(store.dispatch);

  return store;
};
