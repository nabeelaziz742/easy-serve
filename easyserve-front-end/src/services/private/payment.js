import { privateAPi } from ".";

export const paymentApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    createPaymentIntent: build.mutation({
      query: (orderId) => ({
        url: "/payment/create-intent/",
        method: "POST",
        body: { order_id: orderId },
      }),
    }),

    confirmPayment: build.mutation({
      query: (orderId) => ({
        url: "/payment/confirm/",
        method: "POST",
        body: { order_id: orderId },
      }),
      invalidatesTags: ["getOrders"],
    }),
  }),
});

export const {
  useCreatePaymentIntentMutation,
  useConfirmPaymentMutation,
} = paymentApi;
