"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import RoleGuard from "@/components/auth/RoleGuard";

import {
  ChefHat,
  Clock3,
  CookingPot,
  CheckCircle2,
  ReceiptText,
  Flame,
} from "lucide-react";

import {
  useGetChefOrdersQuery,
  useStartPreparingMutation,
  useMarkPreparedMutation,
} from "@/services/private/orders";

// Framer Motion Variants for smooth sequential loading
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function ChefPage() {
  const { data, isLoading } = useGetChefOrdersQuery(undefined, {
  pollingInterval: 5000,
});

  const [startPreparing, { isLoading: preparingLoading }] =
  useStartPreparingMutation();

  const [markPrepared, { isLoading: readyLoading }] =
  useMarkPreparedMutation();

  const orders = data?.results || data || [];

  const preparingCount = orders.filter(
    (order) => order.order_status === "Preparing"
  ).length;

  const readyCount = orders.filter(
    (order) => order.order_status === "Prepared"
  ).length;

  const handleStartPreparing = async (id) => {
    try {
      await startPreparing(id).unwrap();
      toast.success("Cooking started! 🔥");
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const handleMarkReady = async (id) => {
    try {
      await markPrepared(id).unwrap();
      toast.success("Order marked ready! ✅");
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["chef"]}>
        <div className="container mx-auto py-10 px-4 space-y-8 max-w-7xl">
          <Skeleton className="h-12 w-1/3 rounded-xl" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-[500px] rounded-3xl" />
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["chef"]}>
      <div className="container mx-auto py-10 px-4 space-y-10 max-w-7xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-extrabold flex items-center gap-3 text-zinc-900 dark:text-white">
              <ChefHat className="h-10 w-10 text-orange-500" />
              Kitchen Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-lg font-medium">
              Manage food preparation workflow seamlessly.
            </p>
          </div>

          {/* Live Indicator */}
          <div className="bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 border border-orange-200 dark:border-orange-500/20 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            Kitchen Live
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Queue Stat */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 rounded-3xl border-zinc-200/60 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group bg-white dark:bg-zinc-950">
              <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <Clock3 className="w-32 h-32 text-yellow-500" />
              </div>
              <div className="relative z-10">
                <p className="text-zinc-500 dark:text-zinc-400 font-semibold text-lg flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-yellow-500" />
                  Queue
                </p>
                <h2 className="text-5xl font-black mt-2 text-zinc-900 dark:text-white">
                  {orders.length}
                </h2>
              </div>
            </Card>
          </motion.div>

          {/* Preparing Stat */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 rounded-3xl border-zinc-200/60 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group bg-white dark:bg-zinc-950">
              <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <CookingPot className="w-32 h-32 text-blue-500" />
              </div>
              <div className="relative z-10">
                <p className="text-zinc-500 dark:text-zinc-400 font-semibold text-lg flex items-center gap-2">
                  <CookingPot className="h-5 w-5 text-blue-500" />
                  Preparing
                </p>
                <h2 className="text-5xl font-black mt-2 text-zinc-900 dark:text-white">
                  {preparingCount}
                </h2>
              </div>
            </Card>
          </motion.div>

          {/* Ready Stat */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 rounded-3xl border-zinc-200/60 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group bg-white dark:bg-zinc-950">
              <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <CheckCircle2 className="w-32 h-32 text-green-500" />
              </div>
              <div className="relative z-10">
                <p className="text-zinc-500 dark:text-zinc-400 font-semibold text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Ready
                </p>
                <h2 className="text-5xl font-black mt-2 text-zinc-900 dark:text-white">
                  {readyCount}
                </h2>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Orders Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
            <ReceiptText className="h-6 w-6 text-orange-500" />
            Kitchen Queue
          </h2>

          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-24 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800"
            >
              <div className="flex justify-center mb-4 opacity-50">
                <ChefHat className="h-16 w-16 text-zinc-400" />
              </div>
              <p className="text-zinc-500 text-lg font-medium">
                No kitchen orders right now. The stove is cold!
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {orders.map((order) => (
                <motion.div key={order.id} variants={itemVariants}>
                  <Card className="flex flex-col justify-between p-6 rounded-3xl border-zinc-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden bg-white dark:bg-zinc-950">
                    {/* Dynamic Top Accent Line */}
                    <div
                      className={`absolute top-0 left-0 h-1.5 w-full ${
                        order.order_status === "Preparing"
                          ? "bg-blue-500"
                          : "bg-yellow-400"
                      }`}
                    />

                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <div>
                          <Badge
                            variant="outline"
                            className="mb-2 font-bold bg-zinc-50 dark:bg-zinc-900"
                          >
                            🍽️ Table {order.table_number || "N/A"}
                          </Badge>
                          <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
                            Order #{order.id}
                          </h2>
                        </div>

                        <Badge
                          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg ${
                            order.order_status === "To Prepare"
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                              : order.order_status === "Preparing"
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                              : "bg-zinc-100 text-zinc-800 hover:bg-zinc-100"
                          }`}
                        >
                          {order.order_status}
                        </Badge>
                      </div>

                      {/* Order Items List */}
                      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                          Items to Cook
                        </h4>
                        <div className="space-y-2">
                          {order.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50"
                            >
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                {item.menu_item?.name}
                              </span>
                              <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md font-bold text-xs">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 pt-2">
                      {order.order_status === "To Prepare" && (
                        <button
                          onClick={() => handleStartPreparing(order.id)}
                          className="
                            w-full flex items-center justify-center gap-2
                            bg-blue-500 hover:bg-blue-600 text-white
                            px-5 py-3.5 rounded-2xl font-bold text-base
                            shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)]
                            hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                          "
                        >
                          <Flame className="w-5 h-5" />
                          Start Preparing
                        </button>
                      )}

                      {order.order_status === "Preparing" && (
                        <button
                          onClick={() => handleMarkReady(order.id)}
                          className="
                            w-full flex items-center justify-center gap-2
                            bg-green-500 hover:bg-green-600 text-white
                            px-5 py-3.5 rounded-2xl font-bold text-base
                            shadow-[0_4px_14px_0_rgba(34,197,94,0.39)] hover:shadow-[0_6px_20px_rgba(34,197,94,0.23)]
                            hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                          "
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Mark Ready
                        </button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}