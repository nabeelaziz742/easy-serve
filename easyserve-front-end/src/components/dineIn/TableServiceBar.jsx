"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BellRing, ReceiptText, Check } from "lucide-react";
import { toast } from "sonner";
import { getDineInToken } from "@/utilities/dineInStorage";
import { useCreateTableRequestMutation, useGetMyTableRequestsQuery } from "@/services/private/serviceRequests";

const ACTIONS = [
  { kind: "waiter", label: "Call waiter", sent: "Waiter is coming", icon: BellRing },
  { kind: "bill", label: "Ask for bill", sent: "Bill requested", icon: ReceiptText },
];

// Floating buttons for a guest seated through the table QR code: call the
// waiter or ask for the bill without waving across the room. Shown only on
// the guest's table pages (see layoutClient) while the visit is active.
export default function TableServiceBar() {
  const dineIn = useSelector((state) => state.dineIn);
  const [token, setToken] = useState(null);

  // The token can live only in localStorage (after a refresh), which is
  // browser-only, so read it after mount.
  useEffect(() => {
    setToken(getDineInToken({ dineIn }));
  }, [dineIn?.sessionToken, dineIn?.session?.token]);

  const { data } = useGetMyTableRequestsQuery(undefined, {
    skip: !token,
    pollingInterval: 10000,
    refetchOnFocus: true,
  });
  const [createRequest, { isLoading }] = useCreateTableRequestMutation();

  // Wait for the server to confirm the visit: a token can be left over from
  // a finished one (bill paid, table closed).
  if (!token || data?.active !== true) return null;

  const openKinds = new Set((data?.results || []).map((request) => request.kind));

  const send = async (action) => {
    try {
      await createRequest(action.kind).unwrap();
      toast.success(action.kind === "bill" ? "The waiter will bring your bill." : "The waiter has been called.");
    } catch (error) {
      toast.error(error?.data?.detail || "Could not reach the waiter. Please try again.");
    }
  };

  return (
    <div className="fixed bottom-6 left-4 z-40 flex gap-2 sm:left-6 sm:flex-col">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        const sent = openKinds.has(action.kind);
        return (
          <button
            key={action.kind}
            onClick={() => send(action)}
            disabled={isLoading || sent}
            className={`flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-bold shadow-xl transition-colors sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${
              sent
                ? "bg-emerald-600 text-white"
                : "bg-white text-green-950 ring-1 ring-zinc-200 hover:bg-amber-50"
            }`}
          >
            {sent ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            {sent ? action.sent : action.label}
          </button>
        );
      })}
    </div>
  );
}
