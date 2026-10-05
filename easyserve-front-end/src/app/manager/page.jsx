"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, ChefHat, ClipboardList, CheckCircle2, Clock,
  CookingPot, PackageCheck, TrendingUp, BarChart3, Sparkles,
  Boxes, Plus, SlidersHorizontal, UtensilsCrossed, Banknote,
  Zap, ArrowUpRight, Receipt, Percent, AlertTriangle,
  AlertCircle, ShoppingCart, ArrowDownRight, RefreshCw,
  Trash2, ChevronRight, Activity, ShieldCheck, Flame,
  FileSpreadsheet, CornerDownRight, XCircle
} from "lucide-react";
import { useGetCommandCenterQuery } from "@/services/private/financial";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const PERIOD_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "Last 7 Days" },
  { id: "this_month", label: "Last 30 Days" },
];

export default function ManagerPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("today");

  const { data, isLoading, isFetching, refetch } = useGetCommandCenterQuery(
    { period: selectedPeriod },
    {
      pollingInterval: 15000,
      refetchOnFocus: true,
    }
  );

  const fin = data?.financial;
  const pipeline = data?.pipeline;
  const attention = data?.attention;
  const inventoryAlerts = data?.inventory_alerts;
  const recentPurchases = data?.recent_purchases || [];
  const recentExpenses = data?.recent_expenses || [];
  const topProducts = data?.top_products || [];
  const recentActivities = data?.recent_activities || [];
  const trends = data?.trends || [];
  const periodInfo = data?.period;

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-72 rounded-2xl" />
          <Skeleton className="h-10 w-48 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin"]}>
      <div className="relative min-h-screen pb-16 font-sans bg-[#F7F7F4]/40 text-stone-900">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800c_1px,transparent_1px),linear-gradient(to_bottom,#8080800c_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none -z-10" />

        <div className="mx-auto py-8 px-4 sm:px-6 max-w-7xl space-y-6">

          {/* 1. HEADER & PERIOD SELECTOR */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs"
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/40 bg-yellow-50 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-yellow-800">
                  <Sparkles className="h-3 w-3 text-yellow-600" /> Manager Command Center
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live Telemetry
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#063B2E]">
                Restaurant Executive Dashboard
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm font-medium text-stone-500">
                Live database operations, kitchen throughput, P&L telemetry, and inventory alerts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
              {/* Period Selector Tabs */}
              <div className="flex items-center bg-stone-100/80 p-1 rounded-2xl border border-stone-200/70">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedPeriod(opt.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      selectedPeriod === opt.id
                        ? "bg-[#063B2E] text-yellow-400 shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Refresh CTA */}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                title="Refresh Live Telemetry"
                className="p-2 rounded-2xl border border-stone-200 bg-white text-stone-600 hover:text-[#063B2E] hover:border-stone-300 shadow-xs transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={isFetching ? "animate-spin text-emerald-700" : ""} />
              </button>
            </div>
          </motion.div>

          {/* 2. ATTENTION & ACTIONABLE ISSUES CENTER */}
          {attention?.total_alerts > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2.5"
            >
              {attention.alerts.map((alert) => {
                const isCrit = alert.severity === "critical";
                const isWarn = alert.severity === "warning";
                return (
                  <div
                    key={alert.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                      isCrit
                        ? "bg-red-50/80 border-red-200 text-red-950"
                        : isWarn
                        ? "bg-amber-50/80 border-amber-200 text-amber-950"
                        : "bg-blue-50/80 border-blue-200 text-blue-950"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        isCrit ? "bg-red-100 text-red-700" : isWarn ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {isCrit ? <AlertCircle size={18} /> : isWarn ? <AlertTriangle size={18} /> : <Boxes size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isCrit ? "bg-red-200 text-red-900" : isWarn ? "bg-amber-200 text-amber-900" : "bg-blue-200 text-blue-900"
                          }`}>
                            {alert.severity}
                          </span>
                          <h4 className="text-sm font-bold">{alert.title}</h4>
                        </div>
                        <p className="text-xs text-stone-600 mt-0.5">{alert.description}</p>
                      </div>
                    </div>
                    <Link
                      href={alert.cta_link}
                      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        isCrit
                          ? "bg-red-700 text-white hover:bg-red-800"
                          : isWarn
                          ? "bg-amber-700 text-white hover:bg-amber-800"
                          : "bg-blue-700 text-white hover:bg-blue-800"
                      }`}
                    >
                      <span>{alert.cta_label}</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* 3. EXECUTIVE FINANCIAL INTELLIGENCE (P&L SNAPSHOT) */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#063B2E] text-yellow-400 flex items-center justify-center font-bold">
                  <TrendingUp size={15} />
                </div>
                <h3 className="text-base font-black text-[#063B2E] tracking-tight">
                  Financial Performance & P&L
                </h3>
                <span className="text-xs font-semibold text-stone-400">
                  ({periodInfo?.preset?.replace(/_/g, " ") || "Selected Period"})
                </span>
              </div>
              <Link
                href="/manager/reports"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#063B2E] hover:text-emerald-700 transition-colors"
              >
                <span>Full P&L Statement</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Card 1: Net Sales */}
              <motion.div variants={itemVariants}>
                <Card className="p-4 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-[#063B2E]/30 transition-all flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-emerald-50 rounded-xl text-emerald-800 ring-1 ring-emerald-400/20">
                        <TrendingUp size={16} />
                      </div>
                      {fin?.comparisons?.revenue_growth_pct !== null && fin?.comparisons?.revenue_growth_pct !== undefined && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          fin.comparisons.revenue_growth_pct >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}>
                          {fin.comparisons.revenue_growth_pct >= 0 ? "+" : ""}{fin.comparisons.revenue_growth_pct}%
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Net Sales</p>
                    <h3 className="text-lg font-black text-[#063B2E] tracking-tight mt-0.5">
                      Rs. {Number(fin?.revenue?.net_sales || 0).toLocaleString()}
                    </h3>
                  </div>
                  <p className="text-[11px] font-medium text-stone-500 mt-2 border-t border-stone-100 pt-2">
                    {fin?.revenue?.orders_count || 0} valid orders
                  </p>
                </Card>
              </motion.div>

              {/* Card 2: Food COGS */}
              <motion.div variants={itemVariants}>
                <Card className="p-4 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-blue-900/30 transition-all flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-blue-50 rounded-xl text-blue-700 ring-1 ring-blue-400/20">
                        <UtensilsCrossed size={16} />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {fin?.costs?.food_cost_percentage || 0}% Food Cost
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Historical COGS</p>
                    <h3 className="text-lg font-black text-blue-950 tracking-tight mt-0.5">
                      Rs. {Number(fin?.costs?.cogs || 0).toLocaleString()}
                    </h3>
                  </div>
                  <p className="text-[11px] font-medium text-stone-500 mt-2 border-t border-stone-100 pt-2">
                    Direct ingredients consumed
                  </p>
                </Card>
              </motion.div>

              {/* Card 3: Gross Profit */}
              <motion.div variants={itemVariants}>
                <Card className="p-4 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-emerald-700/30 transition-all flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-emerald-50 rounded-xl text-[#063B2E] ring-1 ring-emerald-500/20">
                        <Percent size={16} />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                        {fin?.profitability?.gross_margin || 0}% Margin
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Gross Profit</p>
                    <h3 className="text-lg font-black text-[#063B2E] tracking-tight mt-0.5">
                      Rs. {Number(fin?.profitability?.gross_profit || 0).toLocaleString()}
                    </h3>
                  </div>
                  <p className="text-[11px] font-medium text-stone-500 mt-2 border-t border-stone-100 pt-2">
                    Sales minus COGS
                  </p>
                </Card>
              </motion.div>

              {/* Card 4: Operating Expenses */}
              <motion.div variants={itemVariants}>
                <Card className="p-4 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-amber-700/30 transition-all flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-amber-50 rounded-xl text-amber-800 ring-1 ring-amber-400/20">
                        <Receipt size={16} />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        {fin?.costs?.expense_count || 0} active
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Operating Expenses</p>
                    <h3 className="text-lg font-black text-amber-950 tracking-tight mt-0.5">
                      Rs. {Number(fin?.costs?.operating_expenses || 0).toLocaleString()}
                    </h3>
                  </div>
                  <p className="text-[11px] font-medium text-stone-500 mt-2 border-t border-stone-100 pt-2">
                    Rent, utilities, payroll
                  </p>
                </Card>
              </motion.div>

              {/* Card 5: Stock Wastage */}
              <motion.div variants={itemVariants}>
                <Card className="p-4 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-red-700/30 transition-all flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-red-50 rounded-xl text-red-700 ring-1 ring-red-400/20">
                        <Trash2 size={16} />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-900">
                        {fin?.costs?.wastage_count || 0} logs
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Wastage Loss</p>
                    <h3 className="text-lg font-black text-red-950 tracking-tight mt-0.5">
                      Rs. {Number(fin?.costs?.wastage || 0).toLocaleString()}
                    </h3>
                  </div>
                  <p className="text-[11px] font-medium text-stone-500 mt-2 border-t border-stone-100 pt-2">
                    Operational loss/spoilage
                  </p>
                </Card>
              </motion.div>

              {/* Card 6: Net Operating Result (Hero) */}
              <motion.div variants={itemVariants}>
                <Card className="p-4 rounded-3xl bg-gradient-to-br from-[#063B2E] via-[#084D3C] to-[#04281F] text-white border-none shadow-md flex flex-col justify-between h-full relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-10 text-yellow-400">
                    <TrendingUp size={64} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-yellow-400/20 rounded-xl text-yellow-400 ring-1 ring-yellow-400/30">
                        <CheckCircle2 size={16} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400 text-[#063B2E]">
                        {fin?.profitability?.net_margin || 0}% Net
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Operating Result</p>
                    <h3 className="text-lg font-black text-yellow-400 tracking-tight mt-0.5">
                      Rs. {Number(fin?.profitability?.operating_result || 0).toLocaleString()}
                    </h3>
                  </div>
                  <p className="text-[11px] font-medium text-emerald-200/80 mt-2 border-t border-emerald-800/80 pt-2 relative z-10">
                    Gross profit − expenses − wastage
                  </p>
                </Card>
              </motion.div>
            </div>
          </motion.div>

          {/* 4. LIVE ORDER PIPELINE & FLOOR TELEMETRY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Left 2 Cols: Live Kitchen & Order Pipeline */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                        <ClipboardList size={15} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#063B2E] tracking-tight">
                          Live Order Pipeline
                        </h3>
                        <p className="text-xs text-stone-500">
                          {pipeline?.total_orders || 0} total orders in {selectedPeriod.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/manager/waiters"
                      className="text-xs font-bold text-[#063B2E] hover:text-emerald-700 flex items-center gap-1"
                    >
                      <span>Manage Orders</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>

                  {/* Pipeline Stage Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
                    {[
                      { label: "Placed", count: pipeline?.pending || 0, color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200/70", icon: Clock },
                      { label: "Preparing", count: pipeline?.preparing || 0, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200/70", icon: CookingPot },
                      { label: "Prepared", count: pipeline?.prepared || 0, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200/70", icon: PackageCheck },
                      { label: "Served", count: pipeline?.served || 0, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200/70", icon: CheckCircle2 },
                      { label: "Completed", count: pipeline?.completed || 0, color: "text-stone-700", bg: "bg-stone-50", border: "border-stone-200/70", icon: ShieldCheck },
                    ].map((stg) => {
                      const Icon = stg.icon;
                      return (
                        <div
                          key={stg.label}
                          className={`p-3 rounded-2xl border ${stg.border} ${stg.bg} flex flex-col justify-between`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                              {stg.label}
                            </span>
                            <Icon size={13} className={stg.color} />
                          </div>
                          <p className={`text-xl font-black ${stg.color}`}>
                            {stg.count}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Visual ratio bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-stone-500">
                      <span>Kitchen Queue Progress</span>
                      <span>{pipeline?.orders_in_kitchen || 0} active in kitchen</span>
                    </div>
                    <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden flex">
                      {pipeline?.total_orders > 0 ? (
                        <>
                          <div style={{ width: `${((pipeline?.pending || 0) / pipeline.total_orders) * 100}%` }} className="bg-yellow-400 transition-all duration-500" title="Placed" />
                          <div style={{ width: `${((pipeline?.preparing || 0) / pipeline.total_orders) * 100}%` }} className="bg-blue-500 transition-all duration-500" title="Preparing" />
                          <div style={{ width: `${((pipeline?.prepared || 0) / pipeline.total_orders) * 100}%` }} className="bg-purple-500 transition-all duration-500" title="Prepared" />
                          <div style={{ width: `${((pipeline?.served || 0) / pipeline.total_orders) * 100}%` }} className="bg-emerald-500 transition-all duration-500" title="Served" />
                          <div style={{ width: `${((pipeline?.completed || 0) / pipeline.total_orders) * 100}%` }} className="bg-stone-700 transition-all duration-500" title="Completed" />
                        </>
                      ) : (
                        <div className="w-full bg-stone-200" />
                      )}
                    </div>
                  </div>
                </div>

                {pipeline?.cancelled > 0 && (
                  <p className="text-[11px] text-red-600 font-bold mt-4 flex items-center gap-1">
                    <XCircle size={13} />
                    <span>{pipeline.cancelled} cancelled order(s) excluded from sales calculation</span>
                  </p>
                )}
              </Card>
            </motion.div>

            {/* Right 1 Col: Staff Telemetry & Readiness */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                        <Users size={15} />
                      </div>
                      <h3 className="text-sm font-black text-[#063B2E] tracking-tight">
                        Floor & Kitchen Staff
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                          <Users size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-900">Active Waiters</p>
                          <p className="text-[10px] text-stone-500">Floor service team</p>
                        </div>
                      </div>
                      <span className="text-lg font-black text-blue-900">{pipeline?.active_waiters || 0}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                          <ChefHat size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-900">Kitchen Chefs</p>
                          <p className="text-[10px] text-stone-500">Production line</p>
                        </div>
                      </div>
                      <span className="text-lg font-black text-amber-900">{pipeline?.active_chefs || 0}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/70 border border-purple-100">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                          <PackageCheck size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-purple-950">Ready to Serve</p>
                          <p className="text-[10px] text-purple-700">Awaiting waiter pickup</p>
                        </div>
                      </div>
                      <span className="text-lg font-black text-purple-950">{pipeline?.orders_ready_to_serve || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-500">Service readiness</span>
                  <span className="font-bold text-[#063B2E]">Optimal</span>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* 5. FINANCIAL PERFORMANCE TREND (RECHARTS) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                      <BarChart3 size={15} />
                    </div>
                    <h3 className="text-sm font-black text-[#063B2E] tracking-tight">
                      Financial Performance Trends
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Daily breakdown of Net Sales, Gross Profit, and Operating Result.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-[#063B2E]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#063B2E]" /> Sales
                  </span>
                  <span className="flex items-center gap-1.5 text-yellow-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Gross Profit
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Operating Result
                  </span>
                </div>
              </div>

              {trends.length > 0 ? (
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#063B2E" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#063B2E" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4A72C" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#D4A72C" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day_label" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "16px",
                          border: "1px solid #e7e5e4",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                        formatter={(val, name) => [`Rs. ${Number(val || 0).toLocaleString()}`, name]}
                      />
                      <Area type="monotone" dataKey="sales" name="Sales" stroke="#063B2E" strokeWidth={2.5} fill="url(#salesGrad)" />
                      <Area type="monotone" dataKey="gross_profit" name="Gross Profit" stroke="#D4A72C" strokeWidth={2} fill="url(#profitGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-stone-400 text-xs font-medium">
                  No time-series transactions recorded for this period.
                </div>
              )}
            </Card>
          </motion.div>

          {/* 6. INVENTORY ATTENTION WIDGET */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-bold">
                    <Boxes size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#063B2E] tracking-tight">
                      Inventory Health & Depletion Warnings
                    </h3>
                    <p className="text-xs text-stone-500">
                      {inventoryAlerts?.out_of_stock_count || 0} out of stock, {inventoryAlerts?.low_stock_count || 0} low stock
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/manager/inventory?action=add"
                    className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors"
                  >
                    + Add Item
                  </Link>
                  <Link
                    href="/manager/inventory"
                    className="px-3 py-1.5 rounded-xl bg-[#063B2E] hover:bg-emerald-900 text-yellow-400 font-bold text-xs transition-colors"
                  >
                    View All Stock
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Out of stock items */}
                <div className="p-4 rounded-2xl bg-red-50/40 border border-red-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                      <XCircle size={14} className="text-red-600" /> Out of Stock (Critical)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-200 text-red-900">
                      {inventoryAlerts?.out_of_stock_count || 0}
                    </span>
                  </div>

                  {inventoryAlerts?.critical_items?.length > 0 ? (
                    <div className="space-y-2">
                      {inventoryAlerts.critical_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-red-200/60 shadow-2xs">
                          <div>
                            <p className="text-xs font-bold text-stone-900">{item.name}</p>
                            <p className="text-[10px] text-stone-500">{item.category_name} • SKU: {item.sku || "N/A"}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-red-600">0 {item.uom_symbol}</span>
                            <p className="text-[10px] text-stone-400">Min: {item.min_reorder_level} {item.uom_symbol}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 italic py-4 text-center">No depleted items.</p>
                  )}
                </div>

                {/* Low stock items */}
                <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-600" /> Low Stock (Reorder Needed)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      {inventoryAlerts?.low_stock_count || 0}
                    </span>
                  </div>

                  {inventoryAlerts?.warning_items?.length > 0 ? (
                    <div className="space-y-2">
                      {inventoryAlerts.warning_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-amber-200/60 shadow-2xs">
                          <div>
                            <p className="text-xs font-bold text-stone-900">{item.name}</p>
                            <p className="text-[10px] text-stone-500">{item.category_name} • SKU: {item.sku || "N/A"}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-amber-700">{item.current_stock} {item.uom_symbol}</span>
                            <p className="text-[10px] text-stone-400">Reorder at: {item.min_reorder_level} {item.uom_symbol}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 italic py-4 text-center">All active stock above threshold.</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* 7. PURCHASES & EXPENSES ACTIVITY SNAPSHOTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Recent Purchases */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                        <ShoppingCart size={15} />
                      </div>
                      <h3 className="text-sm font-black text-[#063B2E] tracking-tight">
                        Recent Purchases (Stock In)
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href="/manager/purchases"
                        className="text-xs font-bold text-[#063B2E] hover:text-emerald-700 flex items-center gap-1"
                      >
                        <span>View All</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>

                  {recentPurchases.length > 0 ? (
                    <div className="divide-y divide-stone-100">
                      {recentPurchases.map((po) => (
                        <div key={po.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-stone-900">{po.purchase_number}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                po.status_value === 2 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {po.status_label}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">{po.supplier_name} • {po.purchase_date}</p>
                          </div>
                          <span className="text-xs font-black text-stone-900">
                            Rs. {Number(po.total_amount || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-stone-400">
                      No recent purchases recorded.
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100 mt-4">
                  <Link
                    href="/manager/purchases"
                    className="w-full py-2 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} />
                    <span>Create New Purchase Order</span>
                  </Link>
                </div>
              </Card>
            </motion.div>

            {/* Recent Expenses */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                        <Receipt size={15} />
                      </div>
                      <h3 className="text-sm font-black text-[#063B2E] tracking-tight">
                        Recent Operating Expenses
                      </h3>
                    </div>
                    <Link
                      href="/manager/expenses"
                      className="text-xs font-bold text-[#063B2E] hover:text-emerald-700 flex items-center gap-1"
                    >
                      <span>View All</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>

                  {recentExpenses.length > 0 ? (
                    <div className="divide-y divide-stone-100">
                      {recentExpenses.map((exp) => (
                        <div key={exp.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-stone-900">{exp.title}</span>
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900">
                                {exp.category_name}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">{exp.payment_method_label} • {exp.expense_date}</p>
                          </div>
                          <span className="text-xs font-black text-amber-950">
                            Rs. {Number(exp.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-stone-400">
                      No active operating expenses logged.
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100 mt-4">
                  <Link
                    href="/manager/expenses"
                    className="w-full py-2 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} />
                    <span>Record Operating Expense</span>
                  </Link>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* 8. TOP SELLING PRODUCTS & RECENT ACTIVITY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Top Selling Products */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center font-bold">
                        <Flame size={15} />
                      </div>
                      <h3 className="text-sm font-black text-[#063B2E] tracking-tight">
                        Top Selling Menu Items
                      </h3>
                    </div>
                    <Link
                      href="/manager/menu"
                      className="text-xs font-bold text-[#063B2E] hover:text-emerald-700 flex items-center gap-1"
                    >
                      <span>Menu Catalog</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>

                  {topProducts.length > 0 ? (
                    <div className="space-y-2.5">
                      {topProducts.map((p, idx) => (
                        <div key={idx} className="p-3 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-white border border-stone-200 text-[#063B2E] font-black text-xs flex items-center justify-center shadow-2xs">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-stone-900">{p.name}</p>
                              <p className="text-[10px] text-stone-500">{p.units_sold} sold • {p.food_cost_percentage}% food cost</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-[#063B2E]">
                              Rs. {Number(p.revenue || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-emerald-700 font-semibold">
                              +Rs. {Number(p.gross_profit || 0).toLocaleString()} profit
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-stone-400">
                      No menu item sales recorded in this period.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 mt-4 text-center">
                  <Link
                    href="/manager/reports"
                    className="text-xs font-bold text-stone-500 hover:text-[#063B2E] transition-colors"
                  >
                    View Comprehensive Product Profitability Breakdown →
                  </Link>
                </div>
              </Card>
            </motion.div>

            {/* Unified Recent Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Card className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold">
                        <Activity size={15} />
                      </div>
                      <h3 className="text-sm font-black text-[#063B2E] tracking-tight">
                        Recent Activity Feed
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                      Audit Log
                    </span>
                  </div>

                  {recentActivities.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivities.map((act) => {
                        const isPo = act.type === "PURCHASE_RECEIVED";
                        const isExp = act.type === "EXPENSE_RECORDED";
                        const isAdj = act.type === "STOCK_ADJUSTMENT";
                        const isWst = act.type === "WASTAGE_RECORDED";

                        return (
                          <div key={act.id} className="flex items-start gap-3 text-xs">
                            <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                              isPo ? "bg-emerald-50 text-emerald-800" : isExp ? "bg-amber-50 text-amber-800" : isAdj ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-800"
                            }`}>
                              {isPo ? <PackageCheck size={14} /> : isExp ? <Receipt size={14} /> : isAdj ? <SlidersHorizontal size={14} /> : <Trash2 size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <p className="font-bold text-stone-900 truncate">{act.title}</p>
                                <span className="text-[10px] font-bold text-stone-600">
                                  Rs. {Number(act.amount || 0).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 truncate">{act.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-stone-400">
                      No system events logged in this session.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 mt-4 text-center">
                  <span className="text-[11px] text-stone-400 font-medium">
                    Fully audited and tenant-isolated operations
                  </span>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* 9. MANAGER QUICK ACTIONS (PRESERVED & ENHANCED) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#063B2E] text-yellow-400 flex items-center justify-center">
                    <Zap size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#063B2E] tracking-tight">
                      Manager Quick Actions
                    </h3>
                    <p className="text-xs text-stone-500">
                      Fast shortcuts to core operational and financial workflows.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Commercial SaaS
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Financial Reports */}
                <Link
                  href="/manager/reports"
                  className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/70 hover:bg-[#063B2E] hover:border-[#063B2E] group transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white text-[#063B2E] group-hover:bg-yellow-400 group-hover:text-[#063B2E] flex items-center justify-center shadow-2xs transition-colors">
                      <TrendingUp size={16} />
                    </div>
                    <ArrowUpRight size={14} className="text-stone-400 group-hover:text-yellow-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 group-hover:text-white transition-colors">
                      P&L Reports
                    </p>
                    <p className="text-[11px] text-stone-500 group-hover:text-emerald-200 transition-colors mt-0.5 truncate">
                      P&L & intelligence
                    </p>
                  </div>
                </Link>

                {/* 2. Expenses */}
                <Link
                  href="/manager/expenses"
                  className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/70 hover:bg-[#063B2E] hover:border-[#063B2E] group transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white text-[#063B2E] group-hover:bg-yellow-400 group-hover:text-[#063B2E] flex items-center justify-center shadow-2xs transition-colors">
                      <Receipt size={16} />
                    </div>
                    <ArrowUpRight size={14} className="text-stone-400 group-hover:text-yellow-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 group-hover:text-white transition-colors">
                      Record Expense
                    </p>
                    <p className="text-[11px] text-stone-500 group-hover:text-emerald-200 transition-colors mt-0.5 truncate">
                      Operating overheads
                    </p>
                  </div>
                </Link>

                {/* 3. Add Inventory Item */}
                <Link
                  href="/manager/inventory?action=add"
                  className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/70 hover:bg-[#063B2E] hover:border-[#063B2E] group transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white text-[#063B2E] group-hover:bg-yellow-400 group-hover:text-[#063B2E] flex items-center justify-center shadow-2xs transition-colors">
                      <Plus size={16} />
                    </div>
                    <ArrowUpRight size={14} className="text-stone-400 group-hover:text-yellow-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 group-hover:text-white transition-colors">
                      Add Inventory
                    </p>
                    <p className="text-[11px] text-stone-500 group-hover:text-emerald-200 transition-colors mt-0.5 truncate">
                      Track new raw item
                    </p>
                  </div>
                </Link>

                {/* 4. Stock Adjustment */}
                <Link
                  href="/manager/inventory?action=adjust"
                  className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/70 hover:bg-[#063B2E] hover:border-[#063B2E] group transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white text-[#063B2E] group-hover:bg-yellow-400 group-hover:text-[#063B2E] flex items-center justify-center shadow-2xs transition-colors">
                      <SlidersHorizontal size={15} />
                    </div>
                    <ArrowUpRight size={14} className="text-stone-400 group-hover:text-yellow-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 group-hover:text-white transition-colors">
                      Stock Adjust
                    </p>
                    <p className="text-[11px] text-stone-500 group-hover:text-emerald-200 transition-colors mt-0.5 truncate">
                      Reconcile audit counts
                    </p>
                  </div>
                </Link>

                {/* 5. Manage Menu Items */}
                <Link
                  href="/manager/menu"
                  className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/70 hover:bg-[#063B2E] hover:border-[#063B2E] group transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white text-[#063B2E] group-hover:bg-yellow-400 group-hover:text-[#063B2E] flex items-center justify-center shadow-2xs transition-colors">
                      <UtensilsCrossed size={16} />
                    </div>
                    <ArrowUpRight size={14} className="text-stone-400 group-hover:text-yellow-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 group-hover:text-white transition-colors">
                      Menu Items
                    </p>
                    <p className="text-[11px] text-stone-500 group-hover:text-emerald-200 transition-colors mt-0.5 truncate">
                      Dishes & pricing
                    </p>
                  </div>
                </Link>

                {/* 6. Cash Settlement */}
                <Link
                  href="/manager/cash"
                  className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/70 hover:bg-[#063B2E] hover:border-[#063B2E] group transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white text-[#063B2E] group-hover:bg-yellow-400 group-hover:text-[#063B2E] flex items-center justify-center shadow-2xs transition-colors">
                      <Banknote size={16} />
                    </div>
                    <ArrowUpRight size={14} className="text-stone-400 group-hover:text-yellow-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 group-hover:text-white transition-colors">
                      Cash Settlement
                    </p>
                    <p className="text-[11px] text-stone-500 group-hover:text-emerald-200 transition-colors mt-0.5 truncate">
                      Reconcile register
                    </p>
                  </div>
                </Link>
              </div>
            </Card>
          </motion.div>

        </div>
      </div>
    </RoleGuard>
  );
}