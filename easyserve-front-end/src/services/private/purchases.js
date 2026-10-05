import { privateAPi } from ".";

export const purchasesApi = privateAPi.injectEndpoints({
  endpoints: (builder) => ({
    getPurchasesSummary: builder.query({
      query: (params) => ({
        url: "/manager/purchases/summary/",
        method: "GET",
        params,
      }),
      providesTags: ["PurchasesSummary"],
    }),

    getPurchases: builder.query({
      query: (params) => ({
        url: "/manager/purchases/orders/",
        method: "GET",
        params,
      }),
      providesTags: ["Purchases"],
    }),

    getPurchaseDetail: builder.query({
      query: ({ id, params }) => ({
        url: `/manager/purchases/orders/${id}/`,
        method: "GET",
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: "Purchases", id }],
    }),

    createPurchase: builder.mutation({
      query: (body) => ({
        url: "/manager/purchases/orders/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Purchases", "PurchasesSummary", "Suppliers"],
    }),

    updatePurchase: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/manager/purchases/orders/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Purchases", "PurchasesSummary"],
    }),

    receivePurchase: builder.mutation({
      query: (id) => ({
        url: `/manager/purchases/orders/${id}/receive/`,
        method: "POST",
      }),
      invalidatesTags: [
        "Purchases",
        "PurchasesSummary",
        "Inventory",
        "InventorySummary",
        "InventoryMovements",
      ],
    }),

    cancelPurchase: builder.mutation({
      query: (id) => ({
        url: `/manager/purchases/orders/${id}/cancel/`,
        method: "POST",
      }),
      invalidatesTags: ["Purchases", "PurchasesSummary"],
    }),

    deletePurchase: builder.mutation({
      query: (id) => ({
        url: `/manager/purchases/orders/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Purchases", "PurchasesSummary"],
    }),

    getSuppliers: builder.query({
      query: (params) => ({
        url: "/manager/purchases/suppliers/",
        method: "GET",
        params,
      }),
      providesTags: ["Suppliers"],
    }),

    getSupplierDetail: builder.query({
      query: ({ id, params }) => ({
        url: `/manager/purchases/suppliers/${id}/`,
        method: "GET",
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: "Suppliers", id }],
    }),

    addSupplier: builder.mutation({
      query: (body) => ({
        url: "/manager/purchases/suppliers/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Suppliers", "PurchasesSummary"],
    }),

    updateSupplier: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/manager/purchases/suppliers/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Suppliers", "PurchasesSummary", "Purchases"],
    }),

    deleteSupplier: builder.mutation({
      query: (id) => ({
        url: `/manager/purchases/suppliers/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Suppliers", "PurchasesSummary", "Purchases"],
    }),
  }),
});

export const {
  useGetPurchasesSummaryQuery,
  useGetPurchasesQuery,
  useGetPurchaseDetailQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
  useReceivePurchaseMutation,
  useCancelPurchaseMutation,
  useDeletePurchaseMutation,
  useGetSuppliersQuery,
  useGetSupplierDetailQuery,
  useAddSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = purchasesApi;
