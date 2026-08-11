"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetOrdersQuery } from "@/services/private/orders";

function ClientOrders() {
  const { data, isLoading, isFetching } = useGetOrdersQuery();
  const loading = isLoading || isFetching;

  const ORDER_STATUS_META = {
    "To Prepare": {
      label: "Preparing",
      emoji: "👨‍🍳",
      variant: "warning",
    },
    "Ready": {
      label: "Ready",
      emoji: "🍽️",
      variant: "success",
    },
    "Served": {
      label: "Served",
      emoji: "✅",
      variant: "success",
    },
    "Cancelled": {
      label: "Cancelled",
      emoji: "❌",
      variant: "destructive",
    },
  };

  const PAYMENT_STATUS_META = {
    Pending: {
      emoji: "⏳",
      variant: "outline",
    },
    Paid: {
      emoji: "💳",
      variant: "success",
    },
    Failed: {
      emoji: "❌",
      variant: "destructive",
    },
  };

  const ORDER_TYPE_META = {
    "Dine In": "🍽️ Dine-In",
    Delivery: "🚚 Delivery",
    Takeaway: "🥡 Takeaway",
  };


  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="flex h-150 items-center justify-center">
        <div className="grid w-full max-w-4xl gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  /* ================= EMPTY ================= */
  if (!data?.results?.length) {
    return (
      <div className="flex h-150 items-center justify-center">
        <Card className="rounded-3xl p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold">No Orders Found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            There are currently no orders available.
          </p>
        </Card>
      </div>
    );
  }

  /* ================= LIST ================= */
  return (
    <div className="mx-auto grid max-w-5xl gap-12">
      {data.results.map((order) => {
        const orderedDate = new Date(order.ordered_date).toLocaleString();

        return (
          <Card
            key={order.id}
            className="
              overflow-hidden rounded-3xl
              border border-border/60
              bg-background
              shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]
              transition hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.18)]
              dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]
            "
          >
            {/* ================= HEADER ================= */}
            <div className="px-8 pt-7 pb-5">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Order #{order.id}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {order.billing_first_name} {order.billing_last_name}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* ORDER TYPE */}
                  <Badge variant="secondary" className="px-3 py-1">
                    {ORDER_TYPE_META[order.order_type] || order.order_type}
                  </Badge>

                  {/* ORDER STATUS */}
                  {order.order_status && (
                    <Badge
                      variant={ORDER_STATUS_META[order.order_status]?.variant || "outline"}
                      className="px-3 py-1"
                    >
                      {ORDER_STATUS_META[order.order_status]?.emoji}{" "}
                      {ORDER_STATUS_META[order.order_status]?.label ||
                        order.order_status}
                    </Badge>
                  )}

                  {/* PAYMENT STATUS */}
                  <Badge
                    variant={
                      PAYMENT_STATUS_META[order.payment_status]?.variant || "outline"
                    }
                    className="px-3 py-1"
                  >
                    {PAYMENT_STATUS_META[order.payment_status]?.emoji}{" "}
                    {order.payment_status}
                  </Badge>
                </div>

              </div>
            </div>

            <Separator />

            {/* ================= ITEMS ================= */}
            <div className="px-8 py-7">
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="
                      flex items-center justify-between gap-6
                      rounded-2xl
                      border border-border/50
                      bg-muted/30
                      px-5 py-4
                      transition
                      hover:bg-muted/50
                    "
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-tight">
                        {item.menu_item.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.comments || "No special instructions"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-10 text-sm">
                      <span className="text-muted-foreground">
                        Qty{" "}
                        <span className="font-medium text-foreground">
                          {item.quantity}
                        </span>
                      </span>

                      <span className="text-base font-semibold">
                        {item.price}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ================= FOOTER ================= */}
            <div
              className="
                flex flex-col gap-4
                bg-muted/40
                px-8 py-6
                sm:flex-row sm:items-center sm:justify-between
              "
            >
              <p className="text-sm text-muted-foreground">
                Ordered on{" "}
                <span className="font-medium text-foreground">
                  {orderedDate}
                </span>
              </p>

              <p className="text-xl font-semibold tracking-tight">
                Total {order.total_price || "N/A"}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default ClientOrders;
