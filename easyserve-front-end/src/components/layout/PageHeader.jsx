"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

// The one page heading used across the staff panels: icon, title, one line
// of help text, an optional live badge and actions on the right.
export default function PageHeader({ icon: Icon, title, description, live, actions }) {
  return (
    <motion.div {...fadeUp} className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-950 text-amber-400 shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-zinc-900 sm:text-2xl">{title}</h1>
            {live && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {typeof live === "string" ? live : "Live"}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-zinc-500 sm:text-sm">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
