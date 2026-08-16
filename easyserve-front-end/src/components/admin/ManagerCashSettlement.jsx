"use client";

import { Banknote, CheckCircle2, Clock3, UserRound, Utensils } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  useGetManagerCashOrdersQuery,
  useSettleCashPaymentMutation,
} from "@/services/private/orders";

export default function ManagerCashSettlement() {
  const { data, isLoading } = useGetManagerCashOrdersQuery(undefined, {
    pollingInterval: 10000,
    refetchOnFocus: true,
  });
  const [settleCash, { isLoading: settling }] = useSettleCashPaymentMutation();

  const orders = Array.isArray(data) ? data : data?.results || [];
  const total = orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0);

  const handleSettle = async (orderId) => {
    try {
      await settleCash(orderId).unwrap();
    } catch (error) {
      window.alert(error?.data?.detail || "Unable to settle cash payment.");
    }
  };

  return (
    <Card className="rounded-2xl border-orange-200/70 bg-white/90 p-5 shadow-sm dark:border-orange-500/20 dark:bg-zinc-900/90">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              <Banknote className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Cash Settlement</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Cash received by waiters and awaiting manager settlement.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
            {orders.length} pending
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            Rs {total.toFixed(2)}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          Loading cash settlements...
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
          <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">No cash settlements waiting.</p>
          <p className="mt-1 text-xs text-zinc-500">When a waiter receives cash, it will appear here automatically.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-orange-100 bg-orange-50/50 p-4 dark:border-orange-500/20 dark:bg-orange-500/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">Order #{order.id}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500"><Utensils className="h-3.5 w-3.5" /> Table #{order.table_number || "—"}</p>
                </div>
                <p className="font-bold text-orange-700 dark:text-orange-300">Rs {order.total_price}</p>
              </div>
              <div className="mt-3 space-y-1 text-xs text-zinc-500">
                <p className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> Waiter: {order.waiter_name || "Assigned waiter"}</p>
                <p className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Cash received — ready to settle</p>
              </div>
              <button
                type="button"
                disabled={settling}
                onClick={() => handleSettle(order.id)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {settling ? "Settling..." : "Settle Cash"}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
