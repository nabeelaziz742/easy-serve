"use client";

import { motion } from "framer-motion";
import { listVariants, fadeUp } from "@/lib/motion";
import PageHeader from "@/components/layout/PageHeader";
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

  const BUSY_STATUSES = ["OCCUPIED", "ORDER_PLACED", "PREPARING", "READY", "SERVED", "PAYMENT_PENDING"];
  const occupiedCount = tables.filter((t) => BUSY_STATUSES.includes(t.status)).length;
  const availableCount = tables.filter((t) => t.status === "EMPTY").length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Utensils}
        title="Tables"
        description="See which tables are free, seated or waiting on food."
        live
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
              {availableCount} Available
            </span>
            <span className="rounded-lg border border-yellow-300 bg-yellow-50 px-2.5 py-1 text-yellow-900">
              {occupiedCount} Occupied
            </span>
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700">
              {tables.length} Total
            </span>
          </div>
        }
      />

      {/* Grid */}
      <motion.div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        variants={listVariants}
        initial="hidden"
        animate="show"
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