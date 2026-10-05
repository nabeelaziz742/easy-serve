from decimal import Decimal
from django.db import models
from coresite.mixin import AbstractTimeStampModel
from apps.inventory.constants import StockMovementType


class StockMovementLog(AbstractTimeStampModel):
    """
    Immutable stock audit ledger.
    Every inventory change (purchase, consumption, wastage, adjustment) creates an auditable movement record.
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='stock_movement_logs'
    )
    inventory_item = models.ForeignKey(
        'inventory.InventoryItem',
        on_delete=models.PROTECT,
        related_name='movement_logs'
    )
    movement_type = models.PositiveSmallIntegerField(
        choices=StockMovementType.model_choices(),
        default=StockMovementType.ADJUSTMENT.value,
        db_index=True
    )
    quantity_delta = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        help_text="Positive for stock additions, negative for reductions/consumption/wastage."
    )
    balance_after = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        help_text="Snapshot of the item current_stock immediately after this movement."
    )
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Unit cost of the item at the time of movement."
    )
    total_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total value affected (|quantity_delta| * unit_cost)."
    )
    reference_note = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Audit explanation, e.g. 'Opening Stock Initial Count', 'WASTAGE (Expired Stock)', 'Physical Audit Adjustment'."
    )
    wastage = models.ForeignKey(
        'inventory.StockWastage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movement_logs',
        help_text="Direct link to the originating StockWastage record if applicable."
    )
    logged_by = models.ForeignKey(
        'userprofile.UserProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logged_stock_movements'
    )

    class Meta:
        db_table = 'inventory_stock_movement_logs'
        verbose_name = 'Stock Movement Log'
        verbose_name_plural = 'Stock Movement Logs'
        indexes = [
            models.Index(fields=['restaurant', 'inventory_item', 'created_at']),
            models.Index(fields=['restaurant', 'movement_type', 'created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        sign = "+" if self.quantity_delta > 0 else ""
        return f"{self.inventory_item.name}: {sign}{self.quantity_delta} ({self.get_movement_type_display()}) at {self.created_at}"
