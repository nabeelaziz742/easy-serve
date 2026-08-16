"use client";

import { useGetManagerCashOrdersQuery, useSettleCashPaymentMutation } from "@/services/private/orders";
import RoleGuard from "@/components/auth/RoleGuard";
import { Banknote, CheckCircle2 } from "lucide-react";

export default function ManagerCashPage() {
  const { data: ordersResponse, isLoading } = useGetManagerCashOrdersQuery(undefined, { pollingInterval: 15000 });
  const [settleCash, { isLoading: settling }] = useSettleCashPaymentMutation();
  const orders = Array.isArray(ordersResponse)
    ? ordersResponse
    : ordersResponse?.results || [];

  const handleSettle = async (id) => {
    try {
      await settleCash(id).unwrap();
    } catch (error) {
      alert(error?.data?.detail || "Unable to settle cash.");
    }
  };

  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin"]}>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900 flex items-center gap-2"><Banknote className="w-6 h-6" /> Cash Settlement</h1>
            <p className="text-sm text-gray-500 mt-1">Confirm physical cash received from waiters.</p>
          </div>
          <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">{orders.length} awaiting</span>
        </div>

        {isLoading ? <p className="text-gray-400">Loading cash queue...</p> : orders.length === 0 ? (
          <div className="bg-white border rounded-2xl p-10 text-center text-gray-400">No cash payments awaiting settlement.</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-orange-100 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between gap-3">
                  <div><p className="font-bold text-gray-800">Order #{order.id}</p><p className="text-sm text-gray-500">Table #{order.table_number || "—"}</p></div>
                  <p className="text-lg font-black text-emerald-700">Rs {order.total_price}</p>
                </div>
                <div className="mt-4 space-y-1 text-sm text-gray-600">
                  <p>Customer: {order.billing_first_name} {order.billing_last_name}</p>
                  <p>Waiter: {order.waiter_name || "Not assigned"}</p>
                  <p className="text-orange-700 font-semibold">Cash received by waiter — awaiting settlement</p>
                </div>
                <button disabled={settling} onClick={() => handleSettle(order.id)} className="w-full mt-5 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />{settling ? "Settling..." : "Settle Cash"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
