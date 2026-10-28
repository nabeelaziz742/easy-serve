"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Store } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import RestaurantForm from "@/components/superAdmin/RestaurantForm";
import { useOnboardRestaurantMutation, useUploadRestaurantLogoMutation } from "@/services/private/superAdmin";

function Created({ restaurant, onReset }) {
  return (
    <div className="saas-card space-y-4 p-6 text-sm">
      <p className="flex items-center gap-2 text-base font-black text-zinc-900">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {restaurant.name} is ready
      </p>
      <p className="text-zinc-600">
        The manager can log in now as <b>{restaurant.manager?.username}</b> ({restaurant.manager?.email}) with the
        temporary password. {restaurant.table_count} tables were created, each with its own QR code.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/super-admin" className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700">
          All restaurants
        </Link>
        <Link href="/admin/tables" className="rounded-lg bg-green-950 px-3 py-2 text-xs font-bold text-amber-400">
          Print table QR codes
        </Link>
        <button type="button" onClick={onReset} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700">
          Add another restaurant
        </button>
      </div>
    </div>
  );
}

export default function AddRestaurantPage() {
  const [onboard, { isLoading }] = useOnboardRestaurantMutation();
  const [uploadLogo, { isLoading: isUploading }] = useUploadRestaurantLogoMutation();
  const [created, setCreated] = useState(null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={Store}
        title="Add Restaurant"
        description="Creates the restaurant, its manager login and its tables with QR codes in one step."
      />

      {created ? (
        <Created restaurant={created} onReset={() => setCreated(null)} />
      ) : (
        <RestaurantForm
          isLoading={isLoading || isUploading}
          submitLabel="Create restaurant"
          onSubmit={async (payload, logo) => {
            const restaurant = await onboard(payload).unwrap();
            setCreated(logo ? await uploadLogo({ id: restaurant.id, logo }).unwrap() : restaurant);
          }}
        />
      )}
    </div>
  );
}
