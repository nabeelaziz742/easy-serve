"use client";

import Link from "next/link";
import { Banknote, CheckCircle2, Clock3, Printer, UserRound, Utensils } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listVariants, itemVariants, hoverLift } from "@/lib/motion";
import { toast } from "sonner";
import {
  useGetManagerCashOrdersQuery,
  useSettleCashPaymentMutation,
} from "@/services/private/orders";

export default function ManagerCashSettlement() {
  const { data, isLoading } = useGetManagerCashOrdersQuery(undefined, {
    pollingInterval: 3000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true,
  });
  const [settleCash, { isLoading: settling }] = useSettleCashPaymentMutation();

  const orders = Array.isArray(data) ? data : data?.results || [];
  const total = orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0);

  const handleSettle = async (orderId) => {
    try {
      await settleCash(orderId).unwrap();
      toast.success("Cash payment settled successfully.");
    } catch (error) {
      toast.error(error?.data?.detail || "Unable to settle cash payment.");
    }
  };

  return (
    <div className="saas-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Banknote className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-zinc-900">Cash Settlement</h2>
              <p className="text-xs text-zinc-500">Cash received by waiters and awaiting manager account settlement.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200 tabular">
            {orders.length} pending
          </span>
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200 tabular">
            Rs {total.toFixed(2)}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          Loading cash settlements...
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-7 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
          <p className="mt-2 text-sm font-bold text-zinc-800">No cash settlements pending</p>
          <p className="mt-0.5 text-xs text-zinc-500">When a waiter marks cash received from a customer, it will appear here for final ledger settlement.</p>
        </div>
      ) : (
        <motion.div variants={listVariants} initial="hidden" animate="show" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              layout
              variants={itemVariants}
              exit="exit"
              whileHover={hoverLift}
              className="flex flex-col justify-between rounded-lg border border-amber-200/80 bg-amber-50/40 p-3.5 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-zinc-900">Order #{order.id}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-zinc-500">
                      <Utensils className="h-3.5 w-3.5 text-amber-600" /> Table #{order.table_number || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-green-950 tabular">Rs {order.total_price}</p>
                    <Link href={`/receipt/${order.id}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-800 hover:underline">
                      <Printer className="h-3 w-3" /> Bill
                    </Link>
                  </div>
                </div>
                <div className="mt-2 space-y-0.5 text-[11px] text-zinc-600">
                  <p className="flex items-center gap-1.5 font-medium">
                    <UserRound className="h-3.5 w-3.5 text-zinc-400" /> Waiter: <span className="font-bold text-zinc-800">{order.waiter_name || "Assigned waiter"}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-zinc-500">
                    <Clock3 className="h-3.5 w-3.5 text-amber-500" /> Cash received — awaiting ledger confirmation
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={settling}
                onClick={() => handleSettle(order.id)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-950 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-green-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                {settling ? "Settling Ledger..." : "Settle Cash to Ledger"}
              </button>
            </motion.div>
          ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

