import { privateAPi } from ".";

export const menuItemsApi = privateAPi.injectEndpoints({
  endpoints: (builder) => ({
    getMenuItems: builder.query({
      query: (menuId) => ({
        url: "/owner-menu-items/",
        method: "GET",
        params: { menu_id: menuId },
      }),
      providesTags: ["MenuItems"],
    }),

    getMenus: builder.query({
      query: (restaurantId) => ({
        url: "/owner-menus/",
        method: "GET",
        params: { restaurant_id: restaurantId },
      }),
      providesTags: ["MenuItems"],
    }),

    addMenuItem: builder.mutation({
      query: ({ formData, menuId }) => {
        if (!formData.has("menu")) {
          formData.append("menu", String(menuId));
        }

        return {
          url: "/owner-menu-items/",
          method: "POST",
          params: { menu_id: menuId },
          body: formData,
        };
      },
      invalidatesTags: ["MenuItems"],
    }),

    updateMenuItem: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/owner-menu-items/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["MenuItems"],
    }),

    deleteMenuItem: builder.mutation({
      query: (id) => ({
        url: `/owner-menu-items/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["MenuItems"],
    }),
  }),
});

export const {
  useGetMenuItemsQuery,
  useGetMenusQuery,
  useAddMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
} = menuItemsApi;
