"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Printer } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import RestaurantForm from "@/components/superAdmin/RestaurantForm";
import RestaurantStatusButton from "@/components/superAdmin/RestaurantStatusButton";
import {
  useGetRestaurantQuery,
  useUpdateRestaurantMutation,
  useUploadRestaurantLogoMutation,
} from "@/services/private/superAdmin";
import { useGetTablesQuery } from "@/services/private/tables";
import { printTableQrs } from "@/utilities/tableQr";

export default function EditRestaurantPage() {
  const { id } = useParams();
  const { data: restaurant, isLoading } = useGetRestaurantQuery(id);
  const [update, { isLoading: isSaving }] = useUpdateRestaurantMutation();
  const [uploadLogo, { isLoading: isUploading }] = useUploadRestaurantLogoMutation();
  const { data: allTables = [] } = useGetTablesQuery();
  const tables = allTables.filter((t) => t.restaurant === restaurant?.name && t.qrCode);

  const printQrs = () => {
    if (!printTableQrs(tables)) toast.error("Allow pop-ups for this site to print the QR codes.");
  };

  const save = async (payload, logo) => {
    await update({ id, ...payload }).unwrap();
    if (logo) await uploadLogo({ id, logo }).unwrap();
    // Stay here: after a rename the new QR codes can be printed right away.
    toast.success(payload.name !== restaurant.name ? "Restaurant updated. QR codes now show the new name." : "Restaurant updated.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={Pencil}
        title={restaurant ? `Edit ${restaurant.name}` : "Edit Restaurant"}
        description="Change the restaurant details or its manager login."
        actions={
          restaurant && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={printQrs}
                disabled={!tables.length}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                <Printer className="h-3.5 w-3.5" /> Print QR codes ({tables.length})
              </button>
              <RestaurantStatusButton restaurant={restaurant} />
            </div>
          )
        }
      />
      {isLoading || !restaurant ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <RestaurantForm initial={restaurant} isLoading={isSaving || isUploading} submitLabel="Save changes" onSubmit={save} />
      )}
    </div>
  );
}
