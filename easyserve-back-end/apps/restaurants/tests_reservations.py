"""
Tests for table bookings: slots built from opening hours, guest booking,
lookup and cancel by code, the manager Reservations page actions and the
"Reserved" badge on the Tables page.
"""
from datetime import datetime, time, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.restaurants.constants import ReservationStatus
from apps.restaurants.models import Reservation, Restaurant, Table

from .tests_qa_regression import make_user

SLOTS = "/api/restaurants/restaurants/{}/reservation-slots/"
BOOK = "/api/restaurants/reservations/"
BY_CODE = "/api/restaurants/reservations/code/{}/"
MANAGER = "/api/restaurants/manager/reservations/"


class ReservationBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.restaurant = Restaurant.objects.create(name="Book Alpha", is_active=True)
        self.restaurant.set_daily_hours(time(12, 0), time(23, 0))
        self.other = Restaurant.objects.create(name="Book Beta", is_active=True)
        self.t2 = Table.objects.create(restaurant=self.restaurant, table_number=1, capacity=2)
        self.t4 = Table.objects.create(restaurant=self.restaurant, table_number=2, capacity=4)
        self.other_table = Table.objects.create(restaurant=self.other, table_number=1, capacity=4)

        self.manager, _ = make_user("manager@book.qa", "manager", self.restaurant)
        self.waiter, _ = make_user("waiter@book.qa", "waiter", self.restaurant)
        self.other_manager, _ = make_user("manager@beta.book.qa", "manager", self.other)
        self.customer, self.customer_p = make_user("customer@book.qa", "user")

        self.tomorrow = timezone.localdate() + timedelta(days=1)

    def at(self, hhmm, day=None):
        h, m = map(int, hhmm.split(":"))
        return timezone.make_aware(datetime.combine(day or self.tomorrow, time(h, m)))

    def book(self, guests=2, hhmm="19:00", day=None, user=None, **extra):
        self.client.force_authenticate(user=user)
        payload = {
            "restaurant": self.restaurant.id,
            "date": str(day or self.tomorrow),
            "time": hhmm,
            "guest_count": guests,
            "name": "Ali",
            "phone": "0300-1234567",
            "notes": "",
            **extra,
        }
        return self.client.post(BOOK, payload, format="json")

    def manager_post(self, booking_id, action, data=None, user=None):
        self.client.force_authenticate(user=user or self.manager)
        return self.client.post(f"{MANAGER}{booking_id}/{action}/", data or {}, format="json")


class SlotTests(ReservationBase):
    def slots(self, guests=2, day=None):
        self.client.force_authenticate(user=None)
        return self.client.get(SLOTS.format(self.restaurant.id), {"date": str(day or self.tomorrow), "guests": guests})

    def test_slots_follow_opening_hours_and_slot_length(self):
        res = self.slots()
        self.assertEqual(res.status_code, 200, res.data)
        times = [s["time"] for s in res.data["slots"]]
        # Opens 12:00, closes 23:00, last booking an hour before closing.
        self.assertEqual(times[0], "12:00")
        self.assertEqual(times[1], "12:30")
        self.assertEqual(times[-1], "22:00")
        self.assertTrue(all(s["available"] for s in res.data["slots"]))

        self.restaurant.reservation_slot_minutes = 60
        self.restaurant.save()
        times = [s["time"] for s in self.slots().data["slots"]]
        self.assertEqual(times[:2], ["12:00", "13:00"])

    def test_closed_day_has_no_slots(self):
        self.restaurant.hours.filter(day_of_week=self.tomorrow.weekday()).delete()
        res = self.slots()
        self.assertFalse(res.data["open"])
        self.assertEqual(res.data["slots"], [])

    def test_slot_is_full_when_every_fitting_table_is_booked(self):
        self.assertEqual(self.book(guests=4).status_code, 201)
        slots = {s["time"]: s["available"] for s in self.slots(guests=3).data["slots"]}
        # The only 4-seat table is held 90 minutes either side of 19:00.
        self.assertFalse(slots["19:00"])
        self.assertFalse(slots["20:00"])
        self.assertTrue(slots["20:30"])
        self.assertTrue(slots["17:30"])
        # Two guests still fit on the 2-seat table.
        self.assertTrue({s["time"]: s["available"] for s in self.slots(guests=2).data["slots"]}["19:00"])

    def test_party_bigger_than_limit_gets_no_slots(self):
        res = self.slots(guests=11)
        self.assertEqual(res.data["max_guests"], 10)
        self.assertEqual(res.data["slots"], [])

    def test_today_hides_slots_too_soon(self):
        today = timezone.localdate()
        slots = self.slots(day=today).data["slots"]
        soon = timezone.now() + timedelta(minutes=30)
        for slot in slots:
            if self.at(slot["time"], today) < soon:
                self.assertFalse(slot["available"], slot)


class GuestBookingTests(ReservationBase):
    def test_guest_books_without_login_and_gets_a_code(self):
        res = self.book(guests=2, occasion="birthday", notes="Baby chair")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["status_key"], "pending")
        self.assertEqual(len(res.data["booking_code"]), 8)
        self.assertEqual(res.data["time"], "19:00")
        booking = Reservation.objects.get(id=res.data["id"])
        self.assertIsNone(booking.user)
        self.assertEqual(booking.table, self.t2)  # smallest table that fits
        self.assertEqual(booking.occasion, "birthday")

    def test_auto_confirm_setting(self):
        self.restaurant.reservation_auto_confirm = True
        self.restaurant.save()
        res = self.book()
        self.assertEqual(res.data["status_key"], "confirmed")

    def test_signed_in_customer_sees_own_bookings(self):
        self.book(user=self.customer)
        self.book(hhmm="13:00")  # anonymous, not theirs
        self.client.force_authenticate(user=self.customer)
        res = self.client.get(BOOK)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["results"]), 1)

    def test_rejects_bad_requests(self):
        cases = [
            {"hhmm": "19:10"},                       # not on the slot grid
            {"hhmm": "22:30"},                       # too close to closing
            {"guests": 11},                          # above the online limit
            {"day": timezone.localdate() - timedelta(days=1)},
            {"day": timezone.localdate() + timedelta(days=40)},
            {"phone": "abc"},
            {"name": ""},
        ]
        for case in cases:
            extra = {k: case.pop(k) for k in ("phone", "name") if k in case}
            res = self.book(**case, **extra)
            self.assertEqual(res.status_code, 400, (case, extra, res.data))
        self.assertEqual(Reservation.objects.count(), 0)

    def test_closed_day_and_inactive_restaurant_are_rejected(self):
        self.restaurant.hours.filter(day_of_week=self.tomorrow.weekday()).delete()
        self.assertEqual(self.book().status_code, 400)
        self.restaurant.set_daily_hours(time(12, 0), time(23, 0))
        self.restaurant.is_active = False
        self.restaurant.save()
        self.assertEqual(self.book().status_code, 400)

    def test_no_double_booking(self):
        self.assertEqual(self.book(guests=2).status_code, 201)
        self.assertEqual(self.book(guests=2).status_code, 201)  # moves to the 4-seat table
        res = self.book(guests=2)
        self.assertEqual(res.status_code, 400, res.data)
        # 90 minutes later the tables are free again.
        self.assertEqual(self.book(guests=2, hhmm="20:30").status_code, 201)

    def test_after_midnight_closing(self):
        self.restaurant.set_daily_hours(time(18, 0), time(2, 0))
        day_after = self.tomorrow + timedelta(days=1)
        res = self.book(hhmm="00:30", day=day_after)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(self.book(hhmm="01:30", day=day_after).status_code, 400)


class GuestLookupTests(ReservationBase):
    def setUp(self):
        super().setUp()
        self.code = self.book().data["booking_code"]
        self.client.force_authenticate(user=None)

    def test_lookup_needs_matching_phone(self):
        res = self.client.get(BY_CODE.format(self.code.lower()), {"phone": "03001234567"})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["name"], "Ali")
        res = self.client.get(BY_CODE.format(self.code), {"phone": "03009999999"})
        self.assertEqual(res.status_code, 404)
        res = self.client.get(BY_CODE.format("NOPE1234"), {"phone": "03001234567"})
        self.assertEqual(res.status_code, 404)

    def test_guest_cancels_and_slot_frees_up(self):
        res = self.client.post(BY_CODE.format(self.code), {"phone": "0300 1234567"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status_key"], "cancelled")
        res = self.client.post(BY_CODE.format(self.code), {"phone": "0300 1234567"}, format="json")
        self.assertEqual(res.status_code, 400)
        # The 2-seat table is free again.
        self.assertEqual(self.book().data["table_number"], 1)


class ManagerReservationTests(ReservationBase):
    def test_list_is_scoped_and_hides_walk_ins(self):
        booking_id = self.book().data["id"]
        # A walk-in row like the one checkout creates when a table is seated.
        Reservation.objects.create(
            restaurant=self.restaurant, table=self.t4, reservation_time=self.at("19:00"),
            guest_count=2, status=ReservationStatus.SEATED,
        )
        self.client.force_authenticate(user=self.manager)
        res = self.client.get(MANAGER, {"tab": "tomorrow"})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual([r["id"] for r in res.data["results"]], [booking_id])
        self.assertEqual(res.data["counts"]["pending"], 1)
        self.assertEqual(res.data["counts"]["tomorrow"], 1)
        self.assertEqual([t["number"] for t in res.data["results"][0]["table_options"]], [1, 2])

        res = self.client.get(MANAGER, {"tab": "pending"})
        self.assertEqual(len(res.data["results"]), 1)

        self.client.force_authenticate(user=self.other_manager)
        self.assertEqual(self.client.get(MANAGER, {"tab": "tomorrow"}).data["results"], [])

    def test_staff_who_are_not_managers_are_refused(self):
        for user in (self.waiter, self.customer):
            self.client.force_authenticate(user=user)
            self.assertEqual(self.client.get(MANAGER).status_code, 403)
        booking_id = self.book().data["id"]
        self.assertEqual(self.manager_post(booking_id, "confirm", user=self.waiter).status_code, 403)
        self.assertEqual(self.manager_post(booking_id, "confirm", user=self.other_manager).status_code, 404)

    def test_confirm_on_chosen_table(self):
        booking_id = self.book().data["id"]
        res = self.manager_post(booking_id, "confirm", {"table": self.t4.id})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status_key"], "confirmed")
        self.assertEqual(res.data["table_number"], 2)

    def test_confirm_refuses_wrong_tables(self):
        first = self.book().data["id"]
        second = self.book().data["id"]  # takes the 4-seat table
        self.assertEqual(self.manager_post(first, "confirm", {"table": self.t4.id}).status_code, 400)
        self.assertEqual(self.manager_post(first, "confirm", {"table": self.other_table.id}).status_code, 400)
        big = self.book(guests=4, hhmm="13:00").data["id"]
        self.assertEqual(self.manager_post(big, "confirm", {"table": self.t2.id}).status_code, 400)
        self.assertEqual(self.manager_post(second, "confirm").status_code, 200)

    def test_status_flow(self):
        rejected = self.book().data["id"]
        res = self.manager_post(rejected, "reject")
        self.assertEqual(res.data["status_key"], "rejected")
        self.assertEqual(self.manager_post(rejected, "confirm").status_code, 400)

        booking_id = self.book().data["id"]
        self.assertEqual(self.manager_post(booking_id, "no-show").status_code, 400)  # not confirmed yet
        self.manager_post(booking_id, "confirm")
        self.assertEqual(self.manager_post(booking_id, "arrive").data["status_key"], "seated")

        no_show = self.book(hhmm="13:00").data["id"]
        self.manager_post(no_show, "confirm")
        self.assertEqual(self.manager_post(no_show, "no-show").data["status_key"], "no_show")
        self.assertEqual(self.manager_post(no_show, "dance").status_code, 404)


class TablesPageReservedBadgeTests(ReservationBase):
    def make_booking(self, minutes_from_now, status=ReservationStatus.CONFIRMED):
        return Reservation.objects.create(
            restaurant=self.restaurant, table=self.t4, name="Sara", guest_count=4,
            reservation_time=timezone.now() + timedelta(minutes=minutes_from_now),
            status=status, booking_code=f"T{minutes_from_now:+04d}".replace("+", "P").replace("-", "M"),
        )

    def tables(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.get("/api/dashboard/tables/")
        self.assertEqual(res.status_code, 200)
        return {t["number"]: t["reservation"] for t in res.data}

    def test_confirmed_booking_holds_the_table_from_30_minutes_before(self):
        self.make_booking(20)
        tables = self.tables()
        self.assertEqual(tables[2]["name"], "Sara")
        self.assertEqual(tables[2]["guests"], 4)
        self.assertTrue(tables[2]["held"])
        self.assertIsNone(tables[1])

    def test_later_or_pending_bookings_today_show_as_booked_without_holding(self):
        later = self.make_booking(60)
        tables = self.tables()
        self.assertEqual(tables[2]["id"], later.id)
        self.assertFalse(tables[2]["held"])

        later.delete()
        self.make_booking(10, status=ReservationStatus.PENDING)
        tables = self.tables()
        self.assertEqual(tables[2]["status_key"], "pending")
        self.assertFalse(tables[2]["held"])

    def test_past_cancelled_or_other_day_bookings_do_not_show(self):
        self.make_booking(-30)
        self.make_booking(20, status=ReservationStatus.CANCELLED)
        tomorrow = self.make_booking(24 * 60)
        self.assertIsNone(self.tables()[2])
        self.assertGreater(timezone.localtime(tomorrow.reservation_time).date(), timezone.localdate())


class ReservationSettingsTests(ReservationBase):
    def test_manager_updates_booking_settings(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.patch(
            "/api/restaurants/manager/settings/",
            {"reservation_slot_minutes": 60, "reservation_max_guests": 6, "reservation_auto_confirm": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.reservation_slot_minutes, 60)
        self.assertTrue(self.restaurant.reservation_auto_confirm)
        res = self.client.patch("/api/restaurants/manager/settings/", {"reservation_slot_minutes": 5}, format="json")
        self.assertEqual(res.status_code, 400)

