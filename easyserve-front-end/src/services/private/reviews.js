import { privateAPi } from ".";

export const reviewsApi = privateAPi.injectEndpoints({
  endpoints: (build) => ({
    getReviews: build.query({
      query: () => "/dashboard/tables/reviews/",
      providesTags: ["reviews"],
    }),
  }),
});

export const { useGetReviewsQuery } = reviewsApi;
