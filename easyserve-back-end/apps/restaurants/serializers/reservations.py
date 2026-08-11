from rest_framework import serializers
from django.utils.timezone import make_aware, now
from datetime import datetime, timedelta

from apps.restaurants.models import Reservation, Table
from apps.restaurants.constants import ReservationStatus


class ReservationDetailSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    status = serializers.CharField(source="get_status_display")

    def get_date(self, obj):
        return obj.reservation_time.date()

    def get_time(self, obj):
        return obj.reservation_time.time()

    class Meta:
        model = Reservation
        fields = [
            'id',
            'status',
            "date",
            "time",
            'reservation_time',
            'guest_count',
        ]

class ReservationCreateSerializer(serializers.ModelSerializer):
    date = serializers.DateField(write_only=True)
    time = serializers.TimeField(write_only=True)
    phone = serializers.CharField(write_only=True)
    notes = serializers.CharField(write_only=True)
    name = serializers.CharField(write_only=True)
    status = serializers.CharField(
        source="get_status_display",
        required=False,
        read_only=True,
    )
    reservation_time = serializers.DateTimeField(
        required=False,
        read_only=True,
    )

    class Meta:
        model = Reservation
        fields = [
            'id',
            "restaurant",
            "date",
            "time",
            'reservation_time',
            "guest_count",
            'status',
            "name",
            "phone",
            "notes",
        ]

    def validate_guest_count(self, value):
        if value <= 0:
            raise serializers.ValidationError("Guest count must be greater than zero.")
        if value > 20:
            raise serializers.ValidationError("For large groups, please contact restaurant.")
        return value

    def validate(self, attrs):
        restaurant = attrs["restaurant"]
        date = attrs.pop("date")
        time = attrs.pop("time")
        guest_count = attrs["guest_count"]

        reservation_dt = make_aware(datetime.combine(date, time))

        if reservation_dt < now():
            raise serializers.ValidationError("Reservation time must be in the future.")

        # 🔍 Find suitable table
        table = (
            Table.objects
            .filter(
                restaurant=restaurant,
                capacity__gte=guest_count,
                is_active=True
            )
            .order_by("capacity")
            .first()
        )

        if not table:
            raise serializers.ValidationError(
                "No table available for the selected number of guests."
            )

        # ⛔ Prevent overlapping reservations (±90 min window)
        overlapping = Reservation.objects.filter(
            table=table,
            reservation_time__range=(
                reservation_dt - timedelta(minutes=90),
                reservation_dt + timedelta(minutes=90),
            ),
            status__in=[
                ReservationStatus.PENDING.value,
                ReservationStatus.CONFIRMED.value,
            ],
        ).exists()

        if overlapping:
            raise serializers.ValidationError(
                "This table is already reserved for the selected time."
            )

        attrs["reservation_time"] = reservation_dt
        attrs["table"] = table

        return attrs

def validate_table_capacity(restaurant, guest_count):
    has_capacity = Table.objects.filter(
        restaurant=restaurant,
        capacity__gte=guest_count
    ).exists()

    if not has_capacity:
        raise serializers.ValidationError(
            "No table available for selected guest count."
        )
