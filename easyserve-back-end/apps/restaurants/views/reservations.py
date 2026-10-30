from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import serializers, status
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.financial.permissions import get_request_restaurant
from apps.restaurants.constants import ReservationStatus
from apps.restaurants.models import Reservation, Restaurant, Table
from apps.restaurants.permissions import IsManager
from apps.restaurants.serializers import (
    ReservationCreateSerializer,
    ReservationDetailSerializer,
)
from apps.restaurants.services.reminders import (
    ReminderError,
    can_remind,
    get_sender,
    send_reminder,
    whatsapp_url,
)
from apps.restaurants.services.reservations import (
    BOOKING_DAYS_AHEAD,
    available_slots,
    booking_hours,
    fitting_tables,
    free_tables,
    new_booking_code,
    same_phone,
)
from utils.paginations import LimitOffsetOf10Pagination


def bookings():
    """Real table bookings; walk-in rows made when a table is seated have no code."""
    return Reservation.objects.filter(booking_code__isnull=False).select_related("restaurant", "table")


def own_profile(request):
    return getattr(request.user, "profile", None) if request.user.is_authenticated else None


class ReservationSlotsAPIView(APIView):
    """Bookable times for one day, built from the restaurant's opening hours."""
    permission_classes = [AllowAny]

    def get(self, request, restaurant_id):
        restaurant = get_object_or_404(Restaurant.objects.prefetch_related("hours"), id=restaurant_id, is_active=True)
        today = timezone.localdate()
        day = parse_date(request.query_params.get("date") or "") or today
        if not today <= day <= today + timedelta(days=BOOKING_DAYS_AHEAD):
            return Response({"detail": "Pick a date within the next 30 days."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            guests = max(int(request.query_params.get("guests", 2)), 1)
        except ValueError:
            guests = 2

        window = booking_hours(restaurant, day)
        return Response({
            "date": day,
            "guests": guests,
            "open": window is not None,
            "max_guests": restaurant.reservation_max_guests,
            "auto_confirm": restaurant.reservation_auto_confirm,
            "slots": available_slots(restaurant, day, guests) if guests <= restaurant.reservation_max_guests else [],
        })


class ReservationListCreateAPIView(ListCreateAPIView):
    """Guests book a table (no login needed); signed-in customers list their bookings."""
    pagination_class = LimitOffsetOf10Pagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ReservationCreateSerializer
        return ReservationDetailSerializer

    def get_queryset(self):
        profile = own_profile(self.request)
        if not profile:
            return Reservation.objects.none()
        return bookings().filter(user=profile).order_by("-reservation_time")

    def perform_create(self, serializer):
        data = serializer.validated_data
        restaurant = data["restaurant"]

        # Lock the tables that fit the party and pick a free one inside the
        # transaction, so two guests booking the last table at the same time
        # cannot both get it.
        with transaction.atomic():
            list(fitting_tables(restaurant, data["guest_count"]).select_for_update())
            table = free_tables(restaurant, data["guest_count"], data["reservation_time"]).first()
            if table is None:
                raise serializers.ValidationError("This time was just booked. Please pick another slot.")
            serializer.save(
                table=table,
                user=own_profile(self.request),
                booking_code=new_booking_code(),
                status=(
                    ReservationStatus.CONFIRMED.value
                    if restaurant.reservation_auto_confirm
                    else ReservationStatus.PENDING.value
                ),
            )


class ReservationDetailAPIView(RetrieveAPIView):
    serializer_class = ReservationDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = own_profile(self.request)
        if not profile:
            return Reservation.objects.none()
        return bookings().filter(user=profile)


class GuestReservationAPIView(APIView):
    """Find or cancel a booking by its code.

    The guest proves it is theirs with the phone number they booked with;
    a signed-in customer who made the booking does not need it.
    """
    permission_classes = [AllowAny]

    def get_booking(self, request, code, phone):
        booking = bookings().filter(booking_code=code.upper()).first()
        if booking is None:
            return None
        profile = own_profile(request)
        if (profile and booking.user_id == profile.id) or same_phone(phone, booking.phone):
            return booking
        return None

    def get(self, request, code):
        booking = self.get_booking(request, code, request.query_params.get("phone"))
        if booking is None:
            return Response({"detail": "No booking matches this code and phone number."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ReservationDetailSerializer(booking).data)

    def post(self, request, code):
        booking = self.get_booking(request, code, request.data.get("phone"))
        if booking is None:
            return Response({"detail": "No booking matches this code and phone number."}, status=status.HTTP_404_NOT_FOUND)
        if booking.status not in (ReservationStatus.PENDING, ReservationStatus.CONFIRMED) or booking.reservation_time <= timezone.now():
            return Response({"detail": "This booking can no longer be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        booking.transition_to(ReservationStatus.CANCELLED)
        return Response(ReservationDetailSerializer(booking).data)


class ManagerReservationListAPIView(APIView):
    """The manager's bookings for one tab, plus the counts for the stat cards.

    Tabs: today, tomorrow, upcoming (after tomorrow) and pending (every
    request still waiting for an answer).
    """
    permission_classes = [IsManager]

    def get(self, request):
        restaurant = get_request_restaurant(request)
        if restaurant is None:
            return Response({"detail": "No restaurant is linked to your account."}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.localdate()
        tomorrow = today + timedelta(days=1)
        qs = bookings().filter(restaurant=restaurant)
        pending = qs.filter(status=ReservationStatus.PENDING.value, reservation_time__gte=timezone.now())
        tabs = {
            "today": qs.filter(reservation_time__date=today),
            "tomorrow": qs.filter(reservation_time__date=tomorrow),
            "upcoming": qs.filter(reservation_time__date__gt=tomorrow),
            "pending": pending,
        }
        tab = request.query_params.get("tab", "today")
        rows = tabs.get(tab, tabs["today"]).order_by("reservation_time")

        results = []
        for booking in rows:
            item = ReservationDetailSerializer(booking).data
            if booking.status == ReservationStatus.PENDING.value:
                # Tables the manager can give this party when confirming.
                item["table_options"] = [
                    {"id": t.id, "number": t.table_number, "capacity": t.capacity}
                    for t in free_tables(restaurant, booking.guest_count, booking.reservation_time, exclude_id=booking.id)
                ]
            if can_remind(booking):
                item["whatsapp_url"] = whatsapp_url(booking)
            results.append(item)

        return Response({
            "tab": tab if tab in tabs else "today",
            "counts": {
                "today": tabs["today"].exclude(
                    status__in=[ReservationStatus.CANCELLED.value, ReservationStatus.REJECTED.value]
                ).count(),
                "pending": pending.count(),
                "no_show": tabs["today"].filter(status=ReservationStatus.NO_SHOW.value).count(),
                "tomorrow": tabs["tomorrow"].count(),
                "upcoming": tabs["upcoming"].count(),
            },
            # True when reminders go out on their own (a WhatsApp or SMS
            # service is set up); otherwise the page sends them by hand.
            "reminders_automatic": get_sender() is not None,
            "results": results,
        })


class ManagerReservationActionAPIView(APIView):
    """Confirm (optionally on another table), reject, mark arrived or no-show."""
    permission_classes = [IsManager]
    ACTIONS = {
        "confirm": ReservationStatus.CONFIRMED,
        "reject": ReservationStatus.REJECTED,
        "arrive": ReservationStatus.SEATED,
        "no-show": ReservationStatus.NO_SHOW,
    }

    @transaction.atomic
    def post(self, request, pk, action):
        new_status = self.ACTIONS.get(action)
        if new_status is None:
            return Response({"detail": "Unknown action."}, status=status.HTTP_404_NOT_FOUND)
        restaurant = get_request_restaurant(request)
        booking = get_object_or_404(bookings().select_for_update(of=("self",)), id=pk, restaurant=restaurant)

        if not booking.can_transition_to(new_status):
            return Response(
                {"detail": f"A {booking.get_status_display().lower()} booking cannot be changed like this."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "confirm" and request.data.get("table"):
            table = Table.objects.filter(id=request.data["table"], restaurant=restaurant, is_active=True).first()
            if table is None or table.capacity < booking.guest_count:
                return Response({"detail": "This table does not seat the party."}, status=status.HTTP_400_BAD_REQUEST)
            if not free_tables(restaurant, booking.guest_count, booking.reservation_time, exclude_id=booking.id).filter(id=table.id).exists():
                return Response({"detail": f"Table {table.table_number} is booked around this time."}, status=status.HTTP_400_BAD_REQUEST)
            booking.table = table
            booking.save(update_fields=["table", "updated_at"])

        booking.transition_to(new_status)
        return Response(ReservationDetailSerializer(booking).data)


class ManagerReservationReminderAPIView(APIView):
    """Send the welcome reminder now, or record that the manager sent it from WhatsApp.

    POST {"manual": true} only marks the reminder as sent.
    """
    permission_classes = [IsManager]

    def post(self, request, pk):
        restaurant = get_request_restaurant(request)
        booking = get_object_or_404(bookings(), id=pk, restaurant=restaurant)
        if not can_remind(booking):
            return Response({"detail": "Only upcoming confirmed bookings get a reminder."}, status=status.HTTP_400_BAD_REQUEST)

        if request.data.get("manual"):
            booking.reminder_sent_at = timezone.now()
            booking.save(update_fields=["reminder_sent_at", "updated_at"])
            return Response(ReservationDetailSerializer(booking).data)

        sender = get_sender()
        if sender is None:
            return Response(
                {"detail": "No WhatsApp or SMS service is set up. Send it from WhatsApp instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            send_reminder(booking, sender)
        except ReminderError as error:
            return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(ReservationDetailSerializer(booking).data)
