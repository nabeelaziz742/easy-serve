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
import { CreditCard, Loader2, Lock, ShieldCheck, AlertCircle } from "lucide-react";

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
      setErrorMsg(error.message || "Payment processing failed. Please check card details.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        await confirmPayment(orderId).unwrap();
        onSuccess?.();
      } catch (err) {
        setErrorMsg(
          "Payment processed successfully, but the server status update encountered an error. Please contact restaurant staff."
        );
      }
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <PaymentElement />
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full h-11 rounded-2xl bg-green-950 text-yellow-400 hover:bg-green-900 font-bold text-xs shadow-lg transition active:scale-[0.98] disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Secure Payment...
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" /> Authorize & Pay Online
          </>
        )}
      </Button>
    </form>
  );
}

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
        err?.data?.detail || "Could not initialize card checkout. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <Button
          onClick={startCheckout}
          disabled={loading}
          className="w-full h-11 rounded-2xl bg-green-950 text-yellow-400 hover:bg-green-900 font-bold text-xs shadow-md transition active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initializing Gateway...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" /> Initialize Secure Card Payment
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500 pb-1 border-b border-gray-200">
        <span className="flex items-center gap-1 font-semibold text-green-950">
          <Lock className="h-3 w-3 text-yellow-600" /> 256-bit Encrypted Checkout
        </span>
        <span>Order #{orderId}</span>
      </div>
      <Elements
        stripe={getStripe(publishableKey)}
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#052e16",
              borderRadius: "12px",
            },
          },
        }}
      >
        <CheckoutForm orderId={orderId} onSuccess={onSuccess} />
      </Elements>
    </div>
  );
}
