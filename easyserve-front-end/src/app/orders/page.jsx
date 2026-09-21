"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ShoppingBag,
  CreditCard,
  Banknote,
  Clock,
  Sparkles,
  Utensils,
  Truck,
  Package,
  Calendar,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { useGetOrdersQuery, useRequestCashPaymentMutation } from "@/services/private/orders";
import OrderPayment from "@/components/payment/OrderPayment";
import RoleGuard from "@/components/auth/RoleGuard";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

function ClientOrders() {
  const { data, isLoading, isFetching, refetch } = useGetOrdersQuery(undefined, {
    pollingInterval: 3000,
    refetchOnFocus: true,
  });
  const [requestCashPayment, { isLoading: isRequestingCash }] = useRequestCashPaymentMutation();
  const loading = isLoading || isFetching;
  const [cardPayOrderId, setCardPayOrderId] = useState(null);
  const [cashRequestedIds, setCashRequestedIds] = useState([]);

  const handleCashRequest = async (orderId) => {
    try {
      await requestCashPayment(orderId).unwrap();
      setCashRequestedIds((current) =>
        current.includes(orderId) ? current : [...current, orderId]
      );
      toast.success("Cash payment requested. Please hand cash to your server.");
      refetch();
    } catch (err) {
      toast.error(err?.data?.detail || "Could not submit cash payment request.");
    }
  };

  const ORDER_STATUS_META = {
    "To Prepare": { label: "In Kitchen Queue", emoji: "👨‍🍳", color: "bg-amber-50 text-amber-800 border-amber-200" },
    Preparing: { label: "Cooking", emoji: "🔥", color: "bg-blue-50 text-blue-800 border-blue-200" },
    Prepared: { label: "Plated & Ready", emoji: "🍽️", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    Ready: { label: "Plated & Ready", emoji: "🍽️", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    Served: { label: "Served at Table", emoji: "✨", color: "bg-green-100 text-green-900 border-green-300" },
    Cancelled: { label: "Cancelled", emoji: "❌", color: "bg-red-50 text-red-800 border-red-200" },
  };

  const PAYMENT_STATUS_META = {
    Pending: { label: "Payment Unsettled", color: "bg-amber-50 text-amber-700 border-amber-200" },
    Confirmed: { label: "Paid in Full", color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
    Cancelled: { label: "Payment Voided", color: "bg-red-50 text-red-700 border-red-200" },
  };

  const ORDER_TYPE_META = {
    "Dine In": { label: "Dine-In Table", icon: Utensils, color: "bg-yellow-50 text-yellow-900 border-yellow-200" },
    Delivery: { label: "Direct Delivery", icon: Truck, color: "bg-blue-50 text-blue-900 border-blue-200" },
    Takeaway: { label: "Takeaway Pickup", icon: Package, color: "bg-purple-50 text-purple-900 border-purple-200" },
  };

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.results?.length) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-3xl border border-gray-200/80 bg-white p-8 sm:p-10 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600 border border-yellow-200/60 shadow-inner">
              <ShoppingBag className="h-10 w-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-green-950">
              No Orders Active
            </h2>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              You haven&apos;t placed any orders yet. Browse our chef&apos;s specials or explore top-rated restaurants to get started.
            </p>
            <div className="mt-6">
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-950 px-6 py-3 text-sm font-bold text-yellow-400 shadow-lg transition hover:bg-green-900 hover:scale-[1.02] active:scale-[0.98]"
              >
                Browse Menu <ChevronRight size={16} />
              </a>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <RoleGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-yellow-800">
                <Sparkles className="h-3 w-3 text-yellow-600" /> Live Dining History
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-green-950">
                My Orders
              </h1>
              <p className="text-sm text-gray-500">
                Real-time tracking of kitchen preparation and payment settlement.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live Order Telemetry
            </div>
          </motion.div>

          {/* Orders Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2"
          >
            {data.results.map((order) => {
              const orderedDate = new Date(order.ordered_date).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const cashRequested = cashRequestedIds.includes(order.id);
              const paymentMeta = PAYMENT_STATUS_META[order.payment_status] || {
                label: order.payment_status,
                color: "bg-gray-100 text-gray-700",
              };
              const orderMeta = ORDER_STATUS_META[order.order_status] || {
                label: order.order_status,
                emoji: "📦",
                color: "bg-gray-100 text-gray-700",
              };
              const typeMeta = ORDER_TYPE_META[order.order_type] || {
                label: order.order_type,
                icon: Utensils,
                color: "bg-gray-50 text-gray-700",
              };
              const TypeIcon = typeMeta.icon;

              return (
                <motion.div key={order.id} variants={itemVariants}>
                  <Card className="smooth-card overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-md hover:shadow-xl transition-all">
                    {/* Top Order Card Header */}
                    <div className="border-b border-gray-100 bg-green-950/95 p-5 text-white">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-yellow-400">
                              #{order.id}
                            </span>
                            <span className="text-xs text-green-200">·</span>
                            <span className="text-xs text-green-200 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-yellow-400" /> {orderedDate}
                            </span>
                          </div>
                          <h2 className="text-lg font-black tracking-tight text-white">
                            {order.billing_first_name} {order.billing_last_name}
                          </h2>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${typeMeta.color}`}>
                            <TypeIcon className="h-3 w-3" /> {typeMeta.label}
                          </span>
                        </div>
                      </div>

                      {/* Status Pills */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold border ${orderMeta.color}`}>
                          <span>{orderMeta.emoji}</span>
                          <span>{orderMeta.label}</span>
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold border ${paymentMeta.color}`}>
                          {order.payment_status === "Confirmed" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-700" />
                          )}
                          <span>{paymentMeta.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Order Items List */}
                    <div className="space-y-2.5 p-5 bg-gray-50/50">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        Dishes Ordered ({order.items?.length || 0})
                      </p>
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200/70 bg-white px-4 py-3 shadow-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900">
                              {item.menu_item?.name || "Delicious Dish"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {item.comments || "Standard preparation"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 text-xs">
                            <span className="rounded-lg bg-green-50 px-2 py-1 font-bold text-green-950 border border-green-200/60">
                              x{item.quantity}
                            </span>
                            <span className="text-sm font-black text-gray-900">
                              Rs. {item.price}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Footer & Payment Controls */}
                    <div className="p-5 bg-white">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Total Amount
                        </span>
                        <span className="text-2xl font-black text-green-950 tracking-tight">
                          Rs. {order.total_price || "0.00"}
                        </span>
                      </div>

                      {order.payment_status !== "Confirmed" && !order.order_cancelled && (
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            <Button
                              variant="outline"
                              disabled={isRequestingCash || cashRequested}
                              onClick={() => handleCashRequest(order.id)}
                              className="h-11 rounded-2xl border-gray-200 bg-gray-50 font-bold text-xs hover:bg-gray-100 hover:text-green-950 active:scale-[0.98]"
                            >
                              <Banknote className="mr-1.5 h-4 w-4 text-yellow-600" />
                              {cashRequested ? "Cash Requested — Pay Server" : isRequestingCash ? "Submitting..." : "Pay with Cash"}
                            </Button>
                            <Button
                              onClick={() =>
                                setCardPayOrderId(cardPayOrderId === order.id ? null : order.id)
                              }
                              className="h-11 rounded-2xl bg-green-950 text-yellow-400 font-bold text-xs hover:bg-green-900 active:scale-[0.98] shadow-md"
                            >
                              <CreditCard className="mr-1.5 h-4 w-4 text-yellow-400" />
                              {cardPayOrderId === order.id ? "Close Card Form" : "Pay with Card"}
                            </Button>
                          </div>

                          <AnimatePresence>
                            {cardPayOrderId === order.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden rounded-2xl border border-yellow-400/40 bg-yellow-50/40 p-4"
                              >
                                <OrderPayment
                                  orderId={order.id}
                                  onSuccess={() => {
                                    setCardPayOrderId(null);
                                    toast.success("Payment confirmed! 🎉");
                                    refetch();
                                  }}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </RoleGuard>
  );
}

export default ClientOrders;
