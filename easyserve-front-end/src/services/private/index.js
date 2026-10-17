import API_URL from '@/utilities/apiConfig';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  adoptSharedIfSameUser,
  getAccessToken,
  getRefreshToken,
} from '@/utilities/authStorage';

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    // Prefer this tab's persisted session, but fall back to the Redux auth
    // state so a private request is not sent anonymously when the token is
    // already available in the current session.
    const storedToken = getAccessToken();
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

  const currentToken = () => getAccessToken() || api.getState()?.auth?.token || null;
  const tokenUsed = currentToken();

  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (!mutex.isLocked() && currentToken() !== tokenUsed) {
      // This request was sent with a token that a concurrent refresh has
      // already replaced; retry with the new one instead of refreshing again.
      result = await baseQuery(args, api, extraOptions);
    } else if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        console.warn('⛔ Access token expired. Trying refresh...');

        const refresh = getRefreshToken();

        if (!refresh) {
          console.log('❌ No refresh token saved');
          // Same outcome as a rejected refresh token, so every caller (not
          // only RoleGuard's /me check) ends up logged out consistently.
          if (tokenUsed) api.dispatch({ type: 'auth/onLoggedOut' });
          return result;
        }

        const tryRefresh = (token) =>
          baseQuery(
            {
              url: '/user/token-refresh/',
              method: 'POST',
              body: { refresh: token },
            },
            api,
            extraOptions
          );

        let usedRefresh = refresh;
        let refreshResult = await tryRefresh(refresh);

        const isRejected = (res) =>
          res.error && (res.error.status === 401 || res.error.status === 403);

        // Another tab of the same user may already have rotated this refresh
        // token (rotation blacklists the old one); take over its newer one.
        if (isRejected(refreshResult)) {
          const shared = adoptSharedIfSameUser(refresh);
          if (shared?.refresh) {
            usedRefresh = shared.refresh;
            refreshResult = await tryRefresh(shared.refresh);
          }
        }

        if (refreshResult.data) {
          console.log('✔ Token refreshed');

          const newAccess = refreshResult.data.access;
          const newRefresh = refreshResult.data.refresh || usedRefresh;

          api.dispatch({
            type: 'auth/onTokenRefreshed',
            payload: {
              access: newAccess,
              refresh: newRefresh,
              previousRefresh: usedRefresh,
            },
          });

          // Retry the original query with the new token
          result = await baseQuery(args, api, extraOptions);
        } else if (isRejected(refreshResult)) {
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
