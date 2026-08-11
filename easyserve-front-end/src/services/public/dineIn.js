import { publicApi } from ".";


export const dineInApi = publicApi.injectEndpoints({
  endpoints: (builder) => ({
    validateTable: builder.mutation({
      query: ({ restaurant, table }) => ({
        url: "/restaurants/dine-in/validate/",
        method: "POST",
        body: {
          restaurant,
          table,
        },
      }),
    }),
  }),
});

export const {
  useValidateTableMutation,
} = dineInApi;
