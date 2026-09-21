"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Clock, MessageSquare, Utensils, Star, Sparkles } from "lucide-react";
import ReviewModal from "./ReviewModal";
import { cn } from "@/lib/utils";

export default function TableCard({ table }) {
  const { number, status, customers, orderItems, orderTime, orderId } = table;
  const [openReview, setOpenReview] = useState(false);

  const minutesAgo =
    orderTime ? Math.floor((Date.now() - new Date(orderTime).getTime()) / 60000) : null;

  const STATUS_THEMES = {
    EMPTY: {
      card: "border-gray-200/80 bg-white",
      pill: "bg-gray-100 text-gray-700 border-gray-200",
      indicator: "bg-gray-400",
    },
    RESERVED: {
      card: "border-purple-200/80 bg-purple-50/20",
      pill: "bg-purple-100 text-purple-800 border-purple-200",
      indicator: "bg-purple-500",
    },
    OCCUPIED: {
      card: "border-yellow-300/80 bg-yellow-50/30",
      pill: "bg-yellow-100 text-yellow-900 border-yellow-300",
      indicator: "bg-yellow-500",
    },
    ORDER_PLACED: {
      card: "border-amber-300/80 bg-amber-50/30",
      pill: "bg-amber-100 text-amber-900 border-amber-300",
      indicator: "bg-amber-500",
    },
    PREPARING: {
      card: "border-blue-200/80 bg-blue-50/20",
      pill: "bg-blue-100 text-blue-800 border-blue-200",
      indicator: "bg-blue-500",
    },
    READY: {
      card: "border-emerald-200/80 bg-emerald-50/20",
      pill: "bg-emerald-100 text-emerald-900 border-emerald-300",
      indicator: "bg-emerald-500",
    },
    SERVED: {
      card: "border-green-300/80 bg-green-50/30",
      pill: "bg-green-100 text-green-900 border-green-300",
      indicator: "bg-green-500",
    },
    PAYMENT_PENDING: {
      card: "border-orange-200/80 bg-orange-50/20",
      pill: "bg-orange-100 text-orange-900 border-orange-200",
      indicator: "bg-orange-500",
    },
    CLEANING: {
      card: "border-slate-200/80 bg-slate-50/40",
      pill: "bg-slate-100 text-slate-800 border-slate-200",
      indicator: "bg-slate-400",
    },
    UNAVAILABLE: {
      card: "border-red-200/80 bg-red-50/20",
      pill: "bg-red-100 text-red-800 border-red-200",
      indicator: "bg-red-500",
    },
  };

  const theme = STATUS_THEMES[status] || STATUS_THEMES.EMPTY;

  let finalStatus = (status || "EMPTY").replace(/_/g, " ");
  if (finalStatus === "PAYMENT PENDING") {
    finalStatus = "PAY PENDING";
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "smooth-card rounded-3xl border shadow-sm p-5 flex flex-col justify-between gap-4 transition-all relative overflow-hidden bg-white",
          theme.card
        )}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", theme.indicator)} />
              <h3 className="text-lg font-black text-green-950 tracking-tight">
                Table #{number}
              </h3>
            </div>
            <span
              className={cn(
                "px-2.5 py-0.5 text-[11px] font-bold rounded-full border capitalize",
                theme.pill
              )}
            >
              {finalStatus}
            </span>
          </div>

          {/* Telemetry info */}
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-yellow-600" /> {customers || 0} Guests
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-yellow-600" />{" "}
              {minutesAgo === null ? "No orders" : `${minutesAgo}m ago`}
            </span>
          </div>

          {/* Active Orders List */}
          {(orderItems ?? []).length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3 text-xs space-y-1.5">
              <p className="font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <Utensils size={12} className="text-yellow-600" /> Current Order
              </p>
              <ul className="space-y-1 text-gray-600">
                {(orderItems ?? []).map((item, i) => (
                  <li key={i} className="flex justify-between items-center">
                    <span className="truncate pr-2 font-medium">{item.item_name}</span>
                    <span className="shrink-0 font-bold text-gray-900">
                      {item.quantity}x · Rs {item.price}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Review Box */}
          {table.review && (
            <div className="rounded-2xl border border-yellow-200/80 bg-yellow-50/50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-yellow-900">Guest Review</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "w-3 h-3",
                        star <= table.review.rate
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mt-1 line-clamp-2 italic">
                &ldquo;{table.review.comment || "Great experience!"}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        {!table.review && (
          <button
            onClick={() => setOpenReview(true)}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-green-950 text-yellow-400 shadow-md hover:bg-green-900 active:scale-[0.98] transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Add Table Feedback
          </button>
        )}
      </motion.div>

      <ReviewModal
        open={openReview}
        onClose={() => setOpenReview(false)}
        tableNumber={table.number}
        orderId={table.orderId}
        customerName={table.customer_name}
        review={table.review}
      />
    </>
  );
}
