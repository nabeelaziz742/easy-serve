"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import RoleGuard from "@/components/auth/RoleGuard";
import { Clock, UtensilsCrossed, CheckCircle2, ReceiptText, ChefHat, Banknote } from "lucide-react";
import {
  useGetPendingOrdersQuery,
  useGetReadyOrdersQuery,
  useAcceptOrderMutation,
  useMarkServedMutation,
  useGetWaiterCashOrdersQuery,
  useReceiveCashPaymentMutation,
} from "@/services/private/orders";

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

const OrderCard = ({ order, ready = false, onAction }) => (
  <motion.div key={order.id} variants={itemVariants} className="h-full">
    <Card className="relative flex h-full min-h-[250px] flex-col justify-between overflow-hidden rounded-xl p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute left-0 top-0 h-1 w-full ${ready ? "bg-green-500" : "bg-yellow-400"}`} />
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0"><Badge variant="outline" className={`mb-1 px-2 py-0.5 text-[10px] ${ready ? "border-green-300 text-green-700" : ""}`}>🍽️ Table {order.table_number || "N/A"}</Badge><h2 className="truncate text-base font-extrabold">Order #{order.id}</h2></div>
          <Badge className={`shrink-0 px-2 py-0.5 text-[10px] ${ready ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{ready ? "Ready" : order.order_status}</Badge>
        </div>
        <div className="mt-2 border-t pt-2"><h4 className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">{ready ? "Ready Items" : "Order Items"}</h4><div className="space-y-1">{order.items?.map((item) => <div key={item.id} className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1.5 text-xs dark:bg-zinc-900/50"><span className="truncate pr-2 font-semibold">{item.menu_item?.name}</span><span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold dark:bg-zinc-700">x{item.quantity}</span></div>)}</div></div>
      </div>
      <button onClick={() => onAction(order.id)} className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${ready ? "bg-green-500 text-white hover:bg-green-600" : "bg-yellow-400 text-black hover:bg-yellow-500"}`}><CheckCircle2 className="h-3.5 w-3.5" />{ready ? "Mark Served" : "Accept Order"}</button>
    </Card>
  </motion.div>
);

export default function WaiterPage() {
  const { data, isLoading } = useGetPendingOrdersQuery(undefined, { pollingInterval: 5000 });
  const { data: readyData } = useGetReadyOrdersQuery(undefined, { pollingInterval: 5000 });
  const { data: cashData } = useGetWaiterCashOrdersQuery(undefined, { pollingInterval: 5000 });
  const [acceptOrder] = useAcceptOrderMutation();
  const [markServed] = useMarkServedMutation();
  const [receiveCashPayment] = useReceiveCashPaymentMutation();
  const orders = data?.results || data || [];
  const readyOrders = readyData?.results || readyData || [];
  const cashOrders = cashData?.results || cashData || [];

  const handleAccept = async (id) => { try { await acceptOrder(id).unwrap(); toast.success("Order accepted and sent to kitchen ✅"); } catch (error) { toast.error(error?.data?.detail || "Failed to accept order"); } };
  const handleServed = async (id) => { try { await markServed(id).unwrap(); toast.success("Order served successfully ✅"); } catch (error) { console.error("Mark served error:", error); toast.error(error?.data?.detail || "Failed to mark served"); } };
  const handleCash = async (id) => { try { await receiveCashPayment(id).unwrap(); toast.success("Cash received and recorded. Manager settlement pending."); } catch (error) { toast.error(error?.data?.detail || "Failed to record cash"); } };

  if (isLoading) return <RoleGuard allowedRoles={["waiter"]}><div className="mx-auto max-w-7xl space-y-6 px-4 py-8"><Skeleton className="h-10 w-1/3 rounded-xl" /><div className="grid grid-cols-3 gap-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><Skeleton className="h-80 rounded-xl" /></div></RoleGuard>;

  return (
    <RoleGuard allowedRoles={["waiter"]}>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><h1 className="flex items-center gap-2 text-3xl font-extrabold text-zinc-900 dark:text-white"><ChefHat className="h-8 w-8 text-yellow-500" />Waiter Dashboard</h1><p className="mt-1 text-sm font-medium text-muted-foreground">Manage customer orders, table service and cash receipt.</p></div><div className="flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700"><span className="h-2 w-2 rounded-full bg-yellow-500" />Live Orders</div></div>
        <div className="grid grid-cols-3 gap-3"><Card className="rounded-xl p-3 shadow-sm"><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><Clock className="h-4 w-4 text-yellow-500" />Pending</p><h2 className="mt-1 text-2xl font-black">{orders.length}</h2></Card><Card className="rounded-xl p-3 shadow-sm"><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><UtensilsCrossed className="h-4 w-4 text-green-500" />Active Tables</p><h2 className="mt-1 text-2xl font-black">--</h2></Card><Card className="rounded-xl p-3 shadow-sm"><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><CheckCircle2 className="h-4 w-4 text-blue-500" />Cash Pending</p><h2 className="mt-1 text-2xl font-black">{cashOrders.length}</h2></Card></div>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Banknote className="h-5 w-5 text-orange-500" />Cash Collection</h2>
          {cashOrders.length === 0 ? <div className="rounded-xl border border-dashed bg-zinc-50 py-8 text-center"><p className="text-sm font-medium text-zinc-500">No cash payments waiting for collection.</p></div> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{cashOrders.map((order) => <Card key={order.id} className="rounded-xl p-3 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-zinc-500">Order #{order.id}</p><p className="text-lg font-black">Rs {order.total_price}</p></div><Badge className="bg-orange-100 text-orange-800">Cash</Badge></div><button onClick={() => handleCash(order.id)} className="mt-3 w-full rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600">Cash Received</button></Card>)}</div>}
        </section>

        <section><h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><ReceiptText className="h-5 w-5 text-yellow-500" />Pending Orders</h2>{orders.length === 0 ? <div className="rounded-xl border border-dashed bg-zinc-50 py-12 text-center"><p className="text-sm font-medium text-zinc-500">No pending orders available.</p></div> : <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{orders.map((order) => <OrderCard key={order.id} order={order} onAction={handleAccept} />)}</motion.div>}</section>
        <section><h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><CheckCircle2 className="h-5 w-5 text-green-500" />Ready To Serve</h2>{readyOrders.length === 0 ? <div className="rounded-xl border border-dashed bg-zinc-50 py-12 text-center"><p className="text-sm font-medium text-zinc-500">No ready orders available.</p></div> : <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{readyOrders.map((order) => <OrderCard key={order.id} order={order} ready onAction={handleServed} />)}</motion.div>}</section>
      </div>
    </RoleGuard>
  );
}
