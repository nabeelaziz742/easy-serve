"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { motion, AnimatePresence } from "framer-motion";
import OrderSkeleton from "@/components/admin/OrderSkeleton";
import { easeOut, fadeUp } from "@/lib/motion";
import PageHeader from "@/components/layout/PageHeader";
import { useGetOrderStatusQuery, usePatchOrderStatusMutation } from "@/services/private/orders";
import {
  Clock,
  Users,
  CheckCircle2,
  ChefHat,
  Utensils,
  Flame,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ReceiptText,
} from "lucide-react";

// Moving orders between kitchen columns is for the kitchen and managers.
export default function OrdersPage() {
  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin", "chef"]}>
      <OrderBoard />
    </RoleGuard>
  );
}

function OrderBoard() {
  const { data: initialOrders, isLoading } = useGetOrderStatusQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
  });

  const [orders, setOrders] = useState([]);
  const [time, setTime] = useState("");

  const STATUS_VALUE_TO_LABEL = {
    TO_PREPARE: "To Prepare",
    PREPARING: "Preparing",
    PREPARED: "Prepared",
    SERVED: "Served",
  };

  useEffect(() => {
    setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (initialOrders) {
      setOrders(
        initialOrders.results.map((o) => ({
          ...o,
          status: STATUS_VALUE_TO_LABEL[o.status] || o.status,
        }))
      );
    }
  }, [initialOrders]);

  const [patchStatus] = usePatchOrderStatusMutation();

  const statuses = ["To Prepare", "Preparing", "Prepared", "Served"];

  const moveOrder = async (id, direction) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;

    const currentIndex = statuses.indexOf(order.status);
    const newIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, statuses.length - 1)
        : Math.max(currentIndex - 1, 0);

    const newStatus = statuses[newIndex];

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );

    try {
      await patchStatus({
        orderId: id,
        status: newStatus,
      });
    } catch (err) {
      console.error("PATCH error:", err);
    }
  };

  const COLUMN_STYLES = {
    "To Prepare": {
      border: "border-amber-200/80 bg-amber-50/20",
      header: "bg-amber-100/90 text-amber-900 border-amber-200",
      icon: ChefHat,
      pill: "bg-amber-100 text-amber-900",
    },
    Preparing: {
      border: "border-blue-200/80 bg-blue-50/20",
      header: "bg-blue-100/90 text-blue-900 border-blue-200",
      icon: Flame,
      pill: "bg-blue-100 text-blue-900",
    },
    Prepared: {
      border: "border-emerald-200/80 bg-emerald-50/20",
      header: "bg-emerald-100/90 text-emerald-900 border-emerald-200",
      icon: CheckCircle2,
      pill: "bg-emerald-100 text-emerald-900",
    },
    Served: {
      border: "border-gray-200/80 bg-gray-50/40",
      header: "bg-gray-100/90 text-gray-900 border-gray-200",
      icon: Utensils,
      pill: "bg-gray-100 text-gray-700",
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ChefHat}
        title="Order Board"
        description="Move orders from the kitchen queue to served."
        live
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
            <Clock className="h-3.5 w-3.5 text-yellow-600" />
            <span>Updated {time}</span>
          </div>
        }
      />

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {statuses.map((status, colIndex) => {
          const colStyle = COLUMN_STYLES[status] || COLUMN_STYLES["To Prepare"];
          const IconComponent = colStyle.icon;
          const columnOrders = orders.filter((o) => o.status === status);

          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: colIndex * 0.05, ease: easeOut }}
              className={`rounded-xl border shadow-xs ${colStyle.border} flex flex-col min-h-[420px] overflow-hidden bg-white/70 backdrop-blur-xs`}
            >
              {/* Column Header */}
              <div
                className={`px-3 py-2.5 flex items-center justify-between border-b font-black text-xs ${colStyle.header}`}
              >
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4" />
                  <span>{status}</span>
                </div>
                <span className="text-xs font-bold bg-white/90 px-2.5 py-0.5 rounded-full shadow-xs text-gray-900">
                  {columnOrders.length}
                </span>
              </div>

              {/* Orders in Column */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {isLoading &&
                  [...Array(2)].map((_, i) => <OrderSkeleton key={i} />)}

                {!isLoading &&
                  columnOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      layoutId={`kanban-order-${order.id}`}
                      transition={{ duration: 0.25, ease: easeOut }}
                      whileHover={{ y: -2 }}
                      className="saas-card p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-black text-sm text-green-950">
                            Table #{order.table}
                          </h3>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                            <Users className="w-3 h-3 text-yellow-600" />
                            {order.customer || "Guest"}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colStyle.pill}`}>
                          #{order.id}
                        </span>
                      </div>

                      {/* Items List */}
                      {order.items?.length > 0 && (
                        <div className="rounded-lg bg-gray-50/80 p-2 border border-gray-100">
                          <ul className="space-y-1 text-xs text-gray-700 font-medium">
                            {order.items.map((item, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                                <span className="truncate">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-semibold text-[11px]">
                          <Clock className="w-3 h-3 text-yellow-600" />
                          {order.time || "Just now"}
                        </span>
                        <Link
                          href={`/receipt/${order.id}`}
                          className="flex items-center gap-1 text-[11px] font-semibold text-green-800 hover:underline"
                        >
                          <ReceiptText className="w-3 h-3" /> Bill
                        </Link>
                      </div>

                      {/* Action Navigation Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                        {order.status !== "To Prepare" ? (
                          <button
                            onClick={() => moveOrder(order.id, "prev")}
                            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 active:scale-95 transition font-semibold"
                          >
                            <ArrowLeft size={12} /> Back
                          </button>
                        ) : (
                          <div />
                        )}

                        {order.status !== "Served" && (
                          <button
                            onClick={() => moveOrder(order.id, "next")}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-green-950 text-yellow-400 hover:bg-green-900 active:scale-95 transition font-bold"
                          >
                            Advance <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}

                {!isLoading && columnOrders.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-10 italic">
                    No orders currently in {status}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
