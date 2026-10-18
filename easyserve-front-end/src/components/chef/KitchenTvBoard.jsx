"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChefHat, Flame, Minimize2, Volume2, VolumeX } from "lucide-react";

// Minutes since the order came in, so the kitchen sees what is running late.
function minutesSince(value, now) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 60000));
}

function ageTone(mins) {
  if (mins == null) return "bg-zinc-800 text-zinc-300";
  if (mins >= 20) return "bg-red-600 text-white animate-pulse";
  if (mins >= 10) return "bg-amber-400 text-zinc-950";
  return "bg-emerald-600 text-white";
}

const STATUS_STYLE = {
  "To Prepare": { bar: "bg-sky-400", label: "NEW", chip: "bg-sky-400/15 text-sky-300 ring-sky-400/40" },
  Preparing: { bar: "bg-amber-400", label: "COOKING", chip: "bg-amber-400/15 text-amber-300 ring-amber-400/40" },
  Prepared: { bar: "bg-emerald-500", label: "READY", chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40" },
};

const STATUS_ORDER = { "To Prepare": 0, Preparing: 1, Prepared: 2 };

function TvTicket({ order, now, onStart, onReady }) {
  const style = STATUS_STYLE[order.order_status] || STATUS_STYLE["To Prepare"];
  const placed = order.ordered_date || order.items?.[0]?.created_at;
  const mins = order.order_status === "Prepared" ? null : minutesSince(placed, now);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10"
    >
      <div className={`h-2 ${style.bar}`} />
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-black leading-none text-white tabular">
            {order.table_number ? `T${order.table_number}` : order.order_type}
          </span>
          <span className="text-lg font-semibold text-zinc-400 tabular">#{order.id}</span>
        </div>
        {mins != null ? (
          <span className={`rounded-xl px-3 py-1.5 text-2xl font-black tabular ${ageTone(mins)}`}>{mins}m</span>
        ) : (
          <span className={`rounded-xl px-3 py-1.5 text-lg font-black ring-1 ${style.chip}`}>{style.label}</span>
        )}
      </div>
      {mins != null && (
        <span className={`mx-5 mt-2 w-fit rounded-md px-2 py-0.5 text-sm font-bold tracking-wider ring-1 ${style.chip}`}>
          {style.label}
        </span>
      )}

      <ul className="flex-1 space-y-2 px-5 py-4">
        {order.items?.map((item) => (
          <li key={item.id}>
            <div className="flex items-start gap-3 text-2xl font-bold leading-tight text-zinc-50">
              <span className="min-w-[2.5ch] shrink-0 text-amber-300 tabular">{item.quantity}×</span>
              <span className="break-words">{item.menu_item?.name}</span>
            </div>
            {item.comments && (
              <p className="ml-[calc(2.5ch+0.75rem)] mt-0.5 text-lg font-semibold text-rose-300">“{item.comments}”</p>
            )}
          </li>
        ))}
      </ul>

      <div className="px-5 pb-5">
        {order.order_status === "To Prepare" && (
          <button
            onClick={() => onStart(order.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-4 text-2xl font-black text-zinc-950 transition hover:bg-amber-300 active:scale-[0.98]"
          >
            <Flame className="h-7 w-7" /> Start
          </button>
        )}
        {order.order_status === "Preparing" && (
          <button
            onClick={() => onReady(order.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-2xl font-black text-zinc-950 transition hover:bg-emerald-400 active:scale-[0.98]"
          >
            <CheckCircle2 className="h-7 w-7" /> Ready
          </button>
        )}
        {order.order_status === "Prepared" && (
          <p className="rounded-xl bg-emerald-500/10 py-4 text-center text-xl font-bold text-emerald-300">
            Waiting for waiter
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function KitchenTvBoard({ orders, onStart, onReady, onExit, soundOn, onToggleSound }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // Keep the kitchen TV from dimming or sleeping while the board is open.
  useEffect(() => {
    let lock = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
        if (cancelled) lock?.release();
      } catch {
        // Not supported or not allowed; the board still works.
      }
    };
    const onVisible = () => document.visibilityState === "visible" && request();
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onExit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const sorted = [...orders].sort((a, b) => {
    const s = (STATUS_ORDER[a.order_status] ?? 0) - (STATUS_ORDER[b.order_status] ?? 0);
    return s !== 0 ? s : a.id - b.id;
  });
  const count = (status) => orders.filter((o) => o.order_status === status).length;
  const clock = new Date(now).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-zinc-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <ChefHat className="h-9 w-9 text-amber-400" />
          <h1 className="text-3xl font-black tracking-tight">Kitchen</h1>
          <span className="ml-2 flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> LIVE
          </span>
        </div>
        <div className="flex items-center gap-6 text-xl font-bold tabular">
          <span className="text-sky-300">New {count("To Prepare")}</span>
          <span className="text-amber-300">Cooking {count("Preparing")}</span>
          <span className="text-emerald-300">Ready {count("Prepared")}</span>
          <span className="text-3xl font-black text-white">{clock}</span>
          <button
            onClick={onToggleSound}
            aria-label={soundOn ? "Mute new order sound" : "Turn on new order sound"}
            className="rounded-xl bg-white/10 p-2.5 text-white hover:bg-white/20"
          >
            {soundOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-base font-bold text-white hover:bg-white/20"
          >
            <Minimize2 className="h-5 w-5" /> Exit TV
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {sorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-zinc-500">
            <ChefHat className="h-24 w-24 text-zinc-700" />
            <p className="text-4xl font-bold">No orders right now</p>
            <p className="text-xl">New orders appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {sorted.map((order) => (
                <TvTicket key={order.id} order={order} now={now} onStart={onStart} onReady={onReady} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
