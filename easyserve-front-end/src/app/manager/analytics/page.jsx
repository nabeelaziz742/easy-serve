"use client";
import { useGetManagerDashboardQuery } from "@/services/private/orders";
import { TrendingUp, Users, ChefHat, ClipboardList, CheckCircle2 } from "lucide-react";

export default function AnalyticsPage() {
  const { data, isLoading } = useGetManagerDashboardQuery();

  const stats = [
    { label: "Total Orders",    value: data?.total_orders   || 0, icon: ClipboardList, color: "indigo" },
    { label: "Pending Orders",  value: data?.pending_orders  || 0, icon: TrendingUp,    color: "yellow" },
    { label: "Served Orders",   value: data?.served_orders   || 0, icon: CheckCircle2,  color: "emerald" },
    { label: "Active Waiters",  value: data?.total_waiters   || 0, icon: Users,         color: "blue" },
    { label: "Kitchen Staff",   value: data?.total_chefs     || 0, icon: ChefHat,       color: "orange" },
    { label: "Total Revenue",   value: `Rs ${data?.total_revenue || 0}`, icon: TrendingUp, color: "green" },
  ];

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-900">Analytics</h1>
        <p className="text-zinc-500 mt-1">Restaurant performance overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-zinc-200 p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
              <Icon size={24} />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900">{value}</p>
              <p className="text-zinc-500 text-sm">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Order Pipeline Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Order Pipeline</h2>
        <div className="space-y-4">
          {[
            { label: "Pending",   value: data?.pending_orders,   color: "bg-yellow-400",  max: data?.total_orders },
            { label: "Preparing", value: data?.preparing_orders, color: "bg-blue-400",    max: data?.total_orders },
            { label: "Prepared",  value: data?.prepared_orders,  color: "bg-green-400",   max: data?.total_orders },
            { label: "Served",    value: data?.served_orders,    color: "bg-emerald-500", max: data?.total_orders },
          ].map(({ label, value, color, max }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-zinc-700">{label}</span>
                <span className="text-zinc-500">{value || 0}</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-3">
                <div
                  className={`${color} h-3 rounded-full transition-all duration-500`}
                  style={{ width: max ? `${((value || 0) / max) * 100}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}