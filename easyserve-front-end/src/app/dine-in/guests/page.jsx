"use client";

import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import GuestSelector from "@/components/dineIn/GuestSelector";


export default function GuestPage() {
  const router = useRouter();
  const dineIn = useSelector((state) => state.dineIn);

  if (!dineIn.active) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-6 rounded-xl shadow">
        <GuestSelector
          onContinue={() =>
            router.push(`/restaurant/${dineIn.restaurant.id}?mode=dine-in`)
          }
        />
      </div>
    </div>
  );
}
