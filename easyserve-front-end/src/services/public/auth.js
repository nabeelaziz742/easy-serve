import { publicApi } from ".";

export const authApi = publicApi.injectEndpoints({
  endpoints: (build) => ({
    signUp: build.mutation({
      query: (body) => {
        const profile = {
          first_name: body?.firstName,
          last_name: body?.lastName,
        };

        const payload = {
          profile,
          username: body?.username,
          email: body?.email,
          password: body?.password,
        };

        console.log("REGISTER PAYLOAD =>", payload);

        return {
          url: "/user/register/",
          method: "POST",
          body: payload,
        };
      },
    }),

    login: build.mutation({
      query: (body) => ({
        url: "/user/login/",
        method: "POST",
        body,
      }),
    }),

    forgotPassword: build.mutation({
      query: (body) => ({
        url: "/user/forget-password/",
        method: "POST",
        body,
      }),
    }),

    verifyToken: build.mutation({
      query: (token) => ({
        url: `/user/account-activation/${token}`,
        method: "POST",
      }),
    }),

    resetPassword: build.mutation({
      query: (body) => ({
        url: `/user/reset-password/${body?.token}`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useSignUpMutation,
  useLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyTokenMutation,
} = authApi;