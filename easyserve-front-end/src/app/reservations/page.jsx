"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { CalendarCheck, CalendarX, Clock, Loader2, Phone, Search, Users } from "lucide-react";
import {
  useCancelReservationMutation,
  useGetMyReservationsQuery,
  useGetReservationByCodeQuery,
} from "@/services/private/reservations";
import { formatTime } from "@/utilities/openingHours";
import {
  STATUS_STYLES,
  apiError,
  forgetBooking,
  formatDay,
  isCancellable,
  occasionOf,
  readSavedBookings,
  saveBooking,
} from "@/utilities/reservations";

function BookingCard({ booking, phone }) {
  const [cancelReservation, { isLoading }] = useCancelReservationMutation();
  const style = STATUS_STYLES[booking.status_key] || STATUS_STYLES.pending;
  const occasion = occasionOf(booking.occasion);

  const cancel = async () => {
    if (!window.confirm(`Cancel booking ${booking.booking_code}?`)) return;
    try {
      await cancelReservation({ code: booking.booking_code, phone: phone || booking.phone }).unwrap();
      toast.success("Booking cancelled.");
    } catch (error) {
      toast.error(apiError(error, "Could not cancel the booking."));
    }
  };

  return (
    <div className="saas-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-green-950 text-yellow-400">
        <span className="text-lg font-black leading-none">{new Date(`${booking.date}T00:00`).getDate()}</span>
        <span className="text-[10px] font-bold uppercase">
          {new Date(`${booking.date}T00:00`).toLocaleDateString([], { month: "short" })}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-extrabold text-green-950">{booking.restaurant_name}</p>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ${style.pill}`}>{style.label}</span>
          {occasion && <span className="text-xs">{occasion.emoji} {occasion.label}</span>}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-yellow-600" /> {formatDay(booking.date)}, {formatTime(booking.time)}</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-yellow-600" /> {booking.guest_count} guests</span>
          <span className="font-mono font-bold tracking-wider text-gray-800">#{booking.booking_code}</span>
        </p>
      </div>
      {isCancellable(booking) && (
        <button
          type="button"
          onClick={cancel}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarX className="h-3.5 w-3.5" />}
          Cancel
        </button>
      )}
    </div>
  );
}

// A booking remembered in this browser, loaded by its code and phone.
function SavedBooking({ code, phone, onGone }) {
  const { data, error } = useGetReservationByCodeQuery({ code, phone });
  useEffect(() => {
    if (error?.status === 404) onGone(code);
  }, [error, code, onGone]);
  return data ? <BookingCard booking={data} phone={phone} /> : null;
}

function FindBooking({ onFound }) {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState(null);
  const { data, error, isFetching } = useGetReservationByCodeQuery(query, { skip: !query });

  useEffect(() => {
    if (data && query) {
      onFound(query);
      setQuery(null);
      setCode("");
    }
  }, [data, query, onFound]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setQuery({ code: code.trim().toUpperCase(), phone: phone.trim() });
      }}
      className="saas-card space-y-3 p-4"
    >
      <p className="text-sm font-extrabold text-green-950">Find a booking</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Booking number"
          className="h-10 rounded-xl border border-gray-200 px-3 font-mono text-sm uppercase tracking-wider outline-none focus:border-yellow-500"
        />
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone used to book"
            className="h-10 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-yellow-500"
          />
        </div>
        <button
          type="submit"
          disabled={isFetching}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-green-950 px-4 text-sm font-bold text-yellow-400 transition hover:bg-green-900 disabled:opacity-60"
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Find
        </button>
      </div>
      {error && query && <p className="text-xs font-semibold text-red-600">{apiError(error, "No booking found.")}</p>}
    </form>
  );
}

export default function MyReservationsPage() {
  const { initialized, isAuthenticated } = useSelector((state) => state.auth);
  const [saved, setSaved] = useState([]);
  const { data: mine } = useGetMyReservationsQuery(undefined, { skip: !initialized || !isAuthenticated });

  // The reminder message links here with ?code=…&phone=…, so the guest sees
  // the booking (and can cancel it) on any phone, with one tap.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code")?.trim().toUpperCase();
    const phone = params.get("phone")?.trim();
    if (code && phone) {
      setSaved(saveBooking({ code, phone }));
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      setSaved(readSavedBookings());
    }
  }, []);

  const accountBookings = (mine?.results ?? []).filter((b) => !saved.some((s) => s.code === b.booking_code));
  const forget = useCallback((code) => setSaved(forgetBooking(code)), []);
  const remember = useCallback((found) => setSaved(saveBooking(found)), []);
  const empty = !saved.length && !accountBookings.length;

  return (
    <section className="min-h-[80vh] bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-green-950">My Reservations</h1>
            <p className="text-sm text-gray-500">Bookings made on this device, or found with your booking number.</p>
          </div>
          <Link
            href="/?mode=reservation#restaurants"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"
          >
            <CalendarCheck className="h-4 w-4" /> Book a table
          </Link>
        </div>

        <div className="space-y-3">
          {saved.map((b) => (
            <SavedBooking key={b.code} code={b.code} phone={b.phone} onGone={forget} />
          ))}
          {accountBookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
          {empty && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center">
              <CalendarCheck className="mx-auto mb-2 h-9 w-9 text-gray-300" />
              <p className="font-bold text-gray-700">No bookings yet</p>
              <p className="text-xs text-gray-400">Book a table and it will show up here.</p>
            </div>
          )}
        </div>

        <FindBooking onFound={remember} />
      </div>
    </section>
  );
}
