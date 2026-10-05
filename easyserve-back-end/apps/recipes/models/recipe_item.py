from decimal import Decimal
from django.db import models
from coresite.mixin import AbstractTimeStampModel


class RecipeItem(AbstractTimeStampModel):
    """
    Bill of Materials line item representing a required raw inventory ingredient.
    """
    recipe = models.ForeignKey(
        'recipes.Recipe',
        on_delete=models.CASCADE,
        related_name='items'
    )
    inventory_item = models.ForeignKey(
        'inventory.InventoryItem',
        on_delete=models.PROTECT,
        related_name='recipe_usages'
    )
    quantity_required = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text="Required raw ingredient quantity for this recipe batch."
    )
    uom = models.ForeignKey(
        'inventory.UnitOfMeasure',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='recipe_items',
        help_text="Unit of measure for this recipe line. Defaults to inventory item's UOM if blank."
    )

    class Meta:
        db_table = 'recipe_items'
        verbose_name = 'Recipe Item'
        verbose_name_plural = 'Recipe Items'
        constraints = [
            models.UniqueConstraint(
                fields=['recipe', 'inventory_item'],
                name='unique_inventory_item_per_recipe'
            )
        ]
        indexes = [
            models.Index(fields=['recipe', 'inventory_item']),
        ]
        ordering = ['id']

    @property
    def effective_uom(self):
        """
        Returns the explicit recipe line UOM or falls back to the inventory item's base UOM.
        """
        return self.uom or self.inventory_item.uom

    @property
    def ingredient_cost(self):
        """
        Calculates line ingredient cost using UOM conversion and the inventory item's cost_per_unit.
        """
        from apps.recipes.services.uom_converter import UOMConverter
        converted_qty = UOMConverter.convert(
            quantity=self.quantity_required,
            source_uom=self.effective_uom,
            target_uom=self.inventory_item.uom
        )
        unit_cost = self.inventory_item.cost_per_unit or Decimal('0.00')
        return (converted_qty * unit_cost).quantize(Decimal('0.01'))

    def __str__(self):
        unit_str = self.effective_uom.short_code if self.effective_uom else ""
        return f"{self.inventory_item.name}: {self.quantity_required} {unit_str}"
