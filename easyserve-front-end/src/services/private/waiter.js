import { privateAPi } from ".";

const liveRefresh = (tag, interval = 3000) => ({
  async onCacheEntryAdded(_arg, { cacheDataLoaded, cacheEntryRemoved, dispatch }) {
    await cacheDataLoaded;
    const timer = setInterval(() => dispatch(privateAPi.util.invalidateTags([tag])), interval);
    await cacheEntryRemoved;
    clearInterval(timer);
  },
});

export const waiterApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    getWaiterDashboard: build.query({
      query: () => ({ url: "/dashboard/waiter/dashboard/", method: "GET" }),
      providesTags: ["WaiterDashboard"],
      ...liveRefresh("WaiterDashboard", 3000),
    }),
    getWaiterCashOrders: build.query({
      query: () => ({ url: "/restaurants/orders/waiter/cash/", method: "GET" }),
      providesTags: ["WaiterCashOrders"],
      ...liveRefresh("WaiterCashOrders", 3000),
    }),
    receiveCashPayment: build.mutation({
      query: (orderId) => ({ url: `/restaurants/orders/${orderId}/cash-receive/`, method: "POST" }),
      invalidatesTags: ["WaiterCashOrders", "WaiterDashboard", "ManagerCashOrders", "ManagerDashboard", "getOrders", "getOrder"],
    }),
    addReview: build.mutation({
      query: (data) => ({ url: "/dashboard/tables/review/", method: "POST", body: data }),
      invalidatesTags: ["WaiterDashboard"],
    }),
  }),
});

export const {
  useGetWaiterDashboardQuery,
  useGetWaiterCashOrdersQuery,
  useReceiveCashPaymentMutation,
  useAddReviewMutation,
} = waiterApi;
