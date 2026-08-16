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

const variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const ChefOrderCard = ({ order, onStart, onReady }) => (
  <motion.div variants={variants} className="h-full">
    <Card className="flex h-full flex-col justify-between p-4 rounded-2xl border-zinc-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden bg-white dark:bg-zinc-950">
      <div className={`absolute top-0 left-0 h-1.5 w-full ${order.order_status === "Preparing" ? "bg-blue-500" : "bg-yellow-400"}`} />
      <div>
        <div className="flex justify-between items-start gap-2 mb-4">
          <div className="min-w-0">
            <Badge variant="outline" className="mb-2 text-xs font-bold">🍽️ Table {order.table_number || "N/A"}</Badge>
            <h2 className="text-xl font-black truncate text-zinc-900 dark:text-white">Order #{order.id}</h2>
          </div>
          <Badge className={`text-xs ${order.order_status === "Preparing" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>
            {order.order_status}
          </Badge>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Items to Cook</h4>
          <div className="space-y-1.5">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-900/50 px-2.5 py-2 rounded-lg">
                <span className="font-semibold truncate pr-2 text-zinc-800 dark:text-zinc-200">{item.menu_item?.name}</span>
                <span className="shrink-0 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-[11px] font-bold">x{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {order.order_status === "To Prepare" && (
          <button onClick={() => onStart(order.id)} className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
            <Flame className="w-4 h-4" />Start Preparing
          </button>
        )}
        {order.order_status === "Preparing" && (
          <button onClick={() => onReady(order.id)} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
            <CheckCircle2 className="w-4 h-4" />Mark Ready
          </button>
        )}
      </div>
    </Card>
  </motion.div>
);

export default function ChefPage() {
  const { data, isLoading } = useGetChefOrdersQuery(undefined, { pollingInterval: 5000 });
  const [startPreparing] = useStartPreparingMutation();
  const [markPrepared] = useMarkPreparedMutation();
  const orders = data?.results || data || [];

  const preparingCount = orders.filter((order) => order.order_status === "Preparing").length;
  const readyCount = orders.filter((order) => order.order_status === "Prepared").length;

  const handleStart = async (id) => {
    try { await startPreparing(id).unwrap(); toast.success("Cooking started! 🔥"); }
    catch (error) { toast.error(error?.data?.detail || "Failed to update order"); }
  };

  const handleReady = async (id) => {
    try { await markPrepared(id).unwrap(); toast.success("Order marked ready! ✅"); }
    catch (error) { toast.error(error?.data?.detail || "Failed to update order"); }
  };

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["chef"]}>
        <div className="container mx-auto py-10 px-4 space-y-8 max-w-7xl">
          <Skeleton className="h-12 w-1/3 rounded-xl" />
          <div className="grid md:grid-cols-3 gap-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
          <Skeleton className="h-[500px] rounded-2xl" />
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["chef"]}>
      <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold flex items-center gap-3 text-zinc-900 dark:text-white"><ChefHat className="h-10 w-10 text-orange-500" />Kitchen Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-lg font-medium">Manage food preparation workflow seamlessly.</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 border border-orange-200 dark:border-orange-500/20"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" /></span>Kitchen Live</div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 rounded-2xl shadow-sm"><p className="text-zinc-500 font-semibold flex items-center gap-2"><Clock3 className="h-5 w-5 text-yellow-500" />Queue</p><h2 className="text-4xl font-black mt-2">{orders.length}</h2></Card>
          <Card className="p-5 rounded-2xl shadow-sm"><p className="text-zinc-500 font-semibold flex items-center gap-2"><CookingPot className="h-5 w-5 text-blue-500" />Preparing</p><h2 className="text-4xl font-black mt-2">{preparingCount}</h2></Card>
          <Card className="p-5 rounded-2xl shadow-sm"><p className="text-zinc-500 font-semibold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" />Ready</p><h2 className="text-4xl font-black mt-2">{readyCount}</h2></Card>
        </div>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-zinc-900 dark:text-white"><ReceiptText className="h-6 w-6 text-orange-500" />Kitchen Queue</h2>
          {orders.length === 0 ? (
            <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed"><ChefHat className="h-14 w-14 mx-auto mb-3 text-zinc-400" /><p className="text-zinc-500 font-medium">No kitchen orders right now. The stove is cold!</p></div>
          ) : (
            <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
              {orders.map((order) => <ChefOrderCard key={order.id} order={order} onStart={handleStart} onReady={handleReady} />)}
            </motion.div>
          )}
        </section>
      </div>
    </RoleGuard>
  );
}
