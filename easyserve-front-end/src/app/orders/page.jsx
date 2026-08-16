"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGetOrdersQuery, usePayOrderMutation } from "@/services/private/orders";
import OrderPayment from "@/components/payment/OrderPayment";

function ClientOrders() {
  const { data, isLoading, isFetching, refetch } = useGetOrdersQuery();
  const [payOrder, { isLoading: isPaying }] = usePayOrderMutation();
  const loading = isLoading || isFetching;
  const [cardPayOrderId, setCardPayOrderId] = useState(null);
  const [cashRequestedIds, setCashRequestedIds] = useState([]);

  const handlePay = async (orderId) => {
    try {
      const res = await payOrder({
        orderId,
        paymentMethod: "cash",
      }).unwrap();

      if (res?.payment_pending) {
        setCashRequestedIds((current) =>
          current.includes(orderId) ? current : [...current, orderId]
        );
        toast.success("Cash payment requested. Waiting for restaurant confirmation.");
      } else {
        toast.success("Payment confirmed 🎉");
      }

      refetch();
    } catch (err) {
      toast.error(err?.data?.detail || "Could not submit cash payment request.");
    }
  };

  const ORDER_STATUS_META = {
    "To Prepare": { label: "Preparing", emoji: "👨‍🍳", variant: "warning" },
    Preparing: { label: "Preparing", emoji: "👨‍🍳", variant: "warning" },
    Prepared: { label: "Ready", emoji: "🍽️", variant: "success" },
    Ready: { label: "Ready", emoji: "🍽️", variant: "success" },
    Served: { label: "Served", emoji: "✅", variant: "success" },
    Cancelled: { label: "Cancelled", emoji: "❌", variant: "destructive" },
  };

  const PAYMENT_STATUS_META = {
    Pending: { emoji: "⏳", variant: "outline" },
    Confirmed: { emoji: "💳", variant: "success" },
    Cancelled: { emoji: "❌", variant: "destructive" },
  };

  const ORDER_TYPE_META = {
    "Dine In": "🍽️ Dine-In",
    Delivery: "🚚 Delivery",
    Takeaway: "🥡 Takeaway",
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5 py-8">
        <div className="grid w-full max-w-6xl grid-cols-1 gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.results?.length) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5 py-8">
        <Card className="rounded-2xl p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold">No Orders Found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            There are currently no orders available.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-7">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your orders and payment status.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {data.results.map((order) => {
          const orderedDate = new Date(order.ordered_date).toLocaleString();
          const cashRequested = cashRequestedIds.includes(order.id);
          const paymentMeta = PAYMENT_STATUS_META[order.payment_status];
          const orderMeta = ORDER_STATUS_META[order.order_status];

          return (
            <Card
              key={order.id}
              className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm transition hover:shadow-md"
            >
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold tracking-tight">
                      Order #{order.id}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {order.billing_first_name} {order.billing_last_name}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <Badge variant="secondary" className="px-2 py-0.5 text-[11px]">
                      {ORDER_TYPE_META[order.order_type] || order.order_type}
                    </Badge>

                    {orderMeta && (
                      <Badge
                        variant={orderMeta.variant}
                        className="px-2 py-0.5 text-[11px]"
                      >
                        {orderMeta.emoji} {orderMeta.label}
                      </Badge>
                    )}

                    <Badge
                      variant={paymentMeta?.variant || "outline"}
                      className="px-2 py-0.5 text-[11px]"
                    >
                      {paymentMeta?.emoji || "⏳"} {order.payment_status}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2.5 px-5 py-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.menu_item.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {item.comments || "No special instructions"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-4 text-xs">
                      <span className="text-muted-foreground">
                        Qty <span className="font-semibold text-foreground">{item.quantity}</span>
                      </span>
                      <span className="text-sm font-bold">Rs. {item.price}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t bg-muted/30 px-5 py-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] text-muted-foreground">
                      {orderedDate}
                    </p>
                    <p className="text-lg font-bold tracking-tight">
                      Total Rs. {order.total_price || "N/A"}
                    </p>
                  </div>

                  {order.payment_status !== "Confirmed" && !order.order_cancelled && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPaying || cashRequested}
                        onClick={() => handlePay(order.id)}
                        className="h-9 text-xs"
                      >
                        {cashRequested
                          ? "Cash Requested — Awaiting Confirmation"
                          : isPaying
                            ? "Submitting..."
                            : "Request Cash Payment"}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() =>
                          setCardPayOrderId(
                            cardPayOrderId === order.id ? null : order.id
                          )
                        }
                        className="h-9 text-xs"
                      >
                        Pay with Card
                      </Button>
                    </div>
                  )}
                </div>

                {cardPayOrderId === order.id && (
                  <div className="mt-3 rounded-xl border border-border/60 bg-background p-3">
                    <OrderPayment
                      orderId={order.id}
                      onSuccess={() => {
                        setCardPayOrderId(null);
                        toast.success("Payment confirmed 🎉");
                        refetch();
                      }}
                    />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ClientOrders;
