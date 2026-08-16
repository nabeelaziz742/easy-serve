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
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const OrderCard = ({ order, ready = false, onAction }) => (
  <motion.div key={order.id} variants={itemVariants} className="h-full">
    <Card className="flex h-full flex-col justify-between p-4 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
      <div className={`absolute top-0 left-0 h-1.5 w-full ${ready ? "bg-green-500" : "bg-yellow-400"}`} />

      <div>
        <div className="flex justify-between items-start gap-2 mb-4">
          <div className="min-w-0">
            <Badge
              variant="outline"
              className={`mb-2 text-xs ${ready ? "border-green-300 text-green-700" : ""}`}
            >
              🍽️ Table {order.table_number || "N/A"}
            </Badge>
            <h2 className="text-xl font-black truncate">Order #{order.id}</h2>
          </div>

          <Badge className={ready ? "bg-green-100 text-green-800 text-xs" : "bg-yellow-100 text-yellow-800 text-xs"}>
            {ready ? "Ready" : order.order_status}
          </Badge>
        </div>

        <div className="border-t pt-3 mt-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
            {ready ? "Ready Items" : "Order Items"}
          </h4>

          <div className="space-y-1.5">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-900/50 px-2.5 py-2 rounded-lg"
              >
                <span className="font-semibold truncate pr-2">
                  {item.menu_item?.name}
                </span>
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-[11px] font-bold">
                  x{item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => onAction(order.id)}
        className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
          ready
            ? "bg-green-500 hover:bg-green-600 text-white"
            : "bg-yellow-400 hover:bg-yellow-500 text-black"
        }`}
      >
        <CheckCircle2 className="w-4 h-4" />
        {ready ? "Mark Served" : "Accept Order"}
      </button>
    </Card>
  </motion.div>
);

export default function WaiterPage() {
  const { data, isLoading } = useGetPendingOrdersQuery(undefined, { pollingInterval: 5000 });
  const { data: readyData } = useGetReadyOrdersQuery(undefined, { pollingInterval: 5000 });
  const [acceptOrder] = useAcceptOrderMutation();
  const [markServed] = useMarkServedMutation();

  const orders = data?.results || data || [];
  const readyOrders = readyData?.results || readyData || [];

  const handleAccept = async (id) => {
    try {
      await acceptOrder(id).unwrap();
      toast.success("Order accepted successfully ✅");
    } catch (error) {
      toast.error(error?.data?.detail || "Failed to accept order");
    }
  };

  const handleServed = async (id) => {
    try {
      await markServed(id).unwrap();
      toast.success("Order served successfully");
    } catch (error) {
      console.error("Mark served error:", error);
      toast.error(error?.data?.detail || "Failed to mark served");
    }
  };

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["waiter"]}>
        <div className="container mx-auto py-10 px-4 space-y-8 max-w-7xl">
          <Skeleton className="h-12 w-1/3 rounded-xl" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
          </div>
          <Skeleton className="h-[500px] rounded-3xl" />
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["waiter"]}>
      <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl">
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
            </span>
            Live Orders
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="p-5 rounded-2xl shadow-sm">
            <p className="text-zinc-500 font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-yellow-500" />Pending Orders</p>
            <h2 className="text-4xl font-black mt-2">{orders.length}</h2>
          </Card>
          <Card className="p-5 rounded-2xl shadow-sm">
            <p className="text-zinc-500 font-semibold flex items-center gap-2"><UtensilsCrossed className="h-5 w-5 text-green-500" />Active Tables</p>
            <h2 className="text-4xl font-black mt-2">--</h2>
          </Card>
          <Card className="p-5 rounded-2xl shadow-sm">
            <p className="text-zinc-500 font-semibold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-blue-500" />Served Today</p>
            <h2 className="text-4xl font-black mt-2">--</h2>
          </Card>
        </motion.div>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><ReceiptText className="h-6 w-6 text-yellow-500" />Pending Orders</h2>
          {orders.length === 0 ? (
            <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed"><p className="text-zinc-500 font-medium">No pending orders available.</p></div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
              {orders.map((order) => <OrderCard key={order.id} order={order} onAction={handleAccept} />)}
            </motion.div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-green-500" />Ready To Serve</h2>
          {readyOrders.length === 0 ? (
            <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed"><p className="text-zinc-500 font-medium">No ready orders available.</p></div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
              {readyOrders.map((order) => <OrderCard key={order.id} order={order} ready onAction={handleServed} />)}
            </motion.div>
          )}
        </section>
      </div>
    </RoleGuard>
  );
}
