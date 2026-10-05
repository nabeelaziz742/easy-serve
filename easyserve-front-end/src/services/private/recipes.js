import { privateAPi } from ".";

export const recipesApi = privateAPi.injectEndpoints({
  endpoints: (builder) => ({
    getRecipeSummary: builder.query({
      query: (params) => ({
        url: "/manager/recipes/summary/",
        method: "GET",
        params,
      }),
      providesTags: ["RecipesSummary"],
    }),

    getRecipes: builder.query({
      query: (params) => ({
        url: "/manager/recipes/",
        method: "GET",
        params,
      }),
      providesTags: ["Recipes"],
    }),

    getRecipeDetail: builder.query({
      query: ({ id, params }) => ({
        url: `/manager/recipes/${id}/`,
        method: "GET",
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: "Recipes", id }],
    }),

    getAvailableMenuItems: builder.query({
      query: (params) => ({
        url: "/manager/recipes/available-menu-items/",
        method: "GET",
        params,
      }),
      providesTags: ["AvailableMenuItems"],
    }),

    createRecipe: builder.mutation({
      query: (body) => ({
        url: "/manager/recipes/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Recipes", "RecipesSummary", "AvailableMenuItems", "MenuItems"],
    }),

    updateRecipe: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/manager/recipes/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Recipes", "RecipesSummary", "AvailableMenuItems"],
    }),

    deleteRecipe: builder.mutation({
      query: (id) => ({
        url: `/manager/recipes/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Recipes", "RecipesSummary", "AvailableMenuItems"],
    }),
  }),
});

export const {
  useGetRecipeSummaryQuery,
  useGetRecipesQuery,
  useGetRecipeDetailQuery,
  useGetAvailableMenuItemsQuery,
  useCreateRecipeMutation,
  useUpdateRecipeMutation,
  useDeleteRecipeMutation,
} = recipesApi;
