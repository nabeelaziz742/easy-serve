"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { listVariants, itemVariants, hoverLift, fadeUp } from "@/lib/motion";
import { Clock, CheckCircle, UtensilsCrossed, Truck, Banknote, CalendarDays, BadgeCheck, ShieldAlert } from "lucide-react";
import TableCard from "@/components/admin/TableCard";
import { useGetWaiterDashboardQuery, useGetWaiterCashOrdersQuery } from "@/services/private/waiter";

const formatDate = () => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date());

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useGetWaiterDashboardQuery(undefined, { pollingInterval: 5000, refetchOnFocus: true, refetchOnReconnect: true });
  const { data: cashOrdersResponse } = useGetWaiterCashOrdersQuery(undefined, { pollingInterval: 5000, refetchOnFocus: true, refetchOnReconnect: true });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-xl bg-zinc-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-center">
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

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <motion.section {...fadeUp} className="saas-card relative overflow-hidden p-4">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-green-900 to-amber-400" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-950 text-amber-400 shadow-sm">
              <UtensilsCrossed className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-zinc-900">{user.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" /> On duty
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>Staff ID: <strong className="font-semibold text-zinc-700">{staffId}</strong></span>
                <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:block" />
                <span className="font-bold capitalize text-green-900">{role}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Shift
              </div>
              <p className="mt-0.5 text-sm font-bold text-zinc-800">{user.shift_start} — {user.shift_end}</p>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <CalendarDays className="h-3.5 w-3.5 text-green-600" /> Today
              </div>
              <p className="mt-0.5 text-sm font-bold text-zinc-800">{formatDate()}</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* KPI Stats */}
      <motion.div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        {stats.map((s, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            whileHover={hoverLift}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xs transition-shadow hover:shadow-md ${s.color}`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.iconBg}`}>
              <s.icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{s.title}</p>
              <h3 className="text-xl font-black leading-tight tabular">{s.value}</h3>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Cash is collected on the Orders screen; this only points there. */}
      {cashOrders.length > 0 && (
        <Link
          href="/waiter"
          className="saas-card flex items-center justify-between gap-3 border-amber-200 bg-amber-50/50 p-4 transition hover:shadow-md"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold text-zinc-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Banknote className="h-4 w-4" />
            </span>
            {cashOrders.length} cash {cashOrders.length === 1 ? "payment" : "payments"} waiting for collection
          </span>
          <span className="text-xs font-bold text-green-900">Collect on Orders →</span>
        </Link>
      )}

      {/* Assigned Tables */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="border-l-4 border-amber-400 pl-2.5 text-base font-black text-zinc-900">
            Assigned Tables
          </h3>
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
            {tables.length} tables assigned
          </span>
        </div>
        <motion.div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          variants={listVariants}
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

