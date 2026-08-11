"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import RoleGuard from "@/components/auth/RoleGuard";

import {
  Clock,
  UtensilsCrossed,
  CheckCircle2,
  ReceiptText,
  ChefHat,
} from "lucide-react";

import {
  useGetPendingOrdersQuery,
  useGetReadyOrdersQuery,
  useAcceptOrderMutation,
  useMarkServedMutation,
} from "@/services/private/orders";

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
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export default function WaiterPage() {
  const { data, isLoading } = useGetPendingOrdersQuery(undefined, {
    pollingInterval: 5000,
  });

  const { data: readyData } = useGetReadyOrdersQuery(undefined, {
    pollingInterval: 5000,
  });

  const [acceptOrder] = useAcceptOrderMutation();
  const [markServed] = useMarkServedMutation();

  const orders = data?.results || data || [];
  const readyOrders = readyData?.results || readyData || [];

  const handleAccept = async (id) => {
    try {
      await acceptOrder(id).unwrap();
      toast.success("Order accepted successfully ✅");
    } catch (error) {
      toast.error("Failed to accept order");
    }
  };

  const handleServed = async (id) => {
    try {
      await markServed(id).unwrap();
      toast.success("Order served successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark served");
    }
  };

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["waiter"]}>
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
    <RoleGuard allowedRoles={["waiter"]}>
      <div className="container mx-auto py-10 px-4 space-y-10 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-extrabold flex items-center gap-3 text-zinc-900 dark:text-white">
              <ChefHat className="h-10 w-10 text-yellow-500" />
              Waiter Dashboard
            </h1>

            <p className="text-muted-foreground mt-2 text-lg font-medium">
              Manage customer orders and table service.
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 border border-yellow-200 dark:border-yellow-500/20 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            Live Orders
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div variants={itemVariants}>
            <Card className="p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
              <p className="text-zinc-500 font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Orders
              </p>

              <h2 className="text-5xl font-black mt-2">{orders.length}</h2>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
              <p className="text-zinc-500 font-semibold flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-green-500" />
                Active Tables
              </p>

              <h2 className="text-5xl font-black mt-2">--</h2>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
              <p className="text-zinc-500 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                Served Today
              </p>

              <h2 className="text-5xl font-black mt-2">--</h2>
            </Card>
          </motion.div>
        </motion.div>

        {/* -----------------------------
            ORDERS SECTION (PENDING QUEUE) 
            ----------------------------- */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <ReceiptText className="h-6 w-6 text-yellow-500" />
            Pending Orders
          </h2>

          {orders.length === 0 ? (
            <div className="text-center py-24 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed">
              <p className="text-zinc-500 text-lg font-medium">
                No pending orders available.
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {orders.map((order) => (
                <motion.div key={order.id} variants={itemVariants}>
                  <Card className="flex flex-col justify-between p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1.5 w-full bg-yellow-400" />

                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            🍽️ Table {order.table_number || "N/A"}
                          </Badge>

                          <h2 className="text-2xl font-black">
                            Order #{order.id}
                          </h2>
                        </div>

                        <Badge className="bg-yellow-100 text-yellow-800">
                          {order.order_status}
                        </Badge>
                      </div>

                      <div className="border-t pt-4 mt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                          Order Items
                        </h4>

                        <div className="space-y-2">
                          {order.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl"
                            >
                              <span className="font-semibold">
                                {item.menu_item?.name}
                              </span>

                              <span className="px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-xs font-bold">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={() => handleAccept(order.id)}
                        className="
                          w-full
                          flex items-center justify-center gap-2
                          bg-yellow-400 hover:bg-yellow-500
                          text-black px-5 py-3.5 rounded-2xl
                          font-bold transition-all duration-200
                        "
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Accept Order
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* -----------------------------
            READY TO SERVE SECTION
            ----------------------------- */}
        <div className="mt-14">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Ready To Serve
          </h2>

          {readyOrders.length === 0 ? (
            <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed">
              <p className="text-zinc-500 text-lg font-medium">
                No ready orders available.
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {readyOrders.map((order) => (
                <motion.div key={order.id} variants={itemVariants}>
                  <Card className="flex flex-col justify-between p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1.5 w-full bg-green-500" />

                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <div>
                          <Badge
                            variant="outline"
                            className="mb-2 border-green-300 text-green-700"
                          >
                            🍽️ Table {order.table_number || "N/A"}
                          </Badge>

                          <h2 className="text-2xl font-black">
                            Order #{order.id}
                          </h2>
                        </div>

                        <Badge className="bg-green-100 text-green-800">
                          Ready
                        </Badge>
                      </div>

                      <div className="border-t pt-4 mt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                          Ready Items
                        </h4>

                        <div className="space-y-2">
                          {order.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl"
                            >
                              <span className="font-semibold">
                                {item.menu_item?.name}
                              </span>

                              <span className="px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-xs font-bold">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={() => handleServed(order.id)}
                        className="
                          w-full
                          flex items-center justify-center gap-2
                          bg-green-500 hover:bg-green-600
                          text-white px-5 py-3.5 rounded-2xl
                          font-bold transition-all duration-200
                        "
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Mark Served
                      </button>
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