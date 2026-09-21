"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Sparkles, MessageSquare, Send, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useAddReviewMutation } from "@/services/private/waiter";
import { toast } from "sonner";

export default function ReviewModal({
  open,
  onClose,
  tableNumber,
  orderId,
  customerName,
  review,
}) {
  const hasOrder = !!orderId;
  const isReadOnly = !!review || !hasOrder;

  const [name, setName] = useState(customerName || "");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [addReview, { isLoading }] = useAddReviewMutation();

  useEffect(() => {
    setName(customerName || "");
  }, [customerName]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rating) {
      toast.error("Please select a star rating (1-5).");
      return;
    }

    try {
      await addReview({
        order: orderId,
        rate: rating,
        comment: message,
        created_by: "waiter",
      }).unwrap();

      toast.success("Customer review logged successfully! ⭐");
      onClose();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to record review.");
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-gray-100 bg-green-950 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 rounded-full bg-white/10 p-1.5 text-gray-300 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-0.5 text-xs font-bold text-yellow-300 border border-yellow-400/30 mb-2">
              <Sparkles className="h-3 w-3" /> Table Feedback
            </span>
            <h2 className="text-xl font-black text-white">
              {hasOrder
                ? `Customer Feedback · Table #${tableNumber}`
                : `Table #${tableNumber} Feedback`}
            </h2>
            <p className="text-xs text-green-200 mt-0.5">
              Record customer satisfaction for order quality assurance.
            </p>
          </div>

          <div className="p-6">
            {!hasOrder && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No active order associated with Table #{tableNumber}. Review cannot be recorded without an active order.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={name || ""}
                  onChange={(e) => !isReadOnly && setName(e.target.value)}
                  readOnly={isReadOnly}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs text-gray-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/20"
                  placeholder="Customer name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Rating (1–5 Stars)
                </label>
                <div className="flex items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setRating(star)}
                      className="p-1 rounded-lg transition hover:scale-110 disabled:cursor-not-allowed"
                    >
                      <Star
                        className={`h-7 w-7 transition ${
                          star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        } ${isReadOnly ? "opacity-50" : ""}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Customer Comments
                </label>
                <textarea
                  value={message}
                  onChange={(e) => !isReadOnly && setMessage(e.target.value)}
                  readOnly={isReadOnly}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs text-gray-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/20 resize-none"
                  placeholder="How was the food, service, and dining ambiance?"
                />
              </div>

              <button
                type="submit"
                disabled={isReadOnly || isLoading}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-2xl bg-green-950 py-3 text-xs font-bold text-yellow-400 shadow-xl transition-all hover:bg-green-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={14} />
                {!hasOrder
                  ? "No Active Order"
                  : isReadOnly
                  ? "Review Already Submitted"
                  : isLoading
                  ? "Logging Review..."
                  : "Submit Table Review"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
