"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, ChevronRight, Rocket, X } from "lucide-react";

const STORAGE_KEY = "easyserve_onboarding";

const STEPS = [
  { id: "settings", label: "Set tax and opening hours", hint: "Used on every bill", href: "/manager/settings" },
  { id: "menu", label: "Add your menu items", hint: "Dishes, prices and photos", href: "/manager/menu" },
  { id: "waiters", label: "Add waiters", hint: "They get their own login", href: "/manager/waiters/add" },
  { id: "chefs", label: "Add chefs", hint: "For the kitchen screen", href: "/manager/chefs/add" },
  { id: "qr", label: "Print table QR codes", hint: "Guests scan to order", href: "/table-qr.html", external: true },
  { id: "inventory", label: "Set up inventory", hint: "Track stock and wastage", href: "/manager/inventory" },
];

const read = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const write = (value) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
};

// First-run checklist for a new restaurant. Steps tick off when opened and
// the whole card can be dismissed; progress is kept per browser.
export default function GettingStarted() {
  const [state, setState] = useState(null);

  useEffect(() => setState(read()), []);

  if (!state || state.dismissed) return null;

  const done = state.done || {};
  const completed = STEPS.filter((step) => done[step.id]).length;
  if (completed === STEPS.length) return null;

  const update = (next) => {
    setState(next);
    write(next);
  };
  const markDone = (id) => update({ ...state, done: { ...done, [id]: true } });

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="saas-card overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600 ring-1 ring-yellow-200">
              <Rocket className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-black text-[#063B2E]">Get your restaurant ready</p>
              <p className="text-[11px] text-zinc-500">
                {completed} of {STEPS.length} done
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => update({ ...state, dismissed: true })}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Hide checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 bg-zinc-100">
          <motion.div
            className="h-full bg-yellow-400"
            initial={false}
            animate={{ width: `${(completed / STEPS.length) * 100}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
        <ul className="grid divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5">
          {STEPS.map((step) => {
            const isDone = !!done[step.id];
            const Tag = step.external ? "a" : Link;
            return (
              <li key={step.id}>
                <Tag
                  href={step.href}
                  {...(step.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  onClick={() => markDone(step.id)}
                  className="group flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-zinc-300" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-xs font-bold ${isDone ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
                      {step.label}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-500">{step.hint}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5" />
                </Tag>
              </li>
            );
          })}
        </ul>
      </motion.section>
    </AnimatePresence>
  );
}
