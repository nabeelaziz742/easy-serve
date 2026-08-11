"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { List, ArrowRight } from "lucide-react";
import { CheckCircle2, Calendar, Users, Clock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useGetReservationByIdQuery } from "@/services/private/reservations";

export default function ReservationSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = searchParams.get("id");

  const { data: reservation, isLoading } =
    useGetReservationByIdQuery(id, { skip: !id });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading reservation details...
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Reservation not found.
      </div>
    );
  }

  const date = new Date(reservation.reservation_time);

  return (
    <div
        className="min-h-screen bg-linear-to-br from-emerald-50 to-muted flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <Card className="rounded-3xl shadow-xl border border-border/60 overflow-hidden">
          {/* Header */}
          <CardHeader className="text-center space-y-4 pt-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <CheckCircle2 className="w-16 h-16 text-emerald-600" />
            </motion.div>

            <CardTitle className="text-2xl font-semibold">
              Reservation Successful 🎉
            </CardTitle>

            <CardDescription className="text-base">
              Your table has been reserved successfully.
            </CardDescription>

            <Badge
              variant="secondary"
              className="mx-auto text-emerald-700 bg-emerald-100"
            >
              Status: {reservation.status}
            </Badge>
          </CardHeader>

          <Separator />

          {/* Details */}
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {date.toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {reservation.guest_count} Guests
              </span>
            </div>

            <Separator />

            <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
              Reservation ID:
              <span className="ml-2 font-mono text-foreground">#{id}</span>
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-3">
              <Button
                className="w-full h-11 rounded-xl"
                onClick={() => router.push("/")}
              >
                Back to Home
              </Button>



<motion.div
  whileHover={{ y: -1 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 300 }}
>
  <Button
    variant="outline"
    className="
      w-full h-12 rounded-2xl flex items-center justify-between
      px-5 text-sm font-medium
      border-emerald-200 bg-emerald-50/40
      hover:bg-emerald-50
      hover:border-emerald-400
      text-emerald-800
      transition-all
    "
    onClick={() => router.push("/profile/reservations")}
  >
    <span className="flex items-center gap-2">
      <List className="w-4 h-4" />
      View My Reservations
    </span>

    <ArrowRight className="w-4 h-4 opacity-70" />
  </Button>
</motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
