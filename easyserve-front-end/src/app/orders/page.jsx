"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Badge } from "@/components/ui/badge";
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
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { useGetOrdersQuery, useGetDineInOrdersQuery, useRequestCashPaymentMutation } from "@/services/private/orders";
import { getDineInToken } from "@/utilities/dineInStorage";
import OrderPayment from "@/components/payment/OrderPayment";
import { listVariants, itemVariants, easeOut } from "@/lib/motion";
import RoleGuard from "@/components/auth/RoleGuard";

function ClientOrders() {
  // A guest seated through the table QR code has no account: show this
  // table visit's orders through its session token instead of asking them
  // to log in. Read after mount, since localStorage is browser-only.
  const dineInState = useSelector((state) => state.dineIn);
  const reduxDineInToken = dineInState?.sessionToken || dineInState?.session?.token || null;
  const [guestToken, setGuestToken] = useState(null);
  const [modeKnown, setModeKnown] = useState(false);
  useEffect(() => {
    setGuestToken(getDineInToken({ dineIn: dineInState }));
    setModeKnown(true);
  }, [reduxDineInToken]);
  const isGuest = !!guestToken;

  const queryOptions = { pollingInterval: 3000, refetchOnFocus: true };
  const accountOrders = useGetOrdersQuery(undefined, { ...queryOptions, skip: !modeKnown || isGuest });
  const guestOrders = useGetDineInOrdersQuery(undefined, { ...queryOptions, skip: !modeKnown || !isGuest });
  const { data, isLoading, isFetching, refetch } = isGuest ? guestOrders : accountOrders;
  const Guard = isGuest ? React.Fragment : RoleGuard;

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

    if (!modeKnown || (loading && !data)) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
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
          <div className="saas-card p-8 text-center shadow-md">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-yellow-200/60 bg-yellow-50 text-yellow-600">
              <ShoppingBag className="h-7 w-7 text-yellow-600" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-green-950">
              No Orders Active
            </h2>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              You haven&apos;t placed any orders yet. Browse our chef&apos;s specials or explore top-rated restaurants to get started.
            </p>
            <div className="mt-6">
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-950 px-5 py-2.5 text-sm font-bold text-yellow-400 shadow-sm transition hover:bg-green-900 active:scale-[0.98]"
              >
                Browse Menu <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Guard>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-yellow-800">
                <Sparkles className="h-3 w-3 text-yellow-600" /> Your Orders
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-green-950">
                My Orders
              </h1>
              <p className="text-sm text-gray-500">
                Follow your food from the kitchen to your table, and pay when you are ready.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live updates
            </div>
          </motion.div>

          {/* Orders Grid */}
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {data.results.map((order) => {
              const orderedDate = new Date(order.ordered_date).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const cashRequested = order.cash_requested || cashRequestedIds.includes(order.id);
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
                <motion.div key={order.id} layout="position" variants={itemVariants}>
                  <div className="saas-card overflow-hidden">
                    {/* Header: id, date, customer, type */}
                    <div className="bg-green-950 px-4 py-3 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] text-green-200">
                            <span className="font-mono font-bold text-yellow-400">#{order.id}</span>
                            <span>·</span>
                            <Calendar className="h-3 w-3 text-yellow-400" />
                            <span className="truncate">{orderedDate}</span>
                          </div>
                          <h2 className="mt-0.5 truncate text-sm font-bold text-white">
                            {order.billing_first_name} {order.billing_last_name}
                          </h2>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${typeMeta.color}`}>
                          <TypeIcon className="h-3 w-3" /> {typeMeta.label}
                        </span>
                      </div>
                    </div>

                    {/* Status pills */}
                    <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 px-4 py-2.5">
                      <motion.span
                        key={order.order_status}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${orderMeta.color}`}
                      >
                        <span>{orderMeta.emoji}</span>
                        <span>{orderMeta.label}</span>
                      </motion.span>
                      <motion.span
                        key={order.payment_status}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${paymentMeta.color}`}
                      >
                        {order.payment_status === "Confirmed" ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                        ) : (
                          <Clock className="h-3 w-3 text-amber-700" />
                        )}
                        <span>{paymentMeta.label}</span>
                      </motion.span>
                    </div>

                    {/* Order items */}
                    <div className="px-4 py-2">
                      <p className="saas-label pb-1">Dishes Ordered ({order.items?.length || 0})</p>
                      <ul className="divide-y divide-zinc-100">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-900">
                                {item.menu_item?.name || "Delicious Dish"}
                              </p>
                              {item.comments && (
                                <p className="truncate text-[11px] text-zinc-500">{item.comments}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2.5 text-xs">
                              <span className="rounded-md bg-green-50 px-1.5 py-0.5 font-bold text-green-950 ring-1 ring-green-200/60 tabular">
                                ×{item.quantity}
                              </span>
                              <span className="w-20 text-right font-bold text-zinc-900 tabular">Rs. {item.price}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Footer & payment controls */}
                    <div className="space-y-2.5 border-t border-zinc-100 bg-zinc-50/60 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="saas-label">Total Amount</span>
                          {Number(order.tax_amount) + Number(order.service_charge_amount) > 0 && (
                            <p className="text-[11px] text-zinc-500">Includes tax and service charge</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black tracking-tight text-green-950 tabular">
                            Rs. {order.total_price || "0.00"}
                          </span>
                          <Link href={`/receipt/${order.id}`} className="flex items-center justify-end gap-1 text-[11px] font-semibold text-green-800 hover:underline">
                            <ReceiptText className="h-3 w-3" /> View bill
                          </Link>
                        </div>
                      </div>

                      {order.payment_status !== "Confirmed" && !order.order_cancelled && (
                        <div className="space-y-2">
                          {!cashRequested && order.order_status === "To Prepare" && !order.accepted_by_waiter && (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
                              Choose how you will pay to send this order to the kitchen.
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              disabled={isRequestingCash || cashRequested}
                              onClick={() => handleCashRequest(order.id)}
                              className="h-9 rounded-lg border-zinc-200 bg-white px-2 text-xs font-bold hover:bg-zinc-100 hover:text-green-950 active:scale-[0.98]"
                            >
                              <Banknote className="mr-1 h-3.5 w-3.5 text-yellow-600" />
                              <span className="truncate">
                                {cashRequested ? "Cash Requested — Pay Server" : isRequestingCash ? "Submitting..." : "Pay with Cash"}
                              </span>
                            </Button>
                            <Button
                              onClick={() =>
                                setCardPayOrderId(cardPayOrderId === order.id ? null : order.id)
                              }
                              className="h-9 rounded-lg bg-green-950 px-2 text-xs font-bold text-yellow-400 hover:bg-green-900 active:scale-[0.98]"
                            >
                              <CreditCard className="mr-1 h-3.5 w-3.5 text-yellow-400" />
                              {cardPayOrderId === order.id ? "Close Card Form" : "Pay with Card"}
                            </Button>
                          </div>

                          <AnimatePresence initial={false}>
                            {cardPayOrderId === order.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.22, ease: easeOut }}
                                className="overflow-hidden"
                              >
                                <div className="rounded-lg border border-yellow-400/40 bg-yellow-50/40 p-3">
                                  <OrderPayment
                                    orderId={order.id}
                                    onSuccess={() => {
                                      setCardPayOrderId(null);
                                      toast.success("Payment confirmed! 🎉");
                                      refetch();
                                    }}
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </Guard>
  );
}

export default ClientOrders;
