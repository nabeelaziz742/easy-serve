"use client";

import { motion } from "framer-motion";

// Friendly placeholder for lists that have nothing to show yet.
export default function EmptyState({ icon: Icon, title, description, action, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white/70 px-6 py-10 text-center ${className}`}
    >
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 ring-1 ring-yellow-200/70">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-sm font-bold text-zinc-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
