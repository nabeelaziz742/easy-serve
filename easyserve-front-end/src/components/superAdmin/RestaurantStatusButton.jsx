"use client";

import { toast } from "sonner";
import { Power } from "lucide-react";
import { useUpdateRestaurantMutation } from "@/services/private/superAdmin";

/** Enables or disables a restaurant. Disabled: its staff can't log in and guests can't order. */
export default function RestaurantStatusButton({ restaurant }) {
  const [update, { isLoading }] = useUpdateRestaurantMutation();
  const active = restaurant.is_active !== false;

  const toggle = async () => {
    const question = active
      ? `Disable ${restaurant.name}? Its manager, waiters and chefs will be logged out and guests can't order.`
      : `Enable ${restaurant.name} again?`;
    if (!confirm(question)) return;
    try {
      await update({ id: restaurant.id, is_active: !active }).unwrap();
      toast.success(`${restaurant.name} ${active ? "disabled" : "enabled"}.`);
    } catch (error) {
      toast.error(error?.data?.detail || "Could not change the restaurant status.");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
        active
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      }`}
    >
      <Power className="h-3.5 w-3.5" /> {active ? "Disable" : "Enable"}
    </button>
  );
}
