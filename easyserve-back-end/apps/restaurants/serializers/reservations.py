from datetime import datetime

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import serializers

from apps.restaurants.constants import ReservationStatus
from apps.restaurants.models import Reservation
from apps.restaurants.services.reservations import check_booking_request, free_tables


class ReservationDetailSerializer(serializers.ModelSerializer):
    """A booking as the guest and the manager see it."""
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    status = serializers.CharField(source="get_status_display")
    status_key = serializers.SerializerMethodField()
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)
    table_number = serializers.IntegerField(source="table.table_number", default=None, read_only=True)
    orders = serializers.SerializerMethodField()

    def get_date(self, obj):
        return timezone.localtime(obj.reservation_time).date()

    def get_time(self, obj):
        return timezone.localtime(obj.reservation_time).strftime("%H:%M")

    def get_status_key(self, obj):
        return ReservationStatus(obj.status).name.lower()

    def get_orders(self, obj):
        """Orders placed during the checked-in visit: {count, total}, or None before check-in."""
        if not obj.dine_in_session_id:
            return None
        totals = obj.dine_in_session.orders.filter(ordered=True, order_cancelled=False).aggregate(
            count=Count("id"), total=Sum("total_price")
        )
        return {"count": totals["count"], "total": totals["total"] or 0}

    class Meta:
        model = Reservation
        fields = [
            "id",
            "booking_code",
            "status",
            "status_key",
            "date",
            "time",
            "reservation_time",
            "guest_count",
            "name",
            "phone",
            "notes",
            "occasion",
            "restaurant",
            "restaurant_name",
            "table_number",
            "orders",
            "reminder_sent_at",
            "created_at",
        ]


class ReservationCreateSerializer(serializers.ModelSerializer):
    date = serializers.DateField(write_only=True)
    time = serializers.TimeField(write_only=True)
    name = serializers.CharField(max_length=120)
    phone = serializers.RegexField(r"^\+?[\d\s-]{7,20}$", error_messages={"invalid": "Enter a valid phone number."})
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)

    class Meta:
        model = Reservation
        fields = ["restaurant", "date", "time", "guest_count", "name", "phone", "notes", "occasion"]

    def validate(self, attrs):
        start = timezone.make_aware(datetime.combine(attrs.pop("date"), attrs.pop("time")))
        check_booking_request(attrs["restaurant"], attrs["guest_count"], start)
        if not free_tables(attrs["restaurant"], attrs["guest_count"], start).exists():
            raise serializers.ValidationError("No table is free at this time. Please pick another slot.")
        attrs["reservation_time"] = start
        return attrs

    def to_representation(self, instance):
        return ReservationDetailSerializer(instance, context=self.context).data
