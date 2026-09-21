"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import RoleGuard from "@/components/auth/RoleGuard";
import { ChefHat, Clock3, CookingPot, CheckCircle2, ReceiptText, Flame } from "lucide-react";
import { useGetChefOrdersQuery, useStartPreparingMutation, useMarkPreparedMutation } from "@/services/private/orders";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } }
};

const ChefOrderCard = ({ order, onStart, onReady }) => {
  const isPreparing = order.order_status === "Preparing";

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card className="relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <div className={`absolute left-0 top-0 h-1.5 w-full ${isPreparing ? "bg-amber-500" : "bg-green-800"}`} />
        <div>
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Badge variant="outline" className="mb-1 border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-bold text-zinc-700">
                🍽️ Table {order.table_number || "N/A"}
              </Badge>
              <h2 className="truncate text-base font-black tracking-tight text-zinc-900">
                Order #{order.id}
              </h2>
            </div>
            <Badge className={`shrink-0 px-2.5 py-0.5 text-[11px] font-bold ${
              isPreparing ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
            }`}>
              {order.order_status}
            </Badge>
          </div>
          <div className="border-t border-zinc-100 pt-3">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Items to Cook
            </h4>
            <div className="space-y-1.5">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-xs">
                  <span className="truncate pr-2 font-semibold text-zinc-800">{item.menu_item?.name}</span>
                  <span className="shrink-0 rounded-md bg-zinc-200/80 px-2 py-0.5 text-[10px] font-bold text-zinc-800">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          {order.order_status === "To Prepare" && (
            <button
              onClick={() => onStart(order.id)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2.5 text-xs font-bold text-zinc-950 shadow-xs transition hover:bg-amber-500 active:scale-[0.98]"
            >
              <Flame className="h-4 w-4" />
              Start Preparing
            </button>
          )}
          {order.order_status === "Preparing" && (
            <button
              onClick={() => onReady(order.id)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-950 px-3.5 py-2.5 text-xs font-bold text-amber-400 shadow-xs transition hover:bg-green-900 active:scale-[0.98]"
            >
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              Mark Ready
            </button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default function ChefPage() {
  const { data, isLoading } = useGetChefOrdersQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const [startPreparing] = useStartPreparingMutation();
  const [markPrepared] = useMarkPreparedMutation();

  const orders = data?.results || data || [];
  const preparingCount = orders.filter((order) => order.order_status === "Preparing").length;
  const readyCount = orders.filter((order) => order.order_status === "Prepared").length;

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
      <RoleGuard allowedRoles={["chef"]}>
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
          <Skeleton className="h-10 w-1/3 rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["chef"]}>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-2.5 text-3xl font-black tracking-tight text-zinc-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-950 text-amber-400 shadow-sm">
                <ChefHat className="h-6 w-6" />
              </span>
              Kitchen Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Manage food preparation workflow seamlessly in real time.</p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800 shadow-xs">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            Kitchen Live
          </div>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <Clock3 className="h-4 w-4 text-amber-500" /> Total Queue
            </p>
            <h2 className="mt-1 text-3xl font-black text-zinc-900">{orders.length}</h2>
          </Card>
          <Card className="rounded-2xl border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <CookingPot className="h-4 w-4 text-blue-600" /> Currently Cooking
            </p>
            <h2 className="mt-1 text-3xl font-black text-zinc-900">{preparingCount}</h2>
          </Card>
          <Card className="rounded-2xl border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Prepared
            </p>
            <h2 className="mt-1 text-3xl font-black text-zinc-900">{readyCount}</h2>
          </Card>
        </div>

        {/* Kitchen Queue */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-zinc-900">
            <ReceiptText className="h-5 w-5 text-amber-500" /> Kitchen Queue
          </h2>
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 py-12 text-center">
              <ChefHat className="mx-auto mb-2 h-10 w-10 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-500">No active kitchen orders right now.</p>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {orders.map((order) => (
                <ChefOrderCard key={order.id} order={order} onStart={handleStart} onReady={handleReady} />
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </RoleGuard>
  );
}

