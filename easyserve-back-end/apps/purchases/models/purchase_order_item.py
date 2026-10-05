from decimal import Decimal
from django.db import models
from coresite.mixin import AbstractTimeStampModel


class PurchaseOrderItem(AbstractTimeStampModel):
    """
    Line item for a Purchase Order.
    Specifies raw inventory item, received quantity, and purchase unit cost.
    """
    purchase_order = models.ForeignKey(
        'purchases.PurchaseOrder',
        on_delete=models.CASCADE,
        related_name='items'
    )
    inventory_item = models.ForeignKey(
        'inventory.InventoryItem',
        on_delete=models.PROTECT,
        related_name='purchase_items'
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        help_text="Purchased quantity in item's base Unit of Measure"
    )
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Agreed purchase cost per unit (excluding tax)"
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Calculated line total: quantity * unit_cost"
    )

    class Meta:
        db_table = 'purchase_order_items'
        verbose_name = 'Purchase Order Item'
        verbose_name_plural = 'Purchase Order Items'
        constraints = [
            models.UniqueConstraint(
                fields=['purchase_order', 'inventory_item'],
                name='unique_item_per_purchase_order'
            )
        ]
        indexes = [
            models.Index(fields=['purchase_order', 'inventory_item']),
        ]
        ordering = ['id']

    def save(self, *args, **kwargs):
        if self.quantity is not None and self.unit_cost is not None:
            self.total_cost = (Decimal(str(self.quantity)) * Decimal(str(self.unit_cost))).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.inventory_item.name} x {self.quantity} ({self.total_cost})"
