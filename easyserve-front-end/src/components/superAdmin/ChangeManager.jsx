"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { useGetManagersQuery, useUpdateRestaurantMutation } from "@/services/private/superAdmin";

const describe = (m) =>
  `${m.name || m.username} (${m.username}) · ${m.restaurant ? m.restaurant.name : "No restaurant"}`;

/** Hands the restaurant to an existing manager account, moving it from its old restaurant. */
export default function ChangeManager({ restaurant }) {
  const { data: managers = [] } = useGetManagersQuery();
  const [update, { isLoading }] = useUpdateRestaurantMutation();
  const [managerId, setManagerId] = useState("");
  const others = managers.filter((m) => m.username !== restaurant.manager?.username);

  const assign = async () => {
    const manager = others.find((m) => String(m.id) === managerId);
    const lines = [`Make ${manager.username} the manager of ${restaurant.name}?`];
    if (restaurant.manager) lines.push(`${restaurant.manager.username} will no longer manage it.`);
    if (manager.restaurant) lines.push(`${manager.restaurant.name} will be left without a manager.`);
    if (!confirm(lines.join("\n"))) return;
    try {
      await update({ id: restaurant.id, manager_id: manager.id }).unwrap();
      toast.success(`${manager.username} now manages ${restaurant.name}.`);
      setManagerId("");
    } catch (error) {
      toast.error(error?.data?.manager_id?.[0] || error?.data?.detail || "Could not change the manager.");
    }
  };

  return (
    <section className="saas-card overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3 text-sm font-bold text-zinc-900">
        <ArrowRightLeft className="h-4 w-4 text-amber-500" /> Change manager
      </h2>
      <div className="space-y-3 p-5">
        <p className="text-xs text-zinc-500">
          Current manager:{" "}
          <b className="text-zinc-800">
            {restaurant.manager ? `${restaurant.manager.username} (${restaurant.manager.email})` : "none"}
          </b>
          . Pick an existing manager account to move it to this restaurant.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-green-900 focus:bg-white"
          >
            <option value="">{others.length ? "Select a manager…" : "No other manager accounts"}</option>
            {others.map((m) => (
              <option key={m.id} value={m.id}>{describe(m)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={assign}
            disabled={!managerId || isLoading}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-green-950 px-4 py-2 text-xs font-bold text-amber-400 transition hover:bg-green-900 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Assign manager
          </button>
        </div>
      </div>
    </section>
  );
}
