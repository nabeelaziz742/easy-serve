import { privateAPi } from ".";

export const inventoryApi = privateAPi.injectEndpoints({
  endpoints: (builder) => ({
    getInventorySummary: builder.query({
      query: (params) => ({
        url: "/manager/inventory/summary/",
        method: "GET",
        params,
      }),
      providesTags: ["InventorySummary"],
    }),

    getInventoryItems: builder.query({
      query: (params) => ({
        url: "/manager/inventory/items/",
        method: "GET",
        params,
      }),
      providesTags: ["Inventory"],
    }),

    getInventoryItemDetail: builder.query({
      query: ({ id, params }) => ({
        url: `/manager/inventory/items/${id}/`,
        method: "GET",
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: "Inventory", id }],
    }),

    addInventoryItem: builder.mutation({
      query: (body) => ({
        url: "/manager/inventory/items/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory", "InventorySummary", "InventoryCategories"],
    }),

    updateInventoryItem: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/manager/inventory/items/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Inventory", "InventorySummary"],
    }),

    deleteInventoryItem: builder.mutation({
      query: (id) => ({
        url: `/manager/inventory/items/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Inventory", "InventorySummary", "InventoryCategories"],
    }),

    getInventoryCategories: builder.query({
      query: (params) => ({
        url: "/manager/inventory/categories/",
        method: "GET",
        params,
      }),
      providesTags: ["InventoryCategories"],
    }),

    addInventoryCategory: builder.mutation({
      query: (body) => ({
        url: "/manager/inventory/categories/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["InventoryCategories", "InventorySummary"],
    }),

    deleteInventoryCategory: builder.mutation({
      query: (id) => ({
        url: `/manager/inventory/categories/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["InventoryCategories", "InventorySummary"],
    }),

    getInventoryUnits: builder.query({
      query: (params) => ({
        url: "/manager/inventory/units/",
        method: "GET",
        params,
      }),
      providesTags: ["InventoryUnits"],
    }),

    addInventoryUnit: builder.mutation({
      query: (body) => ({
        url: "/manager/inventory/units/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["InventoryUnits"],
    }),

    getInventoryMovements: builder.query({
      query: (params) => ({
        url: "/manager/inventory/movements/",
        method: "GET",
        params,
      }),
      providesTags: ["InventoryMovements"],
    }),

    adjustInventoryStock: builder.mutation({
      query: (body) => ({
        url: "/manager/inventory/adjustments/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory", "InventorySummary", "InventoryMovements"],
    }),

    // Phase 4: Wastage endpoints
    getInventoryWastage: builder.query({
      query: (params) => ({
        url: "/manager/inventory/wastage/",
        method: "GET",
        params,
      }),
      providesTags: ["InventoryWastage"],
    }),

    getInventoryWastageSummary: builder.query({
      query: (params) => ({
        url: "/manager/inventory/wastage/summary/",
        method: "GET",
        params,
      }),
      providesTags: ["InventoryWastageSummary"],
    }),

    getInventoryWastageDetail: builder.query({
      query: ({ id, params }) => ({
        url: `/manager/inventory/wastage/${id}/`,
        method: "GET",
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: "InventoryWastage", id }],
    }),

    recordInventoryWastage: builder.mutation({
      query: (body) => ({
        url: "/manager/inventory/wastage/",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Inventory",
        "InventorySummary",
        "InventoryMovements",
        "InventoryWastage",
        "InventoryWastageSummary",
      ],
    }),

    // Phase 4: Physical Stock Count reconciliation
    submitPhysicalStockCount: builder.mutation({
      query: (body) => ({
        url: "/manager/inventory/stock-count/",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Inventory",
        "InventorySummary",
        "InventoryMovements",
        "InventoryWastageSummary",
      ],
    }),
  }),
});

export const {
  useGetInventorySummaryQuery,
  useGetInventoryItemsQuery,
  useGetInventoryItemDetailQuery,
  useAddInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useGetInventoryCategoriesQuery,
  useAddInventoryCategoryMutation,
  useDeleteInventoryCategoryMutation,
  useGetInventoryUnitsQuery,
  useAddInventoryUnitMutation,
  useGetInventoryMovementsQuery,
  useAdjustInventoryStockMutation,
  useGetInventoryWastageQuery,
  useGetInventoryWastageSummaryQuery,
  useGetInventoryWastageDetailQuery,
  useRecordInventoryWastageMutation,
  useSubmitPhysicalStockCountMutation,
} = inventoryApi;
