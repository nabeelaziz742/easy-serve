from django.db import models

from apps.restaurants.constants import PaymentStatus, PaymentMethod
from apps.userprofile.models import UserProfile
from coresite.mixin import AbstractTimeStampModel


class PaymentDetails(AbstractTimeStampModel):
    user = models.ForeignKey('userprofile.UserProfile', on_delete=models.CASCADE)
    order = models.ForeignKey('restaurants.Orders', on_delete=models.CASCADE)
    receipt_image = models.ImageField(upload_to='receipts/', null=True, blank=True)
    payment_method = models.PositiveSmallIntegerField(
        choices=PaymentMethod.model_choices(),
        default=PaymentMethod.CATCH_ON_DELIVERY.value
    )
    payment_status = models.PositiveSmallIntegerField(
        default=PaymentStatus.PENDING.value,
        choices=PaymentStatus.model_choices()
    )
    payment_date = models.DateTimeField(auto_now_add=True)
    receipt = models.FileField(upload_to='receipts/', null=True, blank=True)

    # Cash custody chain. These fields deliberately keep CASH RECEIVED
    # separate from FINAL PAYMENT CONFIRMATION.
    cash_received_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cash_received_payments',
    )
    cash_received_at = models.DateTimeField(null=True, blank=True)
    cash_settled_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cash_settled_payments',
    )
    cash_settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payment_details'
        verbose_name = 'Payment Detail'
        verbose_name_plural = 'Payment Details'
