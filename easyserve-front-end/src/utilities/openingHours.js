// Opening hours come from the API as [{day_of_week: 0 (Mon)..6, open_time: "12:00:00", close_time}].

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const formatTime = (time) =>
  new Date(`1970-01-01T${time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** Today's status, e.g. {open: true, label: "Open · till 11:00 PM"}; null when hours are not set. */
export const openingStatus = (hours, now = new Date()) => {
  if (!hours?.length) return null;
  const today = (now.getDay() + 6) % 7; // JS Sunday=0 -> Monday=0
  const slot = hours.find((h) => h.day_of_week === today);
  if (!slot) return { open: false, label: "Closed today" };

  const minutes = now.getHours() * 60 + now.getMinutes();
  const [open, close] = [toMinutes(slot.open_time), toMinutes(slot.close_time)];
  // A closing time before the opening time runs past midnight.
  const isOpen = open < close ? minutes >= open && minutes < close : minutes >= open || minutes < close;
  return isOpen
    ? { open: true, label: `Open · till ${formatTime(slot.close_time)}` }
    : { open: false, label: `Closed · opens ${formatTime(slot.open_time)}` };
};
