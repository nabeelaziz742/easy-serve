import { publicApi } from ".";

export const dineInApi = publicApi.injectEndpoints({
  endpoints: (builder) => ({
    validateTable: builder.mutation({
      query: ({ restaurant, table, key }) => ({
        url: "/restaurants/dine-in/validate/",
        method: "POST",
        body: {
          restaurant,
          table,
          key,
        },
      }),
    }),

    startDineInSession: builder.mutation({
      query: ({ restaurant, table, key, guests, name, phone, session_token }) => ({
        url: "/restaurants/dine-in/start-session/",
        method: "POST",
        body: {
          restaurant,
          table,
          key,
          guests,
          name,
          phone,
          ...(session_token ? { session_token } : {}),
        },
      }),
    }),
  }),
});

export const {
  useValidateTableMutation,
  useStartDineInSessionMutation,
} = dineInApi;
