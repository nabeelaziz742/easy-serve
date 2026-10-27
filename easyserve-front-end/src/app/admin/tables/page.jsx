"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { listVariants, fadeUp } from "@/lib/motion";
import PageHeader from "@/components/layout/PageHeader";
import TableCard from "@/components/admin/TableCard";
import TableSkeleton from "@/components/admin/TableSkeleton";
import { useGetTablesQuery } from "@/services/private/tables";
import { Printer, Utensils } from "lucide-react";
import { printTableQrs } from "@/utilities/tableQr";

export default function TablesPage() {
  const { data, isLoading, isError, isFetching } = useGetTablesQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const allTables = data?.results ?? data ?? [];
  // A super admin sees every restaurant's floor; let them pick one.
  const restaurants = useMemo(() => [...new Set(allTables.map((t) => t.restaurant))], [allTables]);
  const [restaurant, setRestaurant] = useState("");
  const tables = restaurant ? allTables.filter((t) => t.restaurant === restaurant) : allTables;
  const canPrintQr = tables.some((t) => t.qrCode);

  const printQrs = () => {
    if (!printTableQrs(tables)) toast.error("Allow pop-ups for this site to print the QR codes.");
  };

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
            {restaurants.length > 1 && (
              <select
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-gray-700"
              >
                <option value="">All restaurants</option>
                {restaurants.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            )}
            {canPrintQr && (
              <button
                type="button"
                onClick={printQrs}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-950 px-2.5 py-1 text-amber-400 transition hover:bg-green-900"
              >
                <Printer className="h-3.5 w-3.5" /> Print QR codes
              </button>
            )}
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