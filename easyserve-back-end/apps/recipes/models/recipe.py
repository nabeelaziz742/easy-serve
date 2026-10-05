from decimal import Decimal
from django.db import models
from coresite.mixin import AbstractTimeStampModel


class Recipe(AbstractTimeStampModel):
    """
    Bill of Materials (Recipe) for a MenuItem.
    Defines required inventory raw ingredients, yield servings, and prep instructions.
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='recipes'
    )
    menu_item = models.OneToOneField(
        'restaurants.MenuItem',
        on_delete=models.CASCADE,
        related_name='recipe'
    )
    yield_servings = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal('1.00'),
        help_text="Standard number of menu portions produced by this recipe batch."
    )
    instructions = models.TextField(
        blank=True,
        default='',
        help_text="Culinary preparation steps for kitchen staff."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="If inactive, order consumption is bypassed."
    )

    class Meta:
        db_table = 'recipe_headers'
        verbose_name = 'Recipe'
        verbose_name_plural = 'Recipes'
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'menu_item'],
                name='unique_recipe_per_menu_item'
            )
        ]
        indexes = [
            models.Index(fields=['restaurant', 'is_active']),
            models.Index(fields=['restaurant', 'menu_item']),
        ]
        ordering = ['menu_item__name']

    @property
    def total_cost(self):
        """
        Calculates total batch ingredient cost based on current inventory item cost_per_unit.
        """
        total = Decimal('0.00')
        for item in self.items.select_related('inventory_item', 'inventory_item__uom', 'uom').all():
            total += item.ingredient_cost
        return total.quantize(Decimal('0.01'))

    @property
    def cost_per_serving(self):
        """
        Calculates cost for one single serving portion: total_cost / yield_servings.
        """
        servings = self.yield_servings or Decimal('1.00')
        if servings <= Decimal('0.00'):
            servings = Decimal('1.00')
        return (self.total_cost / servings).quantize(Decimal('0.01'))

    @property
    def food_cost_percentage(self):
        """
        Food Cost % = (Cost per serving / Selling Price) * 100.
        Returns None if selling price is 0 or unavailable.
        """
        price = getattr(self.menu_item, 'price', None)
        if not price or price <= Decimal('0.00'):
            return None
        pct = (self.cost_per_serving / price) * Decimal('100.00')
        return pct.quantize(Decimal('0.1'))

    def __str__(self):
        return f"Recipe: {self.menu_item.name} ({self.restaurant.name if self.restaurant else 'No Restaurant'})"
