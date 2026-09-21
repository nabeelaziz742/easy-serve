"use client";

import { useGetManagerCashOrdersQuery, useSettleCashPaymentMutation } from "@/services/private/orders";
import RoleGuard from "@/components/auth/RoleGuard";
import { Banknote, CheckCircle2, Clock3, Utensils, UserRound, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ManagerCashPage() {
  const { data: ordersResponse, isLoading } = useGetManagerCashOrdersQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
  });
  const [settleCash, { isLoading: settling }] = useSettleCashPaymentMutation();
  const orders = Array.isArray(ordersResponse)
    ? ordersResponse
    : ordersResponse?.results || [];

  const handleSettle = async (id) => {
    try {
      await settleCash(id).unwrap();
      toast.success("Cash payment settled successfully! 💰");
    } catch (error) {
      toast.error(error?.data?.detail || "Unable to settle cash payment.");
    }
  };

  const total = orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);

  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin"]}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-yellow-800">
              <Sparkles className="h-3 w-3 text-yellow-600" /> Cash Reconciliation
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-green-950 flex items-center gap-2">
              <Banknote className="h-7 w-7 text-yellow-600" /> Cash Settlement
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Reconcile and confirm physical currency collected by table waiters.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="rounded-2xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-orange-900 shadow-xs">
              {orders.length} Awaiting Settlement
            </span>
            <span className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-emerald-900 shadow-xs">
              Total Rs {total.toFixed(2)}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-yellow-600" />
            Loading cash settlement queue...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="font-bold text-sm text-gray-800 mt-2">All cash payments settled</p>
            <p className="text-xs text-gray-400 mt-1">No pending cash collections awaiting manager reconciliation.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                whileHover={{ y: -2 }}
                className="rounded-3xl border border-orange-200/80 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-yellow-600">
                      #{order.id}
                    </span>
                    <p className="font-black text-base text-green-950 mt-0.5 flex items-center gap-1.5">
                      <Utensils className="h-3.5 w-3.5 text-yellow-600" />
                      Table #{order.table_number || "—"}
                    </p>
                  </div>
                  <span className="text-xl font-black text-green-950">
                    Rs {order.total_price}
                  </span>
                </div>

                <div className="space-y-1.5 rounded-2xl bg-orange-50/50 p-3 text-xs text-gray-700 border border-orange-100">
                  <p className="font-semibold text-gray-900">
                    Customer: {order.billing_first_name} {order.billing_last_name}
                  </p>
                  <p className="flex items-center gap-1.5 text-gray-600">
                    <UserRound className="h-3.5 w-3.5 text-yellow-600" /> Waiter: {order.waiter_name || "Unassigned"}
                  </p>
                  <p className="flex items-center gap-1.5 font-bold text-orange-800 text-[11px]">
                    <Clock3 className="h-3.5 w-3.5" /> Cash collected · Awaiting manager verification
                  </p>
                </div>

                <button
                  disabled={settling}
                  onClick={() => handleSettle(order.id)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-green-950 py-3 text-xs font-bold text-yellow-400 shadow-md hover:bg-green-900 active:scale-[0.98] transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {settling ? "Confirming..." : "Confirm & Settle Cash"}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
