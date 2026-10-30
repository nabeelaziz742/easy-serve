from django.core.management.base import BaseCommand

from apps.restaurants.services.reminders import ReminderError, due_reminders, get_sender, send_reminder


class Command(BaseCommand):
    help = (
        "Send the welcome reminder for today's confirmed table bookings. "
        "Run it every 15 minutes (cron or Windows Task Scheduler); each "
        "booking gets one reminder, from 9 AM on the day."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="List who would get a reminder, send nothing.")

    def handle(self, *args, dry_run=False, **options):
        bookings = list(due_reminders())
        sender = None if dry_run else get_sender()

        if not dry_run and sender is None:
            self.stdout.write(
                f"{len(bookings)} reminder(s) due, but RESERVATION_REMINDER_SENDER is not set. "
                "Managers can send them from the Reservations page."
            )
            return

        sent = failed = 0
        for booking in bookings:
            if dry_run:
                self.stdout.write(f"Would remind {booking.name} ({booking.phone}) for {booking.booking_code}")
                continue
            try:
                send_reminder(booking, sender)
                sent += 1
            except ReminderError as error:
                failed += 1
                self.stderr.write(f"{booking.booking_code}: {error}")

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"Sent {sent} reminder(s), {failed} failed."))
