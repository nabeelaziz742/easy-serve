import { privateAPi } from ".";

export const waiterApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    getWaiterDashboard: build.query({
      query: () => ({
        url: "/dashboard/waiter/dashboard/",
        method: "GET",
      }),
      providesTags: ["WaiterDashboard"],
    }),

    addReview: build.mutation({
      query: (data) => ({
        url: "/dashboard/tables/review/",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["WaiterDashboard"],
    }),
  }),
});

export const { useGetWaiterDashboardQuery, useAddReviewMutation } = waiterApi;
