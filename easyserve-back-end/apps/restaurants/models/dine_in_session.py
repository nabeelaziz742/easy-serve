import uuid
from django.db import models
from django.utils import timezone

from apps.restaurants.constants import DineInSessionStatus
from apps.restaurants.models import Restaurant, Table


class DineInSession(models.Model):
    name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    guests = models.PositiveIntegerField(default=1)
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='dine_in_sessions'
    )
    table = models.ForeignKey(
        Table,
        on_delete=models.CASCADE,
        related_name='dine_in_sessions'
    )
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )
    status = models.PositiveSmallIntegerField(
        choices=DineInSessionStatus.model_choices(),
        default=DineInSessionStatus.ACTIVE.value,
    )

    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'table'],
                condition=models.Q(status=DineInSessionStatus.ACTIVE.value),
                name="unique_active_dine_in_session_per_table"
            )
        ]

    def close(self):
        self.status = DineInSessionStatus.CLOSED.value
        self.closed_at = timezone.now()
        self.save()

    def __str__(self):
        return (
            f"DineInSession at {self.restaurant.name} - "
            f"Table {self.table.table_number} "
            f"({self.status})"
        )
