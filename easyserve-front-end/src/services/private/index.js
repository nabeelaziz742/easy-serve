import API_URL from '@/utilities/apiConfig';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    // Prefer persisted auth, but fall back to the Redux auth state so a
    // private request is not sent anonymously when the token is already
    // available in the current session.
    const storedToken =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const stateToken = getState()?.auth?.token;
    const token = storedToken || stateToken;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    console.warn('⛔ Access token expired. Trying refresh...');

    const refresh =
      typeof window !== 'undefined'
        ? localStorage.getItem('refresh_token')
        : null;

    if (!refresh) {
      console.log('❌ No refresh token saved');
      return result;
    }

    const refreshResult = await baseQuery(
      {
        url: '/user/token-refresh/',
        method: 'POST',
        body: { refresh },
      },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      console.log('✔ Token refreshed');

      localStorage.setItem('token', refreshResult.data.access);
      localStorage.setItem('refresh_token', refreshResult.data.refresh || refresh);

      api.dispatch({
        type: 'auth/onLoggedIn',
        payload: {
          access: refreshResult.data.access,
          refresh: refreshResult.data.refresh || refresh,
          user_type: api.getState().auth.user?.user_type,
        },
      });

      result = await baseQuery(args, api, extraOptions);
    } else {
      console.log('❌ Refresh token failed → logging out');
      api.dispatch({ type: 'auth/onLoggedOut' });
    }
  }

  return result;
};

export const privateAPi = createApi({
  reducerPath: 'privateAPi',

  tagTypes: [
    'GetAuthorizedUser',
    'OrderStatus',
    'WaiterDashboard',
    'WaiterCashOrders',
    'ManagerCashOrders',
    'reviews',
    'tables',
    'getOrders',
    'getOrder',
    'PendingOrders',
    'ReadyOrders',
    'ChefOrders',
    'TopAISuggestions',
    'User',
    'UserFiles',
    'MenuItems',
    'ManagerDashboard',
  ],

  baseQuery: baseQueryWithReauth,

  endpoints: () => ({}),
});
