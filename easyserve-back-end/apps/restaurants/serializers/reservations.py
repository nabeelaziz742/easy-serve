from datetime import datetime, timedelta

from django.utils.timezone import make_aware, now
from rest_framework import serializers

from apps.restaurants.constants import ReservationStatus
from apps.restaurants.models import Reservation, Table


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
            "id",
            "status",
            "date",
            "time",
            "reservation_time",
            "guest_count",
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
    reservation_time = serializers.DateTimeField(required=False, read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "restaurant",
            "date",
            "time",
            "reservation_time",
            "guest_count",
            "status",
            "name",
            "phone",
            "notes",
        ]

    def validate_guest_count(self, value):
        if value <= 0:
            raise serializers.ValidationError("Guest count must be greater than zero.")
        if value > 20:
            raise serializers.ValidationError(
                "For large groups, please contact restaurant."
            )
        return value

    def validate(self, attrs):
        restaurant = attrs["restaurant"]
        date = attrs.pop("date")
        time = attrs.pop("time")
        guest_count = attrs["guest_count"]

        if not restaurant.is_active:
            raise serializers.ValidationError("This restaurant is currently unavailable.")

        reservation_dt = make_aware(datetime.combine(date, time))
        if reservation_dt <= now():
            raise serializers.ValidationError("Reservation time must be in the future.")

        window_start = reservation_dt - timedelta(minutes=90)
        window_end = reservation_dt + timedelta(minutes=90)
        active_statuses = [
            ReservationStatus.PENDING.value,
            ReservationStatus.CONFIRMED.value,
        ]

        # Pick the smallest suitable active table that is free for the requested
        # time window. The previous implementation selected the first table and
        # rejected the reservation if that one table was occupied, even when a
        # second suitable table was available.
        candidate_tables = (
            Table.objects
            .filter(
                restaurant=restaurant,
                capacity__gte=guest_count,
                is_active=True,
            )
            .order_by("capacity", "table_number")
        )

        table = None
        for candidate in candidate_tables:
            if not Reservation.objects.filter(
                table=candidate,
                reservation_time__gte=window_start,
                reservation_time__lte=window_end,
                status__in=active_statuses,
            ).exists():
                table = candidate
                break

        if table is None:
            raise serializers.ValidationError(
                "No table is available for the selected number of guests and time."
            )

        attrs["reservation_time"] = reservation_dt
        attrs["table"] = table
        return attrs


def validate_table_capacity(restaurant, guest_count):
    has_capacity = Table.objects.filter(
        restaurant=restaurant,
        capacity__gte=guest_count,
        is_active=True,
    ).exists()

    if not has_capacity:
        raise serializers.ValidationError(
            "No table available for selected guest count."
        )
