"use client";

import Link from "next/link";
import { Pencil, Plus, Store } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import RestaurantStatusButton from "@/components/superAdmin/RestaurantStatusButton";
import { useGetRestaurantsQuery } from "@/services/private/superAdmin";

const COLUMNS = ["Restaurant", "City", "Manager login", "Tables", "Added", "Status", "Actions"];

export default function AllRestaurantsPage() {
  const { data: restaurants = [], isLoading } = useGetRestaurantsQuery();

  return (
    <>
      <PageHeader
        icon={Store}
        title="All Restaurants"
        description="Every restaurant on Easy Serve with its manager login."
        actions={
          <Link
            href="/super-admin/restaurants/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-950 px-3 py-2 text-xs font-bold text-amber-400 transition hover:bg-green-900"
          >
            <Plus className="h-3.5 w-3.5" /> Add Restaurant
          </Link>
        }
      />

      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : restaurants.length === 0 ? (
        <EmptyState icon={Store} title="No restaurants yet" description="Add the first restaurant to get started." />
      ) : (
        <div className="saas-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/70">
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column} className="saas-label px-4 py-3">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {restaurants.map((r) => (
                <tr key={r.id} className={`align-middle ${r.is_active === false ? "bg-zinc-50/60" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-zinc-900">{r.name}</p>
                    {r.phone_number && <p className="text-xs text-zinc-500">{r.phone_number}</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{r.city || "–"}</td>
                  <td className="px-4 py-3">
                    {r.manager ? (
                      <>
                        <p className="font-medium text-zinc-900">{r.manager.username}</p>
                        <p className="text-xs text-zinc-500">{r.manager.email}</p>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-400">No manager</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-zinc-900 tabular">{r.table_count}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {r.is_active === false ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-100">Disabled</span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/super-admin/restaurants/${r.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <RestaurantStatusButton restaurant={r} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
