"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import ReservationBooking from "./ReservationBooking";

// "Make Reservation" popup over the page. Closes on Escape or a click outside.
export default function ReservationDialog({ restaurant, onClose }) {
  useEffect(() => {
    if (!restaurant) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [restaurant, onClose]);

  if (!restaurant) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Book a table at ${restaurant.name}`}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        onClick={(event) => event.stopPropagation()}
        className="flex w-full justify-center"
      >
        <ReservationBooking restaurant={restaurant} onClose={onClose} />
      </motion.div>
    </div>
  );
}
