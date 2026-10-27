import { privateAPi } from ".";

export const superAdminApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    // Creates the restaurant, its manager login and its tables (with QR codes).
    onboardRestaurant: build.mutation({
      query: (body) => ({ url: "/superadmin/restaurants/", method: "POST", body }),
      invalidatesTags: ["tables"],
    }),
  }),
});

export const { useOnboardRestaurantMutation } = superAdminApi;
