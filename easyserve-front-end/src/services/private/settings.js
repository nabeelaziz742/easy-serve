import { privateAPi } from ".";

export const settingsApi = privateAPi.injectEndpoints({
  endpoints: (builder) => ({
    getRestaurantSettings: builder.query({
      query: () => ({ url: "/restaurants/manager/settings/", method: "GET" }),
      providesTags: ["RestaurantSettings"],
    }),
    updateRestaurantSettings: builder.mutation({
      query: (body) => ({ url: "/restaurants/manager/settings/", method: "PATCH", body }),
      invalidatesTags: ["RestaurantSettings"],
    }),
    getOrderReceipt: builder.query({
      query: (orderId) => ({ url: `/restaurants/orders/${orderId}/receipt/`, method: "GET" }),
    }),
  }),
});

export const {
  useGetRestaurantSettingsQuery,
  useUpdateRestaurantSettingsMutation,
  useGetOrderReceiptQuery,
} = settingsApi;
