import logging

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import serializers

from apps.restaurants.constants import ReservationStatus
from apps.restaurants.models import Reservation, Restaurant, Table
from apps.restaurants.serializers import (
    ReservationCreateSerializer,
    ReservationDetailSerializer,
)
from utils.paginations import LimitOffsetOf10Pagination

logger = logging.getLogger(__name__)


class ReservationListCreateAPIView(ListCreateAPIView):
    serializer_class = ReservationDetailSerializer
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
        profile = getattr(self.request.user, "profile", None)
        if not profile:
            return Reservation.objects.none()

        return (
            Reservation.objects
            .filter(user=profile)
            .select_related("restaurant", "table")
            .order_by("-reservation_time")
        )

    def perform_create(self, serializer):
        restaurant_id = self.request.data.get("restaurant")
        if not restaurant_id:
            raise serializers.ValidationError({"restaurant": "Restaurant is required."})

        restaurant = get_object_or_404(
            Restaurant,
            id=restaurant_id,
            is_active=True,
        )

        validated_table = serializer.validated_data["table"]
        reservation_time = serializer.validated_data["reservation_time"]
        window_start = reservation_time - __import__("datetime").timedelta(minutes=90)
        window_end = reservation_time + __import__("datetime").timedelta(minutes=90)
        active_statuses = [
            ReservationStatus.PENDING.value,
            ReservationStatus.CONFIRMED.value,
        ]

        # Validation runs before save. Lock the selected table and re-check the
        # time window inside the transaction so two simultaneous reservations
        # cannot both book the same table.
        with transaction.atomic():
            table = (
                Table.objects
                .select_for_update()
                .get(id=validated_table.id, restaurant=restaurant, is_active=True)
            )

            if Reservation.objects.filter(
                table=table,
                reservation_time__gte=window_start,
                reservation_time__lte=window_end,
                status__in=active_statuses,
            ).exists():
                raise serializers.ValidationError(
                    "This table was just reserved for the selected time. Please choose another time."
                )

            serializer.save(
                restaurant=restaurant,
                table=table,
                user=getattr(self.request.user, "profile", None),
                status=ReservationStatus.CONFIRMED.value,
            )


class ReservationDetailAPIView(RetrieveAPIView):
    serializer_class = ReservationDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, "profile", None)
        if not profile:
            return Reservation.objects.none()

        return (
            Reservation.objects
            .filter(user=profile)
            .select_related("restaurant", "table")
        )
