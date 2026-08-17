"use client";

import { motion } from "framer-motion";
import TableCard from "@/components/admin/TableCard";
import TableSkeleton from "@/components/admin/TableSkeleton";
import { useGetTablesQuery } from "@/services/private/tables";


export default function TablesPage() {
  const { data, isLoading, isFetching, isError } = useGetTablesQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
  });

  // The dashboard tables endpoint can return either a plain DRF list or a
  // paginated object depending on the active backend pagination settings.
  // Normalize both shapes so a valid response can never silently render as an
  // empty table grid.
  const tables = Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.data)
        ? data.data
        : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-yellow-700">
          All Tables
        </h2>
        {isFetching && !isLoading && (
          <span className="text-xs text-gray-400">Updating…</span>
        )}
      </div>

      <motion.div
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {isLoading &&
          [...Array(6)].map((_, i) => <TableSkeleton key={i} />)}

        {isError && (
          <p className="text-red-600 font-medium">Failed to load tables.</p>
        )}

        {!isLoading &&
          !isError &&
          tables.map((table) => <TableCard key={table.id} table={table} />)}

        {!isLoading && !isError && tables.length === 0 && (
          <p className="text-gray-500 font-medium">No tables available.</p>
        )}
      </motion.div>
    </div>
  );
}
