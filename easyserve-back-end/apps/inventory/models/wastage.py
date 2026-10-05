from decimal import Decimal
from django.db import models
from django.utils import timezone
from coresite.mixin import AbstractTimeStampModel
from apps.inventory.constants import WastageReason


class StockWastage(AbstractTimeStampModel):
    """
    Records operational stock wastage, spoilage, damage, and losses.
    Maintains full auditability, tenant scoping, and cost attribution.
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='stock_wastage_records',
        db_index=True
    )
    inventory_item = models.ForeignKey(
        'inventory.InventoryItem',
        on_delete=models.PROTECT,
        related_name='wastage_records',
        db_index=True
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        help_text="Quantity of item discarded/wasted in the specified UOM."
    )
    uom = models.ForeignKey(
        'inventory.UnitOfMeasure',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='wastage_records',
        help_text="Unit of measure for the recorded quantity."
    )
    reason = models.PositiveSmallIntegerField(
        choices=WastageReason.model_choices(),
        default=WastageReason.EXPIRED.value,
        db_index=True,
        help_text="Categorized operational reason for the wastage."
    )
    notes = models.TextField(
        blank=True,
        default='',
        help_text="Contextual details, lot numbers, or incident explanation."
    )
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Unit cost basis (WAC) at the time of wastage."
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total financial loss (quantity * unit_cost)."
    )
    wastage_date = models.DateField(
        default=timezone.now,
        db_index=True,
        help_text="Date when wastage occurred or was identified."
    )
    created_by = models.ForeignKey(
        'userprofile.UserProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_wastages'
    )

    class Meta:
        db_table = 'inventory_stock_wastage'
        verbose_name = 'Stock Wastage'
        verbose_name_plural = 'Stock Wastages'
        ordering = ['-wastage_date', '-created_at']
        indexes = [
            models.Index(fields=['restaurant', 'wastage_date']),
            models.Index(fields=['restaurant', 'reason']),
            models.Index(fields=['restaurant', 'inventory_item']),
        ]

    def __str__(self):
        unit_str = self.uom.short_code if self.uom else ""
        return f"{self.inventory_item.name}: {self.quantity} {unit_str} ({self.get_reason_display()}) - Rs. {self.total_cost}"
