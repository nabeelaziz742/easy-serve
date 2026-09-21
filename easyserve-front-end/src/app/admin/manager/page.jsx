"use client";

import { motion } from "framer-motion";
import {
  Users,
  ClipboardList,
  CheckCircle,
  Clock,
  Sparkles,
  TrendingUp,
  ChefHat,
  Banknote,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetManagerDashboardQuery } from "@/services/private/orders";
import { useGetMeQuery } from "@/services/private/me";

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
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export default function ManagerDashboardPage() {
  const { data: me } = useGetMeQuery();
  const { data, isLoading } = useGetManagerDashboardQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
  });

  const managerName =
    `${me?.profile?.first_name || ""} ${me?.profile?.last_name || ""}`.trim() ||
    me?.username ||
    "Restaurant Manager";

  const stats = [
    {
      title: "Total Orders",
      value: data?.total_orders || 0,
      icon: ClipboardList,
      color: "bg-amber-50 text-amber-800 border-amber-200",
      accent: "text-amber-600",
    },
    {
      title: "Orders Served",
      value: data?.served_orders || 0,
      icon: CheckCircle,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      accent: "text-emerald-600",
    },
    {
      title: "Pending Orders",
      value: data?.pending_orders || 0,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-900 border-yellow-200",
      accent: "text-yellow-600",
    },
    {
      title: "Total Revenue",
      value: `Rs ${data?.total_revenue || 0}`,
      icon: Banknote,
      color: "bg-green-50 text-green-900 border-green-200",
      accent: "text-green-700",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Manager Profile & Status Hero Card */}
      <section className="smooth-card relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-yellow-400 to-green-900" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-green-950 text-yellow-400 shadow-md font-black text-xl">
              {managerName[0]?.toUpperCase() || "M"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-green-950">
                  {managerName}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" /> Manager on Duty
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                EasyServe Executive Operations & Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400">Shift Date</p>
              <p className="font-bold text-gray-900 mt-0.5">{new Date().toDateString()}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.title} variants={itemVariants}>
              <Card className="smooth-card rounded-3xl border border-gray-200/80 bg-white p-5 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {s.title}
                    </p>
                    <p className="mt-1 text-2xl font-black text-green-950">
                      {s.value}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3 border ${s.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Staff Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-600" />
              <h3 className="font-bold text-lg text-green-950">Active Waiters</h3>
            </div>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-900 border border-green-200">
              {data?.total_waiters || 0} Staff Active
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Waiters currently logged into table floor and accepting customer order requests.
          </p>
        </Card>

        <Card className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-yellow-600" />
              <h3 className="font-bold text-lg text-green-950">Kitchen Chefs</h3>
            </div>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-900 border border-green-200">
              {data?.total_chefs || 0} Staff Active
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Kitchen staff preparing dishes and updating order preparation status.
          </p>
        </Card>
      </div>
    </div>
  );
}
