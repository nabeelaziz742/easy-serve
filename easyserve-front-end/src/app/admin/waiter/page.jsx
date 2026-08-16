"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle, UtensilsCrossed, Truck, Banknote, CalendarDays, BadgeCheck } from "lucide-react";
import TableCard from "@/components/admin/TableCard";
import { useGetWaiterDashboardQuery, useGetWaiterCashOrdersQuery, useReceiveCashPaymentMutation } from "@/services/private/waiter";

const formatDate = () => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date());

export default function DashboardPage() {
  const { data, isLoading, isError } = useGetWaiterDashboardQuery(undefined, { pollingInterval: 60000 });
  const { data: cashOrdersResponse, isLoading: cashLoading } = useGetWaiterCashOrdersQuery(undefined, { pollingInterval: 15000 });
  const [receiveCash, { isLoading: receivingCash }] = useReceiveCashPaymentMutation();

  if (isLoading) return <p>Loading dashboard...</p>;
  if (isError) return <p>Error loading dashboard</p>;

  const user = data.user;
  const apiStats = data.stats;
  const tables = data.tables;
  const cashOrders = Array.isArray(cashOrdersResponse) ? cashOrdersResponse : cashOrdersResponse?.results || [];
  const staffId = user.waiter_id && user.waiter_id !== "ID_NOT" ? user.waiter_id : "—";
  const role = user.role || "Waiter";

  const stats = [
    { title: "Total Orders Today", value: apiStats.total_orders, icon: UtensilsCrossed, color: "bg-amber-50 text-amber-700 border-amber-100" },
    { title: "Orders Served", value: apiStats.served_orders, icon: CheckCircle, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { title: "Ready for Pickup", value: apiStats.ready_orders, icon: Truck, color: "bg-blue-50 text-blue-700 border-blue-100" },
    { title: "Avg Serve Time", value: `${apiStats.avg_serve_time} min`, icon: Clock, color: "bg-violet-50 text-violet-700 border-violet-100" },
  ];

  const handleReceiveCash = async (orderId) => {
    try { await receiveCash(orderId).unwrap(); }
    catch (error) { alert(error?.data?.detail || "Unable to record cash receipt."); }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-orange-500 to-amber-400" />
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                <UtensilsCrossed className="h-8 w-8" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{user.name}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    <BadgeCheck className="h-3.5 w-3.5" /> On duty
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>Staff ID: {staffId}</span>
                  <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                  <span className="font-medium capitalize text-orange-700">{role}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Clock className="h-4 w-4" /> Shift</div>
                <p className="mt-1 text-sm font-semibold text-slate-800">{user.shift_start} — {user.shift_end}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><CalendarDays className="h-4 w-4" /> Today</div>
                <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate()}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {stats.map((s, i) => (
          <motion.div key={i} whileHover={{ y: -2 }} className={`rounded-2xl p-5 flex items-center gap-4 border shadow-sm transition-all duration-200 ${s.color}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70"><s.icon className="h-6 w-6" /></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide opacity-80">{s.title}</p><h3 className="mt-1 text-2xl font-bold">{s.value}</h3></div>
          </motion.div>
        ))}
      </motion.div>

      <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Banknote className="h-5 w-5" /></span>Cash Collection</h3>
            <p className="mt-1 text-sm text-slate-500">Cash payments requested by customers and awaiting collection.</p>
          </div>
          <span className="w-fit rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 ring-1 ring-orange-100">{cashOrders.length} pending</span>
        </div>
        {cashLoading ? <p className="py-6 text-sm text-slate-400">Loading cash orders...</p> : cashOrders.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center"><Banknote className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-500">No cash payments waiting for collection.</p></div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cashOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-800">Order #{order.id}</p><p className="text-sm text-slate-500">Table #{order.table_number || "—"}</p></div><span className="font-bold text-orange-700">Rs {order.total_price}</span></div>
                <p className="mt-3 text-sm text-slate-600">Customer: {order.billing_first_name} {order.billing_last_name}</p>
                <button disabled={receivingCash} onClick={() => handleReceiveCash(order.id)} className="mt-4 w-full rounded-xl bg-orange-600 px-4 py-2.5 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50">{receivingCash ? "Recording..." : "Cash Received"}</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div>
        <h3 className="mb-5 border-l-4 border-orange-400 pl-3 text-2xl font-bold text-slate-900">Assigned Tables</h3>
        <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {tables.map((table) => <TableCard key={table.id} table={table} />)}
        </motion.div>
      </div>
    </div>
  );
}
