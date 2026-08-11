"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  XCircle,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { useGetMyReservationsQuery } from "@/services/private/reservations";

export default function MyReservationsPage() {
  const router = useRouter();
  const { data: reservations = [], isLoading } =
    useGetMyReservationsQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading your reservations…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold">
            My Reservations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your upcoming and past reservations
          </p>
        </div>

        {/* Empty State */}
        {reservations.length === 0 && (
          <Card className="rounded-2xl text-center py-12">
            <CardContent className="space-y-4">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                You don’t have any reservations yet.
              </p>
              <Button onClick={() => router.push("/")}>
                Reserve a Table
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Reservation Cards */}
        <div className="space-y-5">
          {reservations?.results?.map((res, index) => {
            const date = new Date(res.reservation_time);

            return (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="rounded-2xl border shadow-sm hover:shadow-md transition">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">
                      Reservation #{res.id}
                    </CardTitle>

                    <StatusBadge status={res.status} />
                  </CardHeader>

                  <Separator />

                  <CardContent className="pt-4 space-y-3 text-sm">
                    <InfoRow
                      icon={Calendar}
                      label={date.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    />

                    <InfoRow
                      icon={Clock}
                      label={date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />

                    <InfoRow
                      icon={Users}
                      label={`${res.guest_count} Guests`}
                    />

                    {res.restaurant?.name && (
                      <InfoRow
                        icon={MapPin}
                        label={res.restaurant.name}
                      />
                    )}

                    {/* Actions */}
                    <div className="pt-4 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/reservation/success?id=${res.id}`)
                        }
                      >
                        View Details
                      </Button>

                      {res.status === "Confirmed" && (
                        <Button
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
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
  );
}

/* ------------------ helpers ------------------ */

function InfoRow({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span>{label}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    Completed: {
      className:
        "bg-slate-300 text-slate-900 border border-slate-400",
      icon: CheckCircle,
    },
    Confirmed: {
      className:
        "bg-emerald-100 text-emerald-800 border border-emerald-200",
    },
    Pending: {
      className:
        "bg-amber-100 text-amber-800 border border-amber-200",
    },
    Cancelled: {
      className:
        "bg-red-100 text-red-800 border border-red-200",
    },
  };

  const item = config[status] || {};
  const Icon = item.icon;

  return (
    <Badge className={`flex items-center gap-1 px-3 py-1 ${item.className}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {status}
    </Badge>
  );
}
