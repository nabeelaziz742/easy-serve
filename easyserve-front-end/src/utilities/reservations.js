// Helpers shared by the guest booking popup, My Reservations and the
// manager Reservations page.

const SAVED_KEY = "easyserve_bookings";

export const STATUS_STYLES = {
  pending: { label: "Pending", pill: "bg-yellow-100 text-yellow-900 ring-yellow-300" },
  confirmed: { label: "Confirmed", pill: "bg-emerald-100 text-emerald-800 ring-emerald-300" },
  seated: { label: "Arrived", pill: "bg-blue-100 text-blue-800 ring-blue-300" },
  completed: { label: "Completed", pill: "bg-zinc-100 text-zinc-700 ring-zinc-300" },
  no_show: { label: "No-show", pill: "bg-red-100 text-red-700 ring-red-300" },
  rejected: { label: "Rejected", pill: "bg-zinc-100 text-zinc-600 ring-zinc-300" },
  cancelled: { label: "Cancelled", pill: "bg-zinc-100 text-zinc-600 ring-zinc-300" },
};

export const OCCASIONS = [
  { value: "birthday", label: "Birthday", emoji: "🎂" },
  { value: "anniversary", label: "Anniversary", emoji: "💍" },
];

export const occasionOf = (value) => OCCASIONS.find((o) => o.value === value);

export const isCancellable = (booking) =>
  ["pending", "confirmed"].includes(booking.status_key) && new Date(booking.reservation_time) > new Date();

/** YYYY-MM-DD in the browser's time zone. */
export const isoDate = (date) => date.toLocaleDateString("en-CA");

export const formatDay = (value) =>
  new Date(`${value}T00:00`).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

/** The next `count` days as chips: {value, top, bottom, closed}. */
export const nextDays = (hours, count = 7) =>
  Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const weekday = (date.getDay() + 6) % 7; // Monday = 0, like the API
    return {
      value: isoDate(date),
      top: i === 0 ? "Today" : i === 1 ? "Tomorrow" : date.toLocaleDateString([], { weekday: "short" }),
      bottom: date.toLocaleDateString([], { day: "numeric", month: "short" }),
      closed: Boolean(hours?.length) && !hours.some((h) => h.day_of_week === weekday),
    };
  });

/** A readable message from a DRF error response. */
export const apiError = (error, fallback = "Something went wrong. Please try again.") => {
  const data = error?.data;
  if (!data) return fallback;
  if (typeof data === "string") return fallback;
  if (Array.isArray(data)) return data[0] || fallback;
  if (data.detail) return data.detail;
  const first = Object.values(data)[0];
  return (Array.isArray(first) ? first[0] : first) || fallback;
};

// Bookings made in this browser, so a guest without an account can find
// them again on My Reservations.
export const readSavedBookings = () => {
  try {
    const list = JSON.parse(window.localStorage.getItem(SAVED_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const saveBooking = ({ code, phone }) => {
  const list = [{ code, phone }, ...readSavedBookings().filter((b) => b.code !== code)].slice(0, 20);
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {}
  return list;
};

export const forgetBooking = (code) => {
  const list = readSavedBookings().filter((b) => b.code !== code);
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {}
  return list;
};

/** Download an .ics file so the guest can add the booking to their calendar. */
export const downloadCalendarFile = (booking) => {
  const stamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(booking.reservation_time);
  const end = new Date(start.getTime() + 90 * 60000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Easy Serve//Bookings//EN",
    "BEGIN:VEVENT",
    `UID:${booking.booking_code}@easyserve`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:Table at ${booking.restaurant_name} (${booking.guest_count} guests)`,
    `DESCRIPTION:Booking ${booking.booking_code}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `booking-${booking.booking_code}.ics` });
  link.click();
  URL.revokeObjectURL(url);
};
