"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorState({ error, reset, homeHref = "/", compact = false }) {
  return (
    <div className={`flex items-center justify-center px-4 ${compact ? "py-16" : "min-h-[70vh] py-16"}`}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="saas-card w-full max-w-md p-6 text-center shadow-md"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-black tracking-tight text-green-950">Something went wrong</h1>
        <p className="mt-1 text-sm text-zinc-500">
          This page could not load. Your data is safe. Try again, and if it keeps happening, refresh the page.
        </p>
        {error?.digest && <p className="mt-2 font-mono text-[11px] text-zinc-400">Ref: {error.digest}</p>}
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          {reset && (
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-950 px-4 py-2 text-sm font-bold text-yellow-400 transition-colors hover:bg-green-900"
            >
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
          )}
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Home className="h-4 w-4" /> Go to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
