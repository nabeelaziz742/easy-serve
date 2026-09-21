"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle, UtensilsCrossed, Truck, Banknote, CalendarDays, BadgeCheck, ShieldAlert } from "lucide-react";
import TableCard from "@/components/admin/TableCard";
import { useGetWaiterDashboardQuery, useGetWaiterCashOrdersQuery, useReceiveCashPaymentMutation } from "@/services/private/waiter";
import { toast } from "sonner";

const formatDate = () => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date());

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } }
};

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useGetWaiterDashboardQuery(undefined, { pollingInterval: 60000 });
  const { data: cashOrdersResponse, isLoading: cashLoading } = useGetWaiterCashOrdersQuery(undefined, { pollingInterval: 15000 });
  const [receiveCash, { isLoading: receivingCash }] = useReceiveCashPaymentMutation();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-zinc-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500" />
        <h3 className="mt-3 text-lg font-bold text-red-900">Failed to load waiter dashboard</h3>
        <p className="mt-1 text-sm text-red-600">Please verify your staff authorization and try refreshing.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-95"
        >
          Try Again
        </button>
      </div>
    );
  }

  const user = data.user;
  const apiStats = data.stats;
  const tables = data.tables;
  const cashOrders = Array.isArray(cashOrdersResponse) ? cashOrdersResponse : cashOrdersResponse?.results || [];
  const staffId = user.waiter_id && user.waiter_id !== "ID_NOT" ? user.waiter_id : "—";
  const role = user.role || "Waiter";

  const stats = [
    { title: "Total Orders Today", value: apiStats.total_orders, icon: UtensilsCrossed, color: "bg-emerald-50 text-emerald-800 border-emerald-100", iconBg: "bg-emerald-100 text-emerald-700" },
    { title: "Orders Served", value: apiStats.served_orders, icon: CheckCircle, color: "bg-amber-50 text-amber-800 border-amber-100", iconBg: "bg-amber-100 text-amber-700" },
    { title: "Ready for Pickup", value: apiStats.ready_orders, icon: Truck, color: "bg-blue-50 text-blue-800 border-blue-100", iconBg: "bg-blue-100 text-blue-700" },
    { title: "Avg Serve Time", value: `${apiStats.avg_serve_time} min`, icon: Clock, color: "bg-purple-50 text-purple-800 border-purple-100", iconBg: "bg-purple-100 text-purple-700" },
  ];

  const handleReceiveCash = async (orderId) => {
    try {
      await receiveCash(orderId).unwrap();
      toast.success("Cash received recorded successfully.");
    } catch (error) {
      toast.error(error?.data?.detail || "Unable to record cash receipt.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-200">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-green-900 to-amber-400" />
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-green-950 text-amber-400 shadow-md">
              <UtensilsCrossed className="h-8 w-8" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-zinc-900 md:text-2xl">{user.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" /> On duty
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
                <span>Staff ID: <strong className="font-semibold text-zinc-700">{staffId}</strong></span>
                <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:block" />
                <span className="font-bold capitalize text-green-900">{role}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Shift
              </div>
              <p className="mt-0.5 text-sm font-bold text-zinc-800">{user.shift_start} — {user.shift_end}</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <CalendarDays className="h-3.5 w-3.5 text-green-600" /> Today
              </div>
              <p className="mt-0.5 text-sm font-bold text-zinc-800">{formatDate()}</p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Stats */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {stats.map((s, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm transition-all duration-200 ${s.color}`}
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-xs ${s.iconBg}`}>
              <s.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">{s.title}</p>
              <h3 className="mt-0.5 text-2xl font-black">{s.value}</h3>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Cash Collection Section */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Banknote className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-black text-zinc-900">Cash Collection</h3>
            </div>
            <p className="mt-1 text-sm text-zinc-500">Cash payments requested by customers and awaiting collection.</p>
          </div>
          <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            {cashOrders.length} pending collection
          </span>
        </div>

        {cashLoading ? (
          <p className="py-6 text-sm text-zinc-400">Loading cash orders...</p>
        ) : cashOrders.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-5 py-8 text-center">
            <Banknote className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-2 text-sm font-medium text-zinc-500">No cash payments waiting for collection.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cashOrders.map((order) => (
              <motion.div
                key={order.id}
                whileHover={{ y: -2 }}
                className="flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-zinc-900">Order #{order.id}</p>
                      <p className="text-xs font-medium text-zinc-500">Table #{order.table_number || "—"}</p>
                    </div>
                    <span className="font-black text-green-950">Rs {order.total_price}</span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-600">
                    Customer: <strong className="font-semibold text-zinc-800">{order.billing_first_name} {order.billing_last_name}</strong>
                  </p>
                </div>
                <button
                  disabled={receivingCash}
                  onClick={() => handleReceiveCash(order.id)}
                  className="mt-4 w-full rounded-xl bg-green-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-900 active:scale-[0.98] disabled:opacity-50"
                >
                  {receivingCash ? "Recording..." : "Cash Received"}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Assigned Tables */}
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="border-l-4 border-amber-400 pl-3 text-2xl font-black text-zinc-900">
            Assigned Tables
          </h3>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
            {tables.length} tables assigned
          </span>
        </div>
        <motion.div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {tables.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

