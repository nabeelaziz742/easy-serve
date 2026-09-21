"use client";

import { motion } from "framer-motion";
import { Clock, Flame, CheckCircle, Timer, BarChart3, ClipboardList, CalendarDays, BadgeCheck, ChefHat, Sparkles } from "lucide-react";

const formatDate = () =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

export default function ChefDashboardPage() {
  const chef = { name: "Ahmed Raza", id: "CHF-112", role: "Head Chef" };

  const stats = [
    { title: "Orders in Queue", value: 12, icon: ClipboardList, color: "bg-amber-50 text-amber-800 border-amber-200" },
    { title: "Preparing Now", value: 5, icon: Flame, color: "bg-blue-50 text-blue-800 border-blue-200" },
    { title: "Completed Today", value: 25, icon: CheckCircle, color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { title: "Avg Prep Time", value: "18 min", icon: Timer, color: "bg-purple-50 text-purple-800 border-purple-200" },
  ];

  const orders = [
    { id: 101, dish: "Chicken Alfredo Pasta", table: 3, status: "Preparing", timeElapsed: "12 min", priority: "High" },
    { id: 102, dish: "Beef Burger", table: 6, status: "Pending", timeElapsed: "—", priority: "Medium" },
    { id: 103, dish: "Grilled Fish Platter", table: 2, status: "Completed", timeElapsed: "16 min", priority: "Low" },
    { id: 104, dish: "Mushroom Soup", table: 4, status: "Preparing", timeElapsed: "8 min", priority: "High" },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case "Preparing":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "Completed":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Pending":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Chef Banner */}
      <section className="smooth-card relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-yellow-400 to-green-950" />
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-green-950 text-yellow-400 shadow-md">
              <ChefHat className="h-8 w-8" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-green-950 md:text-2xl">
                  {chef.name}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" /> Kitchen Active
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500 font-medium">
                <span>Staff ID: {chef.id}</span>
                <span>·</span>
                <span className="font-bold text-yellow-800">{chef.role}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 md:justify-end text-xs font-semibold">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase text-gray-400">Shift</p>
              <p className="font-bold text-gray-900 mt-0.5">11:00 AM — 9:00 PM</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase text-gray-400">Today</p>
              <p className="font-bold text-gray-900 mt-0.5">{formatDate()}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {stats.map((s, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -2 }}
            className={`smooth-card rounded-3xl p-5 flex items-center gap-4 border shadow-sm ${s.color}`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs">
              <s.icon className="h-6 w-6 text-green-950" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                {s.title}
              </p>
              <h3 className="mt-0.5 text-2xl font-black">{s.value}</h3>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Active Orders Section */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-black text-green-950 flex items-center gap-2">
            <Flame className="h-5 w-5 text-yellow-600" /> Kitchen Queue & Cook Status
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Active food tickets requiring preparation or plating.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              whileHover={{ y: -2 }}
              className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-yellow-600 uppercase">
                    ORDER #{order.id}
                  </span>
                  <h4 className="font-bold text-sm text-gray-900 mt-0.5 truncate">
                    {order.dish}
                  </h4>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusStyle(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 font-medium">
                <span>Table #{order.table}</span>
                <span className="flex items-center gap-1 font-semibold">
                  <Clock className="h-3 w-3 text-yellow-600" />
                  {order.timeElapsed}
                </span>
              </div>

              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  order.priority === "High"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : order.priority === "Medium"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {order.priority} Priority
              </span>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
