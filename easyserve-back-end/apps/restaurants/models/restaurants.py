from decimal import Decimal, ROUND_HALF_UP

from django.db import models

from apps.userprofile.models import UserProfile
from coresite.mixin import AbstractTimeStampModel

CENTS = Decimal("0.01")


class Restaurant(AbstractTimeStampModel):
    """
    Model representing a restaurant.
    """
    owners = models.ManyToManyField(
        'userprofile.UserProfile',
        related_name='owned_restaurants',
        blank=True
    )

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    cuisine = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    logo = models.ImageField(upload_to='restaurant_logos/', blank=True, null=True)
    is_active = models.BooleanField(default=True, null=True, blank=True)

    avg_rating = models.FloatField(default=0)
    total_reviews = models.PositiveIntegerField(default=0)

    # Billing settings, managed from the manager Settings page. Both rates
    # default to 0 so existing restaurants keep charging the item total only.
    tax_label = models.CharField(max_length=30, default="GST")
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    service_charge_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    tax_number = models.CharField(max_length=50, blank=True, default="")
    receipt_footer = models.CharField(max_length=255, blank=True, default="")

    def __str__(self):
        return self.name

    def bill_breakdown(self, subtotal, order_type=None):
        """Tax and service charge for an item subtotal, rounded to paisa.

        Service charge applies to dine-in only; tax applies to every order.
        """
        from apps.restaurants.constants import OrderType

        subtotal = Decimal(subtotal).quantize(CENTS, rounding=ROUND_HALF_UP)
        service = Decimal("0.00")
        if order_type in (None, OrderType.DINE_IN.value):
            service = (subtotal * self.service_charge_percent / 100).quantize(CENTS, rounding=ROUND_HALF_UP)
        tax = (subtotal * self.tax_percent / 100).quantize(CENTS, rounding=ROUND_HALF_UP)
        return {
            "subtotal": subtotal,
            "service_charge": service,
            "tax": tax,
            "total": subtotal + service + tax,
        }

class RestaurantHour(models.Model):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='hours'
    )
    day_of_week = models.IntegerField()  # 0=Mon … 6=Sun
    open_time = models.TimeField()
    close_time = models.TimeField()

class RestaurantImage(AbstractTimeStampModel):
    """
    Model representing an image of a restaurant.
    """
    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        related_name='images',
        on_delete=models.CASCADE
    )
    image = models.ImageField(upload_to='restaurant_images/')
    is_primary = models.BooleanField(default=False)

    def __str__(self):
        return f"Image for {self.restaurant.name}"

class Visit(models.Model):
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='visits'
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='visits'
    )
    visit_time = models.DateTimeField()
    table = models.ForeignKey(
        'restaurants.Table',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='visits'
    )
