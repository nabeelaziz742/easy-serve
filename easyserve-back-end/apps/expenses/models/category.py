from django.db import models
from coresite.mixin import AbstractTimeStampModel


class ExpenseCategory(AbstractTimeStampModel):
    """
    Restaurant-scoped operational expense categorization (e.g. Utilities, Salaries, Rent, Maintenance).
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='expense_categories',
        db_index=True
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'expenses_categories'
        verbose_name = 'Expense Category'
        verbose_name_plural = 'Expense Categories'
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'name'],
                name='unique_expense_category_per_restaurant'
            )
        ]
        indexes = [
            models.Index(fields=['restaurant', 'is_active']),
        ]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.restaurant.name})"
