import { privateAPi } from ".";

// Booking endpoints. Guests can book, look up and cancel without an
// account; a signed-in customer's token is sent along so the booking is
// linked to them.
export const reservationApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    getReservationSlots: build.query({
      query: ({ restaurantId, date, guests }) => ({
        url: `/restaurants/restaurants/${restaurantId}/reservation-slots/`,
        params: { date, guests },
      }),
      providesTags: ["Reservations"],
    }),

    createReservation: build.mutation({
      query: (payload) => ({
        url: "/restaurants/reservations/",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Reservations"],
    }),

    getMyReservations: build.query({
      query: () => "/restaurants/reservations/",
      providesTags: ["Reservations"],
    }),

    getReservationByCode: build.query({
      query: ({ code, phone }) => ({
        url: `/restaurants/reservations/code/${encodeURIComponent(code)}/`,
        params: { phone },
      }),
      providesTags: ["Reservations"],
    }),

    cancelReservation: build.mutation({
      query: ({ code, phone }) => ({
        url: `/restaurants/reservations/code/${encodeURIComponent(code)}/`,
        method: "POST",
        body: { phone },
      }),
      invalidatesTags: ["Reservations"],
    }),

    getManagerReservations: build.query({
      query: (tab) => ({ url: "/restaurants/manager/reservations/", params: { tab } }),
      providesTags: ["ManagerReservations"],
    }),

    reservationAction: build.mutation({
      query: ({ id, action, table }) => ({
        url: `/restaurants/manager/reservations/${id}/${action}/`,
        method: "POST",
        body: table ? { table } : {},
      }),
      invalidatesTags: ["ManagerReservations", "tables"],
    }),

    remindReservation: build.mutation({
      query: ({ id, manual }) => ({
        url: `/restaurants/manager/reservations/${id}/remind/`,
        method: "POST",
        body: manual ? { manual: true } : {},
      }),
      invalidatesTags: ["ManagerReservations"],
    }),
  }),
});

export const {
  useGetReservationSlotsQuery,
  useCreateReservationMutation,
  useGetMyReservationsQuery,
  useGetReservationByCodeQuery,
  useCancelReservationMutation,
  useGetManagerReservationsQuery,
  useReservationActionMutation,
  useRemindReservationMutation,
} = reservationApi;
