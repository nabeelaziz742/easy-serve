"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setDineInGuests,
  setGuestInfo,
} from "@/store/slices/dineInSlice";

export default function GuestSelector({ onContinue }) {
  const dispatch = useDispatch();
  const dineIn = useSelector((state) => state.dineIn);

  const capacity = dineIn.table.capacity;
  const guests = dineIn.guests;

  // 🔹 Recommendation logic
  const recommendedMin = Math.max(1, capacity - 2);
  const recommendedMax = capacity;

  const isOverCapacity = guests > capacity;

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">How many guests?</h3>

      {/* Guest Count */}
      <input
        type="number"
        min={1}
        max={capacity}
        value={guests || ""}
        onChange={(e) =>
          dispatch(setDineInGuests(Number(e.target.value)))
        }
        className={`w-full border rounded p-2 ${
          isOverCapacity ? "border-red-500" : ""
        }`}
        placeholder="Enter number of guests"
      />

      {/* UX Intelligence */}
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

      {/* Optional Info */}
      <div className="space-y-2 pt-2">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={dineIn.guest_name}
          onChange={(e) =>
            dispatch(setGuestInfo({
              name: e.target.value,
              phone: dineIn.guest_phone,
            }))
          }
          className="w-full border rounded p-2"
        />

        <input
          type="tel"
          placeholder="Phone number (optional)"
          value={dineIn.guest_phone}
          onChange={(e) =>
            dispatch(setGuestInfo({
              name: dineIn.guest_name,
              phone: e.target.value,
            }))
          }
          className="w-full border rounded p-2"
        />
      </div>

      {/* Safety */}
      <button
        disabled={!guests || isOverCapacity}
        onClick={onContinue}
        className="w-full bg-green-700 text-white py-2 rounded disabled:opacity-50"
      >
        Continue to Menu
      </button>
    </div>
  );
}
