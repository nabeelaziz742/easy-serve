"""Table booking rules: which times a restaurant takes bookings, which
tables are free then, and the guest-facing booking code.

Times are worked out in the server time zone (Asia/Karachi), the same one
the opening hours are entered in.
"""
import re
import secrets
from datetime import datetime, time, timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.restaurants.constants import ReservationStatus
from apps.restaurants.models import Reservation, Table

# How long a booking holds its table.
BOOKING_DURATION = timedelta(minutes=90)
# Guests cannot book a slot that starts sooner than this.
MIN_NOTICE = timedelta(minutes=30)
# The last booking starts this long before closing time.
LAST_BOOKING_BEFORE_CLOSE = timedelta(minutes=60)
BOOKING_DAYS_AHEAD = 30
# Restaurants that never set opening hours take bookings in these hours.
DEFAULT_HOURS = (time(12, 0), time(23, 0))

# Bookings that hold a table. A pending request holds one too, so a busy
# evening cannot be double booked while the manager has not replied yet.
HOLDING_STATUSES = (ReservationStatus.PENDING.value, ReservationStatus.CONFIRMED.value)

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_booking_code():
    while True:
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(8))
        if not Reservation.objects.filter(booking_code=code).exists():
            return code


def same_phone(a, b):
    """Equal numbers, also when one is written 0300… and the other +92300…."""
    def last_digits(value):
        return re.sub(r"\D", "", value or "")[-10:]
    return len(last_digits(a)) >= 7 and last_digits(a) == last_digits(b)


def booking_hours(restaurant, day):
    """(opens, last_slot) as aware datetimes for a date, or None when closed."""
    hours = list(restaurant.hours.all())
    if hours:
        row = next((h for h in hours if h.day_of_week == day.weekday()), None)
        if row is None:
            return None
        open_time, close_time = row.open_time, row.close_time
    else:
        open_time, close_time = DEFAULT_HOURS

    tz = timezone.get_current_timezone()
    opens = timezone.make_aware(datetime.combine(day, open_time), tz)
    closes = timezone.make_aware(datetime.combine(day, close_time), tz)
    if closes <= opens:  # closes after midnight
        closes += timedelta(days=1)
    return opens, closes - LAST_BOOKING_BEFORE_CLOSE


def slot_times(restaurant, day):
    window = booking_hours(restaurant, day)
    if window is None:
        return []
    start, last = window
    step = timedelta(minutes=max(restaurant.reservation_slot_minutes, 5))
    slots = []
    while start <= last:
        slots.append(start)
        start += step
    return slots


def fitting_tables(restaurant, guests):
    return Table.objects.filter(
        restaurant=restaurant, is_active=True, capacity__gte=guests,
    ).order_by("capacity", "table_number")


def holding_bookings(restaurant, start, end, exclude_id=None):
    """Bookings that hold a table at any time between start and end."""
    qs = Reservation.objects.filter(
        restaurant=restaurant,
        table__isnull=False,
        status__in=HOLDING_STATUSES,
        reservation_time__gt=start - BOOKING_DURATION,
        reservation_time__lt=end + BOOKING_DURATION,
    )
    return qs.exclude(id=exclude_id) if exclude_id else qs


def free_tables(restaurant, guests, start, exclude_id=None):
    """Tables that seat the party and nobody has booked around `start`, smallest first."""
    taken = holding_bookings(restaurant, start, start, exclude_id).values_list("table_id", flat=True)
    return fitting_tables(restaurant, guests).exclude(id__in=list(taken))


def available_slots(restaurant, day, guests):
    """Every bookable time on a day and whether a table is still free then."""
    slots = slot_times(restaurant, day)
    if not slots:
        return []
    tables = list(fitting_tables(restaurant, guests).values_list("id", flat=True))
    bookings = list(holding_bookings(restaurant, slots[0], slots[-1]).values_list("table_id", "reservation_time"))
    earliest = timezone.now() + MIN_NOTICE

    result = []
    for slot in slots:
        taken = {table for table, at in bookings if abs(at - slot) < BOOKING_DURATION}
        result.append({
            "time": timezone.localtime(slot).strftime("%H:%M"),
            "available": slot >= earliest and any(t not in taken for t in tables),
        })
    return result


def check_booking_request(restaurant, guests, start):
    """Raise a ValidationError the guest can read when the booking is not possible."""
    if not restaurant.is_active:
        raise ValidationError("This restaurant is not taking bookings right now.")
    if guests < 1:
        raise ValidationError({"guest_count": "Guest count must be at least 1."})
    if guests > restaurant.reservation_max_guests:
        raise ValidationError({
            "guest_count": f"Online bookings are for up to {restaurant.reservation_max_guests} guests. "
                           "Please call the restaurant for a bigger group."
        })
    if start < timezone.now() + MIN_NOTICE:
        raise ValidationError("Please pick a time at least 30 minutes from now.")
    if start.date() > timezone.localdate() + timedelta(days=BOOKING_DAYS_AHEAD):
        raise ValidationError(f"Bookings open {BOOKING_DAYS_AHEAD} days ahead.")
    day = timezone.localtime(start).date()
    # A slot after midnight belongs to the evening before.
    if start not in slot_times(restaurant, day) + slot_times(restaurant, day - timedelta(days=1)):
        raise ValidationError("The restaurant does not take bookings at this time.")


# The Tables page marks every table with a booking later today as "Booked".
# A confirmed booking holds its table (shown as Reserved) from this long
# before it starts until the guest is this late (then the manager marks a
# no-show).
RESERVED_BADGE_BEFORE = timedelta(minutes=30)
RESERVED_BADGE_AFTER = timedelta(minutes=15)


def upcoming_bookings_by_table(restaurant_id):
    """{table_id: {"id", "time", "name", "guests", "status_key", "held"}} for each
    table's next pending or confirmed booking today."""
    now = timezone.now()
    end_of_day = timezone.make_aware(datetime.combine(timezone.localdate() + timedelta(days=1), time(0, 0)))
    rows = (
        Reservation.objects.filter(
            restaurant_id=restaurant_id,
            booking_code__isnull=False,
            table__isnull=False,
            status__in=HOLDING_STATUSES,
            reservation_time__gte=now - RESERVED_BADGE_AFTER,
            reservation_time__lt=end_of_day,
        )
        .order_by("-reservation_time")
    )
    # Ordered latest first so the soonest booking of a table wins.
    return {
        row.table_id: {
            "id": row.id,
            "time": timezone.localtime(row.reservation_time).strftime("%H:%M"),
            "name": row.name,
            "guests": row.guest_count,
            "status_key": ReservationStatus(row.status).name.lower(),
            "held": (
                row.status == ReservationStatus.CONFIRMED.value
                and row.reservation_time <= now + RESERVED_BADGE_BEFORE
            ),
        }
        for row in rows
    }


# A guest who scans the table QR checks in their confirmed booking when it
# starts within this window: up to 45 minutes early or an hour late.
CHECK_IN_EARLY = timedelta(minutes=45)
CHECK_IN_LATE = timedelta(minutes=60)


def check_in_candidates(restaurant):
    now = timezone.now()
    return Reservation.objects.filter(
        restaurant=restaurant,
        booking_code__isnull=False,
        status=ReservationStatus.CONFIRMED.value,
        reservation_time__gte=now - CHECK_IN_LATE,
        reservation_time__lte=now + CHECK_IN_EARLY,
    ).order_by("reservation_time")


def booking_at_table(table):
    """The confirmed booking about to start at this table, for the scan page to greet."""
    return check_in_candidates(table.restaurant).filter(table=table).first()


def check_in_booking(session):
    """Mark the booking of the guests who just sat down as Arrived.

    The booking is found by the phone number the guest typed, at any table
    (the guest may have sat elsewhere), or else it is the one booked at this
    table. A different phone number at a booked table is a walk-in, so it
    does not check in someone else's booking. Returns the booking or None.
    """
    candidates = list(check_in_candidates(session.restaurant).select_for_update())
    booking = None
    if session.phone:
        booking = next((b for b in candidates if same_phone(session.phone, b.phone)), None)
    if booking is None:
        booking = next(
            (b for b in candidates if b.table_id == session.table_id and not session.phone),
            None,
        )
    if booking is None:
        return None

    booking.table = session.table
    booking.dine_in_session = session
    booking.status = ReservationStatus.SEATED.value
    booking.save(update_fields=["table", "dine_in_session", "status", "updated_at"])
    return booking


def checked_in_summary(booking):
    if booking is None:
        return None
    return {
        "booking_code": booking.booking_code,
        "name": booking.name,
        "guests": booking.guest_count,
        "time": timezone.localtime(booking.reservation_time).strftime("%H:%M"),
        "occasion": booking.occasion,
    }
