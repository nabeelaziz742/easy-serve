"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Clock, CheckCircle2, UtensilsCrossed, Banknote, ReceiptText, ChefHat, Printer, BellRing, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import RoleGuard from "@/components/auth/RoleGuard";
import { useGetPendingOrdersQuery, useGetReadyOrdersQuery, useAcceptOrderMutation, useMarkServedMutation } from "@/services/private/orders";
import { useGetWaiterDashboardQuery, useGetWaiterCashOrdersQuery, useReceiveCashPaymentMutation } from "@/services/private/waiter";
import { listVariants, itemVariants, fadeUp, hoverLift } from "@/lib/motion";
import PageHeader from "@/components/layout/PageHeader";
import SoundToggle from "@/components/layout/SoundToggle";
import useNewOrderAlert from "@/hooks/useNewOrderAlert";
import CancelOrderDialog from "@/components/admin/CancelOrderDialog";
import { useGetStaffTableRequestsQuery, useResolveTableRequestMutation } from "@/services/private/serviceRequests";

const minutesAgo = (value) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return minutes === 0 ? "just now" : `${minutes} min ago`;
};

const OrderCard = ({ order, ready = false, onAction, onCancel }) => {
  const itemCount = order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;

  return (
    <motion.div layout variants={itemVariants} exit="exit" whileHover={hoverLift} className="h-full">
      <div className="saas-card relative flex h-full flex-col overflow-hidden">
        <div className={`absolute inset-y-0 left-0 w-1 ${ready ? "bg-emerald-500" : "bg-amber-400"}`} />
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3.5 py-2.5 pl-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-zinc-100 px-1.5 text-xs font-black text-zinc-800 tabular">
              T{order.table_number || "–"}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-zinc-900">Order #{order.id}</p>
              <p className="text-[11px] text-zinc-500">{itemCount} item{itemCount === 1 ? "" : "s"}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${ready ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"}`}>
            {ready ? "Ready" : order.order_status}
          </span>
        </div>
        <ul className="flex-1 divide-y divide-zinc-100 px-3.5 py-1 pl-4">
          {order.items?.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
              <span className="truncate font-medium text-zinc-700">{item.menu_item?.name}</span>
              <span className="shrink-0 font-bold text-zinc-900 tabular">×{item.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="px-3.5 pb-3 pl-4 pt-1">
          <button
            onClick={() => onAction(order.id)}
            className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors active:scale-[0.98] ${
              ready
                ? "bg-green-950 text-amber-400 hover:bg-green-900"
                : "bg-amber-400 text-zinc-950 hover:bg-amber-500"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {ready ? "Mark Served" : "Accept Order"}
          </button>
          {onCancel && (
            <button
              onClick={() => onCancel(order)}
              className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel order
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const StatTile = ({ icon: Icon, label, value, tone }) => (
  <motion.div variants={itemVariants} className="saas-card flex items-center gap-3 px-4 py-3">
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
      <Icon className="h-4.5 w-4.5" />
    </span>
    <div className="min-w-0">
      <p className="saas-label">{label}</p>
      <p className="text-xl font-black leading-tight text-zinc-900 tabular">{value}</p>
    </div>
  </motion.div>
);

const SectionHeader = ({ icon: Icon, iconClass, title, count }) => (
  <div className="mb-2.5 flex items-center justify-between">
    <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900">
      <Icon className={`h-4 w-4 ${iconClass}`} /> {title}
    </h2>
    {count > 0 && (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600 tabular">{count}</span>
    )}
  </div>
);

const EmptyState = ({ icon: Icon, text }) => (
  <motion.div {...fadeUp} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-white/60 py-6 text-sm text-zinc-500">
    {Icon && <Icon className="h-4 w-4 text-zinc-300" />}
    {text}
  </motion.div>
);

const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export default function WaiterPage() {
  return (
    <RoleGuard allowedRoles={["waiter"]}>
      <WaiterContent />
    </RoleGuard>
  );
}

function WaiterContent() {
  const { data, isLoading } = useGetPendingOrdersQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const { data: readyData } = useGetReadyOrdersQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const { data: dashboardData } = useGetWaiterDashboardQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const { data: cashData } = useGetWaiterCashOrdersQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const [acceptOrder] = useAcceptOrderMutation();
  const [markServed] = useMarkServedMutation();
  const [receiveCashPayment] = useReceiveCashPaymentMutation();
  const { data: requestData } = useGetStaffTableRequestsQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true, refetchOnReconnect: true });
  const [resolveTableRequest] = useResolveTableRequestMutation();
  const [cancelling, setCancelling] = useState(null);

  const orders = data?.results || data || [];
  const readyOrders = readyData?.results || readyData || [];
  const cashOrders = cashData?.results || cashData || [];
  const tableRequests = requestData?.results || [];
  const activeTables = dashboardData?.stats?.active_tables ?? 0;
  // Chime for anything new the waiter must act on: a new order, food ready
  // in the kitchen, or a customer asking to pay cash.
  const { soundOn, toggleSound } = useNewOrderAlert([
    ...orders.map((order) => ({ id: `p${order.id}` })),
    ...readyOrders.map((order) => ({ id: `r${order.id}` })),
    ...cashOrders.map((order) => ({ id: `c${order.id}` })),
    ...tableRequests.map((request) => ({ id: `s${request.id}` })),
  ]);

  const handleResolve = async (id) => {
    try {
      await resolveTableRequest(id).unwrap();
    } catch (error) {
      toast.error(error?.data?.detail || "Could not update the request");
    }
  };

  const handleAccept = async (id) => {
    try {
      await acceptOrder(id).unwrap();
      toast.success("Order accepted and sent to kitchen");
    } catch (error) {
      toast.error(error?.data?.detail || "Failed to accept order");
    }
  };

  const handleServed = async (id) => {
    try {
      await markServed(id).unwrap();
      toast.success("Order served successfully");
    } catch (error) {
      toast.error(error?.data?.detail || "Failed to mark served");
    }
  };

  const handleCash = async (id) => {
    try {
      await receiveCashPayment(id).unwrap();
      toast.success("Cash received. Manager settlement is pending.");
    } catch (error) {
      toast.error(error?.data?.detail || "Failed to record cash");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-1/3 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        icon={ChefHat}
        title="Waiter Dashboard"
        description="Accept new orders, serve ready food and collect cash."
        live
        actions={<SoundToggle on={soundOn} onToggle={toggleSound} />}
      />

      {/* Quick KPI Stats */}
      <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={Clock} label="Pending Orders" value={orders.length} tone="bg-amber-50 text-amber-600" />
        <StatTile icon={UtensilsCrossed} label="Active Tables" value={activeTables} tone="bg-emerald-50 text-emerald-600" />
        <StatTile icon={Banknote} label="Cash To Collect" value={cashOrders.length} tone="bg-blue-50 text-blue-600" />
      </motion.div>

      {/* Guests calling the waiter or asking for the bill */}
      {tableRequests.length > 0 && (
        <section>
          <SectionHeader icon={BellRing} iconClass="text-red-500" title="Table Requests" count={tableRequests.length} />
          <motion.div variants={listVariants} initial="hidden" animate="show" className={GRID}>
            <AnimatePresence mode="popLayout">
              {tableRequests.map((request) => (
                <motion.div
                  key={request.id}
                  layout
                  variants={itemVariants}
                  exit="exit"
                  className="saas-card flex items-center gap-3 border-red-200 bg-red-50/40 px-3.5 py-3"
                >
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-red-100 px-1.5 text-xs font-black text-red-800 tabular">
                    T{request.table_number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-900">
                      {request.kind === "bill" ? "Wants the bill" : "Calling waiter"}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {request.guest_name ? `${request.guest_name} · ` : ""}
                      {minutesAgo(request.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResolve(request.id)}
                    className="shrink-0 rounded-lg bg-green-950 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-green-900 active:scale-[0.98]"
                  >
                    Done
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>
      )}

      {/* Cash Collection Section */}
      <section>
        <SectionHeader icon={Banknote} iconClass="text-amber-600" title="Cash Collection" count={cashOrders.length} />
        {cashOrders.length === 0 ? (
          <EmptyState icon={Banknote} text="No cash payments waiting for collection." />
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show" className={GRID}>
            <AnimatePresence mode="popLayout">
              {cashOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  variants={itemVariants}
                  exit="exit"
                  whileHover={hoverLift}
                  className="saas-card flex items-center gap-3 border-amber-200/80 px-3.5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                      <span>#{order.id}</span>
                      <span className="text-zinc-300">•</span>
                      <span>Table {order.table_number || "—"}</span>
                    </div>
                    <p className="text-base font-black text-zinc-900 tabular">Rs {order.total_price}</p>
                  </div>
                  <Link
                    href={`/receipt/${order.id}`}
                    title="Print bill"
                    className="shrink-0 rounded-lg border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-zinc-50"
                  >
                    <Printer className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleCash(order.id)}
                    className="shrink-0 rounded-lg bg-green-950 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-green-900 active:scale-[0.98]"
                  >
                    Cash Received
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* Pending Orders Section */}
      <section>
        <SectionHeader icon={ReceiptText} iconClass="text-amber-500" title="Pending Orders" count={orders.length} />
        {orders.length === 0 ? (
          <EmptyState text="No pending orders available." />
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show" className={GRID}>
            <AnimatePresence mode="popLayout">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} onAction={handleAccept} onCancel={setCancelling} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* Ready To Serve Section */}
      <section>
        <SectionHeader icon={CheckCircle2} iconClass="text-emerald-600" title="Ready To Serve" count={readyOrders.length} />
        {readyOrders.length === 0 ? (
          <EmptyState text="No orders currently ready for serving." />
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show" className={GRID}>
            <AnimatePresence mode="popLayout">
              {readyOrders.map((order) => (
                <OrderCard key={order.id} order={order} ready onAction={handleServed} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <CancelOrderDialog order={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}
