"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Users, User, Phone, Utensils, Sparkles, AlertTriangle } from "lucide-react";
import {
  setDineInGuests,
  setGuestInfo,
  setDineInSession,
} from "@/store/slices/dineInSlice";
import { useStartDineInSessionMutation } from "@/services/public/dineIn";

const DINE_IN_STORAGE_KEY = "easyserve:dine-in-context";

export default function GuestSelector({ onContinue }) {
  const dispatch = useDispatch();
  const dineIn = useSelector((state) => state.dineIn);
  const [startDineInSession, { isLoading }] = useStartDineInSessionMutation();
  const [error, setError] = useState("");

  const capacity = dineIn.table?.capacity ?? 4;
  const guests = dineIn.guests;

  const recommendedMin = Math.max(1, capacity - 2);
  const recommendedMax = capacity;
  const isOverCapacity = Number(guests || 0) > capacity;

  const handleContinue = async () => {
    setError("");

    if (!guests || isOverCapacity) return;

    try {
      const response = await startDineInSession({
        restaurant: dineIn.restaurant.id,
        table: dineIn.table.number,
        guests: Number(guests),
        name: dineIn.name,
        phone: dineIn.phone,
        session_token: dineIn.sessionToken,
      }).unwrap();

      dispatch(
        setDineInSession({
          active_session: response.active_session,
          session: response.session,
          sessionToken: response.session?.token ?? null,
        })
      );

      // Redux state is memory-only. Persist the active dine-in context so a
      // normal browser refresh does not turn the customer back into an
      // anonymous online-order visitor.
      const persistedContext = {
        active: true,
        restaurant: dineIn.restaurant,
        table: dineIn.table,
        menus: dineIn.menus ?? [],
        active_session: response.active_session,
        session: response.session,
        guests: response.session?.guests ?? Number(guests),
        name: response.session?.name ?? dineIn.name ?? "",
        phone: response.session?.phone ?? dineIn.phone ?? "",
        sessionToken: response.session?.token ?? null,
      };

      window.localStorage.setItem(
        DINE_IN_STORAGE_KEY,
        JSON.stringify(persistedContext)
      );

      onContinue();
    } catch (err) {
      setError(
        err?.data?.detail ||
          "Unable to start the dine-in session. Please try again."
      );
    }
  };

  const quickCounts = Array.from({ length: Math.min(capacity, 8) }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Table Header Info */}
      <div className="rounded-2xl border border-yellow-400/30 bg-yellow-50/70 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-black font-bold">
              <Utensils size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-yellow-900">Table #{dineIn.table?.number || "1"}</p>
              <p className="text-[11px] text-yellow-700">{dineIn.restaurant?.name || "Restaurant"}</p>
            </div>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-700 shadow-sm">
            Max {capacity} Seats
          </span>
        </div>
      </div>

      {/* Guest Count Selection */}
      <div>
        <label className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-600">
          <span className="flex items-center gap-1.5"><Users size={14} className="text-yellow-600" /> Number of Guests</span>
          <span className="text-gray-400 font-normal">Capacity: {capacity}</span>
        </label>

        {/* Quick Selection Chips */}
        <div className="mb-3 grid grid-cols-4 gap-2">
          {quickCounts.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => dispatch(setDineInGuests(num))}
              className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                guests === num
                  ? "bg-green-950 text-yellow-400 shadow-md ring-2 ring-yellow-400"
                  : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {num} {num === 1 ? "Guest" : "Guests"}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <input
          type="number"
          min={1}
          max={capacity}
          value={guests ?? ""}
          onChange={(e) =>
            dispatch(setDineInGuests(e.target.value ? Number(e.target.value) : null))
          }
          className={`w-full rounded-xl border p-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-700/20 ${
            isOverCapacity ? "border-red-500 bg-red-50/50" : "border-gray-200 bg-white"
          }`}
          placeholder={`Or type guest count (1-${capacity})`}
        />

        {isOverCapacity ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
            <AlertTriangle size={14} /> This table cannot fit more than {capacity} guests.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-gray-500">
            Ideal for {recommendedMin}–{recommendedMax} guests.
          </p>
        )}
      </div>

      {/* Optional Contact Info */}
      <div className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Personalize Your Experience (Optional)
        </p>

        <div className="relative">
          <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Your Name"
            value={dineIn.name ?? ""}
            onChange={(e) =>
              dispatch(
                setGuestInfo({
                  name: e.target.value,
                  phone: dineIn.phone,
                })
              )
            }
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-700/20"
          />
        </div>

        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="tel"
            placeholder="Phone Number"
            value={dineIn.phone ?? ""}
            onChange={(e) =>
              dispatch(
                setGuestInfo({
                  name: dineIn.name,
                  phone: e.target.value,
                })
              )
            }
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-700/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Action Button */}
      <button
        disabled={!guests || isOverCapacity || isLoading}
        onClick={handleContinue}
        className="w-full rounded-2xl bg-green-950 py-3.5 text-sm font-bold text-yellow-400 shadow-xl transition-all hover:bg-green-900 hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Starting Table Session..." : "Continue to Menu"}
      </button>
    </div>
  );
}
