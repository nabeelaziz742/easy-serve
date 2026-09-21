"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RoleGuard from "@/components/auth/RoleGuard";
import { useGetManagerDashboardQuery } from "@/services/private/orders";
import {
  TrendingUp,
  Users,
  ChefHat,
  ClipboardList,
  CheckCircle2,
  Clock,
  CookingPot,
  PackageCheck,
  BarChart3,
  Sparkles,
  DollarSign,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 16 },
  },
};

const weeklyData = [
  { day: "Mon", orders: 12, revenue: 4500 },
  { day: "Tue", orders: 18, revenue: 6200 },
  { day: "Wed", orders: 15, revenue: 5100 },
  { day: "Thu", orders: 22, revenue: 7800 },
  { day: "Fri", orders: 35, revenue: 12400 },
  { day: "Sat", orders: 48, revenue: 16800 },
  { day: "Sun", orders: 40, revenue: 14200 },
];

export default function AnalyticsPage() {
  const { data, isLoading } = useGetManagerDashboardQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
  });

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["manager", "restaurant_owner"]}>
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <Skeleton className="h-10 w-64 rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      </RoleGuard>
    );
  }

  const statCards = [
    {
      label: "Total Orders",
      value: data?.total_orders || 0,
      icon: ClipboardList,
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-200",
    },
    {
      label: "Pending Orders",
      value: data?.pending_orders || 0,
      icon: Clock,
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      ring: "ring-yellow-200",
    },
    {
      label: "Served Orders",
      value: data?.served_orders || 0,
      icon: CheckCircle2,
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      ring: "ring-emerald-200",
    },
    {
      label: "Active Waiters",
      value: data?.total_waiters || 0,
      icon: Users,
      bg: "bg-blue-50",
      text: "text-blue-700",
      ring: "ring-blue-200",
    },
    {
      label: "Kitchen Staff",
      value: data?.total_chefs || 0,
      icon: ChefHat,
      bg: "bg-orange-50",
      text: "text-orange-700",
      ring: "ring-orange-200",
    },
    {
      label: "Total Revenue",
      value: `Rs ${data?.total_revenue || 0}`,
      icon: DollarSign,
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      ring: "ring-emerald-200",
    },
  ];

  const total = data?.total_orders || 1;
  const pipelineStages = [
    {
      label: "Pending Verification",
      value: data?.pending_orders || 0,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-500",
      pct: Math.round(((data?.pending_orders || 0) / total) * 100),
    },
    {
      label: "Kitchen In-Prep",
      value: data?.preparing_orders || 0,
      icon: CookingPot,
      color: "text-blue-600",
      bg: "bg-blue-500",
      pct: Math.round(((data?.preparing_orders || 0) / total) * 100),
    },
    {
      label: "Prepared & Plated",
      value: data?.prepared_orders  || 0,
      icon: PackageCheck,
      color: "text-green-600",
      bg: "bg-green-500",
      pct: Math.round(((data?.prepared_orders || 0) / total) * 100),
    },
    {
      label: "Served to Table",
      value: data?.served_orders || 0,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-500",
      pct: Math.round(((data?.served_orders || 0) / total) * 100),
    },
  ];

  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner"]}>
      <div className="mx-auto min-h-screen max-w-7xl space-y-8 px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-yellow-800">
              <Sparkles className="h-3 w-3 text-yellow-600" /> Performance Metrics
            </span>
            <h1 className="text-3xl font-black tracking-tight text-green-950 md:text-4xl">
              Analytics & Reporting
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Restaurant operational efficiency, order velocity, and staff performance overview.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live Syncing
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {statCards.map(({ label, value, icon: Icon, bg, text, ring }) => (
            <motion.div key={label} variants={itemVariants}>
              <Card className="smooth-card rounded-3xl border border-gray-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      {label}
                    </p>
                    <p className="mt-1 text-2xl font-black text-green-950">
                      {value}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3 ring-1 ${bg} ${text} ${ring}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts & Pipeline Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Order Velocity Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-green-950">
                    <BarChart3 className="h-5 w-5 text-amber-600" /> Order Velocity
                  </h3>
                  <p className="text-xs text-gray-500">Daily order count comparison</p>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                  Weekly
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "16px", border: "1px solid #e4e4e7", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  />
                  <Bar dataKey="orders" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Order Pipeline Progress */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-green-950">
                    <TrendingUp className="h-5 w-5 text-emerald-600" /> Kitchen Pipeline
                  </h3>
                  <p className="text-xs text-gray-500">Real-time status conversion funnel</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  {data?.total_orders || 0} Total
                </span>
              </div>
              <div className="space-y-4">
                {pipelineStages.map(({ label, value, icon: Icon, color, bg, pct }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-semibold text-gray-700">
                        <Icon className={`h-4 w-4 ${color}`} />
                        {label}
                      </span>
                      <span className="font-bold text-green-950">
                        {value} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        className={`h-full ${bg} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </RoleGuard>
  );
}