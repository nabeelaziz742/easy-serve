from django.db import models

from apps.userprofile.models import UserProfile
from coresite.mixin import AbstractTimeStampModel


class ServiceRequest(AbstractTimeStampModel):
    """A guest at a table asking for the waiter or for the bill."""

    class Kind(models.TextChoices):
        CALL_WAITER = "waiter", "Call waiter"
        REQUEST_BILL = "bill", "Request bill"

    dine_in_session = models.ForeignKey(
        'restaurants.DineInSession',
        on_delete=models.CASCADE,
        related_name='service_requests'
    )
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='service_requests'
    )
    table = models.ForeignKey(
        'restaurants.Table',
        on_delete=models.CASCADE,
        related_name='service_requests'
    )
    kind = models.CharField(max_length=10, choices=Kind.choices)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_service_requests'
    )

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.get_kind_display()} - Table {self.table.table_number}"
