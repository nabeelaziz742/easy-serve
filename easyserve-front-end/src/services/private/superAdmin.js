import { privateAPi } from ".";

export const superAdminApi = privateAPi.enhanceEndpoints({ addTagTypes: ["Restaurants"] }).injectEndpoints({
  endpoints: (build) => ({
    // Every restaurant with its manager login and table count.
    getRestaurants: build.query({
      query: () => "/superadmin/restaurants/",
      providesTags: ["Restaurants"],
    }),
    getRestaurant: build.query({
      query: (id) => `/superadmin/restaurants/${id}/`,
      providesTags: ["Restaurants"],
    }),
    // Edits details and the manager login; {is_active: false} disables the restaurant.
    updateRestaurant: build.mutation({
      query: ({ id, ...body }) => ({ url: `/superadmin/restaurants/${id}/`, method: "PATCH", body }),
      // A new name redraws the table QR codes.
      invalidatesTags: ["Restaurants", "tables"],
    }),
    // Multipart, so it is its own request after the JSON create/update.
    uploadRestaurantLogo: build.mutation({
      query: ({ id, logo }) => {
        const body = new FormData();
        body.append("logo", logo);
        return { url: `/superadmin/restaurants/${id}/`, method: "PATCH", body };
      },
      invalidatesTags: ["Restaurants"],
    }),
    // Creates the restaurant, its manager login and its tables (with QR codes).
    onboardRestaurant: build.mutation({
      query: (body) => ({ url: "/superadmin/restaurants/", method: "POST", body }),
      invalidatesTags: ["Restaurants", "tables"],
    }),
  }),
});

export const {
  useGetRestaurantsQuery,
  useGetRestaurantQuery,
  useUpdateRestaurantMutation,
  useOnboardRestaurantMutation,
  useUploadRestaurantLogoMutation,
} = superAdminApi;
