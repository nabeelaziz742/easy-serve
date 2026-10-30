"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import ReservationBooking from "@/components/reservations/ReservationBooking";
import { useGetRestaurantQuery } from "@/services/public/resturants";

// Old booking links (/reservation?restaurant=ID) open the same booking card
// as the popup; without a restaurant the guest picks one on the home page.
function ReservationPageContent() {
  const router = useRouter();
  const restaurantId = useSearchParams().get("restaurant");
  const { data: restaurant, isError } = useGetRestaurantQuery(restaurantId, { skip: !restaurantId });

  useEffect(() => {
    if (!restaurantId || isError) router.replace("/?mode=reservation#restaurants");
  }, [restaurantId, isError, router]);

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-black px-3 py-10">
      {restaurant ? (
        <ReservationBooking restaurant={restaurant} />
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      )}
    </div>
  );
}

export default function ReservationPage() {
  return (
    <Suspense fallback={null}>
      <ReservationPageContent />
    </Suspense>
  );
}
