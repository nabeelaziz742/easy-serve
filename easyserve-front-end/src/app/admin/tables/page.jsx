"use client";

import { motion } from "framer-motion";
import TableCard from "@/components/admin/TableCard";
import TableSkeleton from "@/components/admin/TableSkeleton";
import { useGetTablesQuery } from "@/services/private/tables";


export default function TablesPage() {
  const { data, isLoading, isError } = useGetTablesQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
  });

  const tables = data?.results ?? [];

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

        {isError && (
          <p className="text-red-600 font-medium">Failed to load tables.</p>
        )}

        {!isLoading &&
          !isError &&
          tables.map((table) => <TableCard key={table.id} table={table} />)}
      </motion.div>
    </div>
  );
}
