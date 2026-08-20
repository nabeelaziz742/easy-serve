import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authSlice from './slices/authSlice';
import cartSlice from './slices/cartSlice';
import { serviceMiddlewares, serviceReducers } from '@/services';
import dineInSlice from "@/store/slices/dineInSlice";

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

export default store;
