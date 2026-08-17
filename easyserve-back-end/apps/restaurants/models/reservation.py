from django.core.exceptions import ValidationError
from django.db import models

from apps.restaurants.constants import ReservationStatus
from apps.userprofile.models import UserProfile
from apps.restaurants.models import Restaurant
from apps.restaurants.models import Table
from coresite.mixin import AbstractTimeStampModel


class Reservation(AbstractTimeStampModel):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='reservations'
    )
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reservations'
    )
    table = models.ForeignKey(
        Table,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reservations'
    )

    reservation_time = models.DateTimeField()
    guest_count = models.PositiveIntegerField(default=1)

    # Contact snapshot (important for walk-ins / analytics)
    name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)

    status = models.PositiveSmallIntegerField(
        choices=ReservationStatus.model_choices(),
        default=ReservationStatus.PENDING.value
    )

    # Valid state transitions
    VALID_TRANSITIONS = {
        ReservationStatus.PENDING: {
            ReservationStatus.CONFIRMED,
            ReservationStatus.CANCELLED,
        },
        ReservationStatus.CONFIRMED: {
            ReservationStatus.SEATED,
            ReservationStatus.NO_SHOW,
            ReservationStatus.CANCELLED,
        },
        ReservationStatus.SEATED: {
            ReservationStatus.COMPLETED,
        },
    }

    def can_transition_to(self, new_status):
        if self.status == new_status:
            return True

        allowed = self.VALID_TRANSITIONS.get(self.status, set())
        return new_status in allowed

    def transition_to(self, new_status, *, save=True):
        if not self.can_transition_to(new_status):
            try:
                current_label = ReservationStatus(self.status).label
                new_label = ReservationStatus(new_status).label
            except ValueError:
                current_label = str(self.status)
                new_label = str(new_status)

            raise ValidationError(
                f"Invalid status transition from {current_label} → {new_label}"
            )

        self.status = new_status
        if save:
            self.save(update_fields=["status", "updated_at"])

    class Meta:
        ordering = ["-reservation_time"]
        indexes = [
            models.Index(fields=["restaurant", "reservation_time"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.restaurant.name} | {self.reservation_time} | {self.guest_count} guests"
