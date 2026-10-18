"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import RoleGuard from "@/components/auth/RoleGuard";
import { ChefHat, Clock3, CookingPot, CheckCircle2, ReceiptText, Flame, Tv } from "lucide-react";
import { useGetChefOrdersQuery, useStartPreparingMutation, useMarkPreparedMutation } from "@/services/private/orders";
import { listVariants, itemVariants, fadeUp, hoverLift } from "@/lib/motion";
import PageHeader from "@/components/layout/PageHeader";
import SoundToggle from "@/components/layout/SoundToggle";
import useNewOrderAlert from "@/hooks/useNewOrderAlert";
import KitchenTvBoard from "@/components/chef/KitchenTvBoard";

const TV_MODE_KEY = "chef-tv-mode";

const ChefOrderCard = ({ order, onStart, onReady }) => {
  const isPreparing = order.order_status === "Preparing";

  return (
    <motion.div layout variants={itemVariants} exit="exit" whileHover={hoverLift} className="h-full">
      <div className="saas-card relative flex h-full flex-col overflow-hidden">
        <div className={`absolute inset-y-0 left-0 w-1 ${isPreparing ? "bg-amber-500" : "bg-green-800"}`} />
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3.5 py-2.5 pl-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-zinc-100 px-1.5 text-xs font-black text-zinc-800 tabular">
              T{order.table_number || "–"}
            </span>
            <p className="truncate text-sm font-bold text-zinc-900">Order #{order.id}</p>
          </div>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ${
            isPreparing ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"
          }`}>
            {order.order_status}
          </span>
        </div>
        <ul className="flex-1 divide-y divide-zinc-100 px-3.5 py-1 pl-4">
          {order.items?.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
              <span className="truncate font-medium text-zinc-700">{item.menu_item?.name}</span>
              <span className="shrink-0 font-bold text-zinc-900 tabular">×{item.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="px-3.5 pb-3 pl-4 pt-1">
          {order.order_status === "To Prepare" && (
            <button
              onClick={() => onStart(order.id)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-zinc-950 transition-colors hover:bg-amber-500 active:scale-[0.98]"
            >
              <Flame className="h-3.5 w-3.5" />
              Start Preparing
            </button>
          )}
          {order.order_status === "Preparing" && (
            <button
              onClick={() => onReady(order.id)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-950 px-3 py-2 text-xs font-bold text-amber-400 transition-colors hover:bg-green-900 active:scale-[0.98]"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
              Mark Ready
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const StatTile = ({ icon: Icon, label, value, tone }) => (
  <motion.div variants={itemVariants} className="saas-card flex items-center gap-3 px-4 py-3">
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
      <Icon className="h-4.5 w-4.5" />
    </span>
    <div className="min-w-0">
      <p className="saas-label">{label}</p>
      <p className="text-xl font-black leading-tight text-zinc-900 tabular">{value}</p>
    </div>
  </motion.div>
);

export default function ChefPage() {
  return (
    <RoleGuard allowedRoles={["chef"]}>
      <ChefContent />
    </RoleGuard>
  );
}

function ChefContent() {
  const { data, isLoading } = useGetChefOrdersQuery(undefined, {
    pollingInterval: 3000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true,
  });
  const [startPreparing] = useStartPreparingMutation();
  const [markPrepared] = useMarkPreparedMutation();

  const orders = data?.results || data || [];
  const preparingCount = orders.filter((order) => order.order_status === "Preparing").length;
  const readyCount = orders.filter((order) => order.order_status === "Prepared").length;
  const { soundOn, toggleSound } = useNewOrderAlert(orders);
  const [tvMode, setTvMode] = useState(false);

  // A kitchen TV reopens straight into the board after a reload.
  useEffect(() => {
    try {
      if (localStorage.getItem(TV_MODE_KEY) === "1") setTvMode(true);
    } catch {}
  }, []);

  const enterTv = () => {
    setTvMode(true);
    try { localStorage.setItem(TV_MODE_KEY, "1"); } catch {}
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const exitTv = useCallback(() => {
    setTvMode(false);
    try { localStorage.removeItem(TV_MODE_KEY); } catch {}
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  const handleStart = async (id) => {
    try {
      await startPreparing(id).unwrap();
      toast.success("Cooking started! 🔥");
    } catch (error) {
      toast.error(error?.data?.detail || "Failed to update order");
    }
  };

  const handleReady = async (id) => {
    try {
      await markPrepared(id).unwrap();
      toast.success("Order marked ready! ✅");
    } catch (error) {
      toast.error(error?.data?.detail || "Failed to update order");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-1/3 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (tvMode) {
    return (
      <KitchenTvBoard
        orders={orders}
        onStart={handleStart}
        onReady={handleReady}
        onExit={exitTv}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        icon={ChefHat}
        title="Kitchen Dashboard"
        description="Start cooking new orders and mark them ready for the waiter."
        live
        actions={
          <div className="flex items-center gap-2">
            <SoundToggle on={soundOn} onToggle={toggleSound} />
            <button
              onClick={enterTv}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
            >
              <Tv className="h-3.5 w-3.5" /> Kitchen TV
            </button>
          </div>
        }
      />

      {/* Status Counters */}
      <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={Clock3} label="Total Queue" value={orders.length} tone="bg-amber-50 text-amber-600" />
        <StatTile icon={CookingPot} label="Currently Cooking" value={preparingCount} tone="bg-blue-50 text-blue-600" />
        <StatTile icon={CheckCircle2} label="Prepared" value={readyCount} tone="bg-emerald-50 text-emerald-600" />
      </motion.div>

      {/* Kitchen Queue */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900">
            <ReceiptText className="h-4 w-4 text-amber-500" /> Kitchen Queue
          </h2>
          {orders.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600 tabular">{orders.length}</span>
          )}
        </div>
        {orders.length === 0 ? (
          <motion.div {...fadeUp} className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-200 bg-white/60 py-8 text-sm text-zinc-500">
            <ChefHat className="h-7 w-7 text-zinc-300" />
            No active kitchen orders right now.
          </motion.div>
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {orders.map((order) => (
                <ChefOrderCard key={order.id} order={order} onStart={handleStart} onReady={handleReady} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  );
}
