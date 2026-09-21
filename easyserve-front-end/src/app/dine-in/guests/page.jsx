"use client";

import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import GuestSelector from "@/components/dineIn/GuestSelector";

export default function GuestPage() {
  const router = useRouter();
  const dineIn = useSelector((state) => state.dineIn);

  if (!dineIn.active) return null;

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xl sm:p-8"
      >
        <GuestSelector
          onContinue={() =>
            router.push(`/restaurant/${dineIn.restaurant.id}?mode=dine-in`)
          }
        />
      </motion.div>
    </div>
  );
}
