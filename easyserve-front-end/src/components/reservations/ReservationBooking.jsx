"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Minus,
  Phone,
  Plus,
  User,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { useCreateReservationMutation, useGetReservationSlotsQuery } from "@/services/private/reservations";
import { formatTime, openingStatus } from "@/utilities/openingHours";
import {
  OCCASIONS,
  apiError,
  downloadCalendarFile,
  formatDay,
  nextDays,
  saveBooking,
} from "@/utilities/reservations";

const inputClass =
  "h-11 w-full rounded-xl border border-white/10 bg-white/10 pl-10 pr-3 text-sm text-white placeholder:text-gray-400 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30";

const fade = { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 }, transition: { duration: 0.18 } };

function Label({ children }) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-300">{children}</p>;
}

// The guest booking flow in the app's dark glass style: pick a day, party
// size and a free time, then leave a name and phone. Slots come from the
// restaurant's opening hours and only free times can be picked.
export default function ReservationBooking({ restaurant, onClose }) {
  const days = useMemo(() => nextDays(restaurant.hours), [restaurant.hours]);
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(() => (days.find((d) => !d.closed) || days[0]).value);
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", notes: "", occasion: "" });
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);
  const scroller = useRef(null);

  // Each step starts at the top of the card, with the restaurant in view.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [step, booking]);

  const { data, isFetching } = useGetReservationSlotsQuery(
    { restaurantId: restaurant.id, date, guests },
    { refetchOnMountOrArgChange: true }
  );
  const [createReservation, { isLoading: saving }] = useCreateReservationMutation();
  const maxGuests = data?.max_guests ?? 10;
  const slots = data?.slots ?? [];
  const status = openingStatus(restaurant.hours);

  // A picked time that is no longer free (other day, bigger party) is dropped.
  useEffect(() => {
    if (time && !slots.some((s) => s.time === time && s.available)) setTime("");
  }, [slots, time]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const result = await createReservation({ restaurant: restaurant.id, date, time, guest_count: guests, ...form }).unwrap();
      saveBooking({ code: result.booking_code, phone: form.phone });
      setBooking(result);
    } catch (err) {
      setError(apiError(err, "Could not book the table. Please try again."));
    }
  };

  return (
    <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-green-950 via-green-900 to-black text-white shadow-2xl">
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-green-400/10 blur-3xl" />

      <div ref={scroller} className="relative max-h-[92vh] overflow-y-auto p-5 sm:p-7">
        {/* Restaurant */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-yellow-400 text-black shadow-lg">
            {restaurant.logo ? (
              <img src={restaurant.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Utensils className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-extrabold">{restaurant.name}</h2>
            {status && (
              <p className={`text-xs font-semibold ${status.open ? "text-emerald-300" : "text-red-300"}`}>{status.label}</p>
            )}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-gray-300 transition hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {!booking && (
          <div className="mt-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
            {["Date & time", "Your details"].map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step > i ? "bg-yellow-400 text-black" : "bg-white/10 text-gray-400"}`}>
                  {i + 1}
                </span>
                <span className={step > i ? "text-white" : "text-gray-400"}>{label}</span>
                {i === 0 && <span className="h-px flex-1 bg-white/10" />}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {booking ? (
            <motion.div key="done" {...fade} className="mt-6 text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-400/30"
              >
                <CheckCircle2 className="h-11 w-11 text-emerald-400" />
              </motion.div>
              <h3 className="mt-4 text-2xl font-extrabold">
                {booking.status_key === "confirmed" ? "Table booked!" : "Booking request sent"}
              </h3>
              <p className="mt-1 text-sm text-gray-300">
                {booking.status_key === "confirmed"
                  ? "Your table is confirmed. See you soon!"
                  : "The restaurant will confirm it shortly. Keep your booking number."}
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Booking number</span>
                  <span className="font-mono text-lg font-black tracking-widest text-yellow-400">{booking.booking_code}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white/5 p-2">
                    <p className="text-gray-400">Date</p>
                    <p className="font-bold">{formatDay(booking.date)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2">
                    <p className="text-gray-400">Time</p>
                    <p className="font-bold">{formatTime(booking.time)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2">
                    <p className="text-gray-400">Guests</p>
                    <p className="font-bold">{booking.guest_count}</p>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs font-bold">
                  Status:{" "}
                  <span className={booking.status_key === "confirmed" ? "text-emerald-300" : "text-yellow-300"}>
                    {booking.status_key === "confirmed" ? "Confirmed" : "Pending confirmation"}
                  </span>
                </p>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => downloadCalendarFile(booking)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-bold transition hover:bg-white/10"
                >
                  <CalendarPlus className="h-4 w-4" /> Add to calendar
                </button>
                <Link
                  href="/reservations"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
                >
                  My Reservations
                </Link>
              </div>
            </motion.div>
          ) : step === 1 ? (
            <motion.div key="when" {...fade} className="mt-5 space-y-5">
              <div>
                <Label>Date</Label>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {days.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      disabled={day.closed}
                      onClick={() => setDate(day.value)}
                      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border text-center transition ${
                        date === day.value
                          ? "border-yellow-400 bg-yellow-400 text-black shadow-lg shadow-yellow-500/20"
                          : day.closed
                          ? "cursor-not-allowed border-white/5 bg-white/5 text-gray-500"
                          : "border-white/15 bg-white/5 hover:border-yellow-400/60"
                      }`}
                    >
                      <span className="text-[11px] font-bold leading-tight">{day.top}</span>
                      <span className="text-[10px] leading-tight opacity-80">{day.closed ? "Closed" : day.bottom}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Guests</Label>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-2">
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    disabled={guests <= 1}
                    aria-label="Fewer guests"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20 disabled:opacity-40"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <div className="text-center">
                    <p className="text-3xl font-black leading-none">{guests}</p>
                    <p className="text-[11px] text-gray-400">{guests === 1 ? "guest" : "guests"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                    disabled={guests >= maxGuests}
                    aria-label="More guests"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20 disabled:opacity-40"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                {guests >= maxGuests && (
                  <p className="mt-1.5 text-[11px] text-gray-400">For more than {maxGuests} guests please call the restaurant.</p>
                )}
              </div>

              <div>
                <Label>Time</Label>
                {isFetching && !slots.length ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} className="h-10 animate-pulse rounded-xl bg-white/10" />
                    ))}
                  </div>
                ) : !slots.length ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-gray-300">
                    The restaurant takes no bookings on this day. Please pick another date.
                  </p>
                ) : !slots.some((s) => s.available) ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-gray-300">
                    Fully booked for {guests} {guests === 1 ? "guest" : "guests"} on this day. Try another date.
                  </p>
                ) : (
                  <div className={`grid grid-cols-4 gap-2 sm:grid-cols-5 ${isFetching ? "opacity-60" : ""}`}>
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setTime(slot.time)}
                        title={slot.available ? undefined : "Already booked"}
                        className={`flex h-10 flex-col items-center justify-center rounded-xl border text-xs font-bold leading-tight transition ${
                          time === slot.time
                            ? "border-yellow-400 bg-yellow-400 text-black"
                            : slot.available
                            ? "border-white/40 bg-transparent hover:border-yellow-400 hover:text-yellow-300"
                            : "cursor-not-allowed border-white/5 bg-white/5 text-gray-500"
                        }`}
                      >
                        <span className={slot.available ? "" : "line-through"}>{formatTime(slot.time)}</span>
                        {!slot.available && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-red-300/80">Booked</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!time}
                onClick={() => setStep(2)}
                className="w-full rounded-2xl bg-yellow-400 py-3.5 text-base font-bold text-black shadow-xl transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {time ? `Continue · ${formatDay(date)}, ${formatTime(time)}` : "Pick a time"}
              </button>
            </motion.div>
          ) : (
            <motion.form key="details" {...fade} onSubmit={submit} className="mt-5 space-y-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-sm transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 text-gray-400" />
                <span className="flex-1 font-semibold">
                  {formatDay(date)} · {formatTime(time)}
                </span>
                <span className="flex items-center gap-1 text-gray-300">
                  <Users className="h-4 w-4" /> {guests}
                </span>
              </button>

              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type="tel"
                  pattern="\+?[\d\s\-]{7,20}"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone number, e.g. 0300 1234567"
                  autoComplete="tel"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={form.occasion === o.value}
                    onClick={() => setForm({ ...form, occasion: form.occasion === o.value ? "" : o.value })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      form.occasion === o.value ? "border-yellow-400 bg-yellow-400 text-black" : "border-white/15 bg-white/5 hover:border-yellow-400/60"
                    }`}
                  >
                    {o.emoji} {o.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                maxLength={500}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Anything we should know? (baby chair, window seat...)"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-gray-400 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
              />

              {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3.5 text-base font-bold text-black shadow-xl transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Confirm Booking
              </button>
              <p className="text-center text-[11px] text-gray-400">
                {data?.auto_confirm ? "Your table is confirmed instantly." : "The restaurant confirms each booking."}
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
