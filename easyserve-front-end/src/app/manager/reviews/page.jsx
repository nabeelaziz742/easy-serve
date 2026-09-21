"use client";

import { motion } from "framer-motion";
import { Star, MessageSquare, RefreshCw } from "lucide-react";
import { useGetReviewsQuery } from "@/services/private/reviews";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-200"
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
    <div className="space-y-7 p-2 sm:p-4">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">
            Customer Experience
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-900">
            Customer Reviews
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Customer feedback and satisfaction ratings from completed restaurant orders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-50 active:scale-[0.98]"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-amber-600 ${isFetching ? "animate-spin" : ""}`} />
          Refresh Feedback
        </button>
      </div>

      {isError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
          Failed to load reviews. Please refresh and try again.
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center shadow-xs">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-800">No reviews yet</h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            New customer feedback will appear here automatically.
          </p>
        </div>
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          initial="hidden"
          animate="show"
          variants={containerVariants}
        >
          {reviews.map((review) => (
            <motion.article
              key={review.id}
              variants={itemVariants}
              whileHover={{ y: -2 }}
              className="flex min-h-[190px] flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:border-amber-200 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700">
                      Table #{review.table_number ?? "—"}
                    </span>
                    <p className="mt-1 text-sm font-bold text-zinc-900">{review.customer_name || "Guest Customer"}</p>
                  </div>
                  <StarRating rating={Number(review.rate) || 0} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 line-clamp-4">
                  "{review.comment || "No written comment provided."}"
                </p>
              </div>
              <p className="mt-4 border-t border-zinc-100 pt-3 text-[11px] font-medium text-zinc-400">
                {review.created_at ? new Date(review.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Recently submitted"}
              </p>
            </motion.article>
          ))}
        </motion.div>
      )}
    </div>
  );
}

