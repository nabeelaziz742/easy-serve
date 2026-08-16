"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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

  const capacity = dineIn.table?.capacity ?? 0;
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

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">How many guests?</h3>

      <input
        type="number"
        min={1}
        max={capacity}
        value={guests ?? ""}
        onChange={(e) =>
          dispatch(setDineInGuests(e.target.value ? Number(e.target.value) : null))
        }
        className={`w-full border rounded p-2 ${
          isOverCapacity ? "border-red-500" : ""
        }`}
        placeholder="Enter number of guests"
      />

      <p className="text-sm text-gray-500">
        Table capacity: {capacity}
      </p>

      <p className="text-xs text-green-600">
        Recommended for {recommendedMin}–{recommendedMax} people
      </p>

      {isOverCapacity && (
        <p className="text-sm text-red-600">
          ⚠️ This table may not comfortably fit your group.
        </p>
      )}

      <div className="space-y-2 pt-2">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={dineIn.name ?? ""}
          onChange={(e) =>
            dispatch(
              setGuestInfo({
                name: e.target.value,
                phone: dineIn.phone,
              })
            )
          }
          className="w-full border rounded p-2"
        />

        <input
          type="tel"
          placeholder="Phone number (optional)"
          value={dineIn.phone ?? ""}
          onChange={(e) =>
            dispatch(
              setGuestInfo({
                name: dineIn.name,
                phone: e.target.value,
              })
            )
          }
          className="w-full border rounded p-2"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        disabled={!guests || isOverCapacity || isLoading}
        onClick={handleContinue}
        className="w-full bg-green-700 text-white py-2 rounded disabled:opacity-50"
      >
        {isLoading ? "Starting table session..." : "Continue to Menu"}
      </button>
    </div>
  );
}
