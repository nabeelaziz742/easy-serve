"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  List,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Users,
  Clock,
  Home,
  MapPin,
  Sparkles,
  Ticket,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGetReservationByIdQuery } from "@/services/private/reservations";

function ReservationSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = searchParams.get("id");

  const { data: reservation, isLoading } =
    useGetReservationByIdQuery(id, { skip: !id });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="rounded-3xl border border-yellow-400/20 bg-white px-8 py-7 text-center shadow-xl">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-yellow-500" />
          <p className="font-bold text-gray-900">Loading reservation details...</p>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full rounded-3xl p-8 text-center shadow-lg border-gray-200">
          <p className="font-bold text-gray-800 text-lg">Reservation not found</p>
          <p className="text-xs text-gray-500 mt-1">Please check your reservation link or profile.</p>
          <Button
            onClick={() => router.push("/")}
            className="mt-5 w-full rounded-2xl bg-green-950 text-yellow-400 font-bold"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  const date = new Date(reservation.reservation_time);

  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-gray-50 via-white to-gray-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <Card className="rounded-3xl border border-gray-200/80 bg-white shadow-2xl overflow-hidden">
          {/* Header Banner */}
          <CardHeader className="text-center space-y-3 p-6 sm:p-8 bg-green-950 text-white relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 18 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-xl"
            >
              <CheckCircle2 className="h-9 w-9 text-green-950" />
            </motion.div>

            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-0.5 text-xs font-bold text-yellow-300 border border-yellow-400/30 mb-2">
                <Sparkles className="h-3 w-3" /> Booking Confirmed
              </span>
              <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Table Reserved! 🎉
              </CardTitle>
              <CardDescription className="text-sm text-green-200 mt-1">
                Your dining reservation is confirmed and logged in our system.
              </CardDescription>
            </div>
          </CardHeader>

          {/* Ticket Details */}
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-50/60 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-black font-bold">
                  <Ticket size={20} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-yellow-900">Confirmation Code</p>
                  <p className="font-mono text-base font-extrabold text-green-950">#{id}</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-900">
                {reservation.status || "Confirmed"}
              </span>
            </div>

            <div className="space-y-3.5 text-sm text-gray-700">
              <div className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-yellow-600 shadow-xs">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Date</p>
                  <p className="font-bold text-gray-900">
                    {date.toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-yellow-600 shadow-xs">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Time</p>
                    <p className="font-bold text-gray-900">
                      {date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-yellow-600 shadow-xs">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Party Size</p>
                    <p className="font-bold text-gray-900">
                      {reservation.guest_count} {reservation.guest_count === 1 ? "Guest" : "Guests"}
                    </p>
                  </div>
                </div>
              </div>

              {reservation.restaurant?.name && (
                <div className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-yellow-600 shadow-xs">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Restaurant</p>
                    <p className="font-bold text-gray-900">{reservation.restaurant.name}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <Button
                className="w-full h-12 rounded-2xl bg-green-950 text-yellow-400 hover:bg-green-900 font-bold text-sm shadow-xl transition hover:scale-[1.01] active:scale-[0.98]"
                onClick={() => router.push("/")}
              >
                <Home className="mr-2 h-4 w-4" /> Back to Home
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl flex items-center justify-between px-5 text-sm font-bold border-gray-200 bg-gray-50/70 hover:bg-gray-100 hover:border-green-200 text-gray-800 transition active:scale-[0.98]"
                onClick={() => router.push("/profile/reservations")}
              >
                <span className="flex items-center gap-2">
                  <List className="w-4 h-4 text-yellow-600" />
                  View All My Reservations
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ReservationSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="rounded-3xl border border-yellow-400/20 bg-white px-8 py-7 text-center shadow-xl">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-yellow-500" />
            <p className="font-bold text-gray-900">Loading reservation details...</p>
          </div>
        </div>
      }
    >
      <ReservationSuccessContent />
    </Suspense>
  );
}