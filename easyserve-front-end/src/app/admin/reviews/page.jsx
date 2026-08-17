"use client";

import { motion } from "framer-motion";
import { Star, MessageSquare, RefreshCw } from "lucide-react";
import { useGetReviewsQuery } from "@/services/private/reviews";

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-zinc-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { data, isLoading, isFetching, isError, refetch } = useGetReviewsQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
  });

  const reviews = data?.results || data || [];

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">
            Customer Experience
          </p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-zinc-900">
            Customer Reviews
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Fresh feedback from completed restaurant orders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
          Failed to load reviews. Please refresh and try again.
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <MessageSquare className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-zinc-800">No reviews yet</h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Customer feedback will appear here automatically after a review is submitted.
          </p>
        </div>
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } },
          }}
        >
          {reviews.map((review) => (
            <motion.article
              key={review.id}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0 },
              }}
              className="flex min-h-44 flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-zinc-900">
                    Table #{review.table_number ?? "—"}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {review.customer_name || "Customer"}
                  </p>
                </div>
                <StarRating rating={Number(review.rate) || 0} />
              </div>

              <p className="mt-4 flex-1 text-sm leading-6 text-zinc-600">
                {review.comment || "No written comment."}
              </p>

              <p className="mt-4 border-t border-zinc-100 pt-3 text-[11px] font-medium text-zinc-400">
                {review.created_at
                  ? new Date(review.created_at).toLocaleString()
                  : "Recently submitted"}
              </p>
            </motion.article>
          ))}
        </motion.div>
      )}
    </div>
  );
}
