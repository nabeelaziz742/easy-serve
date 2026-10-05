from django.db import models
from coresite.mixin import AbstractTimeStampModel


class InventoryCategory(AbstractTimeStampModel):
    """
    Restaurant-scoped inventory classification (e.g. Meat & Poultry, Dairy, Produce, Dry Goods, Beverages, Packaging).
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='inventory_categories'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'inventory_categories'
        verbose_name = 'Inventory Category'
        verbose_name_plural = 'Inventory Categories'
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'name'],
                name='unique_inventory_category_per_restaurant'
            )
        ]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.restaurant.name})"
