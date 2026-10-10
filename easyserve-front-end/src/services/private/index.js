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

class SimpleMutex {
  constructor() {
    this._locked = false;
    this._waiters = [];
  }

  isLocked() {
    return this._locked;
  }

  acquire() {
    if (!this._locked) {
      this._locked = true;
      return Promise.resolve(this._release.bind(this));
    }
    return new Promise((resolve) => {
      this._waiters.push(resolve);
    }).then(() => this._release.bind(this));
  }

  _release() {
    if (this._waiters.length > 0) {
      const next = this._waiters.shift();
      next();
    } else {
      this._locked = false;
    }
  }

  async waitForUnlock() {
    if (!this._locked) return;
    await new Promise((resolve) => {
      const check = () => {
        if (!this._locked) {
          resolve();
        } else {
          setTimeout(check, 20);
        }
      };
      check();
    });
  }
}

const mutex = new SimpleMutex();

const baseQueryWithReauth = async (args, api, extraOptions) => {
  // Wait until any active refresh has completed
  await mutex.waitForUnlock();

  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
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

          const newAccess = refreshResult.data.access;
          const newRefresh = refreshResult.data.refresh || refresh;

          localStorage.setItem('token', newAccess);
          localStorage.setItem('refresh_token', newRefresh);

          api.dispatch({
            type: 'auth/onLoggedIn',
            payload: {
              access: newAccess,
              refresh: newRefresh,
              user_type: api.getState().auth.user?.user_type,
            },
          });

          // Retry the original query with the new token
          result = await baseQuery(args, api, extraOptions);
        } else if (
          refreshResult.error &&
          (refreshResult.error.status === 401 || refreshResult.error.status === 403)
        ) {
          console.log('❌ Refresh token rejected by server → logging out');
          api.dispatch({ type: 'auth/onLoggedOut' });
        } else {
          console.warn('⚠️ Refresh attempt failed (network/server issue), keeping session for retry');
        }
      } finally {
        release();
      }
    } else {
      // Another request is already refreshing the token. Wait for it to finish and retry.
      await mutex.waitForUnlock();
      result = await baseQuery(args, api, extraOptions);
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
    'Staff',
    'Inventory',
    'InventorySummary',
    'InventoryCategories',
    'InventoryUnits',
    'InventoryMovements',
    'InventoryWastage',
    'InventoryWastageSummary',
    'Purchases',
    'Suppliers',
    'PurchasesSummary',
    'Recipes',
    'RecipesSummary',
    'AvailableMenuItems',
    'Expenses',
    'ExpensesSummary',
    'ExpensesBreakdown',
    'ExpenseCategories',
    'FinancialOverview',
    'FinancialTrends',
    'FinancialBreakdown',
    'FinancialReconciliation',
    'FinancialProductPerformance',
    'FinancialReports',
    'CommandCenter',
  ],


  baseQuery: baseQueryWithReauth,

  endpoints: () => ({}),
});
