import API_URL from '@/utilities/apiConfig';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';


export const publicApi = createApi({
  reducerPath: 'publicApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL }),

  tagTypes: [
    "Restaurant",
    "getOrders",
    "Menu",
    "Item",
    "TopAISuggestions",
    "TopAIMenuItemSuggestions",
    "RecommendedAIMenuItemSuggestions",
  ],

  endpoints: () => ({}),
});
