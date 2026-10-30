"""Same-day welcome reminder for table bookings.

The message goes out through a pluggable sender chosen with the
RESERVATION_REMINDER_SENDER setting. With no sender set up, nothing is sent
automatically and the manager sends the same text from WhatsApp by hand
(the Reservations page has a button that opens it ready to send).
"""
import logging
import re
from datetime import time
from urllib.parse import quote, urlencode

import requests
from django.conf import settings
from django.utils import timezone
from django.utils.module_loading import import_string

from apps.restaurants.constants import ReservationStatus
from apps.restaurants.models import Reservation
from apps.restaurants.models.tables import DEFAULT_FRONTEND_DOMAIN

logger = logging.getLogger(__name__)

# Reminders for today's bookings start going out at this hour (local time),
# so nobody gets a message at night.
SEND_FROM = time(9, 0)


class ReminderError(Exception):
    """The sender could not deliver the message."""


def frontend_url():
    return (getattr(settings, "REACT_DOMAIN", "") or DEFAULT_FRONTEND_DOMAIN).rstrip("/")


def international_number(phone):
    """Digits with the country code, as WhatsApp and SMS services expect: 0300 1234567 -> 923001234567."""
    digits = re.sub(r"\D", "", phone or "")
    country = settings.RESERVATION_PHONE_COUNTRY_CODE
    if digits.startswith("00"):
        return digits[2:]
    if digits.startswith("0"):
        return country + digits[1:]
    if len(digits) <= 10 and not digits.startswith(country):
        return country + digits
    return digits


def display_time(value):
    local = timezone.localtime(value)
    return f"{local.hour % 12 or 12}:{local:%M} {'AM' if local.hour < 12 else 'PM'}"


def cancel_link(booking):
    query = urlencode({"code": booking.booking_code, "phone": booking.phone})
    return f"{frontend_url()}/reservations?{query}"


def reminder_values(booking):
    return {
        "name": booking.name or "Guest",
        "restaurant": booking.restaurant.name,
        "time": display_time(booking.reservation_time),
        "guests": booking.guest_count,
        "link": cancel_link(booking),
    }


def reminder_text(booking):
    v = reminder_values(booking)
    return (
        f"Assalam-o-Alaikum {v['name']}! 🎉 Aaj aapki booking hai {v['restaurant']} mein, "
        f"{v['time']}, {v['guests']} logon ke liye. Hum aapka intezar kar rahe hain, welcome! "
        f"Na aa sakein to yahan cancel kar dein: {v['link']}"
    )


def whatsapp_url(booking):
    """A wa.me link that opens WhatsApp with the reminder ready to send."""
    return f"https://wa.me/{international_number(booking.phone)}?text={quote(reminder_text(booking))}"


class ConsoleSender:
    """Prints the reminder instead of sending it. For trying the flow locally."""

    def send(self, booking, text):
        logger.info("Reservation reminder to %s: %s", booking.phone, text)
        print(f"[reminder] to {booking.phone}: {text}")


class WhatsAppCloudSender:
    """WhatsApp Cloud API (Meta). Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.

    WhatsApp only lets a business start a chat with an approved template,
    so set WHATSAPP_TEMPLATE in production. Without it a plain text is sent,
    which WhatsApp delivers only to numbers that wrote to you in the last
    24 hours (fine for testing).
    """

    API = "https://graph.facebook.com/v21.0/{phone_id}/messages"

    def send(self, booking, text):
        if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
            raise ReminderError("WhatsApp is not set up: add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.")
        message = {"messaging_product": "whatsapp", "to": international_number(booking.phone)}
        if settings.WHATSAPP_TEMPLATE:
            values = reminder_values(booking)
            message["type"] = "template"
            message["template"] = {
                "name": settings.WHATSAPP_TEMPLATE,
                "language": {"code": settings.WHATSAPP_TEMPLATE_LANGUAGE},
                "components": [{
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": str(values[key])}
                        for key in ("name", "restaurant", "time", "guests", "link")
                    ],
                }],
            }
        else:
            message["type"] = "text"
            message["text"] = {"body": text, "preview_url": True}
        post(
            self.API.format(phone_id=settings.WHATSAPP_PHONE_NUMBER_ID),
            json=message,
            headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"},
        )


class TwilioSmsSender:
    """SMS through Twilio. Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER."""

    API = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"

    def send(self, booking, text):
        sid, token, sender = settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_FROM_NUMBER
        if not (sid and token and sender):
            raise ReminderError("Twilio is not set up: add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER.")
        post(
            self.API.format(sid=sid),
            data={"To": f"+{international_number(booking.phone)}", "From": sender, "Body": text},
            auth=(sid, token),
        )


def post(url, **kwargs):
    try:
        response = requests.post(url, timeout=15, **kwargs)
    except requests.RequestException as error:
        raise ReminderError(f"Could not reach the messaging service: {error}") from error
    if response.status_code >= 400:
        raise ReminderError(f"The messaging service refused the message ({response.status_code}): {response.text[:300]}")


SENDERS = {
    "console": ConsoleSender,
    "whatsapp": WhatsAppCloudSender,
    "twilio": TwilioSmsSender,
}


def get_sender():
    """The configured sender, or None when reminders are sent by hand."""
    name = (getattr(settings, "RESERVATION_REMINDER_SENDER", "") or "").strip()
    if not name:
        return None
    sender_class = SENDERS.get(name.lower()) or import_string(name)
    return sender_class()


def send_reminder(booking, sender):
    sender.send(booking, reminder_text(booking))
    booking.reminder_sent_at = timezone.now()
    booking.save(update_fields=["reminder_sent_at", "updated_at"])


def can_remind(booking):
    return (
        booking.booking_code is not None
        and booking.status == ReservationStatus.CONFIRMED.value
        and booking.reservation_time > timezone.now()
    )


def due_reminders(now=None):
    """Today's confirmed bookings, still ahead, that have not had their reminder."""
    now = now or timezone.now()
    local = timezone.localtime(now)
    if local.time() < SEND_FROM:
        return Reservation.objects.none()
    return (
        Reservation.objects.filter(
            booking_code__isnull=False,
            status=ReservationStatus.CONFIRMED.value,
            reminder_sent_at__isnull=True,
            reservation_time__date=local.date(),
            reservation_time__gt=now,
            restaurant__is_active=True,
        )
        .select_related("restaurant")
        .order_by("reservation_time")
    )
