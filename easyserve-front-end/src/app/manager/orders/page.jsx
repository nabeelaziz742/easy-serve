"use client";

import { useEffect, useState } from "react";
import { ReceiptText, Search, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/layout/PageHeader";
import CancelOrderDialog from "@/components/admin/CancelOrderDialog";
import { useGetManagerOrdersQuery } from "@/services/private/orders";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All" },
];

const STATUSES = [
  { value: "", label: "All orders" },
  { value: "active", label: "In progress" },
  { value: "served", label: "Served" },
  { value: "unpaid", label: "Unpaid" },
  { value: "cancelled", label: "Cancelled" },
];

const money = (value) => Number(value || 0).toFixed(2);

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

function StatusBadge({ order }) {
  if (order.order_cancelled) {
    return <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-red-200">Cancelled</span>;
  }
  const served = order.order_status === "Served";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ${served ? "bg-zinc-50 text-zinc-700 ring-zinc-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`}>
      {order.order_status}
    </span>
  );
}

function PaymentBadge({ order }) {
  const paid = order.payment_status === "Confirmed";
  if (order.order_cancelled && Number(order.refund_amount) > 0) {
    return <span className="text-[11px] font-bold text-red-700">Refunded Rs {money(order.refund_amount)}</span>;
  }
  return (
    <span className={`text-[11px] font-bold ${paid ? "text-emerald-700" : "text-zinc-500"}`}>
      {paid ? "Paid" : order.order_cancelled ? "—" : "Unpaid"}
    </span>
  );
}

export default function ManagerOrdersPage() {
  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin"]}>
      <OrdersAndBills />
    </RoleGuard>
  );
}

function OrdersAndBills() {
  const [period, setPeriod] = useState("today");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState(null);

  // Wait for the manager to stop typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => setPage(1), [period, statusFilter, search]);

  const params = { period, page };
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading, isFetching, isError } = useGetManagerOrdersQuery(params, {
    pollingInterval: 15000,
    refetchOnFocus: true,
  });
  const orders = data?.results || [];
  const total = data?.count || 0;
  const pageCount = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <PageHeader
        icon={ReceiptText}
        title="Orders & Bills"
        description="Find any order, print its bill, or cancel it with a reason."
      />

      <div className="saas-card flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
          {PERIODS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                period === option.value ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            aria-label="Order status"
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              inputMode="numeric"
              placeholder="Order # or table #"
              className="w-40 bg-transparent text-sm outline-none"
            />
          </label>
        </div>
      </div>

      <div className="saas-card overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-8 text-center text-sm text-red-600">Could not load orders. Please refresh the page.</p>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">No orders found for this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-zinc-50 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Table</th>
                  <th className="px-4 py-2.5">Items</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Payment</th>
                  <th className="px-4 py-2.5 text-right">Total (Rs)</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-zinc-100 ${isFetching ? "opacity-70" : ""}`}>
                {orders.map((order) => {
                  const itemCount = order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
                  return (
                    <tr key={order.id} className={order.order_cancelled ? "bg-red-50/30" : ""}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-zinc-900">#{order.id}</p>
                        <p className="text-[11px] text-zinc-500">{formatTime(order.ordered_date || order.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {order.table_number ? `T${order.table_number}` : order.order_type}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {itemCount} item{itemCount === 1 ? "" : "s"}
                        {order.waiter_name && <p className="text-[11px] text-zinc-500">Waiter: {order.waiter_name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge order={order} />
                        {order.order_cancelled && order.cancellation_reason && (
                          <p className="mt-1 max-w-[200px] truncate text-[11px] text-zinc-500" title={order.cancellation_reason}>
                            {order.cancellation_reason}
                            {order.cancelled_by_name ? ` (${order.cancelled_by_name})` : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentBadge order={order} />
                      </td>
                      <td className="px-4 py-3 text-right font-black text-zinc-900 tabular">{money(order.total_price)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <a
                            href={`/receipt/${order.id}`}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex items-center gap-1 rounded-lg bg-green-950 px-2.5 py-1.5 text-xs font-bold text-amber-400 hover:bg-green-900"
                          >
                            <ReceiptText className="h-3.5 w-3.5" /> Bill
                          </a>
                          {!order.order_cancelled && (
                            <button
                              onClick={() => setCancelling(order)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 10 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">
            <span>
              Page {page} of {pageCount} · {total} orders
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-zinc-200 p-1.5 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={page >= pageCount}
                className="rounded-lg border border-zinc-200 p-1.5 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CancelOrderDialog order={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}
