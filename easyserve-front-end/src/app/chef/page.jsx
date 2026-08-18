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

const variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

const ChefOrderCard = ({ order, onStart, onReady }) => (
  <motion.div variants={variants} className="h-full">
    <Card className="relative flex h-full min-h-[250px] flex-col justify-between overflow-hidden rounded-xl bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-zinc-950">
      <div className={`absolute left-0 top-0 h-1 w-full ${order.order_status === "Preparing" ? "bg-blue-500" : "bg-yellow-400"}`} />
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0"><Badge variant="outline" className="mb-1 px-2 py-0.5 text-[10px] font-bold">🍽️ Table {order.table_number || "N/A"}</Badge><h2 className="truncate text-base font-extrabold text-zinc-900 dark:text-white">Order #{order.id}</h2></div>
          <Badge className={`shrink-0 px-2 py-0.5 text-[10px] ${order.order_status === "Preparing" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>{order.order_status}</Badge>
        </div>
        <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
          <h4 className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Items to Cook</h4>
          <div className="space-y-1">{order.items?.map((item) => <div key={item.id} className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1.5 text-xs dark:bg-zinc-900/50"><span className="truncate pr-2 font-semibold text-zinc-800 dark:text-zinc-200">{item.menu_item?.name}</span><span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold dark:bg-zinc-700">x{item.quantity}</span></div>)}</div>
        </div>
      </div>
      <div className="mt-3">
        {order.order_status === "To Prepare" && <button onClick={() => onStart(order.id)} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-xs font-bold text-white hover:bg-blue-600"><Flame className="h-3.5 w-3.5" />Start Preparing</button>}
        {order.order_status === "Preparing" && <button onClick={() => onReady(order.id)} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-white hover:bg-green-600"><CheckCircle2 className="h-3.5 w-3.5" />Mark Ready</button>}
      </div>
    </Card>
  </motion.div>
);

export default function ChefPage() {
  const { data, isLoading } = useGetChefOrdersQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const [startPreparing] = useStartPreparingMutation();
  const [markPrepared] = useMarkPreparedMutation();
  const orders = data?.results || data || [];
  const preparingCount = orders.filter((order) => order.order_status === "Preparing").length;
  const readyCount = orders.filter((order) => order.order_status === "Prepared").length;
  const handleStart = async (id) => { try { await startPreparing(id).unwrap(); toast.success("Cooking started! 🔥"); } catch (error) { toast.error(error?.data?.detail || "Failed to update order"); } };
  const handleReady = async (id) => { try { await markPrepared(id).unwrap(); toast.success("Order marked ready! ✅"); } catch (error) { toast.error(error?.data?.detail || "Failed to update order"); } };

  if (isLoading) return <RoleGuard allowedRoles={["chef"]}><div className="mx-auto max-w-7xl space-y-6 px-4 py-8"><Skeleton className="h-10 w-1/3 rounded-xl" /><div className="grid grid-cols-3 gap-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><Skeleton className="h-80 rounded-xl" /></div></RoleGuard>;

  return (
    <RoleGuard allowedRoles={["chef"]}>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><h1 className="flex items-center gap-2 text-3xl font-extrabold text-zinc-900 dark:text-white"><ChefHat className="h-8 w-8 text-orange-500" />Kitchen Dashboard</h1><p className="mt-1 text-sm font-medium text-muted-foreground">Manage food preparation workflow seamlessly.</p></div><div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"><span className="h-2 w-2 rounded-full bg-orange-500" />Kitchen Live</div></div>
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-xl p-3 shadow-sm"><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><Clock3 className="h-4 w-4 text-yellow-500" />Queue</p><h2 className="mt-1 text-2xl font-black">{orders.length}</h2></Card>
          <Card className="rounded-xl p-3 shadow-sm"><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><CookingPot className="h-4 w-4 text-blue-500" />Preparing</p><h2 className="mt-1 text-2xl font-black">{preparingCount}</h2></Card>
          <Card className="rounded-xl p-3 shadow-sm"><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><CheckCircle2 className="h-4 w-4 text-green-500" />Ready</p><h2 className="mt-1 text-2xl font-black">{readyCount}</h2></Card>
        </div>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white"><ReceiptText className="h-5 w-5 text-orange-500" />Kitchen Queue</h2>
          {orders.length === 0 ? <div className="rounded-xl border border-dashed bg-zinc-50 py-12 text-center"><ChefHat className="mx-auto mb-2 h-10 w-10 text-zinc-400" /><p className="text-sm font-medium text-zinc-500">No kitchen orders right now.</p></div> : <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{orders.map((order) => <ChefOrderCard key={order.id} order={order} onStart={handleStart} onReady={handleReady} />)}</motion.div>}
        </section>
      </div>
    </RoleGuard>
  );
}
