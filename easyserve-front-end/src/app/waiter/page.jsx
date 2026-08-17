"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle2, UtensilsCrossed, Truck, Banknote, BadgeCheck, ReceiptText, ChefHat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import RoleGuard from "@/components/auth/RoleGuard";
import { useGetPendingOrdersQuery, useGetReadyOrdersQuery, useAcceptOrderMutation, useMarkServedMutation } from "@/services/private/orders";
import { useGetWaiterDashboardQuery, useGetWaiterCashOrdersQuery, useReceiveCashPaymentMutation } from "@/services/private/waiter";

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } };

const OrderCard = ({ order, ready = false, onAction }) => (
  <motion.div key={order.id} variants={itemVariants} className="h-full">
    <Card className="group relative flex h-full min-h-[235px] flex-col justify-between overflow-hidden rounded-2xl border-zinc-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`absolute left-0 top-0 h-1 w-full ${ready ? "bg-emerald-500" : "bg-amber-400"}`} />
      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Badge variant="outline" className={`mb-1 px-2 py-0.5 text-[10px] ${ready ? "border-emerald-300 text-emerald-700" : ""}`}>🍽️ Table {order.table_number || "N/A"}</Badge>
            <h2 className="truncate text-base font-extrabold text-zinc-900">Order #{order.id}</h2>
          </div>
          <Badge className={`shrink-0 px-2 py-0.5 text-[10px] ${ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{ready ? "Ready" : order.order_status}</Badge>
        </div>
        <div className="mt-2 border-t border-zinc-100 pt-3">
          <h4 className="mb-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400">{ready ? "Ready Items" : "Order Items"}</h4>
          <div className="space-y-1.5">{order.items?.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-2.5 py-2 text-xs"><span className="truncate pr-2 font-semibold text-zinc-700">{item.menu_item?.name}</span><span className="shrink-0 rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700">x{item.quantity}</span></div>)}</div>
        </div>
      </div>
      <button onClick={() => onAction(order.id)} className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all active:scale-[0.98] ${ready ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-amber-400 text-black hover:bg-amber-500"}`}><CheckCircle2 className="h-3.5 w-3.5" />{ready ? "Mark Served" : "Accept Order"}</button>
    </Card>
  </motion.div>
);

export default function WaiterPage() {
  const { data, isLoading } = useGetPendingOrdersQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true });
  const { data: readyData } = useGetReadyOrdersQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true });
  const { data: dashboardData } = useGetWaiterDashboardQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true });
  const { data: cashData } = useGetWaiterCashOrdersQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true });
  const [acceptOrder] = useAcceptOrderMutation();
  const [markServed] = useMarkServedMutation();
  const [receiveCashPayment] = useReceiveCashPaymentMutation();

  const orders = data?.results || data || [];
  const readyOrders = readyData?.results || readyData || [];
  const cashOrders = cashData?.results || cashData || [];
  const activeTables = dashboardData?.stats?.active_tables ?? 0;

  const handleAccept = async (id) => { try { await acceptOrder(id).unwrap(); toast.success("Order accepted and sent to kitchen"); } catch (error) { toast.error(error?.data?.detail || "Failed to accept order"); } };
  const handleServed = async (id) => { try { await markServed(id).unwrap(); toast.success("Order served successfully"); } catch (error) { console.error("Mark served error:", error); toast.error(error?.data?.detail || "Failed to mark served"); } };
  const handleCash = async (id) => { try { await receiveCashPayment(id).unwrap(); toast.success("Cash received. Manager settlement is pending."); } catch (error) { toast.error(error?.data?.detail || "Failed to record cash"); } };

  if (isLoading) return <RoleGuard allowedRoles={["waiter"]}><div className="mx-auto max-w-7xl space-y-6 px-4 py-8"><Skeleton className="h-10 w-1/3 rounded-xl" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div><Skeleton className="h-80 rounded-2xl" /></div></RoleGuard>;

  return (
    <RoleGuard allowedRoles={["waiter"]}>
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white"><ChefHat className="h-8 w-8 text-amber-500" />Waiter Dashboard</h1><p className="mt-1 text-sm font-medium text-muted-foreground">Manage customer orders, table service and cash receipt.</p></div><div className="flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />Live Orders</div></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl border-zinc-200/80 p-4 shadow-sm transition-shadow hover:shadow-md"><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><Clock className="h-4 w-4 text-amber-500" />Pending</p><h2 className="mt-1 text-2xl font-black text-zinc-900">{orders.length}</h2></Card>
          <Card className="rounded-2xl border-zinc-200/80 p-4 shadow-sm transition-shadow hover:shadow-md"><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><UtensilsCrossed className="h-4 w-4 text-emerald-500" />Active Tables</p><h2 className="mt-1 text-2xl font-black text-zinc-900">{activeTables}</h2></Card>
          <Card className="rounded-2xl border-zinc-200/80 p-4 shadow-sm transition-shadow hover:shadow-md"><p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500"><CheckCircle2 className="h-4 w-4 text-blue-500" />Cash Pending</p><h2 className="mt-1 text-2xl font-black text-zinc-900">{cashOrders.length}</h2></Card>
        </div>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Banknote className="h-5 w-5 text-orange-500" />Cash Collection</h2>
          {cashOrders.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 py-9 text-center"><p className="text-sm font-medium text-zinc-500">No cash payments waiting for collection.</p></div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{cashOrders.map((order) => <Card key={order.id} className="rounded-2xl border-zinc-200/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-zinc-500">Order #{order.id}</p><p className="text-lg font-black text-zinc-900">Rs {order.total_price}</p></div><Badge className="bg-orange-100 text-orange-800">Cash</Badge></div><button onClick={() => handleCash(order.id)} className="mt-3 w-full rounded-xl bg-orange-500 px-3 py-2.5 text-xs font-bold text-white transition-all hover:bg-orange-600 active:scale-[0.98]">Cash Received</button></Card>)}</div>}
        </section>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><ReceiptText className="h-5 w-5 text-amber-500" />Pending Orders</h2>
          {orders.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 py-12 text-center"><p className="text-sm font-medium text-zinc-500">No pending orders available.</p></div> : <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{orders.map((order) => <OrderCard key={order.id} order={order} onAction={handleAccept} />)}</motion.div>}
        </section>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><CheckCircle2 className="h-5 w-5 text-emerald-500" />Ready To Serve</h2>
          {readyOrders.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 py-12 text-center"><p className="text-sm font-medium text-zinc-500">No ready orders available.</p></div> : <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{readyOrders.map((order) => <OrderCard key={order.id} order={order} ready onAction={handleServed} />)}</motion.div>}
        </section>
      </div>
    </RoleGuard>
  );
}
