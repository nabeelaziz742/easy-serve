"""
Tests for reservations part 2: checking a booking in by scanning the table
QR, linking the visit's orders to it, and the same-day welcome reminder.
"""
from datetime import datetime, time, timedelta
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from apps.restaurants.constants import ReservationStatus
from apps.restaurants.models import Orders, Reservation
from apps.restaurants.services import reminders
from apps.restaurants.services.reservations import new_booking_code
from apps.restaurants.services.table_lifecycle import release_table_after_payment

from .tests_reservations import MANAGER, ReservationBase

VALIDATE = "/api/restaurants/dine-in/validate/"
START = "/api/restaurants/dine-in/start-session/"


class CheckInBase(ReservationBase):
    def booking(self, table=None, minutes=10, status=ReservationStatus.CONFIRMED, phone="0300-1234567", **extra):
        return Reservation.objects.create(
            restaurant=self.restaurant,
            table=table or self.t4,
            reservation_time=timezone.now() + timedelta(minutes=minutes),
            guest_count=4,
            name="Ali",
            phone=phone,
            booking_code=new_booking_code(),
            status=status.value,
            **extra,
        )

    def scan(self, table, url=START, **data):
        self.client.force_authenticate(user=None)
        payload = {"restaurant": self.restaurant.id, "table": table.table_number, "key": table.qr_key, **data}
        return self.client.post(url, payload, format="json")


class QrCheckInTests(CheckInBase):
    def test_scan_at_booked_table_checks_the_booking_in(self):
        booking = self.booking()
        res = self.scan(self.t4, guests=4)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["reservation"]["booking_code"], booking.booking_code)
        self.assertEqual(res.data["reservation"]["name"], "Ali")

        booking.refresh_from_db()
        self.assertEqual(booking.status, ReservationStatus.SEATED.value)
        self.assertEqual(str(booking.dine_in_session.token), res.data["session"]["token"])

    def test_phone_finds_the_booking_at_another_table(self):
        booking = self.booking(table=self.t2)
        res = self.scan(self.t4, guests=4, phone="+92 300 1234567")
        self.assertEqual(res.data["reservation"]["booking_code"], booking.booking_code)
        booking.refresh_from_db()
        self.assertEqual(booking.table, self.t4)
        self.assertEqual(booking.status, ReservationStatus.SEATED.value)

    def test_walk_in_with_another_phone_does_not_take_the_booking(self):
        booking = self.booking()
        res = self.scan(self.t4, guests=2, phone="0311-7654321")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["reservation"])
        booking.refresh_from_db()
        self.assertEqual(booking.status, ReservationStatus.CONFIRMED.value)

    def test_only_confirmed_bookings_near_now_check_in(self):
        pending = self.booking(status=ReservationStatus.PENDING)
        later = self.booking(table=self.t2, minutes=120)
        self.assertIsNone(self.scan(self.t4, guests=2).data["reservation"])
        self.assertIsNone(self.scan(self.t2, guests=2).data["reservation"])
        pending.refresh_from_db()
        later.refresh_from_db()
        self.assertEqual(pending.status, ReservationStatus.PENDING.value)
        self.assertEqual(later.status, ReservationStatus.CONFIRMED.value)

    def test_other_restaurants_bookings_are_never_touched(self):
        other = Reservation.objects.create(
            restaurant=self.other, table=self.other_table, reservation_time=timezone.now(),
            guest_count=2, name="Ali", phone="0300-1234567", booking_code=new_booking_code(),
            status=ReservationStatus.CONFIRMED.value,
        )
        self.scan(self.t4, guests=2, phone="0300-1234567")
        other.refresh_from_db()
        self.assertEqual(other.status, ReservationStatus.CONFIRMED.value)

    def test_validate_greets_the_booked_guest(self):
        self.booking()
        res = self.scan(self.t4, url=VALIDATE)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["booking"]["name"], "Ali")
        self.assertEqual(res.data["booking"]["guests"], 4)
        self.assertIsNone(self.scan(self.t2, url=VALIDATE).data["booking"])

    def test_orders_link_to_the_booking_and_paying_completes_it(self):
        booking = self.booking()
        self.scan(self.t4, guests=4)
        booking.refresh_from_db()
        session = booking.dine_in_session
        order = Orders.objects.create(
            user=self.customer_p, order_type=1, ordered=True, table=self.t4,
            dine_in_session=session, total_price=1500,
        )

        self.client.force_authenticate(user=self.manager)
        row = self.client.get(MANAGER, {"tab": "today"}).data["results"][0]
        self.assertEqual(row["status_key"], "seated")
        self.assertEqual(row["orders"]["count"], 1)
        self.assertEqual(float(row["orders"]["total"]), 1500)

        release_table_after_payment(order)
        booking.refresh_from_db()
        self.assertEqual(booking.status, ReservationStatus.COMPLETED.value)


class ReminderTextTests(CheckInBase):
    def test_text_and_whatsapp_link(self):
        booking = self.booking(minutes=60)
        text = reminders.reminder_text(booking)
        local = timezone.localtime(booking.reservation_time)
        self.assertIn("Assalam-o-Alaikum Ali! 🎉 Aaj aapki booking hai Book Alpha mein", text)
        self.assertIn(f"{local.hour % 12 or 12}:{local:%M} {'AM' if local.hour < 12 else 'PM'}, 4 logon ke liye", text)
        self.assertIn(f"/reservations?code={booking.booking_code}&phone=0300-1234567", text)
        self.assertTrue(reminders.whatsapp_url(booking).startswith("https://wa.me/923001234567?text=Assalam"))

    def test_international_numbers(self):
        self.assertEqual(reminders.international_number("0300 1234567"), "923001234567")
        self.assertEqual(reminders.international_number("+92 300 1234567"), "923001234567")
        self.assertEqual(reminders.international_number("0044 7700 900123"), "447700900123")
        self.assertEqual(reminders.international_number("3001234567"), "923001234567")


class ReminderSendingTests(CheckInBase):
    def setUp(self):
        super().setUp()
        # 10 AM local today, so every booking below is later the same day.
        self.now = timezone.make_aware(datetime.combine(timezone.localdate(), time(10, 0)))
        patcher = mock.patch("django.utils.timezone.now", return_value=self.now)
        patcher.start()
        self.addCleanup(patcher.stop)

    def today_booking(self, hhmm="20:00", **extra):
        booking = self.booking(**extra)
        h, m = map(int, hhmm.split(":"))
        booking.reservation_time = timezone.make_aware(datetime.combine(self.now.date(), time(h, m)))
        booking.save()
        return booking

    def test_due_reminders_are_todays_upcoming_confirmed_bookings(self):
        due = self.today_booking()
        self.today_booking(status=ReservationStatus.PENDING)
        self.today_booking(hhmm="09:30")  # already started
        self.today_booking(reminder_sent_at=self.now)
        tomorrow = self.booking()
        tomorrow.reservation_time = self.now + timedelta(days=1)
        tomorrow.save()
        self.assertEqual(list(reminders.due_reminders()), [due])
        self.assertEqual(list(reminders.due_reminders(self.now.replace(hour=8))), [])

    @override_settings(RESERVATION_REMINDER_SENDER="console")
    def test_command_sends_each_reminder_once(self):
        booking = self.today_booking()
        out = StringIO()
        call_command("send_reservation_reminders", stdout=out)
        self.assertIn("Sent 1 reminder(s)", out.getvalue())
        booking.refresh_from_db()
        self.assertEqual(booking.reminder_sent_at, self.now)
        out = StringIO()
        call_command("send_reservation_reminders", stdout=out)
        self.assertIn("Sent 0 reminder(s)", out.getvalue())

    @override_settings(RESERVATION_REMINDER_SENDER="")
    def test_command_without_a_sender_sends_nothing(self):
        booking = self.today_booking()
        out = StringIO()
        call_command("send_reservation_reminders", stdout=out)
        self.assertIn("not set", out.getvalue())
        booking.refresh_from_db()
        self.assertIsNone(booking.reminder_sent_at)

    @override_settings(
        RESERVATION_REMINDER_SENDER="whatsapp", WHATSAPP_TOKEN="t", WHATSAPP_PHONE_NUMBER_ID="123",
        WHATSAPP_TEMPLATE="booking_welcome",
    )
    def test_whatsapp_sender_uses_the_template(self):
        booking = self.today_booking()
        with mock.patch("apps.restaurants.services.reminders.requests.post") as post:
            post.return_value.status_code = 200
            call_command("send_reservation_reminders", stdout=StringIO())
        url = post.call_args.args[0]
        body = post.call_args.kwargs["json"]
        self.assertEqual(url, "https://graph.facebook.com/v21.0/123/messages")
        self.assertEqual(body["to"], "923001234567")
        self.assertEqual(body["template"]["name"], "booking_welcome")
        values = [p["text"] for p in body["template"]["components"][0]["parameters"]]
        self.assertEqual(values[:4], ["Ali", "Book Alpha", "8:00 PM", "4"])
        booking.refresh_from_db()
        self.assertIsNotNone(booking.reminder_sent_at)

    @override_settings(RESERVATION_REMINDER_SENDER="whatsapp", WHATSAPP_TOKEN="t", WHATSAPP_PHONE_NUMBER_ID="123")
    def test_failed_send_is_retried_next_run(self):
        booking = self.today_booking()
        err = StringIO()
        with mock.patch("apps.restaurants.services.reminders.requests.post") as post:
            post.return_value.status_code = 401
            post.return_value.text = "bad token"
            call_command("send_reservation_reminders", stdout=StringIO(), stderr=err)
        self.assertIn("refused", err.getvalue())
        booking.refresh_from_db()
        self.assertIsNone(booking.reminder_sent_at)

    def remind(self, booking, user=None, **data):
        self.client.force_authenticate(user=user or self.manager)
        return self.client.post(f"{MANAGER}{booking.id}/remind/", data, format="json")

    @override_settings(RESERVATION_REMINDER_SENDER="")
    def test_manager_sends_from_whatsapp_by_hand(self):
        booking = self.today_booking()
        self.client.force_authenticate(user=self.manager)
        data = self.client.get(MANAGER, {"tab": "today"}).data
        self.assertFalse(data["reminders_automatic"])
        self.assertTrue(data["results"][0]["whatsapp_url"].startswith("https://wa.me/923001234567"))

        self.assertEqual(self.remind(booking).status_code, 400)
        res = self.remind(booking, manual=True)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsNotNone(res.data["reminder_sent_at"])

    @override_settings(RESERVATION_REMINDER_SENDER="console")
    def test_manager_sends_now_and_scoping(self):
        booking = self.today_booking()
        self.assertEqual(self.remind(booking, user=self.other_manager).status_code, 404)
        self.assertEqual(self.remind(booking, user=self.waiter).status_code, 403)
        res = self.remind(booking)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsNotNone(res.data["reminder_sent_at"])

        booking.status = ReservationStatus.CANCELLED.value
        booking.save()
        self.assertEqual(self.remind(booking).status_code, 400)
