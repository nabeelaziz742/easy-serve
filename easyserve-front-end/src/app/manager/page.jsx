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
    amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   ring: "ring-amber-400/30",   glow: "hover:shadow-[0_4px_16px_rgba(245,158,11,0.15)]",  blob: "bg-amber-50" },
    blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    ring: "ring-blue-400/30",    glow: "hover:shadow-[0_4px_16px_rgba(59,130,246,0.15)]",   blob: "bg-blue-50" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-700", ring: "ring-emerald-400/30", glow: "hover:shadow-[0_4px_16px_rgba(16,185,129,0.15)]", blob: "bg-emerald-50" },
    yellow:  { bg: "bg-yellow-50",  icon: "text-yellow-700",  ring: "ring-yellow-400/30",  glow: "hover:shadow-[0_4px_16px_rgba(234,179,8,0.15)]",   blob: "bg-yellow-50" },
  };
  const c = colors[accent] || colors.amber;

  return (
    <Card className={`px-3 py-3 w-full rounded-2xl border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${c.glow} transition-all duration-300 relative overflow-hidden bg-white group`}>
      <div className={`absolute top-0 right-0 w-6 h-6 ${c.blob} rounded-bl-full`} />
      <div className="flex justify-between items-start mb-2">
        <div className={`p-1.5 ${c.bg} rounded-lg ${c.icon} ring-1 ${c.ring}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {badge && (
          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full leading-none mt-0.5">
            {badge}
          </span>
        )}
      </div>
      <p className="text-gray-400 font-semibold tracking-widest text-[9px] uppercase mb-0.5">{label}</p>
      <h2 className="text-base font-bold tracking-tight text-gray-900">{value}</h2>
    </Card>
  );
}

function HeroCard({ value }) {
  return (
    <Card className="px-3 py-3 w-full rounded-2xl border-none shadow-[0_4px_16px_rgba(5,150,105,0.20)] hover:shadow-[0_8px_28px_rgba(5,150,105,0.30)] transition-all duration-300 relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-900 group">
      <div className="absolute -right-3 -bottom-3 opacity-10">
        <TrendingUp className="w-12 h-12 text-yellow-400" />
      </div>
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="p-1.5 bg-yellow-400/20 rounded-lg text-yellow-400 ring-1 ring-yellow-400/30">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
        <span className="text-[9px] font-bold text-green-950 bg-yellow-400 px-1.5 py-0.5 rounded-full leading-none mt-0.5">Success</span>
      </div>
      <div className="relative z-10">
        <p className="text-emerald-200 font-semibold tracking-widest text-[9px] uppercase mb-0.5">Total Served</p>
      </div>
        <h2 className="text-base font-bold tracking-tight text-white">{value}</h2>
    </Card>
  );
}

export default function ManagerPage() {
  const { data, isLoading } = useGetManagerDashboardQuery(undefined, {
    pollingInterval: 3000,
    refetchOnFocus: true,
  });

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
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-yellow-800">
                <Sparkles className="h-3 w-3 text-yellow-600" /> Executive View
              </span>
              <h1 className="text-3xl font-black tracking-tight text-green-950 md:text-4xl">
                Command Center
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-500">
                Real-time telemetry and staff performance metrics.
              </p>
            </div>
            <div className="group relative">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-emerald-600 opacity-30 blur transition duration-500 group-hover:opacity-60" />
              <div className="relative flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-green-950 shadow-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
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
                <StatCard icon={ClipboardList} label="Total Volume" value={data?.total_orders || 0} accent="amber" badge="+Live" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard icon={Users} label="Active Waiters" value={data?.total_waiters || 0} accent="blue" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard icon={TrendingUp} label="Revenue" value={`Rs ${data?.total_revenue || 0}`} accent="emerald" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard icon={ChefHat} label="Kitchen Staff" value={data?.total_chefs || 0} accent="yellow" />
              </motion.div>
              <motion.div variants={itemVariants} className="col-span-3 sm:col-span-1">
                <HeroCard value={data?.served_orders || 0} />
              </motion.div>
            </motion.div>

            {/* Pipeline — right 1/3 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-4 rounded-3xl border border-gray-200/80 bg-white shadow-sm h-full">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 flex items-center gap-1.5 mb-3">
                  <BarChart3 className="w-3 h-3" /> Pipeline
                </p>
                <div className="space-y-2.5">
                  {[
                    { icon: Clock,        label: "Pending",   value: data?.pending_orders   || 0, color: "text-yellow-600",  bg: "bg-yellow-50",   bar: "bg-yellow-400"  },
                    { icon: CookingPot,   label: "Preparing", value: data?.preparing_orders || 0, color: "text-blue-600",    bg: "bg-blue-50",     bar: "bg-blue-500"    },
                    { icon: PackageCheck, label: "Prepared",  value: data?.prepared_orders  || 0, color: "text-green-600",   bg: "bg-green-50",    bar: "bg-green-500"   },
                    { icon: CheckCircle2, label: "Served",    value: data?.served_orders    || 0, color: "text-emerald-600", bg: "bg-emerald-50",  bar: "bg-emerald-500" },
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
                            <span className="text-gray-700">{label}</span>
                            <span className={color}>{value}</span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
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
            <Card className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Weekly Revenue
                  </p>
                  <h3 className="text-2xl font-black text-green-950 mt-0.5">
                    Rs {data?.total_revenue || 0}
                  </h3>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  This week
                </span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weeklyRevenue} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "1px solid #e4e4e7", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(v) => [`Rs ${v}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 3, fill: "#059669", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

        </div>
      </div>
    </RoleGuard>
  );
}