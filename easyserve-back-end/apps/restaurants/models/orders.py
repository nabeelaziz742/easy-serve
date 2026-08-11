from django.db import models
from django.db.models import Sum

from apps.restaurants.constants import OrderType, PaymentStatus, OrderStatus
from apps.userprofile.models import UserProfile
from coresite.mixin import AbstractTimeStampModel


class OrderItem(AbstractTimeStampModel):
    order = models.ForeignKey(
        'restaurants.Orders',
        on_delete=models.CASCADE,
        related_name='items',
        null=True,
        blank=True
    )
    menu_item = models.ForeignKey(
        'restaurants.MenuItem',
        on_delete=models.PROTECT,
        related_name='order_items'
    )
    quantity = models.PositiveIntegerField(default=1)
    comments = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.menu_item.name} - {self.quantity} pcs"


class Orders(AbstractTimeStampModel):
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="orders"
    )

    order_type = models.PositiveSmallIntegerField(
        choices=OrderType.model_choices(),
        default=OrderType.DINE_IN.value
    )

    dine_in_session = models.ForeignKey(
        'restaurants.DineInSession',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders"
    )

    table = models.ForeignKey(
        'restaurants.Table',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )

    waiter = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="waiter_orders"
    )

    # NEW FIELD
    assigned_chef = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chef_orders"
    )

    # NEW FIELD
    accepted_by_waiter = models.BooleanField(default=False)

    order_status = models.PositiveSmallIntegerField(
        choices=OrderStatus.model_choices(),
        default=OrderStatus.TO_PREPARE.value
    )

    billing_first_name = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    billing_last_name = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    billing_email = models.EmailField(
        blank=True,
        null=True
    )

    billing_phone = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    billing_address = models.CharField(
        max_length=500,
        blank=True,
        null=True
    )

    shipping_address = models.CharField(
        max_length=500,
        blank=True,
        null=True
    )

    ordered_date = models.DateTimeField(
        null=True,
        blank=True
    )

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    order_cancelled = models.BooleanField(default=False)

    ordered = models.BooleanField(default=False)

    payment_status = models.PositiveSmallIntegerField(
        choices=PaymentStatus.model_choices(),
        default=PaymentStatus.PENDING.value
    )

    @property
    def total_items(self):
        total = self.items.aggregate(
            total=Sum('quantity')
        )['total']
        return int(total or 0)

    def __str__(self):
        return f"Order {self.id}"