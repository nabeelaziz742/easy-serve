"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle, UtensilsCrossed, Truck, Banknote } from "lucide-react";
import TableCard from "@/components/admin/TableCard";
import { useGetWaiterDashboardQuery, useGetWaiterCashOrdersQuery, useReceiveCashPaymentMutation } from "@/services/private/waiter";

export default function DashboardPage() {
  const { data, isLoading, isError } = useGetWaiterDashboardQuery(undefined, { pollingInterval: 60000 });
  const { data: cashOrdersResponse, isLoading: cashLoading } = useGetWaiterCashOrdersQuery(undefined, { pollingInterval: 15000 });
  const [receiveCash, { isLoading: receivingCash }] = useReceiveCashPaymentMutation();

  if (isLoading) return <p>Loading dashboard...</p>;
  if (isError) return <p>Error loading dashboard</p>;

  const user = data.user;
  const apiStats = data.stats;
  const tables = data.tables;
  const cashOrders = Array.isArray(cashOrdersResponse)
    ? cashOrdersResponse
    : cashOrdersResponse?.results || [];

  const stats = [
    { title: "Total Orders Today", value: apiStats.total_orders, icon: UtensilsCrossed, color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
    { title: "Orders Served", value: apiStats.served_orders, icon: CheckCircle, color: "bg-green-50 text-green-700 border-green-100" },
    { title: "Ready for Pickup", value: apiStats.ready_orders, icon: Truck, color: "bg-blue-50 text-blue-700 border-blue-100" },
    { title: "Avg Serve Time", value: `${apiStats.avg_serve_time} min`, icon: Clock, color: "bg-purple-50 text-purple-700 border-purple-100" },
  ];

  const handleReceiveCash = async (orderId) => {
    try {
      await receiveCash(orderId).unwrap();
    } catch (error) {
      alert(error?.data?.detail || "Unable to record cash receipt.");
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex items-center justify-between flex-wrap gap-6">
        <div className="flex items-center gap-5">
          <img src={user.profile_image} alt="PROFILE" className="w-16 h-16 rounded-full border-2 border-yellow-400 object-cover shadow-sm" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{user.name}</h2>
            <p className="text-sm text-gray-500 mt-1">ID: {user.waiter_id}</p>
            <p className="text-sm font-medium text-yellow-700 mt-2 bg-yellow-50 px-3 py-1 rounded-full w-fit">{user.role}</p>
          </div>
        </div>
        <div className="text-right text-gray-600">
          <p className="text-sm">Shift: {user.shift_start} / {user.shift_end}</p>
          <p className="text-sm mt-1">Date: {new Date().toDateString()}</p>
        </div>
      </div>

      <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {stats.map((s, i) => (
          <motion.div key={i} whileHover={{ scale: 1.04 }} className={`rounded-2xl p-5 flex items-center gap-4 border shadow-sm transition-all duration-200 ${s.color}`}>
            <s.icon className="w-8 h-8 opacity-80" />
            <div><p className="text-sm font-medium">{s.title}</p><h3 className="text-xl font-semibold">{s.value}</h3></div>
          </motion.div>
        ))}
      </motion.div>

      <section className="bg-white border border-orange-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-orange-800 flex items-center gap-2"><Banknote className="w-5 h-5" /> Cash Collection</h3>
            <p className="text-sm text-gray-500 mt-1">Cash requested by customers and awaiting your receipt.</p>
          </div>
          <span className="text-xs font-bold bg-orange-50 text-orange-700 px-3 py-1 rounded-full">{cashOrders.length} pending</span>
        </div>
        {cashLoading ? <p className="text-sm text-gray-400">Loading cash orders...</p> : cashOrders.length === 0 ? (
          <p className="text-sm text-gray-400 py-5">No cash payments waiting for collection.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cashOrders.map((order) => (
              <div key={order.id} className="border border-orange-100 rounded-xl p-4 bg-orange-50/40">
                <div className="flex justify-between items-start gap-3">
                  <div><p className="font-bold text-gray-800">Order #{order.id}</p><p className="text-sm text-gray-500">Table #{order.table_number || "—"}</p></div>
                  <span className="font-bold text-orange-700">Rs {order.total_price}</span>
                </div>
                <p className="text-sm text-gray-600 mt-3">Customer: {order.billing_first_name} {order.billing_last_name}</p>
                <button disabled={receivingCash} onClick={() => handleReceiveCash(order.id)} className="w-full mt-4 px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 transition">{receivingCash ? "Recording..." : "Cash Received"}</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div>
        <h3 className="text-2xl font-semibold mb-6 text-yellow-800 border-l-4 border-yellow-400 pl-3">Assigned Tables</h3>
        <motion.div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {tables.map((table) => <TableCard key={table.id} table={table} />)}
        </motion.div>
      </div>
    </div>
  );
}
