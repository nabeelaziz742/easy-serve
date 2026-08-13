"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, ChefHat, ClipboardList, CheckCircle2, Clock,
  CookingPot, PackageCheck, TrendingUp, BarChart3, Sparkles,
} from "lucide-react";
import { useGetManagerDashboardQuery } from "@/services/private/orders";

const weeklyRevenue = [
  { day: "Mon", revenue: 0 },
  { day: "Tue", revenue: 0 },
  { day: "Wed", revenue: 0 },
  { day: "Thu", revenue: 0 },
  { day: "Fri", revenue: 0 },
  { day: "Sat", revenue: 0 },
  { day: "Sun", revenue: 0 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 16 } },
};

function StatCard({ icon: Icon, label, value, accent, badge }) {
  const colors = {
    indigo: { bg: "bg-indigo-50 dark:bg-indigo-500/10", icon: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-500/20", glow: "hover:shadow-[0_4px_16px_rgb(99,102,241,0.10)]", blob: "bg-indigo-50 dark:bg-indigo-500/10" },
    blue:   { bg: "bg-blue-50 dark:bg-blue-500/10",     icon: "text-blue-600 dark:text-blue-400",     ring: "ring-blue-500/20",   glow: "hover:shadow-[0_4px_16px_rgb(59,130,246,0.10)]",  blob: "bg-blue-50 dark:bg-blue-500/10"   },
    green:  { bg: "bg-green-50 dark:bg-green-500/10",   icon: "text-green-600 dark:text-green-400",   ring: "ring-green-500/20",  glow: "hover:shadow-[0_4px_16px_rgb(34,197,94,0.10)]",   blob: "bg-green-50 dark:bg-green-500/10"  },
    orange: { bg: "bg-orange-50 dark:bg-orange-500/10", icon: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500/20", glow: "hover:shadow-[0_4px_16px_rgb(249,115,22,0.10)]",  blob: "bg-orange-50 dark:bg-orange-500/10" },
  };
  const c = colors[accent] || colors.indigo;

  return (
    <Card className={`px-3 py-3 w-full rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] ${c.glow} transition-all duration-300 relative overflow-hidden bg-white dark:bg-zinc-900 group`}>
      <div className={`absolute top-0 right-0 w-6 h-6 ${c.blob} rounded-bl-full`} />
      <div className="flex justify-between items-start mb-2">
        <div className={`p-1.5 ${c.bg} rounded-lg ${c.icon} ring-1 ${c.ring}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {badge && (
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-full leading-none mt-0.5">
            {badge}
          </span>
        )}
      </div>
      <p className="text-zinc-400 dark:text-zinc-500 font-semibold tracking-widest text-[9px] uppercase mb-0.5">{label}</p>
      <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">{value}</h2>
    </Card>
  );
}

function HeroCard({ value }) {
  return (
    <Card className="px-3 py-3 w-full rounded-xl border-none shadow-[0_4px_16px_rgb(16,185,129,0.20)] hover:shadow-[0_8px_28px_rgb(16,185,129,0.30)] transition-all duration-300 relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 group">
      <div className="absolute -right-3 -bottom-3 opacity-10">
        <TrendingUp className="w-12 h-12 text-white" />
      </div>
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="p-1.5 bg-white/20 rounded-lg text-white ring-1 ring-white/25">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full leading-none mt-0.5">Success</span>
      </div>
      <div className="relative z-10">
        <p className="text-emerald-200 font-semibold tracking-widest text-[9px] uppercase mb-0.5">Total Served</p>
      </div>
        <h2 className="text-base font-bold tracking-tight text-white">{value}</h2>
    </Card>
  );
}

export default function ManagerPage() {
  const { data, isLoading } = useGetManagerDashboardQuery();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner"]}>
      <div className="relative min-h-screen pb-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

        <div className="mx-auto py-8 px-6 max-w-7xl space-y-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          >
            <div>
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-500/20 inline-flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3" /> Executive View
              </span>
              <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white">
                Command Center
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">
                Real-time telemetry and staff performance metrics.
              </p>
            </div>
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500" />
              <div className="relative bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2.5 border border-zinc-200 dark:border-zinc-800 shadow-lg">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                </span>
                Live Telemetry
              </div>
            </div>
          </motion.div>

          {/* Stats + Pipeline same row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Stat Cards — left 2/3 */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="lg:col-span-2 grid grid-cols-3 sm:grid-cols-5 gap-2"
            >
              <motion.div variants={itemVariants}>
                <StatCard icon={ClipboardList} label="Total Volume" value={data?.total_orders || 0} accent="indigo" badge="+Live" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard icon={Users} label="Active Waiters" value={data?.total_waiters || 0} accent="blue" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard icon={TrendingUp} label="Revenue" value={`Rs ${data?.total_revenue || 0}`} accent="green" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard icon={ChefHat} label="Kitchen Staff" value={data?.total_chefs || 0} accent="orange" />
              </motion.div>
              <motion.div variants={itemVariants} className="col-span-3 sm:col-span-1">
                <HeroCard value={data?.served_orders || 0} />
              </motion.div>
            </motion.div>

            {/* Pipeline — right 1/3 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-4 rounded-xl border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-sm h-full">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 mb-3">
                  <BarChart3 className="w-3 h-3" /> Pipeline
                </p>
                <div className="space-y-2.5">
                  {[
                    { icon: Clock,        label: "Pending",   value: data?.pending_orders   || 0, color: "text-yellow-500",  bg: "bg-yellow-50 dark:bg-yellow-500/10",   bar: "bg-yellow-400"  },
                    { icon: CookingPot,   label: "Preparing", value: data?.preparing_orders || 0, color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-500/10",       bar: "bg-blue-400"    },
                    { icon: PackageCheck, label: "Prepared",  value: data?.prepared_orders  || 0, color: "text-green-500",   bg: "bg-green-50 dark:bg-green-500/10",     bar: "bg-green-400"   },
                    { icon: CheckCircle2, label: "Served",    value: data?.served_orders    || 0, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", bar: "bg-emerald-500" },
                  ].map(({ icon: Icon, label, value, color, bg, bar }) => {
                    const total = data?.total_orders || 1;
                    const pct = Math.round((value / total) * 100);
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`p-1.5 ${bg} rounded-lg shrink-0`}>
                          <Icon className={`w-3 h-3 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-[10px] font-semibold mb-0.5">
                            <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
                            <span className={color}>{value}</span>
                          </div>
                          <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Weekly Revenue
                  </p>
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-0.5">
                    Rs {data?.total_revenue || 0}
                  </h3>
                </div>
                <span className="text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-semibold border border-emerald-200/50 dark:border-emerald-500/20">
                  This week
                </span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weeklyRevenue} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e4e4e7", fontSize: 12 }} formatter={(v) => [`Rs ${v}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

        </div>
      </div>
    </RoleGuard>
  );
}