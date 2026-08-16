import { privateAPi } from ".";

export const orderApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query({ query: (params) => ({ url: "/restaurants/orders/", method: "GET", params }), providesTags: ["getOrders"] }),
    getOrder: build.query({ query: (id) => ({ url: `/restaurants/orders/${id}/`, method: "GET" }), providesTags: (result, error, id) => [{ type: "getOrder", id }] }),
    addOrder: build.mutation({ query: (body) => ({ url: "/restaurants/orders/checkout-order/", method: "POST", body }), invalidatesTags: ["getOrders"] }),
    payOrder: build.mutation({ query: ({ orderId, paymentMethod }) => ({ url: `/restaurants/orders/${orderId}/pay/`, method: "POST", body: { payment_method: paymentMethod || "cash" } }), invalidatesTags: ["getOrders", "getOrder"] }),
    requestCashPayment: build.mutation({ query: (orderId) => ({ url: `/restaurants/orders/${orderId}/cash-request/`, method: "POST" }), invalidatesTags: ["getOrders", "getOrder", "WaiterCashOrders", "ManagerCashOrders"] }),
    getWaiterCashOrders: build.query({ query: () => ({ url: "/restaurants/orders/waiter/cash/", method: "GET" }), providesTags: ["WaiterCashOrders"] }),
    receiveCashPayment: build.mutation({ query: (orderId) => ({ url: `/restaurants/orders/${orderId}/cash-receive/`, method: "POST" }), invalidatesTags: ["WaiterCashOrders", "ManagerCashOrders", "getOrders", "getOrder", "ManagerDashboard"] }),
    settleCashPayment: build.mutation({ query: (orderId) => ({ url: `/restaurants/orders/${orderId}/cash-settle/`, method: "POST" }), invalidatesTags: ["ManagerCashOrders", "getOrders", "getOrder", "ManagerDashboard"] }),
    getManagerCashOrders: build.query({ query: () => ({ url: "/restaurants/orders/manager/cash/", method: "GET" }), providesTags: ["ManagerCashOrders"] }),
    updateOrder: build.mutation({ query: (body) => ({ url: `/dashboard/orders/${body?.orderNumber}/`, method: "PATCH", body }), invalidatesTags: ["GetOrders", "getOrder"] }),
    getOrderStatus: build.query({ query: () => ({ url: "/dashboard/orders/status/", method: "GET" }), providesTags: ["OrderStatus"] }),
    patchOrderStatus: build.mutation({ query: ({ orderId, status }) => ({ url: `/dashboard/orders/${orderId}/status/`, method: "PATCH", body: { status } }), invalidatesTags: ["OrderStatus"] }),
    getPendingOrders: build.query({ query: () => ({ url: "/restaurants/orders/pending/", method: "GET" }), providesTags: ["PendingOrders"] }),
    getReadyOrders: build.query({ query: () => ({ url: "/restaurants/orders/ready/", method: "GET" }), providesTags: ["ReadyOrders"] }),
    acceptOrder: build.mutation({ query: (orderId) => ({ url: `/restaurants/orders/${orderId}/accept/`, method: "POST" }), invalidatesTags: ["PendingOrders", "getOrders", "ChefOrders"] }),
    assignChef: build.mutation({ query: ({ orderId, chefId }) => ({ url: `/restaurants/orders/${orderId}/assign-chef/`, method: "POST", body: { chef_id: chefId } }), invalidatesTags: ["PendingOrders", "getOrders", "ChefOrders"] }),
    getChefOrders: build.query({ query: () => ({ url: "/restaurants/orders/chef/", method: "GET" }), providesTags: ["ChefOrders"] }),
    startPreparing: build.mutation({ query: (orderId) => ({ url: `/restaurants/orders/${orderId}/start-preparing/`, method: "POST" }), invalidatesTags: ["ChefOrders"] }),
    markPrepared: build.mutation({ query: (orderId) => ({ url: `/restaurants/orders/${orderId}/mark-prepared/`, method: "POST" }), invalidatesTags: ["ChefOrders", "ReadyOrders"] }),
    markServed: build.mutation({ query: (orderId) => ({ url: `/restaurants/orders/${orderId}/mark-served/`, method: "POST" }), invalidatesTags: ["PendingOrders", "ReadyOrders", "ChefOrders", "getOrders"] }),
    getManagerDashboard: build.query({ query: () => ({ url: "/restaurants/manager/dashboard/", method: "GET" }), providesTags: ["ManagerDashboard"] }),
  }),
});

export const {
  useGetOrdersQuery, useGetOrderQuery, useAddOrderMutation, usePayOrderMutation,
  useRequestCashPaymentMutation, useGetWaiterCashOrdersQuery, useReceiveCashPaymentMutation,
  useSettleCashPaymentMutation, useGetManagerCashOrdersQuery, useUpdateOrderMutation,
  useGetOrderStatusQuery, usePatchOrderStatusMutation, useGetPendingOrdersQuery,
  useGetReadyOrdersQuery, useAcceptOrderMutation, useAssignChefMutation, useGetChefOrdersQuery,
  useStartPreparingMutation, useMarkPreparedMutation, useMarkServedMutation,
  useGetManagerDashboardQuery,
} = orderApi;
