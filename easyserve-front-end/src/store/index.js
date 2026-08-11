import { configureStore } from '@reduxjs/toolkit';
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

export default store;
