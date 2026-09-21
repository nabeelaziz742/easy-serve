"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  XCircle,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Utensils,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useGetMyReservationsQuery } from "@/services/private/reservations";
import RoleGuard from "@/components/auth/RoleGuard";

export default function MyReservationsPage() {
  const router = useRouter();
  const { data: reservations = [], isLoading } = useGetMyReservationsQuery();

  if (isLoading) {
    return (
      <RoleGuard>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-10">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-10 w-64 rounded-2xl" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-3xl" />
              ))}
            </div>
          </div>
        </div>
      </RoleGuard>
    );
  }

  const reservationList = reservations?.results || (Array.isArray(reservations) ? reservations : []);

  return (
    <RoleGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-10 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-yellow-800">
                <Sparkles className="h-3 w-3 text-yellow-600" /> Dining Bookings
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-green-950">
                My Reservations
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage upcoming table bookings and past dining experiences.
              </p>
            </div>

            <Button
              onClick={() => router.push("/restaurant?mode=reservation")}
              className="rounded-2xl bg-green-950 px-5 py-2.5 text-xs font-bold text-yellow-400 hover:bg-green-900 shadow-md active:scale-[0.98]"
            >
              <Utensils className="mr-1.5 h-4 w-4" /> Book New Table
            </Button>
          </motion.div>

          {/* Empty State */}
          {reservationList.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="rounded-3xl border border-gray-200/80 bg-white text-center py-16 px-6 shadow-sm">
                <CardContent className="space-y-4 max-w-sm mx-auto p-0">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600 border border-yellow-200/60 shadow-inner">
                    <Calendar className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    No reservations booked yet
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Select a restaurant, pick a date & time, and guarantee your seating in seconds.
                  </p>
                  <Button
                    onClick={() => router.push("/restaurant?mode=reservation")}
                    className="mt-2 rounded-2xl bg-green-950 px-6 font-bold text-yellow-400 hover:bg-green-900"
                  >
                    Reserve a Table Now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Reservation Cards */}
          <div className="space-y-5">
            {reservationList.map((res, index) => {
              const date = new Date(res.reservation_time);

              return (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="smooth-card overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm hover:shadow-xl transition-all">
                    <div className="border-b border-gray-100 bg-green-950/95 px-6 py-4 text-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-black font-bold text-xs shadow-md">
                          #{res.id}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-white">
                            {res.restaurant?.name || "Restaurant Reservation"}
                          </h3>
                          <p className="text-[11px] text-green-200">
                            Booked for {res.guest_count} {res.guest_count === 1 ? "Guest" : "Guests"}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={res.status} />
                    </div>

                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-yellow-600 shadow-xs">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Date</p>
                            <p className="text-xs font-bold text-gray-900">
                              {date.toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-yellow-600 shadow-xs">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Time</p>
                            <p className="text-xs font-bold text-gray-900">
                              {date.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-yellow-600 shadow-xs">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Guests</p>
                            <p className="text-xs font-bold text-gray-900">
                              {res.guest_count} People
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-gray-200 text-xs font-bold hover:bg-green-50 hover:text-green-950"
                          onClick={() =>
                            router.push(`/reservation/success?id=${res.id}`)
                          }
                        >
                          View Confirmation Pass <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>

                        {res.status === "Confirmed" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-xl text-xs font-bold"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

function StatusBadge({ status }) {
  const config = {
    Completed: {
      className: "bg-slate-200 text-slate-900 border-slate-300",
      icon: CheckCircle,
    },
    Confirmed: {
      className: "bg-emerald-100 text-emerald-900 border-emerald-300",
      icon: CheckCircle,
    },
    Pending: {
      className: "bg-amber-100 text-amber-900 border-amber-300",
      icon: Clock,
    },
    Cancelled: {
      className: "bg-red-100 text-red-900 border-red-300",
      icon: XCircle,
    },
  };

  const item = config[status] || {
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  const Icon = item.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${item.className}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {status || "Confirmed"}
    </span>
  );
}
