from django.db import models
from coresite.mixin import AbstractTimeStampModel


class Supplier(AbstractTimeStampModel):
    """
    Restaurant-scoped supplier for inventory replenishment and raw material purchasing.
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='suppliers'
    )
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, default='')
    phone = models.CharField(max_length=64, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'purchase_suppliers'
        verbose_name = 'Supplier'
        verbose_name_plural = 'Suppliers'
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'name'],
                name='unique_supplier_name_per_restaurant'
            )
        ]
        indexes = [
            models.Index(fields=['restaurant', 'is_active']),
        ]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.restaurant.name if self.restaurant else 'No Restaurant'})"
