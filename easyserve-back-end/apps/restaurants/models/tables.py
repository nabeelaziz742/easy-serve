import qrcode
from io import BytesIO
from django.conf import settings
from django.core.files import File
from django.db import models

from apps.restaurants.constants import TableState
from coresite.mixin import AbstractTimeStampModel


class Table(AbstractTimeStampModel):
    """
    A physical table inside a restaurant with an assigned waiter and QR code.
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name="tables"
    )
    table_number = models.PositiveIntegerField()
    table_state = models.PositiveSmallIntegerField(
        choices=TableState.model_choices(),
        default=TableState.EMPTY.value
    )
    capacity = models.PositiveIntegerField(default=5)
    customer_count = models.PositiveIntegerField(default=0)
    assigned_waiter = models.ForeignKey(
        "userprofile.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="assigned_tables"
    )
    qr_code = models.ImageField(upload_to="qr_codes/", blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("restaurant", "table_number")

    def __str__(self):
        return f"{self.table_name} - {self.restaurant}"

    @property
    def table_name(self):
        return f"Table #{self.table_number}"

    def save(self, *args, **kwargs):
        """
        Auto-generate a customer-facing QR code for this table.

        REACT_DOMAIN should point at the frontend (for example the deployed
        Easy Serve frontend). During local development, localhost is used as
        a safe fallback. The frontend can also parse the legacy payload
        format, but real table QRs should open a browser URL directly.
        """
        if not self.qr_code:
            frontend_domain = (getattr(settings, "REACT_DOMAIN", "") or "").rstrip("/")
            if not frontend_domain:
                frontend_domain = "http://localhost:3000"

            qr_data = (
                f"{frontend_domain}/restaurant/{self.restaurant.id}"
                f"?mode=dine-in&table={self.table_number}"
            )

            qr = qrcode.make(qr_data)
            buffer = BytesIO()
            qr.save(buffer, format="PNG")
            filename = f"table_{self.restaurant.id}_{self.table_number}.png"
            self.qr_code.save(filename, File(buffer), save=False)

        super().save(*args, **kwargs)
