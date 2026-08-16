"use client";

import { motion } from "framer-motion";
import { Clock, Flame, CheckCircle, Timer, BarChart3, ClipboardList, CalendarDays, BadgeCheck, ChefHat } from "lucide-react";

const formatDate = () => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date());

export default function ChefDashboardPage() {
  const chef = { name: "Ahmed Raza", id: "CHF-112", role: "Head Chef" };

  const stats = [
    { title: "Orders in Queue", value: 12, icon: ClipboardList, color: "bg-amber-50 text-amber-700 border-amber-100" },
    { title: "Preparing Now", value: 5, icon: Flame, color: "bg-orange-50 text-orange-700 border-orange-100" },
    { title: "Completed Today", value: 25, icon: CheckCircle, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { title: "Avg Prep Time", value: "18 min", icon: Timer, color: "bg-blue-50 text-blue-700 border-blue-100" },
  ];

  const orders = [
    { id: 101, dish: "Chicken Alfredo Pasta", table: 3, status: "Preparing", timeElapsed: "12 min", priority: "High" },
    { id: 102, dish: "Beef Burger", table: 6, status: "Pending", timeElapsed: "—", priority: "Medium" },
    { id: 103, dish: "Grilled Fish Platter", table: 2, status: "Completed", timeElapsed: "16 min", priority: "Low" },
    { id: 104, dish: "Mushroom Soup", table: 4, status: "Preparing", timeElapsed: "8 min", priority: "High" },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case "Preparing": return "bg-orange-50 text-orange-700 border-orange-100";
      case "Completed": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Pending": return "bg-amber-50 text-amber-700 border-amber-100";
      default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-orange-600 to-amber-400" />
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                <ChefHat className="h-9 w-9" strokeWidth={1.8} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{chef.name}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    <BadgeCheck className="h-3.5 w-3.5" /> On duty
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>Staff ID: {chef.id}</span>
                  <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                  <span className="font-medium text-orange-700">{chef.role}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Clock className="h-4 w-4" /> Shift</div>
                <p className="mt-1 text-sm font-semibold text-slate-800">11:00 AM — 9:00 PM</p>
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

      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 border-l-4 border-orange-400 pl-3 text-2xl font-bold text-slate-900"><Flame className="h-6 w-6 text-orange-500" />Active & Pending Orders</h3>
            <p className="mt-1 pl-4 text-sm text-slate-500">Keep an eye on the kitchen queue and preparation status.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <motion.div key={order.id} whileHover={{ y: -2 }} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-xs font-semibold text-slate-400">ORDER #{order.id}</p><h4 className="mt-1 truncate font-bold text-slate-800">{order.dish}</h4></div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(order.status)}`}>{order.status}</span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-500">Table #{order.table}</span><span className="flex items-center gap-1 text-slate-500"><Clock className="h-4 w-4" />{order.timeElapsed}</span></div>
              <span className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${order.priority === "High" ? "bg-red-50 text-red-700" : order.priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{order.priority} Priority</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900"><BarChart3 className="h-5 w-5 text-orange-600" />Performance Overview</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-orange-50 p-5"><h4 className="text-2xl font-bold text-orange-700">92%</h4><p className="mt-1 text-sm text-slate-600">Orders On-Time</p></div>
          <div className="rounded-2xl bg-emerald-50 p-5"><h4 className="text-2xl font-bold text-emerald-700">4.7 ★</h4><p className="mt-1 text-sm text-slate-600">Average Rating</p></div>
          <div className="rounded-2xl bg-amber-50 p-5"><h4 className="text-2xl font-bold text-amber-700">3 Delays</h4><p className="mt-1 text-sm text-slate-600">Today’s Issues</p></div>
        </div>
      </section>
    </div>
  );
}
