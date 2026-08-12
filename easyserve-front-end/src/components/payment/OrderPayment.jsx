"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

import { Button } from "@/components/ui/button";
import {
  useCreatePaymentIntentMutation,
  useConfirmPaymentMutation,
} from "@/services/private/payment";

let stripePromise = null;

function getStripe(publishableKey) {
  if (!stripePromise && publishableKey) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

function CheckoutForm({ orderId, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();

  const [confirmPayment] = useConfirmPaymentMutation();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMsg("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message || "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        await confirmPayment(orderId).unwrap();
        onSuccess?.();
      } catch (err) {
        setErrorMsg(
          "Payment went through, but we couldn't update your order. Please contact the restaurant."
        );
      }
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {errorMsg && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}

      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full"
      >
        {submitting ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
}

/**
 * Drop this in anywhere you need to collect payment for an order:
 *
 *   <OrderPayment orderId={order.id} onSuccess={() => ...} />
 *
 * It creates a Stripe PaymentIntent for the order, mounts Stripe Elements,
 * and calls /api/payment/confirm/ once the card payment succeeds.
 */
export default function OrderPayment({ orderId, onSuccess }) {
  const [createPaymentIntent] = useCreatePaymentIntentMutation();

  const [clientSecret, setClientSecret] = useState(null);
  const [publishableKey, setPublishableKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await createPaymentIntent(orderId).unwrap();
      setClientSecret(res.client_secret);
      setPublishableKey(res.publishable_key);
    } catch (err) {
      setError(
        err?.data?.detail || "Could not start payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={startCheckout} disabled={loading} className="w-full">
          {loading ? "Loading..." : "Pay Online"}
        </Button>
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripe(publishableKey)}
      options={{ clientSecret }}
    >
      <CheckoutForm orderId={orderId} onSuccess={onSuccess} />
    </Elements>
  );
}
