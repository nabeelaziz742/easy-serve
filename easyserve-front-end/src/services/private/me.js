import { privateAPi } from ".";

export const usersApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query({
      query: () => "/user/me/",
      providesTags: ["User"],
    }),

    updateMe: build.mutation({
      query: (body) => ({
        url: "/user/me/",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["User"],
    }),

    getUserFiles: build.query({
      query: () => "/user/files/",
      providesTags: ["UserFiles"],
    }),

    uploadUserFile: build.mutation({
      query: (body) => ({
        url: "/user/files/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["UserFiles"],
    }),

    getUserLogs: build.query({
      query: () => "/user/logs/",
    }),
  }),
});

export const {
  useGetMeQuery,
  useUpdateMeMutation,
  useGetUserFilesQuery,
  useUploadUserFileMutation,
  useGetUserLogsQuery,
  useGetMyOrdersQuery,
} = usersApi;
