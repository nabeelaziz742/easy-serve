"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Coffee, Clock, MessageSquare } from "lucide-react";
import ReviewModal from "./ReviewModal";
import { cn } from "@/lib/utils";



export default function TableCard({ table }) {
  const { number, status, customers, orderItems, orderTime, orderId } = table;
  const [openReview, setOpenReview] = useState(false);

  const minutesAgo =
    orderTime ? Math.floor((Date.now() - new Date(orderTime).getTime()) / 60000) : null;


  const STATUS_COLORS = {
    EMPTY: "bg-gray-100 border-gray-300",
    RESERVED: "bg-purple-100 border-purple-300",
    OCCUPIED: "bg-yellow-100 border-yellow-300",
    ORDER_PLACED: "bg-orange-100 border-orange-300",
    PREPARING: "bg-blue-100 border-blue-300",
    READY: "bg-indigo-100 border-indigo-300",
    SERVED: "bg-green-100 border-green-300",
    PAYMENT_PENDING: "bg-amber-100 border-amber-300",
    CLEANING: "bg-slate-100 border-slate-300",
    UNAVAILABLE: "bg-red-100 border-red-300",
  };

  const BADGE_COLORS = {
    EMPTY: "bg-gray-200 text-gray-700",
    RESERVED: "bg-purple-200 text-purple-800",
    OCCUPIED: "bg-yellow-200 text-yellow-800",
    ORDER_PLACED: "bg-orange-200 text-orange-800",
    PREPARING: "bg-blue-200 text-blue-800",
    READY: "bg-indigo-200 text-indigo-800",
    SERVED: "bg-green-200 text-green-800",
    PAYMENT_PENDING: "bg-amber-200 text-amber-800",
    CLEANING: "bg-slate-200 text-slate-800",
    UNAVAILABLE: "bg-red-200 text-red-800",
  };

  const color = STATUS_COLORS[status] || "bg-gray-100 border-gray-300";

  let finalStatus = status.replace("_", " ")

  if (finalStatus === 'PAYMENT PENDING') {
    finalStatus = 'PAY PENDING'
  }

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={cn(
          "rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition relative",
          color
        )}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Table #{number}</h3>
          <span
            className={cn(
              "px-3 py-1 text-xs rounded-full font-medium capitalize",
              BADGE_COLORS[status] || "bg-gray-200 text-gray-700"
            )}
          >
            {finalStatus}
          </span>

        </div>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Users className="w-4 h-4" /> {customers || 0} Customers
          <Clock className="w-4 h-4 ml-2" /> {minutesAgo === null ? "No orders yet" : `${minutesAgo} mins ago`}
        </div>

        <div className="text-sm mt-2">
          <p className="font-medium text-gray-700">🍜 Order:</p>
          <ul className="list-disc ml-5 text-gray-600">
            {(orderItems ?? []).map((item, i) => (
              <li key={i}>
                {item.item_name} — {item.quantity}x — Rs {item.price}
                {item.comments && ` (${item.comments})`}
              </li>
            ))}
          </ul>
        </div>

        {table.review ? (
          <div className="mt-3 bg-white/70 p-3 rounded-xl border border-gray-300">
            <p className="text-sm font-semibold text-gray-800">Customer Review:</p>

            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map((star) => (
                <span
                  key={star}
                  className={cn(
                    "text-yellow-500 text-lg",
                    star <= table.review.rate ? "opacity-100" : "opacity-40"
                  )}
                >
                  ★
                </span>
              ))}
            </div>

            <p className="text-gray-600 text-sm mt-1">
              {table.review.comment || "No comment"}
            </p>
          </div>
        ) : (
          <button
            onClick={() => setOpenReview(true)}
            className={cn(
              "mt-auto flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-medium",
              "bg-yellow-500 hover:bg-yellow-600 text-white"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Add Customer Review
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
