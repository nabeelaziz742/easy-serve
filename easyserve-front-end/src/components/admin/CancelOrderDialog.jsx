"use client";

import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { useCancelOrderMutation } from "@/services/private/orders";

const QUICK_REASONS = ["Customer changed mind", "Wrong order entered", "Item not available", "Duplicate order"];

// Asks for a reason before cancelling an order. When the order was already
// paid, the manager is told the amount to hand back.
export default function CancelOrderDialog({ order, onClose }) {
  const [reason, setReason] = useState("");
  const [cancelOrder, { isLoading }] = useCancelOrderMutation();

  useEffect(() => {
    setReason("");
  }, [order?.id]);

  if (!order) return null;

  const paid = order.payment_status === "Confirmed";

  const submit = async (event) => {
    event.preventDefault();
    try {
      const result = await cancelOrder({ orderId: order.id, reason }).unwrap();
      const refund = Number(result?.refund_amount || 0);
      toast.success(
        refund > 0
          ? `Order #${order.id} cancelled. Refund Rs ${refund.toFixed(2)} to the customer.`
          : `Order #${order.id} cancelled.`
      );
      onClose();
    } catch (error) {
      toast.error(error?.data?.detail || "Could not cancel the order");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600" />
          <h2 className="text-base font-black text-zinc-900">Cancel order #{order.id}</h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {paid
            ? `This order is paid. Rs ${Number(order.total_price || 0).toFixed(2)} will be recorded as refunded.`
            : "The order will be removed from the kitchen and the waiter lists."}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => setReason(text)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                reason === text ? "border-red-300 bg-red-50 text-red-700" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-xs font-bold text-zinc-700" htmlFor="cancel-reason">
          Reason
        </label>
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={255}
          rows={3}
          required
          minLength={3}
          placeholder="Why is this order being cancelled?"
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
            Keep order
          </button>
          <button
            type="submit"
            disabled={isLoading || reason.trim().length < 3}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? "Cancelling…" : "Cancel order"}
          </button>
        </div>
      </form>
    </div>
  );
}
