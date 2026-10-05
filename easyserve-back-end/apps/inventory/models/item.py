from decimal import Decimal
from django.db import models
from coresite.mixin import AbstractTimeStampModel


class InventoryItem(AbstractTimeStampModel):
    """
    Core inventory trackable unit (raw material, prepared base, beverage stock, packaging item).
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='inventory_items'
    )
    category = models.ForeignKey(
        'inventory.InventoryCategory',
        on_delete=models.PROTECT,
        related_name='items'
    )
    name = models.CharField(max_length=255)
    sku = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="Stock Keeping Unit code. Automatically generated if left blank."
    )
    uom = models.ForeignKey(
        'inventory.UnitOfMeasure',
        on_delete=models.PROTECT,
        related_name='inventory_items'
    )
    current_stock = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal('0.000')
    )
    min_reorder_level = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal('5.000'),
        help_text="Threshold below which the item is flagged as Low Stock."
    )
    cost_per_unit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Weighted average or standard cost per unit."
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'inventory_items'
        verbose_name = 'Inventory Item'
        verbose_name_plural = 'Inventory Items'
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'name'],
                name='unique_inventory_item_name_per_restaurant'
            ),
            models.UniqueConstraint(
                fields=['restaurant', 'sku'],
                name='unique_inventory_item_sku_per_restaurant',
                condition=models.Q(sku__isnull=False) & ~models.Q(sku='')
            )
        ]
        indexes = [
            models.Index(fields=['restaurant', 'is_active']),
            models.Index(fields=['restaurant', 'category']),
        ]
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.sku:
            # Generate deterministic fallback SKU if none provided
            super().save(*args, **kwargs)
            self.sku = f"INV-{self.restaurant_id}-{self.id:04d}"
            return super().save(update_fields=['sku'])
        return super().save(*args, **kwargs)

    @property
    def stock_value(self):
        """Calculates total monetary value of current on-hand stock."""
        val = (self.current_stock or Decimal('0')) * (self.cost_per_unit or Decimal('0'))
        return val.quantize(Decimal('0.01'))

    @property
    def is_low_stock(self):
        """True if stock is at or below reorder threshold but above zero."""
        return Decimal('0') < self.current_stock <= self.min_reorder_level

    @property
    def is_out_of_stock(self):
        """True if stock is depleted to zero or below."""
        return self.current_stock <= Decimal('0')

    @property
    def stock_status(self):
        if self.is_out_of_stock:
            return "out_of_stock"
        if self.is_low_stock:
            return "low_stock"
        return "in_stock"

    def __str__(self):
        return f"{self.name} ({self.current_stock} {self.uom.short_code})"
