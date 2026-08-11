from django.db import models
from django.utils import timezone
from apps.restaurants.models import Orders


PAYMENT_METHODS = (
    ("cash", "Cash"),
    ("card", "Card"),
    ("online", "Online"),
)

PAYMENT_STATUS = (
    ("pending", "Pending"),
    ("success", "Success"),
    ("failed", "Failed"),
    ("refunded", "Refunded"),
)

class Payment(models.Model):
    order = models.OneToOneField(
        Orders,
        on_delete=models.CASCADE,
        related_name="payment"
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default="pending")

    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    paid_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Payment for Order {self.order.id} - {self.status}"
