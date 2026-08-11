from django.db import models
from coresite.mixin import AbstractTimeStampModel


class Menu(AbstractTimeStampModel):
    """
    Model representing a models item.
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)

    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        related_name='menus',
        on_delete=models.CASCADE
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'name'],
                name='unique_menu_per_restaurant'
            )
        ]

    def __str__(self):
        # return f"{self.name} - {self.restaurant.name}"
        return self.name

class MenuItem(AbstractTimeStampModel):
    """
    Model representing a models item.
    """
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to='menu_items/', blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)

    is_available = models.BooleanField(default=True)

    avg_rating = models.FloatField(default=0)
    total_reviews = models.PositiveIntegerField(default=0)

    menu = models.ForeignKey(
        "restaurants.Menu",
        related_name='menu_items',
        on_delete=models.CASCADE
    )

    category = models.ForeignKey(
        "restaurants.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="menu_items"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['menu', 'name'],
                name='unique_menu_item_per_menu'
            )
        ]

    def __str__(self):
        return f"{self.name} - {self.menu.name}"

class MenuItemIngredient(AbstractTimeStampModel):
    """
    Model representing an ingredient for a models item.
    """
    menu_item = models.ForeignKey(
        "restaurants.MenuItem",
        related_name='ingredients',
        on_delete=models.CASCADE
    )
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to='ingredients/', blank=True, null=True)
    quantity = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['menu_item', 'name'],
                name='unique_ingredient_per_menu_item'
            )
        ]

    def __str__(self):
        return f"{self.name} - {self.menu_item.name}"
