import { privateAPi } from '.';

export const usersApi = privateAPi.injectEndpoints({
  endpoints: build => ({
    getUser: build.query({
      query: params => ({
        url: '/user-profile/user-profile/',
        method: 'GET',
        params,
      }),
      providesTags: ['GetUser'],
    }),
    addUserProfileFiles: build.mutation({
      query: body => ({
        url: '/user-profile/patient-files/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['GetUserFiles'],
    }),
    getUserProfileFiles: build.query({
      query: params => ({
        url: '/user-profile/patient-files/',
        method: 'GET',
        params,
      }),
      providesTags: ['GetUserFiles'],
    }),
    getUserLogsHistory: build.query({
      query: params => ({
        url: '/user/log-history/',
        method: 'GET',
        params,
      }),
      providesTags: ['GetUser'],
    }),
    getUserById: build.query({
      query: slug => `/services/company/${slug}/`,
      providesTags: ['GetUserById'],
    }),

    addUser: build.mutation({
      query: body => ({
        url: '/user-profile/user-profile/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['GetUser'],
    }),

    addContact: build.mutation({
      query: body => ({
        url: '/user/contact-us/',
        method: 'POST',
        body,
      }),
    }),

    getStaff: build.query({
      query: ({ type = 'waiter' } = {}) => ({
        url: '/user/staff/',
        method: 'GET',
        params: { type },
      }),
      providesTags: ['Staff'],
    }),

    createStaff: build.mutation({
      query: body => ({
        url: '/user/staff/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Staff', 'ManagerDashboard'],
    }),

    updateStaff: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/user/staff/${id}/`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Staff'],
    }),

    deleteStaff: build.mutation({
      query: id => ({
        url: `/user/staff/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Staff', 'ManagerDashboard'],
    }),
  }),
});

export const {
  useGetUserQuery,
  useAddUserMutation,
  useGetUserByIdQuery,
  useAddContactMutation,
  useGetUserLogsHistoryQuery,
  useAddUserProfileFilesMutation,
  useGetUserProfileFilesQuery,
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} = usersApi;

