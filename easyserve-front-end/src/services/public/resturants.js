import { publicApi } from ".";


export const restaurantsApi = publicApi.injectEndpoints({
  endpoints: (build) => ({
    getRestaurants: build.query({
      query: (params) => ({
        url: "/restaurants/restaurants/",
        method: "GET",
        params,
      }),
      providesTags: ["Restaurant"],
    }),
    
    getRestaurant: build.query({
      query: (id) => ({
        url: `/restaurants/restaurants/${id}/`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Restaurant", id }],
    }),

    getTopAISuggestions: build.query({
      query: () => ({
        url: "/restaurants/ai/restaurants/suggestions/top/",
        method: "GET",
      }),
      providesTags: ["TopAISuggestions"],
    }),

    getTopAIMenuItemSuggestions: build.query({
      query: () => ({
        url: "/recommend/menu-item/0/",
        method: "GET",
      }),
      providesTags: ["TopAIMenuItemSuggestions"],
    }),

    getAIRecommendedMenuItem: build.query({
      query: () => ({
        url: "/recommend/user-menu-item",
        method: "GET",
      }),
      providesTags: ["RecommendedAIMenuItemSuggestions"],
    }),

    getRestaurantMenus: build.query({
      query: (restaurant_id) => ({
        url: `/restaurants/restaurants/${restaurant_id}/menus/`,
        method: "GET",
      }),
      providesTags: (result, error, restaurant_id) => [{ type: "Menu", restaurant_id }],
    }),
    
    getMenu: build.query({
      query: ({ restaurant_id, id }) => ({
        url: `/restaurants/restaurants/${restaurant_id}/menus/${id}/`,
        method: "GET",
      }),
      providesTags: (result, error, { id }) => [{ type: "Menu", id }],
    }),
    
    getMenuItemDetail: build.query({
      query: ( itemId ) => ({
        url: `/restaurants/menu-items/${itemId}/`,
        method: "GET",
      }),
      providesTags: (result, error, { itemId }) => [{ type: "Item", itemId }],
    }),
  }),
});

export const { 
  useGetRestaurantsQuery, 
  useGetRestaurantQuery,
  useGetTopAISuggestionsQuery,
  useGetTopAIMenuItemSuggestionsQuery,
  useGetAIRecommendedMenuItemQuery,
  useGetRestaurantMenusQuery,
  useGetMenuItemDetailQuery,
  useGetMenuQuery 
} = restaurantsApi;
