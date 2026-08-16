import { privateAPi } from ".";

export const waiterApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    getWaiterDashboard: build.query({
      query: () => ({ url: "/dashboard/waiter/dashboard/", method: "GET" }),
      providesTags: ["WaiterDashboard"],
    }),
    getWaiterCashOrders: build.query({
      query: () => ({ url: "/restaurants/orders/waiter/cash/", method: "GET" }),
      providesTags: ["WaiterCashOrders"],
    }),
    receiveCashPayment: build.mutation({
      query: (orderId) => ({ url: `/restaurants/orders/${orderId}/cash-receive/`, method: "POST" }),
      invalidatesTags: ["WaiterCashOrders", "WaiterDashboard", "getOrders", "getOrder"],
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
