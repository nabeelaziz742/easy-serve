"use client";

import { motion } from "framer-motion";
import TableCard from "@/components/admin/TableCard";
import TableSkeleton from "@/components/admin/TableSkeleton";
import { useGetTablesQuery } from "@/services/private/tables";
import { Sparkles, Utensils } from "lucide-react";

export default function TablesPage() {
  const { data, isLoading, isError, isFetching } = useGetTablesQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const tables = data?.results ?? data ?? [];
  const showError = isError && !isFetching && tables.length === 0;

  const occupiedCount = tables.filter((t) => t.status === "OCCUPIED" || t.status === "ORDER_PLACED" || t.status === "PREPARING").length;
  const availableCount = tables.filter((t) => t.status === "EMPTY").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-yellow-800">
            <Sparkles className="h-3 w-3 text-yellow-600" /> Dining Floor
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-green-950">
            Table Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Real-time table occupancy, customer session tracking, and service status.
          </p>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 shadow-xs">
            {availableCount} Available
          </span>
          <span className="rounded-xl bg-yellow-50 text-yellow-900 border border-yellow-300 px-3 py-1.5 shadow-xs">
            {occupiedCount} Occupied
          </span>
          <span className="rounded-xl bg-gray-100 text-gray-700 px-3 py-1.5">
            {tables.length} Total Tables
          </span>
        </div>
      </div>

      {/* Grid */}
      <motion.div
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {isLoading &&
          [...Array(8)].map((_, i) => <TableSkeleton key={i} />)}

        {showError && (
          <div className="col-span-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
            Failed to load tables. Please check your network or refresh the page.
          </div>
        )}

        {!isLoading &&
          tables.map((table) => <TableCard key={table.id} table={table} />)}
      </motion.div>
    </div>
  );
}