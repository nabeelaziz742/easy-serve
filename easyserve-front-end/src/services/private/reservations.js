  import { privateAPi } from ".";


export const reservationApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({

    createReservation: build.mutation({
      query: (payload) => ({
        url: "/restaurants/reservations/",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Reservations"],
    }),

    getReservationById: build.query({
      query: (id) => `/restaurants/reservations/${id}/`,
    }),

    getMyReservations: build.query({
      query: () => ({
        url: `/restaurants/reservations/`,
        method: "GET",
      }),
      providesTags: ["Reservations"],
    }),
  })
});

export const {
  useCreateReservationMutation,
  useGetReservationByIdQuery,
    useGetMyReservationsQuery,
} = reservationApi;
