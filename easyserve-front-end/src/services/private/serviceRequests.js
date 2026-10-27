import { privateAPi } from ".";

// Guests call the waiter or ask for the bill from their table; waiters see
// and clear those requests. The guest's table session token is sent by the
// shared base query.
export const serviceRequestApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    getMyTableRequests: build.query({
      query: () => ({ url: "/restaurants/dine-in/service-requests/", method: "GET" }),
      providesTags: ["ServiceRequests"],
    }),
    createTableRequest: build.mutation({
      query: (kind) => ({ url: "/restaurants/dine-in/service-requests/", method: "POST", body: { kind } }),
      invalidatesTags: ["ServiceRequests"],
    }),
    getStaffTableRequests: build.query({
      query: () => ({ url: "/restaurants/service-requests/", method: "GET" }),
      providesTags: ["ServiceRequests"],
    }),
    resolveTableRequest: build.mutation({
      query: (id) => ({ url: `/restaurants/service-requests/${id}/resolve/`, method: "POST" }),
      invalidatesTags: ["ServiceRequests"],
    }),
  }),
});

export const {
  useGetMyTableRequestsQuery,
  useCreateTableRequestMutation,
  useGetStaffTableRequestsQuery,
  useResolveTableRequestMutation,
} = serviceRequestApi;
