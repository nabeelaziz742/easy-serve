"use client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Star, Loader2 } from "lucide-react";

function StarRating({ rating }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={star <= rating ? "text-yellow-400 fill-yellow-400" : "text-zinc-300"}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const token = useSelector((state) => state.auth.token);
  const [data, setData] = useState({ average_rating: 0, total_reviews: 0, five_star_reviews: 0, reviews: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch("http://localhost:9000/api/ratings/restaurant-reviews/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchReviews();
  }, [token]);

  return (
    <div className="p-8">

      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-900">Reviews</h1>
        <p className="text-zinc-500 mt-1">Customer feedback and ratings</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
          <p className="text-4xl font-black text-yellow-400">{data.average_rating}</p>
          <p className="text-zinc-500 text-sm mt-1">Average Rating</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
          <p className="text-4xl font-black text-green-600">{data.total_reviews}</p>
          <p className="text-zinc-500 text-sm mt-1">Total Reviews</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
          <p className="text-4xl font-black text-indigo-600">{data.five_star_reviews}</p>
          <p className="text-zinc-500 text-sm mt-1">5 Star Reviews</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-zinc-400" size={28} />
        </div>
      ) : data.reviews.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 text-center text-zinc-400">
          No reviews yet.
        </div>
      ) : (
        <div className="space-y-4">
          {data.reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl border border-zinc-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-950 text-white flex items-center justify-center font-bold text-sm">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">{review.name}</p>
                    <p className="text-xs text-zinc-400">{review.date}</p>
                  </div>
                </div>
                <StarRating rating={review.rating} />
              </div>
              {review.review && <p className="text-zinc-600 mt-3 text-sm">{review.review}</p>}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}