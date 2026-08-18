"use client";

import { motion } from "framer-motion";
import TableCard from "@/components/admin/TableCard";
import TableSkeleton from "@/components/admin/TableSkeleton";
import { useGetTablesQuery } from "@/services/private/tables";


export default function TablesPage() {
  const { data, isLoading, isError, isFetching } = useGetTablesQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const tables = data?.results ?? data ?? [];
  // Only show the hard error state if we have no cached data at all AND
  // we're not currently mid-retry — a single transient failure (e.g. a
  // momentary SQLite lock while another request is writing) shouldn't
  // flash an error at the user when the next poll will succeed.
  const showError = isError && !isFetching && tables.length === 0;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 text-yellow-700">
        All Tables
      </h2>

      <motion.div
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {isLoading &&
          [...Array(6)].map((_, i) => <TableSkeleton key={i} />)}

        {showError && (
          <p className="text-red-600 font-medium">Failed to load tables.</p>
        )}

        {!isLoading &&
          tables.map((table) => <TableCard key={table.id} table={table} />)}
      </motion.div>
    </div>
  );
}