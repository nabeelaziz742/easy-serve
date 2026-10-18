"use client";

import { motion } from "framer-motion";

// The dark card used by the sign-in and password pages.
export default function AuthCard({ icon, title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-black px-5 py-16">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-green-400/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 text-black shadow-xl">
            {icon}
          </div>
          <h2 className="text-3xl font-extrabold text-white">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-gray-300">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="mt-8 text-center text-sm text-gray-300">{footer}</div>}
      </motion.div>
    </div>
  );
}

export const authInputClass =
  "h-12 rounded-2xl border-white/10 bg-white/10 pl-12 text-white placeholder:text-gray-400 focus:border-yellow-400 focus:ring-yellow-400/30";

export const authButtonClass =
  "w-full rounded-2xl bg-yellow-400 py-3 text-lg font-bold text-black shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70";
