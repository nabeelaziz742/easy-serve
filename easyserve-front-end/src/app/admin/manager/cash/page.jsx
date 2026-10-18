"use client";

import { useGetManagerCashOrdersQuery, useSettleCashPaymentMutation } from "@/services/private/orders";
import RoleGuard from "@/components/auth/RoleGuard";
import { Banknote, CheckCircle2, Clock3, Utensils, UserRound, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { listVariants, itemVariants, hoverLift, fadeUp } from "@/lib/motion";
import PageHeader from "@/components/layout/PageHeader";

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
        <PageHeader
          icon={Banknote}
          title="Cash Settlement"
          description="Confirm cash that waiters collected from tables."
          actions={
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-900">
                {orders.length} Awaiting
              </span>
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-900 tabular">
                Total Rs {total.toFixed(2)}
              </span>
            </div>
          }
        />

        {isLoading ? (
          <div className="saas-card p-8 text-center text-sm text-gray-400">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-yellow-600" />
            Loading cash settlement queue...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="font-bold text-sm text-gray-800 mt-2">All cash payments settled</p>
            <p className="text-xs text-gray-400 mt-1">No pending cash collections awaiting manager reconciliation.</p>
          </div>
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show" className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                layout
                variants={itemVariants}
                exit="exit"
                whileHover={hoverLift}
                className="saas-card border-orange-200/80 p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-yellow-600">
                      #{order.id}
                    </span>
                    <p className="font-black text-sm text-green-950 mt-0.5 flex items-center gap-1.5">
                      <Utensils className="h-3.5 w-3.5 text-yellow-600" />
                      Table #{order.table_number || "—"}
                    </p>
                  </div>
                  <span className="text-base font-black text-green-950 tabular">
                    Rs {order.total_price}
                  </span>
                </div>

                <div className="space-y-1 rounded-lg bg-orange-50/50 p-2.5 text-[11px] text-gray-700 border border-orange-100">
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
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-green-950 py-2 text-xs font-bold text-yellow-400 hover:bg-green-900 active:scale-[0.98] transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {settling ? "Confirming..." : "Confirm & Settle Cash"}
                </button>
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </RoleGuard>
  );
}
