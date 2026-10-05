from django.db import models
from coresite.mixin import AbstractTimeStampModel


class UnitOfMeasure(AbstractTimeStampModel):
    """
    Restaurant-scoped unit of measurement (e.g. Kilogram, Gram, Liter, Milliliter, Piece).
    Supports base-unit conversion factors for future recipe calculations.
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='units_of_measure',
        null=True,
        blank=True,
        help_text="Null restaurant indicates a system-default template unit."
    )
    name = models.CharField(max_length=50)
    short_code = models.CharField(max_length=10)
    base_unit = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sub_units'
    )
    conversion_factor = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=1.0000,
        help_text="Multiplier to convert this unit to its base unit (e.g., 1 kg = 1000 g -> factor=1000)."
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'inventory_units_of_measure'
        verbose_name = 'Unit of Measure'
        verbose_name_plural = 'Units of Measure'
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'short_code'],
                name='unique_unit_per_restaurant'
            )
        ]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.short_code})"
