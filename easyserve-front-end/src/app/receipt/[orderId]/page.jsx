"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, ReceiptText } from "lucide-react";
import { useGetOrderReceiptQuery } from "@/services/private/settings";

const money = (v) => Number(v || 0).toFixed(2);

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}

function Row({ label, value, strong }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-base font-black text-black" : ""}`}>
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

export default function ReceiptPage({ params }) {
  const { orderId } = use(params);
  const router = useRouter();
  const { data: bill, isLoading, isError, error } = useGetOrderReceiptQuery(orderId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <div className="h-[420px] w-[320px] animate-pulse rounded-lg bg-white" />
      </div>
    );
  }

  if (isError || !bill) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
        <div className="saas-card max-w-sm p-6 text-center">
          <ReceiptText className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
          <h1 className="text-base font-bold text-zinc-900">Bill not available</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {error?.status === 403
              ? "This bill belongs to another table or restaurant."
              : "We could not load this bill. Please try again."}
          </p>
          <button onClick={() => router.back()} className="mt-4 text-sm font-semibold text-green-800 hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const r = bill.restaurant || {};
  const showService = Number(bill.service_charge) > 0;
  const showTax = Number(bill.tax) > 0;

  return (
    <div className="receipt-page min-h-screen bg-zinc-100 px-4 py-6">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body { background: #fff !important; }
          .receipt-page { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
          .receipt-actions { display: none !important; }
          .receipt-paper { box-shadow: none !important; border: 0 !important; width: 72mm !important; max-width: 72mm !important; margin: 0 auto !important; padding: 0 !important; }
        }
      `}</style>

      <div className="receipt-actions mx-auto mb-4 flex w-full max-w-[340px] items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-green-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-800"
        >
          <Printer className="h-4 w-4" /> Print bill
        </button>
      </div>

      <div className="receipt-paper mx-auto w-full max-w-[340px] rounded-lg border border-zinc-200 bg-white p-5 font-mono text-[12px] leading-relaxed text-zinc-800 shadow-sm">
        <div className="text-center">
          <h1 className="text-base font-black uppercase tracking-wide text-black">{r.name || "Restaurant"}</h1>
          {(r.address || r.city) && <p>{[r.address, r.city].filter(Boolean).join(", ")}</p>}
          {r.phone_number && <p>Tel: {r.phone_number}</p>}
          {r.tax_number && <p>{r.tax_label || "Tax"} No: {r.tax_number}</p>}
        </div>

        <div className="my-3 border-t border-dashed border-zinc-400" />

        <div className="space-y-0.5">
          <Row label="Bill #" value={bill.order_id} />
          <Row label="Date" value={formatDate(bill.ordered_date)} />
          {bill.table_number != null && <Row label="Table" value={bill.table_number} />}
          {bill.waiter_name && <Row label="Served by" value={bill.waiter_name} />}
          <Row label="Order" value={bill.order_type} />
        </div>

        <div className="my-3 border-t border-dashed border-zinc-400" />

        <div className="mb-1 flex justify-between font-bold text-black">
          <span>Item</span>
          <span>Amount</span>
        </div>
        <ul className="space-y-1.5">
          {bill.items.map((item, i) => (
            <li key={i}>
              <div className="flex justify-between gap-3">
                <span className="min-w-0 break-words">{item.name}</span>
                <span className="tabular shrink-0">{money(item.amount)}</span>
              </div>
              <div className="text-[11px] text-zinc-500">
                {item.quantity} x {money(item.price)}
                {item.comments ? ` · ${item.comments}` : ""}
              </div>
            </li>
          ))}
        </ul>

        <div className="my-3 border-t border-dashed border-zinc-400" />

        <div className="space-y-0.5">
          <Row label="Subtotal" value={money(bill.subtotal)} />
          {showService && <Row label="Service charge" value={money(bill.service_charge)} />}
          {showTax && <Row label={r.tax_label || "Tax"} value={money(bill.tax)} />}
        </div>
        <div className="my-2 border-t border-zinc-800" />
        <Row label="TOTAL (Rs.)" value={money(bill.total)} strong />

        <div className="mt-3 space-y-0.5 text-[11px]">
          <Row label="Payment" value={bill.payment_status} />
          {bill.payment_method && <Row label="Method" value={bill.payment_method} />}
        </div>

        <div className="my-3 border-t border-dashed border-zinc-400" />
        <p className="text-center">{r.receipt_footer || "Thank you for dining with us!"}</p>
        <p className="mt-2 text-center text-[10px] text-zinc-400">Powered by Easy Serve</p>
      </div>
    </div>
  );
}
