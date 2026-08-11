import { privateAPi } from ".";

export const tablesApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    getTables: build.query({
      query: () => "/dashboard/tables/",
      providesTags: ["tables"],
    }),
  }),
});

export const { useGetTablesQuery } = tablesApi;
