"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, CalendarClock, CalendarX, Check, CheckCheck, Clock, Hourglass, MessageCircle, Phone, Receipt, StickyNote, UserCheck, Users, X } from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import PageHeader from "@/components/layout/PageHeader";
import SoundToggle from "@/components/layout/SoundToggle";
import useNewOrderAlert from "@/hooks/useNewOrderAlert";
import {
  useGetManagerReservationsQuery,
  useRemindReservationMutation,
  useReservationActionMutation,
} from "@/services/private/reservations";
import { formatTime } from "@/utilities/openingHours";
import { STATUS_STYLES, apiError, formatDay, occasionOf } from "@/utilities/reservations";

const TABS = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "upcoming", label: "Upcoming" },
  { value: "pending", label: "Pending" },
];

const POLL = { pollingInterval: 15000, refetchOnFocus: true };

export default function ManagerReservationsPage() {
  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin"]}>
      <Reservations />
    </RoleGuard>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="saas-card flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="saas-label">{label}</p>
        <p className="tabular text-2xl font-black text-zinc-900">{value ?? "–"}</p>
      </div>
    </div>
  );
}

function Reservations() {
  const [tab, setTab] = useState("today");
  const { data, isLoading, isError } = useGetManagerReservationsQuery(tab, POLL);
  // Always watch the pending requests so a new one rings on any tab.
  const { data: pending } = useGetManagerReservationsQuery("pending", POLL);
  const { soundOn, toggleSound } = useNewOrderAlert(pending?.results);

  const counts = pending?.counts ?? data?.counts ?? {};
  const rows = data?.results ?? [];
  const groups = rows.reduce((acc, row) => {
    const key = tab === "today" || tab === "tomorrow" ? row.time.slice(0, 2) : row.date;
    (acc[key] ||= []).push(row);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <PageHeader
        icon={CalendarClock}
        title="Reservations"
        description="Confirm table bookings, give them a table and mark guests as they arrive."
        live
        actions={<SoundToggle on={soundOn} onToggle={toggleSound} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={CalendarClock} label="Today's bookings" value={counts.today} tone="bg-emerald-50 text-emerald-700" />
        <Stat icon={Hourglass} label="Pending" value={counts.pending} tone="bg-yellow-50 text-yellow-700" />
        <Stat icon={CalendarX} label="No-shows today" value={counts.no_show} tone="bg-red-50 text-red-600" />
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 sm:w-fit">
        {TABS.map((option) => (
          <button
            key={option.value}
            onClick={() => setTab(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              tab === option.value ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {option.label}
            {option.value === "pending" && counts.pending > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{counts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
          Could not load bookings. Check your connection and refresh.
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-14 text-center">
          <CalendarClock className="mx-auto mb-2 h-9 w-9 text-zinc-300" />
          <p className="font-bold text-zinc-700">No bookings here</p>
          <p className="text-xs text-zinc-400">New requests appear on their own, with a sound.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([key, items]) => (
            <div key={key} className="grid gap-3 sm:grid-cols-[84px_1fr]">
              <p className="pt-3 text-sm font-black text-zinc-400 sm:text-right">
                {key.length === 2 ? formatTime(`${key}:00`).replace(":00", "") : formatDay(key)}
              </p>
              <div className="space-y-2 border-l-2 border-zinc-100 pl-3">
                {items.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} automaticReminders={data?.reminders_automatic} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking, automaticReminders }) {
  const [table, setTable] = useState("");
  const [runAction, { isLoading }] = useReservationActionMutation();
  const style = STATUS_STYLES[booking.status_key] || STATUS_STYLES.pending;
  const occasion = occasionOf(booking.occasion);
  const started = new Date(booking.reservation_time) <= new Date();
  const options = booking.table_options ?? [];

  const act = async (action, message) => {
    try {
      await runAction({ id: booking.id, action, table: action === "confirm" ? table || undefined : undefined }).unwrap();
      toast.success(message);
    } catch (error) {
      toast.error(apiError(error, "Could not update the booking."));
    }
  };

  return (
    <div className="saas-card flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular rounded-md bg-green-950 px-2 py-0.5 text-xs font-black text-amber-400">{formatTime(booking.time)}</span>
          <p className="truncate font-extrabold text-zinc-900">{booking.name}</p>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ${style.pill}`}>{style.label}</span>
          {occasion && (
            <span className="rounded-md bg-pink-50 px-2 py-0.5 text-[11px] font-bold text-pink-700 ring-1 ring-pink-200">
              {occasion.emoji} {occasion.label}
            </span>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {booking.guest_count} guests</span>
          <a href={`tel:${booking.phone}`} className="flex items-center gap-1 hover:text-zinc-900"><Phone className="h-3.5 w-3.5" /> {booking.phone}</a>
          {booking.table_number && <span className="font-semibold text-zinc-700">Table #{booking.table_number}</span>}
          <span className="font-mono">#{booking.booking_code}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDay(booking.date)}</span>
        </p>
        {booking.status_key === "seated" || booking.status_key === "completed" ? (
          <p className="flex flex-wrap items-center gap-x-3 text-xs font-semibold text-blue-700">
            <span className="flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5" /> Checked in</span>
            {booking.orders && (
              <span className="flex items-center gap-1 text-zinc-600">
                <Receipt className="h-3.5 w-3.5" />
                {booking.orders.count === 0
                  ? "No order yet"
                  : `${booking.orders.count} ${booking.orders.count === 1 ? "order" : "orders"} · Rs. ${Number(booking.orders.total).toLocaleString()}`}
              </span>
            )}
          </p>
        ) : null}
        {booking.notes && (
          <p className="flex items-start gap-1 text-xs text-zinc-600"><StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {booking.notes}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {booking.status_key === "pending" && (
          <>
            {options.length > 0 ? (
              <select
                value={table}
                onChange={(event) => setTable(event.target.value)}
                aria-label="Table for this booking"
                className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700"
              >
                <option value="">{booking.table_number ? `Table #${booking.table_number}` : "Any table"}</option>
                {options
                  .filter((t) => t.number !== booking.table_number)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      Table #{t.number} · {t.capacity} seats
                    </option>
                  ))}
              </select>
            ) : (
              <span className="text-[11px] font-semibold text-red-600">No other table free</span>
            )}
            <button
              disabled={isLoading}
              onClick={() => act("confirm", `Booking for ${booking.name} confirmed.`)}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" /> Confirm
            </button>
            <button
              disabled={isLoading}
              onClick={() => window.confirm(`Reject the booking for ${booking.name}?`) && act("reject", "Booking rejected.")}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-zinc-100 px-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </>
        )}
        {booking.status_key === "confirmed" && (
          <>
            <button
              disabled={isLoading}
              onClick={() => act("arrive", `${booking.name} has arrived.`)}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              <UserCheck className="h-3.5 w-3.5" /> Arrived
            </button>
            {booking.whatsapp_url && <ReminderButton booking={booking} automatic={automaticReminders} />}
            {started && (
              <button
                disabled={isLoading}
                onClick={() => act("no-show", "Marked as no-show, the table is free.")}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                <CalendarX className="h-3.5 w-3.5" /> No-show
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// The same-day welcome reminder. With a WhatsApp or SMS service set up the
// backend sends it; otherwise WhatsApp opens with the message ready to send.
function ReminderButton({ booking, automatic }) {
  const [remind, { isLoading }] = useRemindReservationMutation();
  const sent = Boolean(booking.reminder_sent_at);
  const label = sent ? "Reminder sent" : "Send reminder";
  const tone = sent
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
    : "border-zinc-200 text-zinc-700 hover:bg-zinc-50";
  const className = `inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-bold transition disabled:opacity-60 ${tone}`;
  const title = sent ? "Send the reminder again" : "Send the welcome reminder";

  if (automatic) {
    const send = async () => {
      try {
        await remind({ id: booking.id }).unwrap();
        toast.success(`Reminder sent to ${booking.name}.`);
      } catch (error) {
        toast.error(apiError(error, "Could not send the reminder."));
      }
    };
    return (
      <button type="button" disabled={isLoading} onClick={send} title={title} className={className}>
        <BellRing className="h-3.5 w-3.5" /> {label}
      </button>
    );
  }

  return (
    <a
      href={booking.whatsapp_url}
      target="_blank"
      rel="noreferrer"
      title={title}
      onClick={() => remind({ id: booking.id, manual: true })}
      className={className}
    >
      <MessageCircle className="h-3.5 w-3.5" /> {sent ? label : "WhatsApp reminder"}
    </a>
  );
}
